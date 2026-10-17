import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { createStore } from './db.js';
import { createNotifier, RETRY_MINUTES } from './notifier.js';
import { mailConfigFromEnv } from './mail.js';
import { renderEmail } from './emails.js';
import { recommend } from './recommend.js';

const body = (o = {}) => ({ goal: 'We built a booking tool with Lovable and need it live', name: 'Sam Rivera', email: 'sam@example.com', consent: true, ...o });
const config = { notifyTo: ['team@northbound.test'], publicUrl: 'https://northbound.test', from: 'Northbound <hello@northbound.test>' };

async function start({ mailer, cfg = config } = {}) {
  const sent = [];
  const m = mailer || { send: async (x) => { sent.push(x); } };
  const store = createStore(':memory:');
  const quiet = { log() {}, warn() {}, error() {} };
  const notifier = createNotifier({ store, mailer: m, config: cfg, log: quiet, autoSend: false });
  const app = createApp({ store, notifier, serveStatic: false, adminToken: 'secret', maxSubmissions: 100 });
  const server = await new Promise((r) => { const s = app.listen(0, () => { s.unref(); r(s); }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, init = {}) => fetch(base + path, {
    ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) }, body: init.body && JSON.stringify(init.body),
  });
  return { call, sent, store, notifier, close: () => { server.close(); store.close(); } };
}
const fixture = (extra = {}) => {
  const answers = { ...body(), ...extra };
  return { id: 'NB-TEST22', name: answers.name, email: answers.email, company: answers.company || '', goal: answers.goal, answers, recommendation: recommend(answers), createdAt: '2026-01-01T00:00:00.000Z' };
};

test('templates: confirmation has the reference, no prices, and escapes HTML', () => {
  const m = renderEmail('confirmation', fixture({ name: '<script>alert(1)</script> Sam' }));
  assert.match(m.subject, /NB-TEST22/);
  assert.doesNotMatch(m.html, /<script>/);
  assert.doesNotMatch(m.text + m.html, /\$\s?\d/);
  assert.match(m.text, /within one business day/);
});

test('templates: team email replies to the customer and cannot be header-injected', () => {
  const m = renderEmail('team-new', fixture({ name: 'Sam\r\nBcc: evil@example.com', company: 'Acme' }), { publicUrl: 'https://x.test/' });
  assert.equal(m.replyTo, 'sam@example.com');
  assert.doesNotMatch(m.subject, /[\r\n]/);
  assert.match(m.text, /https:\/\/x\.test\/admin/);
});

test('flow: a new request queues a team email and a confirmation, and both are sent', async () => {
  const t = await start();
  await t.call('/api/requests', { method: 'POST', body: body() });
  assert.equal(await t.notifier.tick(), 2);
  const to = t.sent.map((m) => m.to).sort();
  assert.deepEqual(to, ['sam@example.com', 'team@northbound.test']);
  assert.equal(t.sent.find((m) => m.to === 'team@northbound.test').replyTo, 'sam@example.com');
  assert.equal(await t.notifier.tick(), 0); // nothing sent twice
  t.close();
});

test('flow: validation failures and honeypot submissions send nothing', async () => {
  const t = await start();
  await t.call('/api/requests', { method: 'POST', body: { goal: 'x' } });
  await t.call('/api/requests', { method: 'POST', body: body({ website: 'http://spam.test' }) });
  assert.equal(await t.notifier.tick(), 0);
  assert.equal(t.sent.length, 0);
  t.close();
});

test('flow: without NOTIFY_TO only the confirmation goes out', async () => {
  const t = await start({ cfg: { ...config, notifyTo: [] } });
  await t.call('/api/requests', { method: 'POST', body: body() });
  await t.notifier.tick();
  assert.deepEqual(t.sent.map((m) => m.to), ['sam@example.com']);
  t.close();
});

test('flow: one address cannot be sent more than two confirmations a day', async () => {
  const t = await start();
  for (let i = 0; i < 4; i++) await t.call('/api/requests', { method: 'POST', body: body() });
  await t.notifier.tick();
  assert.equal(t.sent.filter((m) => m.to === 'sam@example.com').length, 2);
  assert.equal(t.sent.filter((m) => m.to === 'team@northbound.test').length, 4); // the team still hears about every request
  t.close();
});

test('flow: adding detail notifies the team once, and coalesces repeat edits', async () => {
  const t = await start();
  const { reference, editToken } = await (await t.call('/api/requests', { method: 'POST', body: body() })).json();
  await t.notifier.tick();
  t.sent.length = 0;
  for (const data of ['personal', 'business']) {
    await t.call(`/api/requests/${reference}/details`, { method: 'PUT', body: { data }, headers: { 'x-edit-token': editToken } });
  }
  await t.notifier.tick();
  assert.equal(t.sent.length, 1);
  assert.match(t.sent[0].subject, /^Updated request/);
  assert.match(t.sent[0].text, /Data: Confidential business information/); // rendered from the latest answers
  t.close();
});

test('retry: transient failures back off on a schedule, then succeed', async () => {
  let fail = true;
  const sent = [];
  const t = await start({ mailer: { send: async (m) => { if (fail) throw new Error('connection reset'); sent.push(m); } }, cfg: { ...config, notifyTo: [] } });
  await t.call('/api/requests', { method: 'POST', body: body() });
  const t0 = new Date();
  await t.notifier.tick(t0);
  const [row] = t.store.emailsFor(t.store.list()[0].id);
  assert.equal(row.status, 'pending');
  assert.equal(row.attempts, 1);
  assert.match(row.lastError, /connection reset/);
  assert.equal(await t.notifier.tick(new Date(t0.getTime() + 30_000)), 0); // not due yet
  fail = false;
  assert.equal(await t.notifier.tick(new Date(t0.getTime() + (RETRY_MINUTES[0] + 1) * 60_000)), 1);
  assert.equal(t.store.emailsFor(t.store.list()[0].id)[0].status, 'sent');
  t.close();
});

test('retry: permanent rejections and exhausted retries are marked failed, and admin can retry', async () => {
  const mailer = { send: async () => { throw Object.assign(new Error('550 mailbox unavailable'), { responseCode: 550 }); } };
  const t = await start({ mailer, cfg: { ...config, notifyTo: [] } });
  await t.call('/api/requests', { method: 'POST', body: body() });
  await t.notifier.tick();
  const id = t.store.list()[0].id;
  const [row] = t.store.emailsFor(id);
  assert.equal(row.status, 'failed');

  const detail = await (await t.call(`/api/admin/requests/${id}`, { headers: { 'x-admin-token': 'secret' } })).json();
  assert.equal(detail.emails[0].status, 'failed');
  assert.equal((await t.call(`/api/admin/emails/${row.id}/retry`, { method: 'POST', headers: { 'x-admin-token': 'secret' } })).status, 200);
  assert.equal(t.store.emailsFor(id)[0].status, 'pending');
  assert.equal((await t.call(`/api/admin/emails/${row.id}/retry`, { method: 'POST' })).status, 401);
  t.close();
});

test('a mail failure never breaks the customer request', async () => {
  const t = await start();
  t.notifier.requestCreated = () => { throw new Error('boom'); };
  const res = await t.call('/api/requests', { method: 'POST', body: body() });
  assert.equal(res.status, 201);
  t.close();
});

test('config: defaults to log transport; smtp requires host and from', () => {
  assert.equal(mailConfigFromEnv({}).transport, 'log');
  assert.throws(() => mailConfigFromEnv({ MAIL_TRANSPORT: 'smtp' }), /SMTP_HOST, MAIL_FROM/);
  assert.throws(() => mailConfigFromEnv({ MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'h', MAIL_FROM: 'a@b.c', SMTP_USER: 'u' }), /SMTP_USER and SMTP_PASS/);
  assert.throws(() => mailConfigFromEnv({ MAIL_TRANSPORT: 'sendgrid' }), /must be/);
  const c = mailConfigFromEnv({ MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'h', SMTP_PORT: '465', MAIL_FROM: 'a@b.c', NOTIFY_TO: 'x@y.z, p@q.r' });
  assert.equal(c.smtp.secure, true);
  assert.deepEqual(c.notifyTo, ['x@y.z', 'p@q.r']);
});
