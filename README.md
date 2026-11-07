# NEXA — The AI Organization

A members-only platform where people register with their ID and email, build their own
AI agents, and use them in a private studio. Membership is a one-time payment:
**$10 USD**, or **3,000 ETB** for members in Ethiopia. Free accounts include
**5 hours** of AI time and one agent.

Built as a zero-build single-page app on Node.js + Express with SQLite (`node:sqlite`).

## Requirements

- **Node.js 22.13 or newer** (uses the built-in `node:sqlite` module)
- No database server, no build step, no external services required to run

## Quick start

```bash
npm install
cp .env.example .env    # optional; the app runs with defaults
npm start
```

Open **http://localhost:3000**.

The first account that registers automatically becomes the **admin**. Later admins can
be set with `ADMIN_EMAIL` (comma-separated).

> If port 3000 is busy, set `PORT=3010` in `.env` (or run `PORT=3010 npm start`).

## Put it online (Render)

The repo includes `render.yaml`, so Render can create the service, disk and environment
in one step.

1. Push this folder to a GitHub repository.
2. In Render, choose **New → Blueprint**, connect the repository, and apply `render.yaml`.
3. Keep the **Starter** plan. Persistent disks are not available on free instances, so
   the database would reset on every deploy without one. Region is set to Frankfurt.
4. Fill the prompted secrets:
   - `ADMIN_EMAIL` — **your** email. With this set, only that address becomes admin.
   - `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — fill whichever you
     have. With none, replies are demo replies.
   - `PAYMENT_ACCOUNT_NAME` — optional account holder name to show at checkout.
5. Deploy. Render provides a free `https://<service>.onrender.com` address automatically;
   `PUBLIC_URL` is derived from `RENDER_EXTERNAL_URL` for canonical links and social cards.
6. Open the site and create your account with the `ADMIN_EMAIL` address. Approve member
   payments from `#/app/admin`.

The database is stored on the mounted disk at `/var/data/nexa.db`. Back it up by copying
that file. `PAYMENTS_DEMO` is set to `false` in `render.yaml`, so members cannot
self-activate membership.

### Making it discoverable

The site ships with SEO basics: title/description, canonical URL, Open Graph and Twitter
cards, Organization/WebSite/Service structured data, `robots.txt`, `sitemap.xml`, and a
1200×630 social image. Submit the deployed URL to Google Search Console and Bing Webmaster
Tools after launch, and link to it from your social profiles. The marketing page is
client-rendered (hash-routed SPA); Google executes JavaScript, but other crawlers may index
only the meta tags and `<noscript>` summary. For stronger SEO later, move the landing page
to server-rendered HTML.

## How the product works

| | Free account | Member |
|---|---|---|
| AI time | 5 hours total | Unlimited |
| Agents | 1 | Up to 25 |
| Price | $0 | $10 once, or 3,000 ETB for Ethiopia |
| Renewal | — | None (one-time) |

**Registration** asks for name, email, country, national ID/passport number, and a
password. IDs are normalized and must be unique — one membership per ID. In the UI the
ID is only ever displayed masked (`•••• 1234`).

**Usage** is measured in seconds of chat. The timer starts at the first message and
accrues per conversation turn, capped at 3 minutes per turn. When a free account
reaches its limit, chat returns HTTP `402` with `code: "limit_reached"`; the account and
agents remain accessible, and upgrading restores chat.

**Checkout** creates a pending payment with a reference like `NX-XXXXXXXX`. The checkout
modal shows the payment account — by default **EBIRR `0958131880`**, configurable with
`PAYMENT_ACCOUNT_NUMBER` — and members send the amount using the reference as the reason.
A payment officer approves or rejects it in the admin queue (`#/app/admin`). With
`PAYMENTS_DEMO=true` the modal also offers a **simulate payment** button for testing;
production sets this to `false`.

## Configuration

All settings are optional environment variables (see `.env.example`).

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | `production` enables extra checks/logging behavior |
| `AI_PROVIDER` | `auto` | `auto`, `deepseek`, `openai`, or `anthropic`. Auto uses the first configured key |
| `DEEPSEEK_API_KEY` | — | Enables live DeepSeek replies |
| `DEEPSEEK_MODEL` | `deepseek-chat` | DeepSeek model |
| `OPENAI_API_KEY` | — | Enables live OpenAI replies |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model |
| `ANTHROPIC_API_KEY` | — | Enables live Claude replies. Must be a real `sk-ant-api…` Messages API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Anthropic model |
| `DEEPSEEK_BASE_URL` / `OPENAI_BASE_URL` | provider default | Optional API base override |
| `PAYMENTS_DEMO` | `true` | Adds the "simulate payment" button. **Set `false` in production** |
| `PAYMENT_PROVIDER` | `EBIRR` | Payment provider shown at checkout |
| `PAYMENT_ACCOUNT_NUMBER` | `0958131880` | Account members pay into |
| `PAYMENT_ACCOUNT_NAME` | — | Optional account holder name shown at checkout |
| `ADMIN_EMAIL` | — | Comma-separated emails to promote to admin. When set, the first signup no longer becomes admin |
| `PUBLIC_URL` | Render URL or localhost | Canonical links, social cards and sitemap |
| `DATA_DIR` | `./data` | SQLite directory (Render disk: `/var/data`) |
| `FREE_TRIAL_SECONDS` | `18000` | Free AI time (5 hours) |
| `SESSION_DAYS` | `30` | Session cookie lifetime |

## AI: demo mode vs. live

NEXA supports three providers: **DeepSeek**, **OpenAI**, and **Anthropic**.

- With `AI_PROVIDER=auto` (the default), the first configured key wins in this order:
  DeepSeek → OpenAI → Anthropic. Set `AI_PROVIDER` explicitly to force one.
- Each request sends the agent's name, purpose, tone, guardrails and recent history.
  Anthropic uses explicit prompt caching; DeepSeek and OpenAI use automatic caching.
- With no key, replies are generated locally by a deterministic demo engine, so the
  whole product works offline.
- If a provider rejects its key (401/403), the server logs a warning, tries the next
  configured provider, then falls back to demo replies so chat never breaks. A malformed
  Anthropic key is treated as unconfigured.
- Keys are used server-side only and are never sent to the browser.

## Payments — what is and isn't implemented

Implemented: pricing by country, pending payments with references, the EBIRR destination
account (default `0958131880`), a demo activation button, an admin approval/rejection
queue, and membership activation on approval.

**Not implemented:** automated payment processing. There is no Stripe, Chapa or EBIRR API
integration in this build — members transfer manually and an admin approves the reference.
If you later add a provider, call the same approval path used by `demo-pay`. Set
`PAYMENTS_DEMO=false` before exposing the app.

Paying into EBIRR from outside Ethiopia requires an EBIRR account; international members
should contact you before registering if they cannot use it.

## Data and backups

Everything lives in `data/nexa.db` (SQLite, WAL mode). To back up, stop the app and copy
`data/nexa.db` (plus `-wal`/`-shm` if present), or use SQLite's online backup while
running. To reset the installation, stop the app and delete the `data/` directory.

Passwords are hashed with scrypt; session tokens are stored as SHA-256 hashes in
HttpOnly, SameSite=Lax cookies. Payment references and masked IDs are the only account
identifiers rendered in the UI.

## Production checklist

- [ ] Deploy with `render.yaml` (or another host with a persistent disk) so accounts survive
- [ ] Set `PAYMENTS_DEMO=false` — checkout must use the EBIRR account + admin approval
- [ ] Set `ADMIN_EMAIL` to your own address before sharing the URL
- [ ] Provide `ANTHROPIC_API_KEY` for live AI
- [ ] Run behind HTTPS (Render provides it; secure cookies require it)
- [ ] Confirm `PAYMENT_ACCOUNT_NUMBER` is the account you want members to pay into
- [ ] Back up `/var/data/nexa.db` regularly
- [ ] Add email verification/password reset if you need account recovery (not included)
- [ ] Review ID handling against your local data-protection rules — the app stores the
      submitted ID; it does **not** perform external identity verification

## Project structure

```
server.js          Express app, API routes, security headers, checkout/admin logic, SEO routes
render.yaml        One-click Render blueprint (Node, Frankfurt, persistent disk)
lib/config.js      Environment config, pricing, countries, limits, payment account
lib/db.js          SQLite schema + connection (users, sessions, agents, messages, usage, payments)
lib/auth.js        scrypt password hashing, sessions, auth middleware, ID masking
lib/ai.js          Multi-provider AI layer (DeepSeek/OpenAI/Anthropic), demo replies
public/            SPA shell, styles, client app, social image, robots/sitemap
data/              SQLite database (created on first run; git-ignored)
```

## Troubleshooting

**`EADDRINUSE`** — another process owns the port. Use `PORT=3010 npm start`, or find and
stop the process.

**Chat replies are generic / demo-like** — check the startup log. `AI: demo replies`
means no working key is configured; `AI: live (provider · model)` shows which provider
and model will answer.

**Locked out after resetting** — deleting `data/` removes all accounts; the next signup
becomes admin again.

**Checkout has no "simulate payment" button** — `PAYMENTS_DEMO` is `false`; approve
payments from the admin page instead.

## Known limitations

- No automated payment processor; approval is manual or simulated.
- EBIRR is the only live payment destination; there is no card checkout.
- No email verification, password reset, or account recovery.
- One ID per account is enforced by uniqueness, not by an external identity service.
- Usage is time-based (conversation turns), not token-based.
- The marketing page is a hash-routed SPA, so SEO is basic rather than ideal.
