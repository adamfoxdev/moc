import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from './app.js';
import { createStore } from './db.js';
import { mailConfigFromEnv, createMailer } from './mail.js';
import { productionProblems } from './config.js';

const goodProd = { NODE_ENV: 'production', MAIL_TRANSPORT: 'resend', MAIL_API_KEY: 'k', MAIL_FROM: 'a@b.c', PUBLIC_URL: 'https://x.test', NOTIFY_TO: 'team@x.test', ADMIN_TOKEN: 'x'.repeat(32) };

test('production checks: a safe config passes; unsafe ones are named; non-production is untouched', () => {
  assert.deepEqual(productionProblems(goodProd), []);
  assert.deepEqual(productionProblems({}), []);
  const bad = productionProblems({ NODE_ENV: 'production', ADMIN_TOKEN: 'short' });
  assert.equal(bad.length, 4);
  assert.match(bad.join('\n'), /"log"/);
  assert.match(bad.join('\n'), /PUBLIC_URL/);
  assert.match(bad.join('\n'), /ADMIN_TOKEN/);
  assert.match(bad.join('\n'), /NOTIFY_TO/);
  assert.ok(productionProblems({ ...goodProd, PUBLIC_URL: 'http://x.test' }).some((p) => /PUBLIC_URL/.test(p)));
});

test('mail config: API transports need a key and a sender', () => {
  assert.throws(() => mailConfigFromEnv({ MAIL_TRANSPORT: 'resend' }), /MAIL_API_KEY, MAIL_FROM/);
  assert.throws(() => mailConfigFromEnv({ MAIL_TRANSPORT: 'postmark', MAIL_FROM: 'a@b.c' }), /MAIL_API_KEY/);
  assert.equal(mailConfigFromEnv({ MAIL_TRANSPORT: 'resend', MAIL_API_KEY: 'k', MAIL_FROM: 'a@b.c' }).api.url, 'https://api.resend.com/emails');
});

// A stand-in for the email provider's HTTPS API.
async function fakeApi(respond) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      seen.push({ url: req.url, headers: req.headers, body: JSON.parse(data) });
      const [status, payload] = respond(seen.length);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  server.unref();
  return { seen, url: `http://127.0.0.1:${server.address().port}/send`, close: () => server.close() };
}
const msg = { to: 'team@x.test, ops@x.test', replyTo: 'sam@example.com', subject: 'Hi', text: 'text', html: '<p>html</p>' };

test('resend transport: sends the right request', async () => {
  const api = await fakeApi(() => [200, { id: '1' }]);
  const mailer = createMailer(mailConfigFromEnv({ MAIL_TRANSPORT: 'resend', MAIL_API_KEY: 'secret-key', MAIL_FROM: 'Northbound <hello@x.test>', MAIL_API_URL: api.url }));
  await mailer.send(msg);
  const [r] = api.seen;
  assert.equal(r.headers.authorization, 'Bearer secret-key');
  assert.deepEqual(r.body.to, ['team@x.test', 'ops@x.test']);
  assert.equal(r.body.from, 'Northbound <hello@x.test>');
  assert.equal(r.body.reply_to, 'sam@example.com');
  assert.equal(r.body.subject, 'Hi');
  api.close();
});

test('postmark transport: sends the right request', async () => {
  const api = await fakeApi(() => [200, { ErrorCode: 0 }]);
  const mailer = createMailer(mailConfigFromEnv({ MAIL_TRANSPORT: 'postmark', MAIL_API_KEY: 'tok', MAIL_FROM: 'hello@x.test', MAIL_API_URL: api.url }));
  await mailer.send(msg);
  const [r] = api.seen;
  assert.equal(r.headers['x-postmark-server-token'], 'tok');
  assert.equal(r.body.To, 'team@x.test,ops@x.test');
  assert.equal(r.body.ReplyTo, 'sam@example.com');
  assert.equal(r.body.TextBody, 'text');
  api.close();
});

test('API transport errors: bad requests are permanent, rate limits and server errors are retried', async () => {
  const codes = [422, 429, 503, 401];
  const api = await fakeApi((n) => [codes[n - 1], { message: 'nope' }]);
  const mailer = createMailer(mailConfigFromEnv({ MAIL_TRANSPORT: 'resend', MAIL_API_KEY: 'k', MAIL_FROM: 'a@b.c', MAIL_API_URL: api.url }));
  const outcome = async () => mailer.send(msg).then(() => 'sent', (e) => e.responseCode ?? 'retry');
  assert.equal(await outcome(), 550); // 422: rejected, never retry
  assert.equal(await outcome(), 'retry'); // 429
  assert.equal(await outcome(), 'retry'); // 503
  assert.equal(await outcome(), 550); // 401: bad key
  api.close();
});

async function start(opts = {}) {
  const store = createStore(':memory:');
  const app = createApp({ store, serveStatic: false, adminToken: 'secret', ...opts });
  const server = await new Promise((r) => { const s = app.listen(0, () => { s.unref(); r(s); }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, store, close: () => { server.close(); store.close(); } };
}

test('readiness: ok while the database works, 503 when it does not', async () => {
  const t = await start();
  assert.equal((await fetch(t.base + '/api/ready')).status, 200);
  t.store.ping = () => { throw new Error('db gone'); };
  assert.equal((await fetch(t.base + '/api/ready')).status, 503);
  assert.equal((await fetch(t.base + '/api/health')).status, 200); // liveness does not depend on the database
  t.close();
});

test('headers: CSP and friends always; HSTS only when asked', async () => {
  const off = await start({ hsts: false });
  const res = await fetch(off.base + '/api/health');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(res.headers.get('strict-transport-security'), null);
  off.close();
  const on = await start({ hsts: true });
  assert.match((await fetch(on.base + '/api/health')).headers.get('strict-transport-security'), /max-age=31536000/);
  on.close();
});

test('admin: repeated wrong tokens get locked out, even for the right token afterwards', async () => {
  const t = await start({ maxAdminFailures: 3 });
  const hit = (token) => fetch(t.base + '/api/admin/requests', { headers: { 'x-admin-token': token } }).then((r) => r.status);
  assert.deepEqual([await hit('a'), await hit('b'), await hit('c')], [401, 401, 401]);
  assert.equal(await hit('secret'), 429);
  assert.equal(await hit('d'), 429);
  t.close();
});

test('database: file databases use WAL (needed for continuous backup)', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { DatabaseSync } = await import('node:sqlite');
  const dir = mkdtempSync(join(tmpdir(), 'nb-wal-'));
  try {
    const store = createStore(join(dir, 'x.db'));
    const check = new DatabaseSync(join(dir, 'x.db'));
    assert.equal(check.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
    check.close();
    store.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
