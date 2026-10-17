# Runbooks

One page each, for the sites run from `platform/` (one Fly app per brand). Commands are for **PowerShell in `C:\moc\moc\platform`** and use the app names in `deploy/brands.json`. Replace `<app>` with the brand's Fly app (for example `moc-landing-gear`) and `<brand>` with its id.

> **Status.** Written from how the system is built, not from a real incident. The Fly commands are standard but I have not run every one against your account. Rehearse sections 1, 4 and 7 once while nothing is wrong, and fix this file where reality differs.
> The privacy and breach steps are an operational checklist, **not legal advice**: have counsel review sections 5 and 6.

**Quick reference**

| I want to… | Run |
|---|---|
| See whether every site is up | `npm run check-sites` |
| See machines and volumes | `npm run fly -- status` |
| Read recent logs | `fly logs --app <app> --no-tail` |
| Deploy | `npm run fly -- deploy <brand>` |
| Roll back | section 7 |
| Rehearse a backup restore | `npm run fly -- restore-test <brand>` |

---

## 1. Site is down

*Symptom: the uptime check failed (GitHub emails you), a customer reported it, or `npm run check-sites` shows `DOWN`.*

1. **Which sites?** `npm run check-sites`. One brand down is an app problem. All of them down at once is more likely your network, DNS, or Fly itself ([status.flyio.net](https://status.flyio.net)).
2. **Is it your computer?** Try from a phone on mobile data. A router that cached a failed lookup once made a healthy site look dead (`Could not resolve host`). Test with `nslookup <name> 1.1.1.1`.
3. **Machine state.** `fly status --app <app>`. You want one machine, `started`, `1 total, 1 passing`.
   - `stopped`: `fly machine start <machine id> --app <app>`.
   - Two machines: `fly scale count 1 --app <app>`. A second machine sends every email twice and cannot share the database.
4. **Why it stopped.** `fly logs --app <app> --no-tail`, and read from the last "Starting machine":
   - `Refusing to start in production:` followed by bullets: a secret or setting is missing or unsafe. Set it with `fly secrets set --app <app> "NAME=value"`.
   - `Staff sign-in is misconfigured` or `MAIL_TRANSPORT=… needs`: same, the message names what is missing.
   - Litestream errors about credentials, bucket or region: the backup settings are wrong. The app **deliberately refuses to start** rather than run without being able to read its backup. See section 4.
   - `ERR_MODULE_NOT_FOUND` or a crash after a deploy: roll back (section 7).
5. **Wrong brand showing?** `check-sites` says `serving brand "x" but should be "y"`. The app has the wrong `BRAND`: `npm run fly -- deploy <brand>` rewrites it from the manifest.
6. **Still stuck.** `fly deploy` the last good version (section 7) and write down what you saw.

---

## 2. Emails are not arriving

*Symptom: customers do not get the confirmation, or you do not get new-request alerts.*

1. Open the request in `/admin`. **Emails** shows each message as `sent`, `pending` or `failed`, with the error.
2. **`pending` with an error.** The queue retries after 1, 5, 30, 120 and 360 minutes. Look at the error:
   - `connection`/timeout: the email provider or the network. Wait; check the provider's status page.
   - `429`: rate limited. It retries by itself.
3. **`failed`.** The provider rejected it permanently. Typical causes:
   - **"You can only send testing emails to your own email address"** (Resend 403): the brand is still using `onboarding@resend.dev`. Verify the brand's sending domain at Resend and set `MAIL_FROM` to it.
   - Domain not verified, or a bad API key (401). Fix at the provider, then press **Retry** in `/admin`.
4. **Sent but not received.** Check spam. Then check the sending domain's **SPF, DKIM and DMARC** at the provider. Missing records are the usual cause.
5. **No alerts to the team.** `fly secrets list --app <app>` must show `NOTIFY_TO`. Check the shared mailbox is not filtering them.
6. **Nothing is queued at all.** Check `fly logs` for `Email: sending via resend`. If it says `log only`, `MAIL_TRANSPORT` is wrong (production refuses that, so this only happens outside production).

---

## 3. Rotate a secret

*When: a secret may have leaked, a staff member left, or on a schedule (suggested: yearly, and always on suspicion).*

Setting a secret restarts the app. Do one brand at a time.

| Secret | How | Effect |
|---|---|---|
| `MAIL_API_KEY` | Create a new key at Resend, `fly secrets set --app <app> "MAIL_API_KEY=…"`, then delete the old key at Resend | Emails keep working |
| `OIDC_CLIENT_SECRET` | In Google Cloud: Auth Platform > Clients > your client > add a new secret, set it on every app that uses the client, then remove the old one | Staff stay signed in |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, then `fly secrets set` | Only sign-ins in progress at that moment fail |
| Staff list | Edit `ADMIN_EMAILS` (section 8) | See section 8 |
| Backup keys (`AWS_*`) | `fly storage` rotates these with the bucket: do not do this by hand without checking the Fly and Tigris docs first. If keys leak, create a new bucket, point the app at it, and delete the old one | Backup history starts again |

After any rotation, run `npm run check-sites`.

---

## 4. Restore the database

The database lives on one Fly volume and is copied to a Tigris bucket every second by Litestream (7 days of history, daily snapshots). **A backup you have never restored is a hope, not a backup.**

### 4a. Rehearse (do this now, then quarterly)
```powershell
npm run fly -- restore-test <brand>
```
It restores the latest backup into a scratch file on the running machine, counts the requests in it, and deletes the scratch file. It does **not** touch the live database. If it fails, read the message: a credentials or bucket error means the backup is not working. Fix that before anything else.
*Unconfirmed: this assumes a `fly ssh console` session can see the backup settings. If it reports missing credentials but the app logs show Litestream replicating, tell me and I will change the rehearsal.*

### 4b. The volume or machine is lost
1. `fly status --app <app>` and `fly volumes list --app <app>`.
2. Create a fresh volume in the same region: `fly volumes create northbound_data --app <app> --region <region> --size 1`.
3. `npm run fly -- deploy <brand>`. On first start with an empty volume the app restores from the bucket by itself. In `fly logs` you should see `restoring snapshot` and `applied wal`.
4. `npm run check-sites`, then open `/admin` and confirm recent requests are there.
5. Remove any stray unattached volume with `fly volumes destroy <id> --app <app>` (check the ID first).

### 4c. Go back to an earlier moment (bad deploy, corruption)
1. Stop the app so nothing writes: `fly scale count 0 --app <app>`.
2. Open a one-off machine or console that can run Litestream against the bucket and restore with a timestamp, for example `litestream restore -config /etc/litestream.yml -timestamp 2026-10-17T09:00:00Z -o /data/platform.db /data/platform.db` (move the old file aside first). Check the Litestream documentation for the exact options in the version we ship (0.3.13).
3. `fly scale count 1 --app <app>`, then verify.

### 4d. After ANY restore to an earlier point
- **A restore brings back data that was deleted later.** Re-apply every deletion request made after the restore point. The `audit` table records deletions, but it was restored too, so also check your sent mail and any notes. Customers who had asked for deletion must not reappear.
- The retention job runs daily and will delete requests past their retention period again.
- Deleted data also remains in backups for 7 days. The privacy notice says so.

---

## 5. A person asks to see or delete their data

*Requests may come by email to the brand's privacy address, or the person can do it themselves on the page they see after sending a request (download or delete, while that browser tab is open).*

1. **Check who is asking.** Do not send or delete anything for an unverified person. Reply to the email address on the request, or ask for the reference number (`NB-…`) and the address they used.
2. **Find the request.** `/admin`, search the list by name or reference. Check **every brand's inbox** if they may have used more than one site: each brand is a separate system.
3. **Access request:** `/admin` > the request > **Export (JSON)**. This includes your internal notes, so decide with counsel what to send (the self-service export leaves notes out). Send it securely, not as a plain attachment to an unverified address.
4. **Deletion request:** **Delete request**. It removes the request and its email records and is logged by reference.
5. **Tell them what it does not cover.** Emails already sent stay in mailboxes (including your shared `NOTIFY_TO` mailbox: delete the alert emails there too), and backups keep deleted data for up to 7 days.
6. **Reply within the time in the privacy notice** (the draft says one month). Keep a note of the date, the checks you made and what you did, without storing the personal data again.
7. If the person is a client with a contract (status `Working together`), involve counsel before deleting.

---

## 6. Suspected data breach

*Examples: a staff Google account is compromised, a secret is leaked, someone reports seeing another person's data, a backup bucket is exposed, an email with personal data went to the wrong place.*

**Not legal advice.** Contracts (the DPA) promise notice to clients within **72 hours** of confirming a breach, and privacy law may require notice to a regulator. Counsel decides who must be told.

1. **Contain (first hour).**
   - Compromised staff account: remove the address from `ADMIN_EMAILS` (`fly secrets set --app <app> "ADMIN_EMAILS=…"` on every brand) and reset it at Google. Staff sessions end when they next make a request after the restart.
   - Leaked secret: rotate it (section 3) immediately.
   - Exposed backup bucket: rotate the keys, then check the bucket is private.
   - Stop sending: if emails are going wrong, `fly scale count 0 --app <app>` until fixed.
2. **Preserve evidence.** `fly logs --app <app> --no-tail > logs-<date>.txt`, the `/admin` Activity log (who signed in, viewed, exported, deleted), Resend's delivery log, and Google's security log for the account. Do not delete anything yet.
3. **Assess.** What data (requests, names, emails, free text), whose, how many people, which brands, since when, still ongoing? The Activity log shows staff views and exports; each brand has its own.
4. **Record the time you became aware**, and who decided what. The 72-hour clock runs from confirmation.
5. **Notify.** Counsel decides; then the data controller (Mock LLC) notifies the regulator where required, and affected people where required. Where Mock LLC acts as a processor for a client, notify the client under the DPA.
6. **Fix and learn.** Close the gap, write down what happened, change this runbook.

---

## 7. Deploy and roll back

**Deploy** (after pulling the latest code):
```powershell
git pull origin claude/hopeful-bell-9pfex0     # or main, once merged
npm install
npm test
npm run fly -- deploy <brand>                  # one brand; do this first and check it
npm run fly -- deploy all                      # then the rest, in order; stops at the first failure
npm run check-sites
```
A deploy causes a few seconds of downtime per app (one machine).

**Roll back one brand:**
```powershell
fly releases --app <app>                       # find the last good image, e.g. registry.fly.io/<app>:deployment-…
fly deploy --app <app> --image <that image> --ha=false
fly scale count 1 --app <app>
```
Database changes are additive (new columns are added, nothing is removed), so an older version still runs against the newer database.

**Automatic deploys:** `.github/workflows/platform.yml` deploys every live brand when changes reach `main`, using one deploy token per app (`fly tokens create deploy --app <app>`, stored as the repository secret `FLY_API_TOKEN_<BRAND>`, for example `FLY_API_TOKEN_LANDING_GEAR`). A brand without its secret is skipped. *Not yet run: watch the first run.*

---

## 8. Staff join or leave

**Join:** add their Google address to `ADMIN_EMAILS` on every brand they need (comma-separated), in `.fly-secrets/_shared.env`, then `npm run fly -- setup <brand>` for each (it re-stages the secrets), then deploy or restart. While the Google OAuth app is in **Testing**, also add them as a test user.

**Leave:** remove them from `ADMIN_EMAILS` the same way, the same day, and remove them as a Google test user. Review the Activity log for anything unusual in their last weeks. If they had the Google client secret or Fly access, rotate (section 3) and remove them from the Fly organisation.

**Quarterly:** compare `ADMIN_EMAILS` with who actually works here, and the Fly organisation members with the same list. Everyone with Fly access can read the database.

---

## 9. Add a new brand (a sixth site)

1. Copy a file in `platform/brands/` to `<new-id>.json` and edit it. `npm run dev` shows a live design switcher so you can see it.
2. Add the brand to `platform/deploy/brands.json` (app name, address).
3. `npm run fly -- init-secrets <new-id>`, fill the files, `npm run fly -- setup <new-id>`.
4. Add `<address>/auth/callback` to the Google OAuth client; verify the brand's email sending domain at Resend.
5. `npm run fly -- deploy <new-id>`, then `npm run check-sites`.
6. Fill in the brand's legal details (or rely on `brands/_company.json`) so its privacy notice loses the draft banner.
7. If it should deploy automatically, add the `FLY_API_TOKEN_<BRAND>` repository secret.

---

## 10. Routine

| When | Do |
|---|---|
| Every deploy | `npm run check-sites` afterwards |
| Monthly | Look at the Fly and Tigris bills; skim `fly logs` for `ERROR`; update dependencies (`npm audit`, then test and deploy) |
| Quarterly | Restore rehearsal for every brand (4a); review `ADMIN_EMAILS` and Fly members (8); re-read the privacy notice against what the system does |
| Yearly | Rotate secrets (3); confirm the Google OAuth app status; review retention periods with counsel |
