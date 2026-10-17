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
- Our inbox: `/admin` (enter the admin token). Without `ADMIN_TOKEN` the admin API is disabled.
- Tests: `npm test`

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_TOKEN` | none (admin off) | Secret for the `/admin` view |
| `NOTIFY_TO` | none | Comma-separated team addresses for new-request alerts |
| `MAIL_TRANSPORT` | `log` | `log` (print only) or `smtp` |
| `MAIL_FROM`, `MAIL_REPLY_TO` | placeholder, `MAIL_FROM` | Sender, and where customer replies go |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | port 587 | SMTP server (port 465 uses implicit TLS) |
| `PUBLIC_URL` | none | Base URL used for the inbox link in team alerts |
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

Setup: copy `.env.example` to `.env`, then `node --env-file=.env server/index.js`. By default `MAIL_TRANSPORT=log` prints emails to the console and sends nothing. For real sending, set `MAIL_TRANSPORT=smtp` with `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` (Microsoft 365 or Azure Communication Services Email both work over SMTP). Half-configured SMTP stops the server at startup with a clear message. Use a sending domain with SPF, DKIM and DMARC set up, or confirmations will land in spam.

## Protections in place

- Server-side validation of every field; unknown fields dropped; 64 KB body limit.
- Parameterised SQL only.
- Rate limit on submissions (5 per 15 minutes per IP, in memory) and a honeypot field.
- Email sending is queued, retried, capped per address and escaped (see above).
- Admin endpoints require a token compared in constant time, and are off by default.
- Security headers (`nosniff`, frame denial, same-origin referrer).
- The form asks people not to send passwords, keys or customer data.

## Known limits (deliberate, for a first version)

- **Single admin token**, not named users. Next step: Entra ID sign-in for staff.
- **Rate limiting is per process.** Use a shared store or gateway limit if you run more than one instance.
- **Local SQLite file.** Fine for one instance; for production use Azure SQL by replacing `server/db.js`, and encrypt and back up the data. It holds personal data, so see `DPA.md` and your privacy notice.
- **No privacy notice or terms page yet.** Add one and link it from the consent checkbox before launch (the legal text needs counsel).
- **Node's `node:sqlite` is still marked experimental.** It is wrapped in `server/db.js`, so swapping to `better-sqlite3` or Azure SQL touches one file.
- Placeholder name "Northbound", no real branding.
