import { createApp } from './app.js';
import { createStore } from './db.js';
import { createMailer, mailConfigFromEnv } from './mail.js';
import { createNotifier } from './notifier.js';
import { createRetention } from './retention.js';

const store = createStore();
const mailConfig = mailConfigFromEnv(); // throws with a clear message if SMTP is half-configured
const notifier = createNotifier({ store, mailer: createMailer(mailConfig), config: mailConfig });
const app = createApp({ store, notifier });
const port = Number(process.env.PORT) || 3001;

const server = app.listen(port, () => {
  console.log(`Northbound onboarding API on http://localhost:${port}`);
  if (!process.env.ADMIN_TOKEN) console.log('ADMIN_TOKEN is not set: the /admin view is disabled.');
  console.log(`Email: ${mailConfig.transport === 'smtp' ? `SMTP via ${mailConfig.smtp.host}` : 'log only (nothing is sent; set MAIL_TRANSPORT=smtp)'}`);
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
