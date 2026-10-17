import { createApp } from './app.js';
import { createStore } from './db.js';

const store = createStore();
const app = createApp({ store });
const port = Number(process.env.PORT) || 3001;

const server = app.listen(port, () => {
  console.log(`Northbound onboarding API on http://localhost:${port}`);
  if (!process.env.ADMIN_TOKEN) console.log('ADMIN_TOKEN is not set: the /admin view is disabled.');
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => { store.close(); process.exit(0); }));
}
