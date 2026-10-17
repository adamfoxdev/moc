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

The person who submits gets a secret edit token, kept in `sessionStorage`, so they can add detail or reload the page. Knowing a reference number alone is not enough to read or change a request.

## Protections in place

- Server-side validation of every field; unknown fields dropped; 64 KB body limit.
- Parameterised SQL only.
- Rate limit on submissions (5 per 15 minutes per IP, in memory) and a honeypot field.
- Admin endpoints require a token compared in constant time, and are off by default.
- Security headers (`nosniff`, frame denial, same-origin referrer).
- The form asks people not to send passwords, keys or customer data.

## Known limits (deliberate, for a first version)

- **No email is sent.** Nothing notifies us or the customer; we see requests in `/admin`. Next step: send a notification and a confirmation (Microsoft Graph or ACS Email).
- **Single admin token**, not named users. Next step: Entra ID sign-in for staff.
- **Rate limiting is per process.** Use a shared store or gateway limit if you run more than one instance.
- **Local SQLite file.** Fine for one instance; for production use Azure SQL by replacing `server/db.js`, and encrypt and back up the data. It holds personal data, so see `DPA.md` and your privacy notice.
- **No privacy notice or terms page yet.** Add one and link it from the consent checkbox before launch (the legal text needs counsel).
- **Node's `node:sqlite` is still marked experimental.** It is wrapped in `server/db.js`, so swapping to `better-sqlite3` or Azure SQL touches one file.
- Placeholder name "Northbound", no real branding.
