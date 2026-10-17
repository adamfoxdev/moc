import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from './app.js';
import { createStore } from './db.js';
import { createRetention } from './retention.js';
import { extractPublicNotice, NOTICE_PATH } from './notice.js';
import { renderEmail } from './emails.js';
import { recommend } from './recommend.js';

const body = (o = {}) => ({ goal: 'We built a booking tool with Lovable and need it live', name: 'Sam Rivera', email: 'sam@example.com', company: 'Acme', consent: true, ...o });
const A = { 'x-admin-token': 'secret' };
const quiet = { log() {}, warn() {}, error() {} };

async function start(opts = {}) {
  const store = createStore(':memory:');
  const app = createApp({ store, serveStatic: false, adminToken: 'secret', maxSubmissions: 100, noticeVersion: 'v1abcdef', ...opts });
  const server = await new Promise((r) => { const s = app.listen(0, () => { s.unref(); r(s); }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, init = {}) => fetch(base + path, {
    ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) }, body: init.body && JSON.stringify(init.body),
  });
  const create = async (o) => (await call('/api/requests', { method: 'POST', body: body(o) })).json();
  return { call, create, store, close: () => { server.close(); store.close(); } };
}

test('notice: the page text is generated from PRIVACY_NOTICE.md and has not drifted', () => {
  const source = extractPublicNotice(readFileSync(new URL('../../PRIVACY_NOTICE.md', import.meta.url), 'utf8'));
  assert.equal(readFileSync(NOTICE_PATH, 'utf8'), source, 'run `npm run sync:privacy`');
  assert.doesNotMatch(source, /Part [ABC]|Short notice for the consent checkbox|PUBLIC-NOTICE/);
});

test('consent: the time and the notice version are stored with the request', async () => {
  const t = await start();
  const { reference } = await t.create();
  const r = await (await t.call(`/api/admin/requests/${reference}`, { headers: A })).json();
  assert.equal(r.noticeVersion, 'v1abcdef');
  assert.ok(Math.abs(Date.parse(r.consentAt) - Date.now()) < 5000);
  t.close();
});

test('customer export: needs the token, has their data, omits staff notes, downloads as a file', async () => {
  const t = await start();
  const { reference, editToken } = await t.create();
  await t.call(`/api/admin/requests/${reference}`, { method: 'PATCH', headers: A, body: { notes: 'INTERNAL: tricky one', status: 'contacted' } });

  assert.equal((await t.call(`/api/requests/${reference}/export`)).status, 403);
  assert.equal((await t.call(`/api/requests/${reference}/export`, { headers: { 'x-edit-token': 'nope' } })).status, 403);

  const res = await t.call(`/api/requests/${reference}/export`, { headers: { 'x-edit-token': editToken } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition'), new RegExp(`attachment; filename="northbound-request-${reference}.json"`));
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const data = await res.json();
  assert.equal(data.email, 'sam@example.com');
  assert.equal(data.request, body().goal);
  assert.equal(data.consent.privacyNoticeVersion, 'v1abcdef');
  assert.doesNotMatch(JSON.stringify(data), /INTERNAL|contacted/);
  t.close();
});

test('customer delete: needs the token, removes the request and its email records, and is audited without personal data', async () => {
  const t = await start();
  const { reference, editToken } = await t.create();
  t.store.enqueueEmail({ kind: 'confirmation', requestId: reference, to: 'sam@example.com' });
  assert.equal(t.store.emailsFor(reference).length, 1);

  assert.equal((await t.call(`/api/requests/${reference}`, { method: 'DELETE' })).status, 403);
  assert.ok(t.store.get(reference));

  const res = await t.call(`/api/requests/${reference}`, { method: 'DELETE', headers: { 'x-edit-token': editToken } });
  assert.equal(res.status, 200);
  assert.equal(t.store.get(reference), null);
  assert.equal(t.store.emailsFor(reference).length, 0);
  assert.equal((await t.call(`/api/requests/${reference}`, { headers: { 'x-edit-token': editToken } })).status, 403); // token is gone too

  const audit = await (await t.call('/api/admin/audit', { headers: A })).json();
  assert.deepEqual(audit.entries.map((e) => [e.actor, e.action, e.requestId]), [['customer', 'delete', reference]]);
  assert.doesNotMatch(JSON.stringify(audit), /Sam|sam@example|booking tool/);
  t.close();
});

test('admin: full export includes notes and audit, delete works, hold is settable, all need the token', async () => {
  const t = await start();
  const { reference } = await t.create();
  assert.equal((await t.call(`/api/admin/requests/${reference}/export`)).status, 401);
  assert.equal((await t.call(`/api/admin/requests/${reference}`, { method: 'DELETE' })).status, 401);

  const patched = await (await t.call(`/api/admin/requests/${reference}`, { method: 'PATCH', headers: A, body: { notes: 'call Tuesday', hold: true } })).json();
  assert.equal(patched.hold, true);
  assert.equal((await t.call(`/api/admin/requests/${reference}`, { method: 'PATCH', headers: A, body: { hold: 'yes' } })).status, 400);

  const exp = await (await t.call(`/api/admin/requests/${reference}/export`, { headers: A })).json();
  assert.equal(exp.notes, 'call Tuesday');
  assert.ok(Array.isArray(exp.emails) && Array.isArray(exp.audit));

  assert.equal((await t.call(`/api/admin/requests/${reference}`, { method: 'DELETE', headers: A })).status, 200);
  assert.equal((await t.call(`/api/admin/requests/${reference}`, { method: 'DELETE', headers: A })).status, 404);
  t.close();
});

test('retention: deletes inactive requests, keeps recent ones, clients and held ones, and can be switched off', () => {
  const store = createStore(':memory:');
  const empty = { paths: [], flags: [], questions: [] };
  const mk = () => store.create({ goal: 'x'.repeat(12), name: 'N', email: 'n@example.com' }, empty).id;
  const stale = mk(), client = mk(), held = mk();
  store.updateAdmin(client, { status: 'working' });
  store.updateAdmin(held, { hold: true });
  for (const id of [stale, client, held]) store.enqueueEmail({ kind: 'confirmation', requestId: id, to: 'n@example.com' });

  const day = 86_400_000;
  const retention = createRetention({ store, days: 365, log: quiet });
  assert.equal(retention.run(new Date(Date.now() + 100 * day)), 0, 'recent requests are kept');

  assert.equal(retention.run(new Date(Date.now() + 400 * day)), 1);
  assert.equal(store.get(stale), null);
  assert.equal(store.emailsFor(stale).length, 0, 'email records go with the request');
  assert.ok(store.get(client), 'clients are kept');
  assert.ok(store.get(held), 'held requests are kept');
  assert.deepEqual(store.auditList().map((e) => [e.actor, e.action, e.requestId]), [['system', 'retention-delete', stale]]);
  assert.equal(retention.run(new Date(Date.now() + 400 * day)), 0);

  store.updateAdmin(held, { hold: false }); // released: now eligible
  assert.equal(retention.run(new Date(Date.now() + 800 * day)), 1);

  assert.equal(createRetention({ store, days: 0, log: quiet }).run(new Date(Date.now() + 9999 * day)), 0, '0 disables');
  assert.ok(store.get(client));
  store.close();
});

test('migration: a database created by the previous version is upgraded in place and keeps its data', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nb-'));
  const path = join(dir, 'old.db');
  try {
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE requests (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL DEFAULT '',
      goal TEXT NOT NULL, answers_json TEXT NOT NULL, recommendation_json TEXT NOT NULL, edit_token TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '')`);
    old.prepare(`INSERT INTO requests (id, created_at, updated_at, name, email, goal, answers_json, recommendation_json, edit_token)
      VALUES ('NB-OLD222', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 'Old', 'old@example.com', 'an old request', '{}', '{"paths":[],"flags":[],"questions":[]}', 't')`).run();
    old.close();

    const store = createStore(path);
    const r = store.get('NB-OLD222');
    assert.equal(r.name, 'Old');
    assert.equal(r.hold, false);
    assert.equal(r.noticeVersion, '');
    assert.equal(store.updateAdmin('NB-OLD222', { hold: true }), true);
    assert.equal(store.get('NB-OLD222').hold, true);
    store.close();
    createStore(path).close(); // opening twice must not try to add the columns again
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('confirmation email links to the privacy notice when the public URL is known', () => {
  const answers = { ...body() };
  const r = { id: 'NB-TEST22', name: answers.name, email: answers.email, company: '', goal: answers.goal, answers, recommendation: recommend(answers), createdAt: '2026-01-01T00:00:00.000Z' };
  const withUrl = renderEmail('confirmation', r, { publicUrl: 'https://onboarding.test/' });
  assert.match(withUrl.text, /https:\/\/onboarding\.test\/privacy/);
  assert.match(withUrl.html, /href="https:\/\/onboarding\.test\/privacy"/);
  assert.doesNotMatch(renderEmail('confirmation', r, {}).text, /Privacy Notice/);
});
