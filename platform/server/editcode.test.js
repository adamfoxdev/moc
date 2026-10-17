import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from './app.js';
import { createStore } from './db.js';
import { createRetention } from './retention.js';

const DAY = 86_400_000;
const body = { goal: 'A goal long enough to count', name: 'Sam', email: 'sam@example.com', consent: true };

async function start(opts = {}) {
  const clock = { t: Date.now() };
  const store = opts.store || createStore(':memory:');
  const app = createApp({ store, serveStatic: false, authConfig: null, now: () => clock.t, maxSubmissions: 100, ...opts });
  const server = await new Promise((r) => { const s = app.listen(0, () => { s.unref(); r(s); }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, token, init = {}) => fetch(base + path, { ...init, headers: { 'content-type': 'application/json', 'x-edit-token': token, ...(init.headers || {}) }, body: init.body && JSON.stringify(init.body) });
  const create = async () => (await fetch(base + '/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
  return { clock, store, call, create, close: () => { server.close(); store.close(); } };
}

test('edit codes work for 30 days and then stop working for every action', async () => {
  const t = await start();
  const a = await t.create();
  t.clock.t += 29 * DAY;
  assert.equal((await t.call(`/api/requests/${a.reference}`, a.editToken)).status, 200, 'still valid on day 29');
  assert.equal((await t.call(`/api/requests/${a.reference}/export`, a.editToken)).status, 200);

  t.clock.t += 2 * DAY; // day 31
  for (const [method, path, extra] of [['GET', '', {}], ['GET', '/export', {}], ['PUT', '/details', { body: { data: 'personal' } }], ['DELETE', '', {}]]) {
    const res = await t.call(`/api/requests/${a.reference}${path}`, a.editToken, { method, ...extra });
    assert.equal(res.status, 403, `${method} ${path} after expiry`);
  }
  assert.ok(t.store.get(a.reference), 'an expired code deletes nothing');
  t.close();
});

test('expiry can be changed or switched off', async () => {
  const short = await start({ editTokenDays: 1 });
  const r = await short.create();
  short.clock.t += 2 * DAY;
  assert.equal((await short.call(`/api/requests/${r.reference}`, r.editToken)).status, 403);
  short.close();

  const never = await start({ editTokenDays: 0 });
  const n = await never.create();
  never.clock.t += 3650 * DAY;
  assert.equal((await never.call(`/api/requests/${n.reference}`, n.editToken)).status, 200);
  never.close();
});

test('only a hash of the edit code is stored, and wrong codes still fail', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'edit-'));
  try {
    const path = join(dir, 'x.db');
    const t = await start({ store: createStore(path) });
    const r = await t.create();
    const raw = new DatabaseSync(path);
    const stored = raw.prepare('SELECT edit_token FROM requests WHERE id = ?').get(r.reference).edit_token;
    assert.match(stored, /^[0-9a-f]{64}$/);
    assert.notEqual(stored, r.editToken);
    assert.doesNotMatch(stored, new RegExp(r.editToken));
    assert.equal((await t.call(`/api/requests/${r.reference}`, r.editToken)).status, 200);
    assert.equal((await t.call(`/api/requests/${r.reference}`, stored)).status, 403, 'the stored hash is not itself a working code');
    assert.equal((await t.call(`/api/requests/${r.reference}`, 'nope')).status, 403);
    assert.equal((await t.call(`/api/requests/${r.reference}`, '')).status, 403);

    // a code issued before hashing was introduced (plain, 48 characters) still works
    raw.prepare('UPDATE requests SET edit_token = ? WHERE id = ?').run('legacy-plain-code-0123456789abcdef0123456789ab', r.reference);
    assert.equal((await t.call(`/api/requests/${r.reference}`, 'legacy-plain-code-0123456789abcdef0123456789ab')).status, 200);
    assert.equal((await t.call(`/api/requests/${r.reference}`, 'something-else')).status, 403);
    raw.close();
    t.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('audit log: old entries are deleted after the retention period; recent ones and live requests are kept', () => {
  const store = createStore(':memory:');
  const now = new Date();
  store.audit('staff:a@x.test', 'login', '', '', new Date(now.getTime() - 800 * DAY));
  store.audit('staff:a@x.test', 'view', 'NB-OLD111', '', new Date(now.getTime() - 731 * DAY));
  store.audit('staff:a@x.test', 'view', 'NB-NEW111', '', new Date(now.getTime() - 100 * DAY));
  store.audit('customer', 'delete', 'NB-RECENT', '', now);
  const retention = createRetention({ store, days: 365, auditDays: 730, log: { log() {}, error() {} } });
  retention.run(now);
  assert.deepEqual(store.auditList().map((e) => e.requestId).sort(), ['NB-NEW111', 'NB-RECENT']);
  assert.equal(createRetention({ store, days: 365, auditDays: 0, log: { log() {}, error() {} } }).run(new Date(now.getTime() + 5000 * DAY)), 0);
  assert.equal(store.auditList().length, 2, '0 keeps the audit log forever');
  store.close();
});
