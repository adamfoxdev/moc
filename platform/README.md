# Northbound onboarding platform

A customer-facing site where prospective clients tell us what they are working on and get an immediate, honest first read of how we could help. Requests are stored in a local SQLite database for now.

## Design intent

- **Easy to get in the door.** Only four things are required: what they are working on, name, email, and OK to reply. Everything else is optional and can be added afterwards on the result page.
- **Show value straight away.** The moment they submit, they see a first read: one to three routes that fit, why, and where we would start.
- **No money talk.** No pricing, no budget questions. It says plainly that there is nothing to pay to find out whether we can help, and that we will say so if they do not need us.
- **A person always follows up.** The first read is rule-based (`server/recommend.js`), not a model, so it is fast, free and explainable. It never replaces a human reply.

## Run it

Requires Node 22.13 or later (uses the built-in `node:sqlite`).

```bash
cd platform
npm install
ADMIN_TOKEN=choose-a-long-secret npm run dev   # site on http://localhost:5173, API on :3001
```

Production-style:

```bash
npm run build
ADMIN_TOKEN=choose-a-long-secret npm start     # everything on http://localhost:3001
```

- Customer site: `/`
- Our inbox: `/admin`. Staff sign in with their own work accounts (see Staff sign-in below). For local development only, a shared `ADMIN_TOKEN` works when sign-in is not configured.
- Tests: `npm test`

| Variable | Default | Purpose |
|---|---|---|
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | none | Your identity provider (staff sign-in) |
| `ADMIN_EMAILS` | none | Comma-separated staff addresses allowed to sign in |
| `SESSION_SECRET` | none | 32+ random characters; signs the short-lived login state |
| `ALLOW_ADMIN_TOKEN` | `false` | Keep the shared token working alongside sign-in (break-glass; remove when proven) |
| `ADMIN_TOKEN` | none | Shared secret for `/admin` when staff sign-in is **not** configured (development and early pilots) |
| `NOTIFY_TO` | none | Comma-separated team addresses for new-request alerts |
| `MAIL_TRANSPORT` | `log` | `log` (print only, not allowed in production), `smtp`, `resend` or `postmark` |
| `MAIL_FROM`, `MAIL_REPLY_TO` | placeholder, `MAIL_FROM` | Sender, and where customer replies go |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | port 587 | SMTP server (port 465 uses implicit TLS) |
| `MAIL_API_KEY` | none | Resend or Postmark API key (`MAIL_TRANSPORT=resend` or `postmark`) |
| `BUCKET_NAME`, `AWS_*` | none | Backup bucket; set by `fly storage create`. Without `BUCKET_NAME` the container warns that nothing is backed up |
| `PUBLIC_URL` | none | Base URL for the inbox link in team alerts and the privacy link in confirmations |
| `RETENTION_DAYS` | `365` | Delete requests inactive this long (`0` = never) |
| `PORT` | `3001` | API and production server port |
| `DB_PATH` | `data/platform.db` | SQLite file (git-ignored) |
| `TRUST_PROXY` | unset | Set (for example `1`) behind a proxy so rate limiting sees real client IPs |

## How it works

| Piece | File |
|---|---|
| Public form (minimal) | `web/src/Intake.jsx` |
| First read, "sharpen this" form | `web/src/Result.jsx` |
| Our inbox | `web/src/Admin.jsx` |
| Routes: create, add details, admin | `server/app.js` |
| Validation (server is the authority) | `server/validate.js` |
| Rules that pick the routes | `server/recommend.js` |
| Storage (the only file that touches SQL) | `server/db.js` |
| Email queue, retries, worker | `server/notifier.js` |
| Retention job | `server/retention.js` |
| Notice version and extraction | `server/notice.js`, `scripts/sync-privacy.mjs` |
| Public privacy page | `web/src/Privacy.jsx` |
| Email wording | `server/emails.js` |
| SMTP / log transport and settings | `server/mail.js` |

The person who submits gets a secret edit token, kept in `sessionStorage`, so they can add detail or reload the page. Knowing a reference number alone is not enough to read or change a request.

## Email notifications

Each new request sends two emails:

1. **Alert to the team** (`NOTIFY_TO`). Reply-To is the customer, so replying answers them directly.
2. **Confirmation to the customer.** Their reference, the routes from the first read, what happens next, and a note that replying to the email adds to their request (Reply-To is `MAIL_REPLY_TO`). No pricing.

If a customer adds detail afterwards, the team gets one "updated" alert (repeat edits are merged into a single email).

How it is built:

- **Queue first.** Emails are written to an `outbox` table in the same database and sent by a background worker. A mail outage can't slow down or fail a customer's submission, and nothing is lost if the server restarts.
- **Retries.** A failed send is retried after 1, 5, 30, 120 and 360 minutes, then marked failed. Permanent SMTP rejections (5xx) fail immediately. Failed emails show in `/admin` with a Retry button.
- **Privacy.** The queue keeps only the recipient and the kind of email. The body is rendered from the request at send time, so it is never copied around.
- **Abuse limits.** The confirmation is only ever sent to the address on the form, and at most twice per address per day, so the form can't be used to mail-bomb someone. Names and text are escaped in HTML and kept out of headers.
- **Sender.** `From` is always `MAIL_FROM`. We never put the customer's address in From.

Setup: copy `.env.example` to `.env`, then `node --env-file=.env server/index.js`. By default `MAIL_TRANSPORT=log` prints emails to the console and sends nothing (development only: production refuses to start with it). For real sending set `MAIL_TRANSPORT` to `resend` or `postmark` (HTTPS APIs, which work on Fly.io where outbound SMTP is restricted) with `MAIL_API_KEY` and `MAIL_FROM`, or to `smtp` with `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`. Half-configured settings stop the server at startup with a clear message. Use a sending domain with SPF, DKIM and DMARC set up, or confirmations will land in spam.

## Staff sign-in

`/admin` uses **OpenID Connect** (authorization code flow with PKCE), so it works with Microsoft Entra ID, Google, Okta and similar. Staff get named accounts, MFA and offboarding from the identity provider, and everything they do is attributed to them.

- **Allowlist.** Only the addresses in `ADMIN_EMAILS` can get in, even if the identity provider would sign others in. The email comes from the `email` claim, or `preferred_username` (Entra often omits `email`). Tokens with `email_verified: false` are refused.
- **Tokens are checked properly:** signature against the provider's published keys, issuer, audience, expiry, and a per-login nonce; the authorization code is bound to the login by PKCE, and the login state is a signed, 10-minute, HttpOnly cookie.
- **Sessions** are server-side. Only a hash of the session id is stored. The cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` with the `__Host-` prefix when `PUBLIC_URL` is https. They end after 2 hours idle or 12 hours total, and on sign-out.
- **CSRF.** Anything that changes data must carry a per-session token in `X-CSRF-Token` (the admin page does this).
- **Accountability.** The audit log records who signed in, viewed a request, edited it, exported, deleted, retried an email, and signed out (by staff email), plus refused sign-ins (by email domain only). The admin page shows the last 100 entries under "Activity log".
- **The shared token is switched off** once sign-in is configured (unless `ALLOW_ADMIN_TOKEN=true`). Production start-up prints a warning if sign-in is missing or the token fallback is left on.
- **Rate limited:** sign-in attempts per address; wrong shared tokens lock out.

**Setting it up with Google** (free; the quickest way to start). Google changes its console layout from time to time, so labels may differ slightly.

1. Go to the [Google Cloud console](https://console.cloud.google.com/) and sign in with the Google account that should own this (a shared company account is better than a personal one). Create a **project** from the project picker at the top (for example "Northbound onboarding"). No billing is needed.
2. Open the **Google Auth Platform** ([console.cloud.google.com/auth/overview](https://console.cloud.google.com/auth/overview)) and choose *Get started*. Older layout: *APIs & Services > OAuth consent screen*. Fill in the app name, a support email and a contact email, and choose **External** as the audience.
3. Under **Audience**, leave the app in **Testing** and add each staff member's Google address under *Test users* (up to 100). In Testing, each person's consent expires after about 7 days, so staff re-confirm roughly weekly. To avoid that, publish the app (Audience > *Publish app*); because we only ask for `openid`, `email` and `profile`, no Google review should be needed (Google's production-readiness page says basic identity scopes are open to any account; confirm this when you publish).
4. Under **Clients**, choose *Create client*, type **Web application**. Add **Authorized redirect URIs** (they must match exactly):
   - `http://localhost:5173/auth/callback` to try it on your computer
   - `https://<your site>/auth/callback` for the live site (first the `*.fly.dev` address, later your own domain)

   Leave *Authorized JavaScript origins* empty. Create it, then **copy the Client ID and Client secret straight away**.
5. Under **Data access**, the default scopes (`openid`, `email`, `profile`) are all that is needed. Do not add any others.
6. Put these in `.env` (see `.env.example`) or `fly secrets set`:
   ```
   OIDC_ISSUER=https://accounts.google.com
   OIDC_CLIENT_ID=<client id>.apps.googleusercontent.com
   OIDC_CLIENT_SECRET=<client secret>
   ADMIN_EMAILS=you@gmail.com,colleague@gmail.com
   SESSION_SECRET=<openssl rand -hex 32>
   PUBLIC_URL=http://localhost:5173        # or https://<your site>
   ```
7. Run `npm run check:auth`. It reaches Google, confirms the settings match, and prints the exact redirect URI to register. Then `npm run dev`, open `http://localhost:5173/admin`, and click *Sign in*.

If Google shows `redirect_uri_mismatch`, the address registered in step 4 differs from the one `check:auth` printed (a different port, `http` vs `https`, or a trailing slash). If it shows "Access blocked: app has not completed verification" or similar, add that person under *Test users* (Testing mode) or publish the app.

Google accounts cannot have 2-step verification enforced from our side or by you centrally (without a paid Workspace or a Cloud Identity domain). **Ask each person to turn on 2-Step Verification** on their Google account. The allowlist still blocks everyone else.

**Setting it up with Microsoft Entra ID** (steps not yet verified against a live tenant):

1. Entra admin centre > App registrations > New registration. Single tenant. Redirect URI (type Web): `https://<PUBLIC_URL host>/auth/callback`.
2. Certificates and secrets > new client secret (note the value) and the Application (client) ID.
3. Optional but recommended: token configuration > add the `email` optional claim; Enterprise application > Properties > **Assignment required = Yes**, then assign only the staff group. Apply a Conditional Access policy requiring MFA.
4. Settings: `OIDC_ISSUER=https://login.microsoftonline.com/<tenant-id>/v2.0`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `ADMIN_EMAILS`, `SESSION_SECRET` (`openssl rand -hex 32`). Use the **single-tenant** issuer; do not use the `common` or `organizations` endpoints.

For Google use `OIDC_ISSUER=https://accounts.google.com`.

**Trying it locally without a real provider:** `server/testing/fake-idp.js` is a stand-in OpenID provider used by the tests. It is not for production.

## Privacy: retention, export, deletion, notice

- **Automatic deletion.** A daily job deletes requests with no activity for `RETENTION_DAYS` (default 365; `0` turns it off), together with their email records. Requests with status **Working together** (clients) and requests marked **Keep** in `/admin` are exempt. Activity means the customer adding detail or staff saving a change.
- **People can manage their own data.** The page shown after sending a request has **Download my data** (a JSON file) and **Delete my request** (two steps). Both use the secret code held in that browser session, so they only work while the tab is open; otherwise people email us. The self-service export leaves out staff status and notes (counsel to decide, see `../PRIVACY_NOTICE.md` Part C item 2).
- **Staff tools** in `/admin`: full export (includes notes, email records and the audit trail), delete, and keep. `GET /api/admin/audit` lists the audit log.
- **Audit log.** Deletions (by customer, staff or the retention job) and exports are recorded by reference and action only, never names, emails or content.
- **Privacy notice.** `/privacy` renders the public part of `../PRIVACY_NOTICE.md`. After editing that file run `npm run sync:privacy` (`npm run build` does it too); a test fails if the page copy drifts. While the text still contains `{{placeholders}}` the page shows a draft banner. The notice is linked from the consent checkbox, every page footer, the confirmation email and the marketing site footer.
- **Consent evidence.** Each request stores when consent was given and a fingerprint of the notice version shown.
- **Not covered by deletion:** emails already sent stay in mailboxes (set a retention rule on the team mailbox), and database backups until they expire. The delete screens say so.

## Protections in place

- Server-side validation of every field; unknown fields dropped; 64 KB body limit.
- Parameterised SQL only.
- Rate limit on submissions (5 per 15 minutes per IP, in memory) and a honeypot field.
- Email sending is queued, retried, capped per address and escaped (see above).
- Staff sign-in with named accounts (see above); admin is off unless sign-in or a token is configured.
- Security headers (`nosniff`, frame denial, same-origin referrer).
- The form asks people not to send passwords, keys or customer data.

## Deploying (Fly.io)

See `../FLY_DEPLOYMENT_PLAN.md` for the full plan and first-deploy commands. In short: one Fly machine with a volume at `/data` holding the SQLite file, continuously backed up to Tigris by Litestream, deployed from this folder with `fly deploy --ha=false`.

| File | Purpose |
|---|---|
| `Dockerfile` | Build the React app, then a slim Node runtime running as a non-root user |
| `docker-entrypoint.sh` | Fix volume ownership, restore from backup if the volume is empty, run the app under Litestream |
| `litestream.yml` | Backup replica settings (Tigris, 7-day window) |
| `fly.toml` | Fly app configuration |
| `../site/` | Fly deployment of the marketing page |
| `../.github/workflows/platform.yml` | Tests on every change, deploy from `main` |

Things to know: run **one** machine only (the volume and the email worker are single-instance); in production the app **refuses to start** with unsafe settings (see `server/config.js`); `GET /api/ready` checks the database and is the health check; the deployment package must include `web/src/privacy-notice.md` (the Dockerfile does).

## Known limits (deliberate, for a first version)

- **One staff role.** Everyone on the allowlist can view, edit, export and delete. Add roles if you need read-only staff.
- **Rate limiting is per process.** Use a shared store or gateway limit if you run more than one instance.
- **One machine only.** SQLite on one volume cannot be shared, and the email worker would double-send. Before scaling out, add an outbox lease and move to a database several machines can use (LiteFS or Postgres by replacing `server/db.js`). It holds personal data, so see `DPA.md` and your privacy notice.
- **The privacy notice is still a draft for counsel** (`../PRIVACY_NOTICE.md`). It is linked everywhere, but shows a draft banner until the placeholders are filled in. Open items in its Part C: edit-token expiry, console logging of emails in `log` mode, mailbox and backup retention, admin sign-in and hosting logs.
- **Node's `node:sqlite` is still marked experimental.** It is wrapped in `server/db.js`, so swapping to `better-sqlite3` or another database touches one file.
- Placeholder name "Northbound", no real branding.
