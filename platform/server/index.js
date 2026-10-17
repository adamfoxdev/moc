import { createApp } from './app.js';
import { createStore } from './db.js';
import { createMailer, mailConfigFromEnv } from './mail.js';
import { createNotifier } from './notifier.js';
import { createRetention } from './retention.js';
import { productionProblems, productionWarnings } from './config.js';
import { authConfigFromEnv } from './auth.js';
import { loadBrand } from './brand.js';

const problems = productionProblems();
if (problems.length) {
  console.error('Refusing to start in production:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

let authConfig;
try { authConfig = authConfigFromEnv(); } catch (e) {
  console.error(`Staff sign-in is misconfigured: ${e.message}`);
  process.exit(1);
}
for (const w of productionWarnings()) console.warn(`WARNING: ${w}`);

let brand;
try { brand = loadBrand(process.env.BRAND || 'northbound'); } catch (e) {
  console.error(e.message);
  process.exit(1);
}

if (process.env.BRAND_PREVIEW === 'true') console.log('Design preview is ON: a switcher on the page lets you flip between brands and layouts, and brand files are re-read on every request.');

const store = createStore();
const mailConfig = mailConfigFromEnv(); // throws with a clear message if SMTP is half-configured
const notifier = createNotifier({ store, mailer: createMailer(mailConfig), config: { ...mailConfig, brand } });
const app = createApp({ store, notifier, authConfig, brand });
const port = Number(process.env.PORT) || 3001;

const server = app.listen(port, () => {
  console.log(`${brand.name} (brand: ${brand.id}) onboarding API on http://localhost:${port}`);
  if (authConfig) console.log(`Admin: staff sign-in via ${authConfig.issuer} (${authConfig.allowedEmails.size} allowed address${authConfig.allowedEmails.size === 1 ? '' : 'es'})`);
  else if (process.env.ADMIN_TOKEN) console.log('Admin: shared ADMIN_TOKEN (set OIDC_* and ADMIN_EMAILS for staff sign-in)');
  else console.log('Admin is DISABLED: no staff sign-in or ADMIN_TOKEN settings were found. Put them in platform/.env (next to package.json) and restart; the npm scripts load that file automatically.');
  console.log(mailConfig.transport === 'log' ? 'Email: log only (nothing is sent; set MAIL_TRANSPORT=resend, postmark or smtp)' : `Email: sending via ${mailConfig.transport}${mailConfig.transport === 'smtp' ? ` (${mailConfig.smtp.host})` : ''}`);
  if (!mailConfig.notifyTo.length) console.log('NOTIFY_TO is not set: the team will not be emailed about new requests.');
});
notifier.start();

// Requests with no activity for this many days are deleted (clients and held requests are kept). 0 = never.
const retentionDays = process.env.RETENTION_DAYS === undefined ? 365 : Number(process.env.RETENTION_DAYS);
if (!Number.isInteger(retentionDays) || retentionDays < 0) throw new Error('RETENTION_DAYS must be a whole number of days (0 to disable)');
const retention = createRetention({ store, days: retentionDays });
retention.start();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { notifier.stop(); retention.stop(); server.close(() => { store.close(); process.exit(0); }); });
}
