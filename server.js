import express from 'express';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { db, nowIso } from './lib/db.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  requireAuth,
  sanitizeUser,
  normalizeIdNumber,
  formatIdDisplay,
  newId,
} from './lib/auth.js';
import {
  PORT,
  IS_PROD,
  PUBLIC_URL,
  FREE_TRIAL_SECONDS,
  FREE_AGENT_LIMIT,
  MEMBER_AGENT_LIMIT,
  PRICING,
  pricingForCountry,
  COUNTRIES,
  ADMIN_EMAIL,
  TONES,
  PAYMENTS,
  PAYMENT_ACCOUNT,
  AI,
} from './lib/config.js';
import { buildSystemPrompt, generateReply, aiStatus } from './lib/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable('x-powered-by');
if (IS_PROD) app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
});

// ── rate limiting ─────────────────────────────────────────────────
const buckets = new Map();

function allow(key, max, windowMs) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= max;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref();

// ── helpers ───────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function fail(res, status, error, extra = {}) {
  return res.status(status).json({ error, ...extra });
}

function usageFor(user) {
  const row = db.prepare('SELECT * FROM usage WHERE user_id = ?').get(user.id);
  const usedSeconds = row?.used_seconds || 0;
  const unlimited = user.plan !== 'free';
  return {
    usedSeconds,
    limitSeconds: FREE_TRIAL_SECONDS,
    remainingSeconds: unlimited ? null : Math.max(0, FREE_TRIAL_SECONDS - usedSeconds),
    unlimited,
    lastChatAt: row?.last_chat_at || null,
  };
}

function accountPayload(user) {
  const ai = aiStatus();
  return {
    user: sanitizeUser(user, usageFor(user)),
    pricing: pricingForCountry(user.country),
    paymentsDemo: PAYMENTS.demo,
    aiLive: ai.live,
    aiProvider: ai.provider,
  };
}

function newReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i += 1) ref += alphabet[bytes[i] % alphabet.length];
  return `NX-${ref}`;
}

function publicPayment(p) {
  return {
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    method: p.method,
    status: p.status,
    reference: p.reference,
    createdAt: p.created_at,
    paidAt: p.paid_at,
  };
}

function publicAgent(a) {
  return {
    id: a.id,
    name: a.name,
    purpose: a.purpose,
    tone: a.tone,
    expertise: a.expertise,
    guardrails: a.guardrails,
    createdAt: a.created_at,
  };
}

function activateMembership(userId) {
  db.prepare("UPDATE users SET plan = 'member' WHERE id = ?").run(userId);
}

function isAdmin(user) {
  return user.role === 'admin';
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return fail(res, 403, 'Administrator access only.');
  next();
}

// ── config ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: nowIso() });
});

app.get('/api/config', (req, res) => {
  const ai = aiStatus();
  res.json({
    organization: 'NEXA',
    pricing: { USD: PRICING.USD, ETB: PRICING.ETB },
    freeTrialSeconds: FREE_TRIAL_SECONDS,
    freeAgentLimit: FREE_AGENT_LIMIT,
    memberAgentLimit: MEMBER_AGENT_LIMIT,
    countries: COUNTRIES,
    tones: TONES,
    paymentsDemo: PAYMENTS.demo,
    paymentAccount: PAYMENT_ACCOUNT,
    aiLive: ai.live,
    aiProvider: ai.provider,
    aiModel: ai.model,
  });
});

// ── auth ──────────────────────────────────────────────────────────
app.post('/api/auth/signup', (req, res) => {
  const ipKey = `signup:${req.ip}`;
  if (!allow(ipKey, 12, 10 * 60_000)) {
    return fail(res, 429, 'Too many attempts. Please wait a few minutes and try again.');
  }

  const name = text(req.body?.name, 80);
  const email = text(req.body?.email, 160).toLowerCase();
  const country = text(req.body?.country, 2).toUpperCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const idNormalized = normalizeIdNumber(req.body?.idNumber);

  if (name.length < 2) return fail(res, 400, 'Please enter your full name.');
  if (!EMAIL_RE.test(email)) return fail(res, 400, 'Please enter a valid email address.');
  if (!/^[A-Z]{2}$/.test(country)) return fail(res, 400, 'Please select your country.');
  if (idNormalized.length < 5 || idNormalized.length > 32) {
    return fail(res, 400, 'Please enter a valid national ID or passport number.');
  }
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.');
  if (password.length > 200) return fail(res, 400, 'Password is too long.');

  const emailTaken = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (emailTaken) return fail(res, 409, 'An account with this email already exists.');

  const idTaken = db.prepare('SELECT id FROM users WHERE id_normalized = ?').get(idNormalized);
  if (idTaken) return fail(res, 409, 'This ID is already registered. One membership per ID.');

  const total = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const isFirst = total === 0;

  // With ADMIN_EMAIL set, only that address becomes admin — otherwise the first
  // account bootstraps the organization. Admins get full membership.
  const role = ADMIN_EMAIL ? (email === ADMIN_EMAIL ? 'admin' : 'member') : isFirst ? 'admin' : 'member';
  const plan = role === 'admin' ? 'member' : 'free';

  const { hash, salt } = hashPassword(password);
  const userId = newId();
  const createdAt = nowIso();

  db.prepare(
    `INSERT INTO users
      (id, name, email, id_normalized, id_display, country, password_hash, password_salt, role, plan, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    name,
    email,
    idNormalized,
    formatIdDisplay(idNormalized),
    country,
    hash,
    salt,
    role,
    plan,
    createdAt
  );
  db.prepare('INSERT INTO usage (user_id, used_seconds, updated_at) VALUES (?, 0, ?)').run(
    userId,
    createdAt
  );

  const token = createSession(userId);
  setSessionCookie(res, token);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.status(201).json(accountPayload(user));
});

app.post('/api/auth/login', (req, res) => {
  const ipKey = `login:${req.ip}`;
  const email = text(req.body?.email, 160).toLowerCase();
  if (!allow(`${ipKey}:${email || 'unknown'}`, 10, 10 * 60_000)) {
    return fail(res, 429, 'Too many sign-in attempts. Please wait and try again.');
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) return fail(res, 400, 'Enter your email and password.');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return fail(res, 401, 'Email or password is incorrect.');
  }

  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json(accountPayload(user));
});

app.post('/api/auth/logout', (req, res) => {
  destroySession(req);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json(accountPayload(req.user));
});

// ── agents ────────────────────────────────────────────────────────
app.get('/api/agents', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, (SELECT COUNT(*) FROM messages m WHERE m.agent_id = a.id) AS message_count
       FROM agents a WHERE a.user_id = ? ORDER BY a.created_at DESC`
    )
    .all(req.user.id);
  const limit = req.user.plan === 'free' ? FREE_AGENT_LIMIT : MEMBER_AGENT_LIMIT;
  res.json({
    agents: rows.map((row) => ({ ...publicAgent(row), messageCount: row.message_count })),
    limit,
    canCreate: rows.length < limit,
    plan: req.user.plan,
  });
});

app.post('/api/agents', requireAuth, (req, res) => {
  if (!allow(`agent:${req.user.id}`, 20, 60 * 60_000)) {
    return fail(res, 429, 'Slow down for a moment, then try again.');
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM agents WHERE user_id = ?').get(req.user.id).n;
  const limit = req.user.plan === 'free' ? FREE_AGENT_LIMIT : MEMBER_AGENT_LIMIT;
  if (count >= limit) {
    if (req.user.plan === 'free') {
      return fail(res, 402, 'Free membership includes one AI. Upgrade to build more.', {
        code: 'agent_limit',
      });
    }
    return fail(res, 400, `You have reached the ${limit}-agent limit for this plan.`);
  }

  const name = text(req.body?.name, 40);
  const purpose = text(req.body?.purpose, 400);
  const tone = TONES.includes(text(req.body?.tone, 40)) ? text(req.body?.tone, 40) : 'Professional';
  const rawExpertise = Array.isArray(req.body?.expertise) ? req.body.expertise : [];
  const expertise = rawExpertise
    .map((item) => text(item, 40))
    .filter(Boolean)
    .slice(0, 8)
    .join(', ')
    .slice(0, 300);
  const guardrails =
    text(req.body?.guardrails, 600) ||
    'Stay within your stated purpose, be honest about uncertainty, and never invent facts.';

  if (name.length < 2) return fail(res, 400, 'Give your AI a name (at least 2 characters).');
  if (purpose.length < 10) {
    return fail(res, 400, 'Describe what your AI does in at least 10 characters.');
  }

  const systemPrompt = buildSystemPrompt(
    { name, purpose, tone, expertise, guardrails },
    req.user.name
  );
  const agentId = newId();
  db.prepare(
    `INSERT INTO agents
      (id, user_id, name, purpose, tone, expertise, guardrails, system_prompt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(agentId, req.user.id, name, purpose, tone, expertise, guardrails, systemPrompt, nowIso());

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  res.status(201).json({ agent: publicAgent(agent) });
});

app.get('/api/agents/:id', requireAuth, (req, res) => {
  const agent = db
    .prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!agent) return fail(res, 404, 'AI not found.');

  const messages = db
    .prepare(
      `SELECT role, content, created_at FROM messages
       WHERE agent_id = ? ORDER BY created_at ASC LIMIT 200`
    )
    .all(agent.id)
    .map((m) => ({ role: m.role, content: m.content, createdAt: m.created_at }));

  res.json({ agent: publicAgent(agent), messages, usage: usageFor(req.user) });
});

app.delete('/api/agents/:id', requireAuth, (req, res) => {
  const result = db
    .prepare('DELETE FROM agents WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (!result.changes) return fail(res, 404, 'AI not found.');
  res.json({ ok: true });
});

app.post('/api/agents/:id/chat', requireAuth, async (req, res) => {
  if (!allow(`chat:${req.user.id}`, 40, 60_000)) {
    return fail(res, 429, 'You are sending messages very quickly. Pause a moment.');
  }

  const agent = db
    .prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!agent) return fail(res, 404, 'AI not found.');

  const message = text(req.body?.message, 4000);
  if (!message) return fail(res, 400, 'Write a message first.');

  const usage = usageFor(req.user);
  if (!usage.unlimited && usage.usedSeconds >= FREE_TRIAL_SECONDS) {
    return fail(res, 402, 'Your free 5 hours of AI time are used up. Upgrade to keep building.', {
      code: 'limit_reached',
      usage,
    });
  }

  const history = db
    .prepare(
      `SELECT role, content FROM messages WHERE agent_id = ? ORDER BY created_at ASC LIMIT 40`
    )
    .all(agent.id);

  let reply;
  try {
    reply = await generateReply({
      agent,
      ownerName: req.user.name,
      history,
      message,
    });
  } catch (error) {
    return fail(res, error.status || 502, error.message || 'The AI could not reply right now.');
  }

  const createdAt = nowIso();
  const insert = db.prepare(
    'INSERT INTO messages (id, agent_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insert.run(newId(), agent.id, req.user.id, 'user', message, createdAt);
  insert.run(newId(), agent.id, req.user.id, 'assistant', reply.text, nowIso());

  // Count time between exchanges as usage, after a successful reply so failed
  // provider calls never consume a member's trial. Capped so idle time is not billed.
  const now = Date.now();
  const last = usage.lastChatAt ? new Date(usage.lastChatAt).getTime() : now;
  const elapsed = Math.min(Math.max(0, Math.round((now - last) / 1000)), 180);
  db.prepare(
    `UPDATE usage SET used_seconds = used_seconds + ?, last_chat_at = ?, updated_at = ?
     WHERE user_id = ?`
  ).run(elapsed, new Date(now).toISOString(), new Date(now).toISOString(), req.user.id);

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    reply: reply.text,
    demo: Boolean(reply.demo),
    usage: usageFor(freshUser),
  });
});

// ── payments ──────────────────────────────────────────────────────
app.get('/api/payments', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ payments: rows.map(publicPayment) });
});

app.post('/api/payments/checkout', requireAuth, (req, res) => {
  if (req.user.plan !== 'free') {
    return fail(res, 409, 'Your membership is already active.');
  }

  const existing = db
    .prepare("SELECT * FROM payments WHERE user_id = ? AND status = 'pending'")
    .get(req.user.id);
  if (existing) {
    return res.json({ payment: publicPayment(existing), reused: true });
  }

  const method = ['ebirr', 'telebirr', 'bank_transfer', 'card'].includes(req.body?.method)
    ? req.body.method
    : 'ebirr';
  const pricing = pricingForCountry(req.user.country);

  const payment = {
    id: newId(),
    user_id: req.user.id,
    amount: pricing.amount,
    currency: pricing.currency,
    method,
    status: 'pending',
    reference: newReference(),
    created_at: nowIso(),
    paid_at: null,
  };

  db.prepare(
    `INSERT INTO payments (id, user_id, amount, currency, method, status, reference, created_at, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`
  ).run(
    payment.id,
    payment.user_id,
    payment.amount,
    payment.currency,
    payment.method,
    payment.status,
    payment.reference,
    payment.created_at
  );

  res.status(201).json({ payment: publicPayment(payment) });
});

app.post('/api/payments/:id/demo-pay', requireAuth, (req, res) => {
  if (!PAYMENTS.demo) return fail(res, 403, 'Demo payments are disabled.');
  const payment = db
    .prepare('SELECT * FROM payments WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!payment) return fail(res, 404, 'Payment not found.');
  if (payment.status !== 'pending') return fail(res, 409, 'This payment is already resolved.');

  const paidAt = nowIso();
  db.prepare("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ?").run(
    paidAt,
    payment.id
  );
  activateMembership(req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ ...accountPayload(user), payment: { ...publicPayment(payment), status: 'paid', paidAt } });
});

// ── admin ─────────────────────────────────────────────────────────
app.get('/api/admin/payments', requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, u.name AS user_name, u.email AS user_email, u.country AS user_country
       FROM payments p JOIN users u ON u.id = p.user_id
       ORDER BY CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END, p.created_at DESC
       LIMIT 200`
    )
    .all();
  res.json({
    payments: rows.map((p) => ({
      ...publicPayment(p),
      userName: p.user_name,
      userEmail: p.user_email,
      userCountry: p.user_country,
    })),
  });
});

app.post('/api/admin/payments/:id/decision', requireAuth, requireAdmin, (req, res) => {
  const action = req.body?.action === 'approve' ? 'approve' : req.body?.action === 'reject' ? 'reject' : '';
  if (!action) return fail(res, 400, 'Choose approve or reject.');

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!payment) return fail(res, 404, 'Payment not found.');
  if (payment.status !== 'pending') return fail(res, 409, 'This payment is already resolved.');

  if (action === 'approve') {
    db.prepare("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ?").run(
      nowIso(),
      payment.id
    );
    activateMembership(payment.user_id);
  } else {
    db.prepare("UPDATE payments SET status = 'rejected' WHERE id = ?").run(payment.id);
  }

  res.json({ ok: true });
});

app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
  const members = db.prepare("SELECT COUNT(*) AS n FROM users WHERE plan = 'member'").get().n;
  const accounts = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const agents = db.prepare('SELECT COUNT(*) AS n FROM agents').get().n;
  const pending = db.prepare("SELECT COUNT(*) AS n FROM payments WHERE status = 'pending'").get().n;
  res.json({ members, accounts, agents, pending });
});

// ── static app ────────────────────────────────────────────────────
const publicDir = path.join(__dirname, 'public');
const indexTemplate = readFileSync(path.join(publicDir, 'index.html'), 'utf8');

function sendIndex(req, res) {
  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(indexTemplate.replaceAll('%PUBLIC_URL%', PUBLIC_URL));
}

app.get(['/', '/index.html'], sendIndex);

app.get('/robots.txt', (req, res) => {
  res
    .type('text/plain')
    .send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${PUBLIC_URL}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${PUBLIC_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`
  );
});

app.use(express.static(publicDir, { index: false }));

app.use('/api', (req, res) => fail(res, 404, 'Not found.'));

app.get('*', sendIndex);

app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return fail(res, 400, 'Invalid request body.');
  }
  console.error(err);
  if (res.headersSent) return next(err);
  return fail(res, 500, 'Something went wrong on our side.');
});

app.listen(PORT, () => {
  const ai = aiStatus();
  console.log('');
  console.log('  NEXA · AI Organization');
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Local:    http://localhost:${PORT}`);
  if (IS_PROD) console.log(`  Public:   ${PUBLIC_URL}`);
  console.log(
    `  AI:       ${
      ai.live
        ? `live (${ai.provider} · ${ai.model})`
        : AI.rejectedKey
          ? 'demo replies (ANTHROPIC_API_KEY format was rejected)'
          : 'demo replies (set DEEPSEEK_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)'
    }`
  );
  console.log(
    `  Payments: ${PAYMENTS.demo ? 'demo mode (simulate checkout)' : 'manual verification (EBIRR)'}`
  );
  console.log('');
});
