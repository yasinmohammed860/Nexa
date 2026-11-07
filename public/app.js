/* NEXA — client application */

const appEl = document.getElementById('app');
const toastEl = document.getElementById('toasts');
const modalRoot = document.getElementById('modal-root');

const state = {
  me: null,
  config: null,
};

// ── icons ─────────────────────────────────────────────────────────
const ICON_PATHS = {
  spark:
    '<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/>',
  shield:
    '<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M3 7l9 6 9-6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  id: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.6-1.8 1.7-2.7 3-2.7s2.4.9 3 2.7M14 10h4M14 14h3"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.6-4-9s1.5-6.6 4-9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  logout:
    '<path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M9 12H3M6.5 8.5L3 12l3.5 3.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash:
    '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 13h9.4l.8-13"/><path d="M10 11v5.5M14 11v5.5"/>',
  send: '<path d="M4 12l16-8-6 16-3-7-7-1z"/>',
  building:
    '<path d="M4 21V6l8-3 8 3v15"/><path d="M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 12.5h.01M12 12.5h.01M16 12.5h.01"/>',
  warning:
    '<path d="M12 3l9 16H3L12 3z"/><path d="M12 9.5v4.5M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2.5 2.5 0 0 0-2.5 2.5V13"/>',
};

function icon(name, size = 18) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

function logoMark() {
  return `<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19V5l12 14V5"/></svg></span>`;
}

// ── utilities ─────────────────────────────────────────────────────
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function fmtMoney(minor, currency) {
  const amount = Number(minor || 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeLabel(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function fmtDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return total > 0 ? `${total}s` : '0m';
}

function greetingWord() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'member';
}

const AVATAR_GRADIENTS = [
  ['#d8ff4f', '#66e3d0'],
  ['#9d8cff', '#66e3d0'],
  ['#ffc978', '#ff8080'],
  ['#66e3d0', '#9d8cff'],
  ['#f3f0e9', '#d8ff4f'],
  ['#ff9ecb', '#9d8cff'],
];

function avatarFor(name) {
  const value = String(name || 'N');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  const [g1, g2] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  const initial = (value.trim()[0] || 'N').toUpperCase();
  return `<div class="avatar" style="--g1:${g1};--g2:${g2}">${esc(initial)}</div>`;
}

function initials(name) {
  return (String(name || 'N').trim()[0] || 'N').toUpperCase();
}

function methodLabel(method) {
  return { ebirr: 'EBIRR', telebirr: 'Telebirr', card: 'Card', bank_transfer: 'Bank transfer' }[method] || method;
}

function aiProviderLabel(provider) {
  return { deepseek: 'DeepSeek', openai: 'OpenAI', anthropic: 'Anthropic' }[provider] || provider || '';
}

function countryName(code) {
  const match = state.config?.countries?.find((country) => country.code === code);
  return match ? match.name : code || '—';
}

// ── markdown (safe: escape first, then format) ────────────────────
function inlineMd(value) {
  return value
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
}

function renderMarkdown(source) {
  const lines = String(source ?? '').replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let list = null;
  let paragraph = [];
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html += `<p>${inlineMd(paragraph.join(' '))}</p>`;
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      html += `<${list.tag}>${list.items
        .map((item) => `<li>${inlineMd(item)}</li>`)
        .join('')}</${list.tag}>`;
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      html += `<blockquote>${quote.map((q) => inlineMd(q)).join('<br>')}</blockquote>`;
      quote = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushAll();
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      flushAll();
      html += '<hr>';
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      flushAll();
      html += `<h4>${inlineMd(esc(heading[1]))}</h4>`;
      continue;
    }
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quote.push(esc(quoteMatch[1]));
      continue;
    }
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      flushQuote();
      if (!list || list.tag !== 'ul') {
        flushList();
        list = { tag: 'ul', items: [] };
      }
      list.items.push(esc(bullet[1]));
      continue;
    }
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      flushQuote();
      if (!list || list.tag !== 'ol') {
        flushList();
        list = { tag: 'ol', items: [] };
      }
      list.items.push(esc(numbered[1]));
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(esc(line));
  }
  flushAll();
  return html;
}

// ── api ───────────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function api(path, options = {}) {
  const { method = 'GET', body } = options;
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is it running?', 0, null);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* empty response */
  }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/api/auth') && path !== '/api/me') {
      state.me = null;
      if (!location.hash.startsWith('#/signin')) location.hash = '#/signin';
    }
    throw new ApiError(data?.error || `Request failed (${response.status}).`, response.status, data);
  }
  return data;
}

// ── toast + modal ─────────────────────────────────────────────────
function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ico = type === 'success' ? icon('check', 16) : type === 'error' ? icon('warning', 16) : icon('info', 16);
  el.innerHTML = `${ico}<span>${esc(message)}</span>`;
  toastEl.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 240);
  }, 3800);
}

function openModal(html, options = {}) {
  modalRoot.innerHTML = '';
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  modalRoot.appendChild(backdrop);
  document.body.style.overflow = 'hidden';

  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };

  const close = () => {
    modalRoot.innerHTML = '';
    document.body.style.overflow = '';
    window.removeEventListener('keydown', onKey);
    if (options.onClose) options.onClose();
  };

  window.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', close);
  });

  if (options.onMount) options.onMount(backdrop.querySelector('.modal'), close);
  return close;
}

function closeModal() {
  if (!modalRoot.innerHTML) return;
  modalRoot.innerHTML = '';
  document.body.style.overflow = '';
}

function confirmDialog({ title, body, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    openModal(
      `<div class="modal-head">
        <div>
          <h2>${esc(title)}</h2>
          <p>${esc(body)}</p>
        </div>
        <button class="modal-close" data-close-modal aria-label="Close">${icon('close', 16)}</button>
      </div>
      <div class="wizard-actions" style="margin-top:4px;padding-top:0;border-top:0">
        <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${esc(confirmLabel)}</button>
      </div>`,
      {
        onMount(modal, close) {
          modal.querySelector('#confirm-cancel').addEventListener('click', () => {
            close();
            settle(false);
          });
          modal.querySelector('#confirm-ok').addEventListener('click', () => {
            close();
            settle(true);
          });
        },
        onClose() {
          settle(false);
        },
      }
    );
  });
}

// ── shared UI ─────────────────────────────────────────────────────
function publicNav() {
  const authed = Boolean(state.me);
  return `<header class="nav" id="nav">
    <div class="wrap nav-inner">
      <a class="brand" href="#/">${logoMark()} NEXA</a>
      <nav class="nav-links" aria-label="Main">
        <a href="#/" data-scroll="features">What you get</a>
        <a href="#/" data-scroll="how">How it works</a>
        <a href="#/" data-scroll="membership">Membership</a>
        <a href="#/" data-scroll="faq">Questions</a>
      </nav>
      <div class="nav-actions">
        ${
          authed
            ? `<a class="btn btn-sm btn-primary" href="#/app">Open studio ${icon('arrow', 15)}</a>`
            : `<a class="btn btn-sm btn-ghost" href="#/signin">Sign in</a>
               <a class="btn btn-sm btn-primary" href="#/signup">Join NEXA</a>`
        }
      </div>
    </div>
  </header>`;
}

function sideLink(href, iconName, label, active) {
  return `<a class="side-link ${active ? 'active' : ''}" href="${href}">${icon(iconName, 17)}<span>${label}</span></a>`;
}

function shell(content, active, options = {}) {
  const user = state.me.user;
  return `<div class="shell">
    <aside class="sidebar" id="sidebar">
      <a class="side-brand" href="#/app">${logoMark()} NEXA</a>
      <div class="side-section">Studio</div>
      <nav class="side-nav" aria-label="Studio">
        ${sideLink('#/app', 'grid', 'Overview', active === 'overview')}
        ${sideLink('#/app/build', 'plus', 'AI Studio', active === 'build')}
        ${sideLink('#/app/billing', 'card', 'Membership', active === 'billing')}
        ${user.role === 'admin' ? sideLink('#/app/admin', 'building', 'Administration', active === 'admin') : ''}
      </nav>
      <div class="side-foot">
        <div class="user-chip">
          ${avatarFor(user.name)}
          <div class="user-meta">
            <b>${esc(user.name)}</b>
            <span>${esc(user.email)}</span>
          </div>
          <button class="icon-btn" data-action="logout" title="Sign out" aria-label="Sign out">${icon('logout', 17)}</button>
        </div>
      </div>
    </aside>
    <div class="sidebar-scrim" data-action="close-sidebar"></div>
    <main class="main">
      <header class="topbar">
        <button class="icon-btn" data-action="open-sidebar" aria-label="Open menu">${icon('menu', 20)}</button>
        <a class="brand" href="#/app" style="font-size:11px">${logoMark()} NEXA</a>
        <a class="btn btn-sm btn-primary" href="#/app/build">New AI</a>
      </header>
      ${options.raw ? content : `<div class="content ${options.narrow ? 'narrow' : ''}">${content}</div>`}
    </main>
  </div>`;
}

function mount(html) {
  appEl.innerHTML = html;
}

// ── routing ───────────────────────────────────────────────────────
async function route() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const segments = path.split('/').filter(Boolean);

  document.body.classList.remove('sidebar-open');
  closeModal();

  const isApp = segments[0] === 'app';
  if (isApp && !state.me) {
    location.hash = '#/signin';
    return;
  }
  if ((path === '/signin' || path === '/signup') && state.me) {
    location.hash = '#/app';
    return;
  }

  window.scrollTo({ top: 0, behavior: 'auto' });

  try {
    if (path === '/') {
      renderLanding();
    } else if (path === '/signin') {
      renderSignIn();
    } else if (path === '/signup') {
      renderSignUp();
    } else if (path === '/app') {
      await renderDashboard();
    } else if (path === '/app/build') {
      await renderBuilder();
    } else if (segments[0] === 'app' && segments[1] === 'ai' && segments[2]) {
      await renderChat(segments[2]);
    } else if (path === '/app/billing') {
      await renderBilling();
    } else if (path === '/app/admin') {
      await renderAdmin();
    } else {
      renderNotFound();
    }
  } catch (error) {
    if (error?.status === 401) return;
    console.error(error);
    renderPageError(error?.message || 'This page could not load.');
  }
}

function renderPageError(message) {
  mount(`<div class="page-loading"><div style="text-align:center">
    <div class="badge">Something went wrong</div>
    <h1 class="serif" style="font-size:34px;margin:16px 0 8px">The page did not load.</h1>
    <p style="color:var(--muted);font-size:14px;margin-bottom:20px">${esc(message)}</p>
    <a class="btn btn-primary" href="#/">Return home</a>
  </div></div>`);
}

function renderNotFound() {
  document.title = 'Not found — NEXA';
  mount(`${publicNav()}<div class="section" style="text-align:center;border:0">
    <div class="wrap">
      <span class="kicker">404</span>
      <h1 class="serif" style="font-size:clamp(2.4rem,6vw,4rem)">This page is not part of the organization.</h1>
      <p style="color:var(--muted);margin:16px auto 28px;max-width:420px">The address may have changed, or the page never existed.</p>
      <a class="btn btn-primary" href="#/">Return home</a>
    </div>
  </div>`);
}

// ── landing ───────────────────────────────────────────────────────
function renderLanding() {
  document.title = 'NEXA — The AI Organization';
  const authed = Boolean(state.me);
  const primaryHref = authed ? '#/app' : '#/signup';
  const primaryLabel = authed ? 'Open your studio' : 'Become a member';

  mount(`
  ${publicNav()}
  <main class="landing">
    <section class="hero">
      <div class="wrap">
        <div class="hero-grid">
          <div>
            <span class="eyebrow"><i></i> The AI organization</span>
            <h1>Build an intelligence<br />that <em>belongs to you.</em></h1>
            <p class="hero-sub">
              NEXA is a members-only AI organization. Register with your <strong>ID and email</strong>,
              then design, name and run your own AI agent — built for your work, owned by you.
              <strong>$10 once</strong>, or <strong>3,000 ETB</strong> in Ethiopia. Free accounts include <strong>5 hours</strong>.
            </p>
            <div class="hero-actions">
              <a class="btn btn-primary btn-lg" href="${primaryHref}">${primaryLabel} ${icon('arrow', 16)}</a>
              <a class="btn btn-ghost btn-lg" href="${authed ? '#/app/build' : '#/signup'}">${authed ? 'Build a new AI' : 'Start free — 5 hours'}</a>
            </div>
            <div class="hero-note">
              <span>${icon('check', 14)} One-time membership</span>
              <span>${icon('check', 14)} No subscription</span>
              <span>${icon('check', 14)} ID-registered members</span>
            </div>
          </div>
          <div class="hero-visual" aria-hidden="true">
            <div class="glow-orb"></div>
            <div class="float-badge one">
              <span class="fb-icon">${icon('clock', 15)}</span>
              <div><b>5 hours free</b><span>No card required</span></div>
            </div>
            <div class="float-badge two">
              <span class="fb-icon">${icon('shield', 15)}</span>
              <div><b>ID-registered members</b><span>One membership per ID</span></div>
            </div>
            <div class="console">
              <div class="console-top">
                <div class="console-dots"><span></span><span></span><span></span></div>
                <div class="console-title">atlas · operations agent</div>
                <div class="console-live"><i></i> live</div>
              </div>
              <div class="console-chat">
                <div class="bubble user">Review this supplier contract and flag the risky clauses.</div>
                <div class="bubble ai">
                  <div class="bubble-name">ATLAS</div>
                  Three clauses need attention before signing:
                  <ol>
                    <li>Payment terms are net-15 with no remedy</li>
                    <li>Liability cap is unlimited</li>
                    <li>Renewal is automatic with a 90-day exit</li>
                  </ol>
                </div>
                <div class="bubble user">Draft a firm reply to the supplier.</div>
                <div class="bubble ai typing"><span></span><span></span><span></span></div>
              </div>
              <div class="console-foot">Ask Atlas anything <b>${icon('arrow', 14)}</b></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="stats-band">
      <div class="wrap">
        <div class="stats-grid">
          <div class="stat"><b>$10</b><span>One-time membership</span></div>
          <div class="stat"><b>3,000 ETB</b><span>Ethiopian member rate</span></div>
          <div class="stat"><b>5 hours</b><span>Free AI time</span></div>
          <div class="stat"><b>25 agents</b><span>Included per member</span></div>
        </div>
      </div>
    </div>

    <section class="section" id="features">
      <div class="wrap">
        <div class="section-head">
          <span class="kicker">What you build</span>
          <h2>A studio for your own intelligence.</h2>
          <p>Not another chat window. A private workspace where every member designs an AI with a purpose, a personality, and boundaries you set.</p>
        </div>
        <div class="feature-grid">
          <div class="feature">
            <span class="feature-ico">${icon('user', 19)}</span>
            <h3>Agents that work like you do</h3>
            <p>Shape the tone, expertise and guardrails. Your AI answers with your standards — not a generic voice borrowed from the internet.</p>
          </div>
          <div class="feature">
            <span class="feature-ico">${icon('shield', 19)}</span>
            <h3>Your account, your agents</h3>
            <p>Every AI is private to your workspace. Your ID is registered once and shown masked. Conversations are visible only to you.</p>
          </div>
          <div class="feature">
            <span class="feature-ico">${icon('bolt', 19)}</span>
            <h3>Built for real work</h3>
            <p>Research, writing, operations, study, sales. Start with a purpose and refine the agent as you work together.</p>
          </div>
          <div class="feature">
            <span class="feature-ico">${icon('card', 19)}</span>
            <h3>Membership, not subscription</h3>
            <p>One payment. No recurring bill, nothing to cancel. Member status unlocks unlimited AI time and more agents.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="how">
      <div class="wrap">
        <div class="section-head">
          <span class="kicker">How it works</span>
          <h2>From registration to your first conversation.</h2>
        </div>
        <div class="steps">
          <div class="step">
            <div class="step-num">01</div>
            <h3>Register with ID and email</h3>
            <p>Every member registers with a national ID or passport number. One membership per ID — so the organization stays real.</p>
          </div>
          <div class="step">
            <div class="step-num">02</div>
            <h3>Design your AI</h3>
            <p>Name it, give it a purpose and a tone, and set the guardrails. Preview it live before you create it.</p>
          </div>
          <div class="step">
            <div class="step-num">03</div>
            <h3>Put it to work</h3>
            <p>Chat, iterate, and keep your agent in your studio. Free members get 5 hours of AI time. Members get unlimited.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="membership">
      <div class="wrap">
        <div class="section-head">
          <span class="kicker">Membership</span>
          <h2>Two ways in.</h2>
          <p>Start free to test the studio, or join as a member with one payment.</p>
        </div>
        <div class="price-grid">
          <div class="price-card">
            <div class="price-name">Free trial</div>
            <div class="price-amount"><b>$0</b><span>forever</span></div>
            <p class="price-desc">For seeing what a personal AI feels like inside the organization.</p>
            <ul class="price-list">
              <li>${icon('check', 15)} 5 hours of AI time</li>
              <li>${icon('check', 15)} 1 personal AI agent</li>
              <li>${icon('check', 15)} Full studio and builder access</li>
              <li>${icon('check', 15)} Upgrade whenever you are ready</li>
            </ul>
            <a class="btn btn-ghost btn-block" href="${authed ? '#/app' : '#/signup'}">${authed ? 'Open studio' : 'Start free'}</a>
          </div>
          <div class="price-card featured">
            <div class="price-tag">${icon('spark', 12)} Most members</div>
            <div class="price-name">Member</div>
            <div class="price-amount"><b>$10</b><span>one time</span></div>
            <p class="price-desc">Full membership in the organization. 3,000 ETB for members in Ethiopia.</p>
            <ul class="price-list">
              <li>${icon('check', 15)} Unlimited AI time</li>
              <li>${icon('check', 15)} Up to 25 personal AI agents</li>
              <li>${icon('check', 15)} Member status</li>
              <li>${icon('check', 15)} Every future studio feature</li>
            </ul>
            <a class="btn btn-primary btn-block" href="${authed ? '#/app/billing' : '#/signup'}">${authed ? 'Manage membership' : 'Become a member'}</a>
            <div class="price-foot">Ethiopian members pay 3,000 ETB · One-time payment, no renewal</div>
          </div>
        </div>
      </div>
    </section>

    <section class="quote-band">
      <div class="wrap">
        <blockquote>“An organization of people who <em>build</em> — not people who watch.”</blockquote>
        <p>NEXA membership charter · 2026</p>
      </div>
    </section>

    <section class="section" id="faq">
      <div class="wrap">
        <div class="section-head">
          <span class="kicker">Questions</span>
          <h2>The practical details.</h2>
        </div>
        <div class="faq">
          <details>
            <summary>What exactly is NEXA?</summary>
            <div class="faq-body">NEXA is a members-only AI organization. Members register with their identity, then build and use personal AI agents inside a private studio. The organization exists to give people their own intelligence tools — not just access to somebody else's chatbot.</div>
          </details>
          <details>
            <summary>Why do you ask for my ID?</summary>
            <div class="faq-body">To keep membership real and limited to one per person. Your national ID or passport number is stored with your account and displayed masked (only the last four characters). It is never shown to other members.</div>
          </details>
          <details>
            <summary>Is the $10 a subscription?</summary>
            <div class="faq-body">No. Membership is a one-time payment. There is no renewal, no recurring charge, and nothing to cancel. Once you are a member, your studio stays active.</div>
          </details>
          <details>
            <summary>What happens after my 5 free hours?</summary>
            <div class="faq-body">Your account and your AI stay exactly where they are. You can sign in and browse the studio, but conversations pause until you become a member. Upgrading unlocks unlimited AI time and up to 25 agents.</div>
          </details>
          <details>
            <summary>How does Ethiopian pricing work?</summary>
            <div class="faq-body">Choose Ethiopia when you register and your membership is 3,000 ETB instead of $10. Pay by ${esc(state.config?.paymentAccount?.provider || 'EBIRR')} to ${esc(state.config?.paymentAccount?.number || '')}, using the reference code given at checkout. A payment officer verifies the transfer before activating your membership.</div>
          </details>
          <details>
            <summary>Is my data private?</summary>
            <div class="faq-body">Your agents and conversations belong to your account. Other members cannot see them. The organization stores them on your behalf so your studio persists between sessions, and you can delete any agent at any time.</div>
          </details>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="wrap">
        <div class="footer-top">
          <div class="footer-brand">
            <a class="brand" href="#/">${logoMark()} NEXA</a>
            <p>The AI organization. ID-registered members, private agents, and one-time membership — built for Ethiopia and the world.</p>
          </div>
          <div class="footer-cols">
            <div class="footer-col">
              <h4>Organization</h4>
              <a href="#/" data-scroll="features">What you get</a>
              <a href="#/" data-scroll="how">How it works</a>
              <a href="#/" data-scroll="membership">Membership</a>
            </div>
            <div class="footer-col">
              <h4>Account</h4>
              <a href="#/signin">Sign in</a>
              <a href="#/signup">Create account</a>
              <a href="#/app">Member studio</a>
            </div>
            <div class="footer-col">
              <h4>Membership</h4>
              <a href="#/" data-scroll="faq">Common questions</a>
              <a href="#/" data-scroll="membership">Pricing</a>
              <a href="#/" data-scroll="faq">ID registration</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 NEXA · The AI Organization</span>
          <span>Addis Ababa · and everywhere</span>
        </div>
      </div>
    </footer>
  </main>`);
}

// ── auth ──────────────────────────────────────────────────────────
function authBrand() {
  return `<aside class="auth-brand">
    <a class="brand" href="#/">${logoMark()} NEXA</a>
    <blockquote>The next organization you join should be <em>yours to build.</em></blockquote>
    <div class="auth-brand-foot">
      <div><b>$10 once</b>3,000 ETB in Ethiopia</div>
      <div><b>5 hours</b>Free AI time to start</div>
      <div><b>One ID</b>One membership</div>
    </div>
  </aside>`;
}

function showAuthError(message) {
  const box = document.getElementById('auth-error');
  if (!box) return;
  box.classList.remove('hidden');
  box.innerHTML = `${icon('warning', 15)}<span>${esc(message)}</span>`;
}

function setBusy(button, busy, label = 'Working…') {
  if (!button) return;
  if (busy) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span> ${esc(label)}`;
  } else {
    button.disabled = false;
    if (button.dataset.original) button.innerHTML = button.dataset.original;
  }
}

function renderSignUp() {
  document.title = 'Create your account — NEXA';
  const countries = state.config.countries;
  mount(`
  <div class="auth">
    ${authBrand()}
    <div class="auth-panel">
      <div class="form-card">
        <a class="brand" href="#/" style="font-size:11px;margin-bottom:32px;display:inline-flex">${logoMark()} NEXA</a>
        <h1>Join the organization.</h1>
        <p class="form-sub">Register with your identity and email. Your studio is created immediately.</p>
        <div id="auth-error" class="form-error hidden"></div>
        <form id="signup-form" novalidate>
          <div class="field">
            <label class="label" for="su-name">Full name</label>
            <input class="input" id="su-name" name="name" autocomplete="name" placeholder="e.g. Selam Bekele" required />
          </div>
          <div class="field">
            <label class="label" for="su-email">Email address</label>
            <input class="input" id="su-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required />
          </div>
          <div class="field row">
            <div>
              <label class="label" for="su-country">Country</label>
              <select class="select" id="su-country" name="country">
                ${countries
                  .map(
                    (c) =>
                      `<option value="${c.code}" ${c.code === 'ET' ? 'selected' : ''}>${esc(c.name)}</option>`
                  )
                  .join('')}
              </select>
            </div>
            <div>
              <label class="label" for="su-id">National ID / Passport</label>
              <input class="input" id="su-id" name="idNumber" autocomplete="off" placeholder="ID number" maxlength="32" required />
              <div class="hint">Displayed masked · never public</div>
            </div>
          </div>
          <div class="field">
            <label class="label" for="su-password">Password</label>
            <input class="input" id="su-password" name="password" type="password" autocomplete="new-password" placeholder="At least 8 characters" minlength="8" required />
          </div>
          <div class="auth-price-note" id="price-note">
            ${icon('card', 16)}
            <span>${priceNoteContent('ET')}</span>
          </div>
          <div style="height:20px"></div>
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="signup-submit">Create my account ${icon('arrow', 16)}</button>
          <div class="terms">By creating an account you accept the membership terms, including one membership per registered ID. Free accounts include 5 hours of AI time.</div>
        </form>
        <div class="auth-alt">Already a member? <a class="link" href="#/signin">Sign in</a></div>
      </div>
    </div>
  </div>`);

  const countrySelect = document.getElementById('su-country');
  countrySelect.addEventListener('change', () => {
    const note = document.getElementById('price-note');
    note.innerHTML = `${icon('card', 16)}<span>${priceNoteContent(countrySelect.value)}</span>`;
  });

  const form = document.getElementById('signup-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.getElementById('signup-submit');
    const errorBox = document.getElementById('auth-error');
    errorBox.classList.add('hidden');
    setBusy(button, true, 'Creating account…');
    try {
      const data = await api('/api/auth/signup', {
        method: 'POST',
        body: {
          name: document.getElementById('su-name').value,
          email: document.getElementById('su-email').value,
          country: countrySelect.value,
          idNumber: document.getElementById('su-id').value,
          password: document.getElementById('su-password').value,
        },
      });
      state.me = data;
      toast('Welcome to NEXA. Your studio is ready.', 'success');
      location.hash = '#/app';
    } catch (error) {
      showAuthError(error.message);
      setBusy(button, false);
    }
  });
}

function priceNoteContent(country) {
  return country === 'ET'
    ? '<strong>Ethiopian membership: 3,000 ETB</strong> — one-time. Free accounts include 5 hours of AI time.'
    : '<strong>Membership: $10</strong> — one-time. Free accounts include 5 hours of AI time.';
}

function renderSignIn() {
  document.title = 'Sign in — NEXA';
  mount(`
  <div class="auth">
    ${authBrand()}
    <div class="auth-panel">
      <div class="form-card">
        <a class="brand" href="#/" style="font-size:11px;margin-bottom:32px;display:inline-flex">${logoMark()} NEXA</a>
        <h1>Welcome back.</h1>
        <p class="form-sub">Sign in to your studio and pick up where you left off.</p>
        <div id="auth-error" class="form-error hidden"></div>
        <form id="login-form" novalidate>
          <div class="field">
            <label class="label" for="si-email">Email address</label>
            <input class="input" id="si-email" type="email" autocomplete="email" placeholder="you@example.com" required />
          </div>
          <div class="field">
            <label class="label" for="si-password">Password</label>
            <input class="input" id="si-password" type="password" autocomplete="current-password" placeholder="Your password" required />
          </div>
          <div style="height:8px"></div>
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="login-submit">Sign in ${icon('arrow', 16)}</button>
        </form>
        <div class="auth-alt">New to NEXA? <a class="link" href="#/signup">Create an account</a></div>
      </div>
    </div>
  </div>`);

  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.getElementById('login-submit');
    const errorBox = document.getElementById('auth-error');
    errorBox.classList.add('hidden');
    setBusy(button, true, 'Signing in…');
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: {
          email: document.getElementById('si-email').value,
          password: document.getElementById('si-password').value,
        },
      });
      state.me = data;
      toast(`Welcome back, ${firstName(data.user.name)}.`, 'success');
      location.hash = '#/app';
    } catch (error) {
      showAuthError(error.message);
      setBusy(button, false);
    }
  });
}

// ── dashboard ─────────────────────────────────────────────────────
async function renderDashboard() {
  document.title = 'Studio — NEXA';
  mount(shell(`<div class="page-loading"><div class="center-load"><span class="spinner light"></span> Opening your studio…</div></div>`, 'overview'));

  const [me, agentsRes, adminStats] = await Promise.all([
    api('/api/me'),
    api('/api/agents'),
    state.me.user.role === 'admin' ? api('/api/admin/stats').catch(() => null) : Promise.resolve(null),
  ]);
  state.me = me;

  const user = me.user;
  const usage = user.usage;
  const isMember = user.plan !== 'free';
  const agents = agentsRes.agents;
  const limit = agentsRes.limit;
  const pct = Math.min(100, Math.round((usage.usedSeconds / usage.limitSeconds) * 100));
  const meterClass = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : '';
  const chats = agents.reduce((sum, agent) => sum + Math.floor((agent.messageCount || 0) / 2), 0);
  const newCard =
    agentsRes.canCreate
      ? `<a class="new-agent-card" href="#/app/build">
           <span class="plus-ring">${icon('plus', 18)}</span>
           <b>Build a new AI</b>
           <span>Name it, give it a purpose, set the tone.</span>
         </a>`
      : `<a class="new-agent-card locked" href="#/app/billing">
           <span class="plus-ring">${icon('lock', 17)}</span>
           <b>Upgrade to build more</b>
           <span>Free membership includes one AI. Members can build up to ${limit}.</span>
         </a>`;

  const usageCard = isMember
    ? `<div class="card usage">
        <div class="card-label"><span>Membership · active</span><span class="badge member">Member</span></div>
        <div class="member-state">
          <div>
            <h3>Unlimited AI time</h3>
            <p>Your membership is active. Build up to ${limit} AI agents and use your studio without a time limit.</p>
          </div>
        </div>
        <div class="usage-foot">
          <span>Member${user.country ? ` · ${esc(countryName(user.country))}` : ''}</span>
          <a class="link" href="#/app/billing">View membership</a>
        </div>
      </div>`
    : `<div class="card usage">
        <div class="card-label"><span>Usage · free trial</span><span class="badge free">5 hours</span></div>
        <div class="usage-figure"><b>${fmtDuration(usage.usedSeconds)}</b><span>of ${fmtDuration(usage.limitSeconds)} used</span></div>
        <div class="meter"><div class="meter-fill ${meterClass}" style="width:${pct}%"></div></div>
        <div class="usage-foot">
          <span>${pct >= 100 ? 'Your free hours are used up.' : `${fmtDuration(usage.remainingSeconds)} of AI time remaining.`}</span>
          <a class="btn btn-sm btn-primary" href="#/app/billing">Become a member</a>
        </div>
      </div>`;

  const adminBanner =
    adminStats && adminStats.pending > 0
      ? `<div class="banner admin">
          <span><b>${adminStats.pending} payment${adminStats.pending === 1 ? '' : 's'}</b> awaiting verification.</span>
          <a class="btn btn-sm btn-ghost" href="#/app/admin">Review payments</a>
        </div>`
      : '';

  const agentsBlock =
    agents.length === 0
      ? `<div class="empty">
          <h3>No AI yet.</h3>
          <p>Your first agent is the hardest to name and the easiest to use. Start with what you actually do every day.</p>
          <a class="btn btn-primary" href="#/app/build">Design your first AI</a>
        </div>`
      : `<div class="agent-grid">
          ${agents
            .map(
              (agent) => `<a class="agent-card" href="#/app/ai/${agent.id}">
                <div class="agent-card-top">
                  ${avatarFor(agent.name)}
                  <span class="badge">${esc(agent.tone)}</span>
                </div>
                <h3>${esc(agent.name)}</h3>
                <p class="agent-purpose">${esc(agent.purpose)}</p>
                <div class="agent-meta">
                  <span>${Math.floor((agent.messageCount || 0) / 2)} chats</span>
                  <span class="open">Open ${icon('arrow', 13)}</span>
                </div>
              </a>`
            )
            .join('')}
          ${newCard}
        </div>`;

  const content = `
    <div class="page-head">
      <div>
        <span class="badge ${isMember ? 'member' : 'free'}">${isMember ? 'Member' : 'Free trial'}</span>
        <h1 class="greeting" style="margin-top:12px">${greetingWord()}, <em>${esc(firstName(user.name))}</em>.</h1>
        <p class="page-sub">${isMember ? 'Your studio is fully unlocked.' : 'You are on the free plan. Here is where your work lives.'}</p>
      </div>
      <a class="btn btn-primary" href="#/app/build">${icon('plus', 16)} Build an AI</a>
    </div>
    ${adminBanner}
    <div class="dash-grid">
      ${usageCard}
      <div class="card">
        <div class="card-label"><span>At a glance</span></div>
        <div class="stat-mini">
          <div class="stat-mini-row"><span>AI agents</span><b>${agents.length} / ${limit}</b></div>
          <div class="stat-mini-row"><span>Conversations</span><b>${chats}</b></div>
          <div class="stat-mini-row"><span>Plan</span><b>${isMember ? 'Member' : 'Free'}</b></div>
          <div class="stat-mini-row"><span>Joined</span><b>${fmtDate(user.createdAt)}</b></div>
        </div>
      </div>
    </div>
    <div class="section-title-row">
      <h2>Your AIs</h2>
      <span class="badge">${agents.length} of ${limit}</span>
    </div>
    ${agentsBlock}
  `;

  mount(shell(content, 'overview'));
}

// ── builder ───────────────────────────────────────────────────────
async function renderBuilder() {
  document.title = 'AI Studio — NEXA';
  mount(shell(`<div class="page-loading"><div class="center-load"><span class="spinner light"></span> Opening the studio…</div></div>`, 'build'));

  const res = await api('/api/agents');
  const me = await api('/api/me');
  state.me = me;

  if (!res.canCreate) {
    const first = res.agents[0];
    const content = `
      <div class="page-head">
        <div>
          <span class="kicker">AI Studio</span>
          <h1 class="greeting">The studio is at <em>capacity.</em></h1>
          <p class="page-sub">Free membership includes one AI. Membership unlocks up to ${res.limit}.</p>
        </div>
        <a class="btn btn-ghost btn-sm" href="#/app">Back to studio</a>
      </div>
      <div class="empty">
        <h3>One more agent needs a membership.</h3>
        <p>Your existing AI is safe. Become a member to build up to ${res.limit} personal agents and use them without a time limit.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a class="btn btn-primary" href="#/app/billing">View membership</a>
          ${first ? `<a class="btn btn-ghost" href="#/app/ai/${first.id}">Open ${esc(first.name)}</a>` : ''}
        </div>
      </div>`;
    mount(shell(content, 'build'));
    return;
  }

  const tones = state.config.tones;
  const presets = ['Research', 'Writing', 'Marketing', 'Engineering', 'Finance', 'Legal', 'Education', 'Design', 'Operations'];
  const draft = { name: '', purpose: '', tone: 'Professional', expertise: [], guardrails: '' };
  let step = 1;

  const content = `
    <div class="page-head">
      <div>
        <span class="kicker">AI Studio</span>
        <h1 class="greeting">Create your <em>AI.</em></h1>
        <p class="page-sub">Three short steps. You can refine the personality later through conversation.</p>
      </div>
      <a class="btn btn-ghost btn-sm" href="#/app">Cancel</a>
    </div>
    <div class="builder-grid">
      <form class="wizard-card" id="builder-form" novalidate>
        <div class="wizard-steps">
          <div class="wstep active" data-step-dot="1"><b>1</b><span>Identity</span></div>
          <div class="wstep" data-step-dot="2"><b>2</b><span>Personality</span></div>
          <div class="wstep" data-step-dot="3"><b>3</b><span>Safeguards</span></div>
        </div>

        <section class="wizard-step" data-step="1">
          <h2>Give it a name and a purpose.</h2>
          <p class="wstep-sub">Specific agents are useful agents.</p>
          <div class="field">
            <label class="label" for="ai-name">Name</label>
            <input class="input" id="ai-name" maxlength="40" placeholder="e.g. Atlas, Vera, Nuru" autocomplete="off" />
            <div class="chips" style="margin-top:9px">
              ${['Atlas', 'Vera', 'Nuru', 'Sage'].map((n) => `<button type="button" class="chip" data-name-suggest="${n}">${n}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label class="label" for="ai-purpose">What does it do?</label>
            <textarea class="textarea" id="ai-purpose" maxlength="400" placeholder="I help a small logistics company plan routes, draft client updates, and review supplier contracts."></textarea>
            <div class="hint">Mention the work, the audience, and the outcome. Minimum 10 characters.</div>
          </div>
        </section>

        <section class="wizard-step hidden" data-step="2">
          <h2>Shape its personality.</h2>
          <p class="wstep-sub">Tone is how it sounds. Expertise is what it knows to focus on.</p>
          <div class="field">
            <label class="label">Tone</label>
            <div class="chips" id="tone-chips">
              ${tones.map((t) => `<button type="button" class="chip ${t === draft.tone ? 'active' : ''}" data-tone="${esc(t)}">${esc(t)}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label class="label">Areas of expertise <span>— optional, up to 8</span></label>
            <div class="tag-row">
              <input class="input" id="expertise-input" maxlength="40" placeholder="Add an area…" autocomplete="off" />
              <button class="btn btn-dark" type="button" id="expertise-add">Add</button>
            </div>
            <div class="chips" style="margin-top:10px" id="preset-chips">
              ${presets.map((p) => `<button type="button" class="chip" data-preset="${esc(p)}">${esc(p)}</button>`).join('')}
            </div>
            <div class="chips" style="margin-top:10px" id="expertise-chips"></div>
          </div>
        </section>

        <section class="wizard-step hidden" data-step="3">
          <h2>Set the guardrails.</h2>
          <p class="wstep-sub">The boundaries your AI should never cross. Plain language is fine.</p>
          <div class="field">
            <label class="label" for="ai-guardrails">Rules and limits <span>— optional</span></label>
            <textarea class="textarea" id="ai-guardrails" maxlength="600" placeholder="Never give medical or legal advice. Keep answers under 200 words unless asked. Do not discuss competitors."></textarea>
            <div class="hint">If left empty, a default rule keeps your agent inside its stated purpose.</div>
          </div>
          <div class="auth-price-note">
            ${icon('info', 16)}
            <span>Your AI is private to your account. It is created immediately and can be deleted at any time.</span>
          </div>
        </section>

        <div class="form-error hidden" id="builder-error"></div>

        <div class="wizard-actions">
          <button class="btn btn-ghost" type="button" id="back-btn" style="visibility:hidden">Back</button>
          <button class="btn btn-primary" type="button" id="next-btn">Continue ${icon('arrow', 16)}</button>
        </div>
      </form>

      <aside class="preview-card">
        <div class="preview-label">Live preview</div>
        <div id="preview-avatar">${avatarFor('Your AI')}</div>
        <h3 id="preview-name">Your AI</h3>
        <p class="preview-purpose" id="preview-purpose">Give your agent a name and a purpose to see it take shape.</p>
        <div class="preview-tags" id="preview-tags">
          <span>Professional</span>
        </div>
        <div class="preview-foot">${icon('shield', 14)} Private to your studio</div>
      </aside>
    </div>`;

  mount(shell(content, 'build'));

  const form = document.getElementById('builder-form');
  const nameInput = document.getElementById('ai-name');
  const purposeInput = document.getElementById('ai-purpose');
  const guardrailsInput = document.getElementById('ai-guardrails');
  const expertiseInput = document.getElementById('expertise-input');
  const errorBox = document.getElementById('builder-error');
  const nextBtn = document.getElementById('next-btn');
  const backBtn = document.getElementById('back-btn');
  const previewName = document.getElementById('preview-name');
  const previewPurpose = document.getElementById('preview-purpose');
  const previewTags = document.getElementById('preview-tags');
  const previewAvatar = document.getElementById('preview-avatar');
  const expertiseChips = document.getElementById('expertise-chips');
  const presetChips = document.getElementById('preset-chips');

  function showError(message) {
    if (!message) {
      errorBox.classList.add('hidden');
      errorBox.innerHTML = '';
      return;
    }
    errorBox.classList.remove('hidden');
    errorBox.innerHTML = `${icon('warning', 15)}<span>${esc(message)}</span>`;
  }

  function updatePreview() {
    const name = nameInput.value.trim() || 'Your AI';
    const purpose = purposeInput.value.trim();
    previewName.textContent = name;
    previewPurpose.textContent = purpose || 'Give your agent a name and a purpose to see it take shape.';
    previewAvatar.innerHTML = avatarFor(name);
    const tags = [draft.tone, ...draft.expertise];
    previewTags.innerHTML = tags.map((tag) => `<span>${esc(tag)}</span>`).join('');
  }

  function renderExpertise() {
    expertiseChips.innerHTML = draft.expertise
      .map(
        (tag) =>
          `<span class="chip removable active">${esc(tag)}<button type="button" data-remove-tag="${esc(tag)}" aria-label="Remove ${esc(tag)}">×</button></span>`
      )
      .join('');
    presetChips.querySelectorAll('[data-preset]').forEach((chip) => {
      chip.classList.toggle('active', draft.expertise.includes(chip.dataset.preset));
    });
    updatePreview();
  }

  function addExpertise(raw) {
    const value = String(raw || '').trim().slice(0, 40);
    if (!value) return;
    if (draft.expertise.length >= 8) {
      showError('You can add up to 8 areas of expertise.');
      return;
    }
    if (!draft.expertise.some((item) => item.toLowerCase() === value.toLowerCase())) {
      draft.expertise.push(value);
    }
    showError('');
    renderExpertise();
  }

  function showStep(next) {
    step = next;
    form.querySelectorAll('[data-step]').forEach((section) => {
      section.classList.toggle('hidden', Number(section.dataset.step) !== step);
    });
    form.querySelectorAll('[data-step-dot]').forEach((dot) => {
      const value = Number(dot.dataset.stepDot);
      dot.classList.toggle('active', value === step);
      dot.classList.toggle('done', value < step);
    });
    backBtn.style.visibility = step === 1 ? 'hidden' : 'visible';
    nextBtn.innerHTML =
      step === 3 ? `Create AI ${icon('spark', 16)}` : `Continue ${icon('arrow', 16)}`;
    showError('');
  }

  function validateStepOne() {
    if (nameInput.value.trim().length < 2) {
      showError('Give your AI a name with at least 2 characters.');
      nameInput.focus();
      return false;
    }
    if (purposeInput.value.trim().length < 10) {
      showError('Describe what your AI does in at least 10 characters.');
      purposeInput.focus();
      return false;
    }
    return true;
  }

  nameInput.addEventListener('input', updatePreview);
  purposeInput.addEventListener('input', updatePreview);

  document.querySelectorAll('[data-name-suggest]').forEach((chip) => {
    chip.addEventListener('click', () => {
      nameInput.value = chip.dataset.nameSuggest;
      updatePreview();
      nameInput.focus();
    });
  });

  document.getElementById('tone-chips').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-tone]');
    if (!chip) return;
    draft.tone = chip.dataset.tone;
    document.querySelectorAll('[data-tone]').forEach((item) => item.classList.toggle('active', item === chip));
    updatePreview();
  });

  presetChips.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-preset]');
    if (!chip) return;
    const value = chip.dataset.preset;
    if (draft.expertise.includes(value)) {
      draft.expertise = draft.expertise.filter((item) => item !== value);
    } else {
      addExpertise(value);
      return;
    }
    renderExpertise();
  });

  expertiseChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-tag]');
    if (!button) return;
    draft.expertise = draft.expertise.filter((item) => item !== button.dataset.removeTag);
    renderExpertise();
  });

  document.getElementById('expertise-add').addEventListener('click', () => {
    addExpertise(expertiseInput.value);
    expertiseInput.value = '';
    expertiseInput.focus();
  });

  expertiseInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addExpertise(expertiseInput.value.replace(/,/g, ''));
      expertiseInput.value = '';
    }
  });
  expertiseInput.addEventListener('blur', () => {
    if (expertiseInput.value.trim()) {
      addExpertise(expertiseInput.value);
      expertiseInput.value = '';
    }
  });

  backBtn.addEventListener('click', () => {
    if (step > 1) showStep(step - 1);
  });

  nextBtn.addEventListener('click', async () => {
    if (step === 1) {
      if (!validateStepOne()) return;
      showStep(2);
      return;
    }
    if (step === 2) {
      showStep(3);
      return;
    }

    draft.name = nameInput.value.trim();
    draft.purpose = purposeInput.value.trim();
    draft.guardrails = guardrailsInput.value.trim();
    setBusy(nextBtn, true, 'Creating your AI…');
    try {
      const result = await api('/api/agents', {
        method: 'POST',
        body: {
          name: draft.name,
          purpose: draft.purpose,
          tone: draft.tone,
          expertise: draft.expertise,
          guardrails: draft.guardrails,
        },
      });
      toast(`${draft.name} is ready. Say hello.`, 'success');
      location.hash = `#/app/ai/${result.agent.id}`;
    } catch (error) {
      showError(error.message);
      setBusy(nextBtn, false);
      if (error.status === 402) {
        toast('Membership required to create more AIs.', 'error');
      }
    }
  });

  form.addEventListener('submit', (event) => event.preventDefault());
  renderExpertise();
  updatePreview();
}

// ── chat ──────────────────────────────────────────────────────────
async function renderChat(agentId) {
  document.title = 'AI — NEXA';
  mount(shell(`<div class="page-loading"><div class="center-load"><span class="spinner light"></span> Opening your AI…</div></div>`, 'overview'));

  const data = await api(`/api/agents/${agentId}`);
  const agent = data.agent;
  const usage = data.usage;
  const isFree = !usage.unlimited;
  const limitReached = isFree && usage.remainingSeconds <= 0;
  const pct = isFree ? Math.min(100, Math.round((usage.usedSeconds / usage.limitSeconds) * 100)) : 0;

  const suggestions = [
    'Help me plan my week.',
    'Draft a professional email.',
    'Explain this in simple terms.',
    'What should I do first?',
  ];

  const content = `
    <div class="chat-wrap">
      <div class="chat-head">
        <a class="icon-btn" href="#/app" aria-label="Back to studio">${icon('arrowLeft', 19)}</a>
        ${avatarFor(agent.name)}
        <div class="chat-head-info">
          <h1>${esc(agent.name)}</h1>
          <p>${esc(agent.purpose)}</p>
        </div>
        <div class="chat-head-actions">
          ${
            state.config.aiLive
              ? `<span class="badge member">Live${state.config.aiProvider ? ` · ${esc(aiProviderLabel(state.config.aiProvider))}` : ''}</span>`
              : `<span class="badge soft">Demo replies</span>`
          }
          <button class="icon-btn" id="delete-agent" aria-label="Delete this AI" title="Delete this AI">${icon('trash', 17)}</button>
        </div>
      </div>

      <div class="messages" id="messages">
        ${
          data.messages.length
            ? data.messages.map((message) => messageHtml(message.role, message.content, message.createdAt, agent.name)).join('')
            : `<div class="chat-empty" id="chat-empty">
                ${avatarFor(agent.name)}
                <h2>Ask ${esc(agent.name)} anything.</h2>
                <p>${esc(agent.purpose)}</p>
                <div class="prompt-chips">
                  ${suggestions.map((prompt) => `<button class="prompt-chip" data-prompt="${esc(prompt)}">${esc(prompt)}</button>`).join('')}
                </div>
              </div>`
        }
      </div>

      <div class="composer">
        ${
          isFree
            ? `<div class="usage-strip">
                <span>Free trial</span>
                <div class="meter"><div class="meter-fill ${pct >= 100 ? 'full' : pct >= 80 ? 'warn' : ''}" id="chat-meter" style="width:${pct}%"></div></div>
                <b id="chat-usage-label">${fmtDuration(usage.usedSeconds)} of ${fmtDuration(usage.limitSeconds)} used</b>
              </div>`
            : ''
        }
        ${
          limitReached
            ? `<div class="banner">
                <span><b>You have used your 5 free hours.</b> ${esc(agent.name)} is safe — membership unlocks the conversation.</span>
                <a class="btn btn-sm btn-primary" href="#/app/billing">Become a member</a>
              </div>`
            : `<form id="chat-form" class="composer-box">
                <textarea id="chat-input" rows="1" placeholder="Message ${esc(agent.name)}…" autocomplete="off"></textarea>
                <button class="send-btn" type="submit" id="send-btn" aria-label="Send message">${icon('send', 18)}</button>
              </form>
              <div class="composer-hint">Enter to send · Shift + Enter for a new line</div>`
        }
      </div>
    </div>`;

  mount(shell(content, 'overview', { raw: true }));

  const messagesEl = document.getElementById('messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const form = document.getElementById('chat-form');
  let sending = false;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  scrollToBottom();

  messagesEl.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-prompt]');
    if (!chip || !input) return;
    input.value = chip.dataset.prompt;
    input.focus();
    autoResize();
  });

  function autoResize() {
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  }

  if (input) {
    input.addEventListener('input', autoResize);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
  }

  function updateUsage(nextUsage) {
    const meter = document.getElementById('chat-meter');
    const label = document.getElementById('chat-usage-label');
    if (!meter || !label) return;
    const nextPct = Math.min(100, Math.round((nextUsage.usedSeconds / nextUsage.limitSeconds) * 100));
    meter.style.width = `${nextPct}%`;
    meter.classList.toggle('warn', nextPct >= 80 && nextPct < 100);
    meter.classList.toggle('full', nextPct >= 100);
    label.textContent = `${fmtDuration(nextUsage.usedSeconds)} of ${fmtDuration(nextUsage.limitSeconds)} used`;
    state.me.user.usage = nextUsage;
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || sending) return;

      const empty = document.getElementById('chat-empty');
      if (empty) empty.remove();

      sending = true;
      sendBtn.disabled = true;
      input.value = '';
      input.style.height = 'auto';

      messagesEl.insertAdjacentHTML(
        'beforeend',
        messageHtml('user', message, new Date().toISOString(), agent.name)
      );
      messagesEl.insertAdjacentHTML(
        'beforeend',
        `<div class="msg ai" id="typing">
           <div class="msg-avatar">${esc(initials(agent.name))}</div>
           <div class="msg-body"><div class="typing"><span></span><span></span><span></span></div></div>
         </div>`
      );
      scrollToBottom();

      try {
        const result = await api(`/api/agents/${agent.id}/chat`, {
          method: 'POST',
          body: { message },
        });
        document.getElementById('typing')?.remove();
        messagesEl.insertAdjacentHTML(
          'beforeend',
          messageHtml('assistant', result.reply, new Date().toISOString(), agent.name)
        );
        updateUsage(result.usage);
        scrollToBottom();
      } catch (error) {
        document.getElementById('typing')?.remove();
        if (error.status === 402) {
          if (error.data?.usage) updateUsage(error.data.usage);
          showLimitModal();
        } else {
          messagesEl.insertAdjacentHTML(
            'beforeend',
            `<div class="msg-error">${esc(error.message)}</div>`
          );
          scrollToBottom();
          input.value = message;
        }
      } finally {
        sending = false;
        sendBtn.disabled = false;
        input.focus();
      }
    });
  }

  document.getElementById('delete-agent').addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: `Delete ${agent.name}?`,
      body: 'This removes the AI and its conversation history permanently. This cannot be undone.',
      confirmLabel: 'Delete AI',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api(`/api/agents/${agent.id}`, { method: 'DELETE' });
      toast(`${agent.name} was deleted.`, 'success');
      location.hash = '#/app';
    } catch (error) {
      toast(error.message, 'error');
    }
  });
}

function messageHtml(role, content, iso, agentName) {
  const isUser = role === 'user';
  const user = state.me.user;
  const who = isUser ? user.name : agentName;
  return `<div class="msg ${isUser ? 'user' : 'ai'}">
    <div class="msg-avatar">${esc(initials(who))}</div>
    <div>
      <div class="msg-body">${isUser ? esc(content).replace(/\n/g, '<br>') : renderMarkdown(content)}</div>
      <div class="msg-time">${isUser ? 'You' : esc(agentName)} · ${timeLabel(iso)}</div>
    </div>
  </div>`;
}

function showLimitModal() {
  const pricing = state.me.pricing;
  const price = fmtMoney(pricing.amount, pricing.currency);
  openModal(
    `<div class="modal-head">
      <div>
        <h2>Your free hours are used up.</h2>
        <p>Your AI is safe. Membership unlocks unlimited conversation.</p>
      </div>
      <button class="modal-close" data-close-modal aria-label="Close">${icon('close', 16)}</button>
    </div>
    <ul class="price-list" style="margin-bottom:22px">
      <li>${icon('check', 15)} Unlimited AI time</li>
      <li>${icon('check', 15)} Up to ${state.config.memberAgentLimit} AI agents</li>
      <li>${icon('check', 15)} One payment — no subscription</li>
    </ul>
    <div class="checkout-summary"><span>Membership</span><b>${price}</b></div>
    <a class="btn btn-primary btn-block btn-lg" href="#/app/billing" data-close-modal>Become a member ${icon('arrow', 16)}</a>`
  );
}

// ── billing ───────────────────────────────────────────────────────
async function renderBilling() {
  document.title = 'Membership — NEXA';
  mount(shell(`<div class="page-loading"><div class="center-load"><span class="spinner light"></span> Loading membership…</div></div>`, 'billing'));

  const [me, paymentsRes] = await Promise.all([api('/api/me'), api('/api/payments')]);
  state.me = me;
  const user = me.user;
  const isMember = user.plan !== 'free';
  const price = me.pricing;
  const priceLabel = fmtMoney(price.amount, price.currency);
  const payments = paymentsRes.payments;
  const paidPayment = payments.find((p) => p.status === 'paid');
  const pendingPayment = payments.find((p) => p.status === 'pending');

  const currentCard = isMember
    ? `<div class="plan-card active">
        <span class="badge member">Active membership</span>
        <h3>NEXA Member</h3>
        <p>You have full access to the studio: unlimited AI time and up to ${state.config.memberAgentLimit} personal agents.</p>
        <div class="plan-price"><b>Active</b><span>one-time membership</span></div>
        <ul>
          <li>${icon('check', 15)} Unlimited AI time</li>
          <li>${icon('check', 15)} Up to ${state.config.memberAgentLimit} agents</li>
          <li>${icon('check', 15)} Member status</li>
        </ul>
        <a class="btn btn-ghost btn-block" href="#/app">Back to studio</a>
        <div class="price-foot">${
          paidPayment
            ? `Membership payment · ${fmtMoney(paidPayment.amount, paidPayment.currency)} · ${fmtDate(paidPayment.paidAt)}`
            : 'Membership active'
        }</div>
      </div>`
    : `<div class="plan-card">
        <span class="badge free">Free trial</span>
        <h3>Free</h3>
        <p>5 hours of AI time and one personal AI agent. Enough to know whether this belongs in your life.</p>
        <div class="plan-price"><b>$0</b><span>forever</span></div>
        <ul>
          <li>${icon('check', 15)} ${fmtDuration(user.usage.usedSeconds)} of ${fmtDuration(user.usage.limitSeconds)} used</li>
          <li>${icon('check', 15)} 1 AI agent</li>
          <li>${icon('check', 15)} Studio access</li>
        </ul>
        <a class="btn btn-ghost btn-block" href="#/app">Back to studio</a>
      </div>`;

  const actionCard = isMember
    ? `<div class="plan-card">
        <span class="badge soft">Member details</span>
        <h3>Your membership</h3>
        <p>One payment, kept in the organization's records.</p>
        <div class="stat-mini" style="margin-top:22px">
          <div class="stat-mini-row"><span>Country</span><b>${esc(countryName(user.country))}</b></div>
          <div class="stat-mini-row"><span>Member since</span><b>${fmtDate(paidPayment?.paidAt || user.createdAt)}</b></div>
          <div class="stat-mini-row"><span>Membership fee</span><b>${paidPayment ? fmtMoney(paidPayment.amount, paidPayment.currency) : '—'}</b></div>
          <div class="stat-mini-row"><span>Reference</span><b>${paidPayment ? esc(paidPayment.reference) : '—'}</b></div>
        </div>
        <div class="price-foot">Your member status does not expire</div>
      </div>`
    : `<div class="plan-card active">
        <span class="badge member">Member</span>
        <h3>Join the organization</h3>
        <p>One payment. Unlimited AI time, up to ${state.config.memberAgentLimit} personal AIs, and member status.</p>
        <div class="plan-price"><b>${priceLabel}</b><span>one time</span></div>
        <ul>
          <li>${icon('check', 15)} Unlimited AI time</li>
          <li>${icon('check', 15)} Up to ${state.config.memberAgentLimit} AI agents</li>
          <li>${icon('check', 15)} Member status</li>
          <li>${icon('check', 15)} One payment, no renewal</li>
        </ul>
        ${
          pendingPayment
            ? `<button class="btn btn-primary btn-block" id="checkout-btn">Continue payment ${icon('arrow', 16)}</button>
               <div class="price-foot">Payment ${esc(pendingPayment.reference)} is awaiting verification</div>`
            : `<button class="btn btn-primary btn-block" id="checkout-btn">Become a member ${icon('arrow', 16)}</button>
               <div class="price-foot">Pay by ${esc(state.config.paymentAccount?.provider || 'EBIRR')} · verified by an admin</div>`
        }
      </div>`;

  const rows = payments.length
    ? payments
        .map(
          (p) => `<tr>
            <td class="mono"><b>${esc(p.reference)}</b></td>
            <td>${fmtMoney(p.amount, p.currency)}</td>
            <td>${methodLabel(p.method)}</td>
            <td>${fmtDate(p.createdAt)}</td>
            <td><span class="status-pill ${p.status}">${esc(p.status)}</span></td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="5" style="text-align:center;padding:34px;color:var(--dim)">No payments yet.</td></tr>`;

  const content = `
    <div class="page-head">
      <div>
        <span class="kicker">Membership</span>
        <h1 class="greeting">Your <em>membership.</em></h1>
        <p class="page-sub">${isMember ? 'Your membership is active. Nothing renews, nothing expires.' : 'One payment unlocks the full studio.'}</p>
      </div>
    </div>
    <div class="billing-grid">
      ${currentCard}
      ${actionCard}
    </div>
    <div class="section-title-row">
      <h2>Payments</h2>
      <span class="badge">${payments.length} record${payments.length === 1 ? '' : 's'}</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Reference</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${demoHint(me)}
  `;

  mount(shell(content, 'billing'));

  document.getElementById('checkout-btn')?.addEventListener('click', () => openCheckout(price));
}

function demoHint(me) {
  return me.paymentsDemo
    ? `<div class="demo-note">${icon('info', 15)}<span>Demonstration mode is on: the simulated payment button activates membership instantly. In production, members pay by EBIRR and an admin verifies each transfer.</span></div>`
    : '';
}

function openCheckout(price) {
  const priceLabel = fmtMoney(price.amount, price.currency);
  const account = state.config.paymentAccount || {};
  const provider = account.provider || 'EBIRR';
  const number = account.number || '';
  const holder = account.name || '';

  openModal(
    `<div class="modal-head">
      <div>
        <h2>Become a member</h2>
        <p>One-time payment · ${priceLabel}</p>
      </div>
      <button class="modal-close" data-close-modal aria-label="Close">${icon('close', 16)}</button>
    </div>
    <div class="pay-account">
      <div>
        <span>${esc(provider)} account</span>
        <b>${esc(number || 'Being configured')}</b>
        ${holder ? `<small>${esc(holder)}</small>` : ''}
      </div>
      ${
        number
          ? `<button class="icon-btn" id="copy-account" title="Copy account number" aria-label="Copy account number">${icon('copy', 17)}</button>`
          : ''
      }
    </div>
    <ol class="pay-steps">
      <li>Send <strong>${priceLabel}</strong> to the ${esc(provider)} account above.</li>
      <li>Use the payment reference we give you next as the reason.</li>
      <li>Submit for verification — membership activates after review.</li>
    </ol>
    <div class="checkout-summary"><span>Total due today</span><b>${priceLabel}</b></div>
    <button class="btn btn-primary btn-block btn-lg" id="checkout-continue">Continue to payment ${icon('arrow', 16)}</button>
    <div class="terms">Membership is one-time and does not renew. A payment officer verifies each membership before activation.</div>`,
    {
      onMount(modal, close) {
        modal.querySelector('#copy-account')?.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(number);
            toast('Account number copied.', 'success');
          } catch {
            toast('Copy the account number manually.', 'info');
          }
        });

        modal.querySelector('#checkout-continue').addEventListener('click', async (event) => {
          const button = event.currentTarget;
          setBusy(button, true, 'Creating payment…');
          try {
            const result = await api('/api/payments/checkout', {
              method: 'POST',
              body: { method: 'ebirr' },
            });
            showPaymentInstructions(modal, close, result.payment, price, 'ebirr');
          } catch (error) {
            toast(error.message, 'error');
            setBusy(button, false);
          }
        });
      },
    }
  );
}

function showPaymentInstructions(modal, close, payment, price, method) {
  const priceLabel = fmtMoney(price.amount, price.currency);
  const demo = state.me.paymentsDemo;
  const account = state.config.paymentAccount || {};
  const provider = account.provider || 'EBIRR';
  const number = account.number || '';
  const holder = account.name || '';
  const instructions =
    method === 'ebirr' || method === 'telebirr'
      ? `Send <strong>${priceLabel}</strong> to <strong>${esc(provider)} ${esc(number)}</strong> and use <strong>${esc(
          payment.reference
        )}</strong> as the reason for payment. Keep the confirmation message until your membership is active.`
      : `Pay <strong>${priceLabel}</strong> using <strong>${esc(
          payment.reference
        )}</strong> as your reference, then keep the receipt until your membership is active.`;

  modal.innerHTML = `
    <div class="modal-head">
      <div>
        <h2>Finish your payment</h2>
        <p>${methodLabel(method)} · ${priceLabel}</p>
      </div>
      <button class="modal-close" data-close-modal aria-label="Close">${icon('close', 16)}</button>
    </div>
    <div class="pay-ref">
      <div>
        <span>Payment reference</span>
        <b>${esc(payment.reference)}</b>
      </div>
      <button class="icon-btn" id="copy-ref" title="Copy reference" aria-label="Copy reference">${icon('copy', 17)}</button>
    </div>
    <div class="pay-account">
      <div>
        <span>${esc(provider)} account</span>
        <b>${esc(number || 'Being configured')}</b>
        ${holder ? `<small>${esc(holder)}</small>` : ''}
      </div>
      ${
        number
          ? `<button class="icon-btn" id="copy-account" title="Copy account number" aria-label="Copy account number">${icon('copy', 17)}</button>`
          : ''
      }
    </div>
    <div class="pay-instructions">${instructions}</div>
    ${
      demo
        ? `<button class="btn btn-primary btn-block btn-lg" id="demo-pay">Simulate successful payment ${icon('arrow', 16)}</button>
           <div class="demo-note">${icon('info', 15)}<span>Demonstration build: this button marks the payment as paid and activates membership instantly. No money is charged.</span></div>`
        : `<button class="btn btn-primary btn-block btn-lg" data-close-modal>I have paid — submit for verification</button>
           <div class="demo-note">${icon('clock', 15)}<span>Your payment stays pending until a payment officer verifies the transfer, usually within one working day.</span></div>`
    }`;

  modal.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', close));

  modal.querySelector('#copy-ref').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(payment.reference);
      toast('Reference copied.', 'success');
    } catch {
      toast('Copy the reference manually.', 'info');
    }
  });

  modal.querySelector('#copy-account')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(number);
      toast('Account number copied.', 'success');
    } catch {
      toast('Copy the account number manually.', 'info');
    }
  });

  modal.querySelector('#demo-pay')?.addEventListener('click', async (event) => {
    setBusy(event.currentTarget, true, 'Activating membership…');
    try {
      const result = await api(`/api/payments/${payment.id}/demo-pay`, { method: 'POST' });
      state.me = result;
      showCheckoutSuccess(modal, close);
    } catch (error) {
      toast(error.message, 'error');
      setBusy(event.currentTarget, false);
    }
  });
}

function showCheckoutSuccess(modal, close) {
  modal.innerHTML = `
    <div class="checkout-success">
      <div class="success-mark">${icon('check', 26)}</div>
      <h2>Welcome to the organization.</h2>
      <p>Your membership is active. Unlimited AI time and up to ${state.config.memberAgentLimit} personal agents are now unlocked.</p>
      <a class="btn btn-primary btn-block btn-lg" href="#/app/build" id="start-building">Start building ${icon('arrow', 16)}</a>
      <div class="terms" style="margin-top:14px">${
        state.me.paymentsDemo ? 'Activated in demonstration mode.' : 'Membership verified.'
      }</div>
    </div>`;
  modal.querySelector('#start-building').addEventListener('click', () => {
    close();
    location.hash = '#/app/build';
  });
}

// ── admin ─────────────────────────────────────────────────────────
async function renderAdmin() {
  document.title = 'Administration — NEXA';
  if (state.me?.user.role !== 'admin') {
    toast('Administrator access only.', 'error');
    location.hash = '#/app';
    return;
  }

  mount(shell(`<div class="page-loading"><div class="center-load"><span class="spinner light"></span> Loading administration…</div></div>`, 'admin'));

  const [stats, paymentsRes] = await Promise.all([api('/api/admin/stats'), api('/api/admin/payments')]);
  const payments = paymentsRes.payments;
  const pending = payments.filter((p) => p.status === 'pending');

  const pendingRows = pending.length
    ? pending
        .map(
          (p) => `<tr>
            <td>
              <b>${esc(p.userName)}</b><br />
              <span style="font-size:11.5px">${esc(p.userEmail)}</span>
            </td>
            <td>${esc(countryName(p.userCountry))}</td>
            <td>${fmtMoney(p.amount, p.currency)}</td>
            <td class="mono">${esc(p.reference)}</td>
            <td>${methodLabel(p.method)}</td>
            <td>${fmtDate(p.createdAt)}</td>
            <td>
              <div class="admin-actions">
                <button class="btn btn-sm btn-danger" data-reject="${p.id}">Reject</button>
                <button class="btn btn-sm btn-primary" data-approve="${p.id}">Approve</button>
              </div>
            </td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--dim)">No payments are awaiting verification.</td></tr>`;

  const allRows = payments.length
    ? payments
        .map(
          (p) => `<tr>
            <td><b>${esc(p.userName)}</b></td>
            <td>${fmtMoney(p.amount, p.currency)}</td>
            <td>${methodLabel(p.method)}</td>
            <td class="mono">${esc(p.reference)}</td>
            <td>${fmtDate(p.createdAt)}</td>
            <td><span class="status-pill ${p.status}">${esc(p.status)}</span></td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--dim)">No payments recorded yet.</td></tr>`;

  const content = `
    <div class="page-head">
      <div>
        <span class="kicker">Administration</span>
        <h1 class="greeting">The <em>organization.</em></h1>
        <p class="page-sub">Verify membership payments and keep an eye on the studio.</p>
      </div>
    </div>
    <div class="admin-stats">
      <div class="admin-stat"><span>Accounts</span><b>${stats.accounts}</b></div>
      <div class="admin-stat"><span>Members</span><b>${stats.members}</b></div>
      <div class="admin-stat"><span>AIs created</span><b>${stats.agents}</b></div>
      <div class="admin-stat"><span>Pending</span><b>${stats.pending}</b></div>
    </div>
    <div class="section-title-row" style="margin-top:0">
      <h2>Awaiting verification</h2>
      <span class="badge ${pending.length ? 'soft' : ''}">${pending.length} pending</span>
    </div>
    <div class="admin-note">${icon('warning', 15)} Verify the transfer or card payment before approving. Approving activates membership immediately.</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Member</th><th>Country</th><th>Amount</th><th>Reference</th><th>Method</th><th>Created</th><th>Decision</th></tr>
        </thead>
        <tbody>${pendingRows}</tbody>
      </table>
    </div>
    <div class="section-title-row">
      <h2>All payments</h2>
      <span class="badge">${payments.length} total</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Member</th><th>Amount</th><th>Method</th><th>Reference</th><th>Date</th><th>Status</th></tr>
        </thead>
        <tbody>${allRows}</tbody>
      </table>
    </div>
  `;

  mount(shell(content, 'admin'));

  async function decide(id, action) {
    try {
      await api(`/api/admin/payments/${id}/decision`, {
        method: 'POST',
        body: { action },
      });
      toast(action === 'approve' ? 'Membership approved.' : 'Payment rejected.', 'success');
      await renderAdmin();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  document.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', () => decide(btn.dataset.approve, 'approve'));
  });
  document.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', () => decide(btn.dataset.reject, 'reject'));
  });
}

// ── global events + boot ──────────────────────────────────────────
document.addEventListener('click', async (event) => {
  const actionEl = event.target.closest('[data-action]');
  if (actionEl) {
    const action = actionEl.dataset.action;
    if (action === 'open-sidebar') {
      document.body.classList.add('sidebar-open');
    } else if (action === 'close-sidebar') {
      document.body.classList.remove('sidebar-open');
    } else if (action === 'logout') {
      try {
        await api('/api/auth/logout', { method: 'POST' });
      } catch {
        /* ignore */
      }
      state.me = null;
      closeModal();
      toast('You have signed out.', 'info');
      location.hash = '#/';
    }
    return;
  }

  const scrollEl = event.target.closest('[data-scroll]');
  if (scrollEl) {
    event.preventDefault();
    const targetId = scrollEl.dataset.scroll;
    const scrollNow = () => {
      const target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (location.hash === '#/' || location.hash === '') {
      scrollNow();
    } else {
      location.hash = '#/';
      setTimeout(scrollNow, 120);
    }
  }
});

// Close the mobile drawer after navigation.
window.addEventListener('hashchange', () => {
  document.body.classList.remove('sidebar-open');
});

window.addEventListener('scroll', () => {
  const nav = document.querySelector('.nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

async function boot() {
  try {
    const [config, me] = await Promise.all([
      api('/api/config'),
      api('/api/me').catch(() => null),
    ]);
    state.config = config;
    state.me = me;
  } catch (error) {
    mount(`<div class="page-loading"><div style="text-align:center;padding:20px">
      <span class="badge">Offline</span>
      <h1 class="serif" style="font-size:34px;margin:16px 0 8px">NEXA is unavailable.</h1>
      <p style="color:var(--muted);font-size:14px;margin-bottom:20px">${esc(error.message)}</p>
      <button class="btn btn-primary" id="boot-retry">Try again</button>
    </div></div>`);
    document.getElementById('boot-retry')?.addEventListener('click', () => location.reload());
    return;
  }
  window.addEventListener('hashchange', route);
  if (!location.hash) location.hash = '#/';
  route();
}

boot();
