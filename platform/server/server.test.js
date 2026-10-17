import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { createStore } from './db.js';
import { recommend } from './recommend.js';
import { validateAnswers } from './validate.js';

const minimal = { goal: 'We built a scheduling tool with Lovable and need it live', name: 'Sam', email: 'sam@example.com', consent: true };

async function start(opts = {}) {
  const store = createStore(':memory:');
  const app = createApp({ store, serveStatic: false, adminToken: 'secret', ...opts });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, init = {}) => fetch(base + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    body: init.body && JSON.stringify(init.body),
  });
  return { call, close: () => { server.close(); store.close(); } };
}

test('validation: only goal, name, email and consent are required', () => {
  assert.equal(validateAnswers(minimal, { requireCore: true }).ok, true);
  const r = validateAnswers({}, { requireCore: true });
  assert.deepEqual(Object.keys(r.errors).sort(), ['consent', 'email', 'goal', 'name']);
});

test('validation: rejects bad enums, bad links and drops unknown keys', () => {
  const r = validateAnswers({ ...minimal, stage: 'nope', link: 'javascript:alert(1)', extra: 'x' }, { requireCore: true });
  assert.ok(r.errors.stage);
  assert.ok(r.errors.link);
  assert.equal('extra' in r.value, false);
});

test('recommend: AI-built prototype with no team points to end-to-end migration', () => {
  const rec = recommend({ goal: 'Built a prototype in Lovable, need it production ready', team: 'none' });
  assert.equal(rec.paths[0].id, 'vibe-migration');
  assert.match(rec.paths[0].how, /end to end/);
});

test('recommend: idea stage leads with the one-week PoC and says there is no rush', () => {
  const rec = recommend({ goal: 'I have an idea for a booking platform', stage: 'idea' });
  assert.equal(rec.paths[0].id, 'poc');
  assert.ok(rec.flags.some((f) => /no rush/.test(f)));
});

test('recommend: Microsoft and AI mentions yield Foundry add-on; personal data triggers NDA/DPA note', () => {
  const rec = recommend({ goal: 'Add a chatbot to our .NET app on Azure', data: 'personal' });
  assert.ok(rec.paths.some((p) => p.id === 'ai-addon' && /Foundry/.test(p.how)));
  assert.ok(rec.flags.some((f) => /NDA/.test(f) && /data processing agreement/.test(f)));
});

test('recommend: always returns at least one path and no prices', () => {
  const rec = recommend({ goal: 'Not sure what we need yet really' });
  assert.ok(rec.paths.length >= 1);
  assert.doesNotMatch(JSON.stringify(rec), /\$\s?\d/);
});

test('API: minimal request is accepted and returns a first read', async () => {
  const t = await start();
  const res = await t.call('/api/requests', { method: 'POST', body: minimal });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.match(body.reference, /^NB-[A-Z2-9]{6}$/);
  assert.ok(body.editToken.length >= 32);
  assert.ok(body.recommendation.paths.length >= 1);
  t.close();
});

test('API: invalid request returns field errors', async () => {
  const t = await start();
  const res = await t.call('/api/requests', { method: 'POST', body: { goal: 'short' } });
  assert.equal(res.status, 400);
  const { errors } = await res.json();
  assert.ok(errors.goal && errors.name && errors.email && errors.consent);
  t.close();
});

test('API: details need the edit token and then re-run the recommendation', async () => {
  const t = await start();
  const { reference, editToken } = await (await t.call('/api/requests', { method: 'POST', body: minimal })).json();
  const denied = await t.call(`/api/requests/${reference}/details`, { method: 'PUT', body: { data: 'personal' } });
  assert.equal(denied.status, 403);
  const wrong = await t.call(`/api/requests/${reference}/details`, { method: 'PUT', body: { data: 'personal' }, headers: { 'x-edit-token': 'nope' } });
  assert.equal(wrong.status, 403);
  const ok = await t.call(`/api/requests/${reference}/details`, { method: 'PUT', body: { data: 'personal', team: 'none' }, headers: { 'x-edit-token': editToken } });
  assert.equal(ok.status, 200);
  const { recommendation } = await ok.json();
  assert.ok(recommendation.flags.some((f) => /NDA/.test(f)));
  t.close();
});

test('API: honeypot submissions are not stored', async () => {
  const t = await start();
  const res = await t.call('/api/requests', { method: 'POST', body: { ...minimal, website: 'http://spam.example' } });
  assert.equal(res.status, 201);
  const list = await (await t.call('/api/admin/requests', { headers: { 'x-admin-token': 'secret' } })).json();
  assert.equal(list.requests.length, 0);
  t.close();
});

test('API: rate limit applies to the public form', async () => {
  const t = await start({ maxSubmissions: 2 });
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push((await t.call('/api/requests', { method: 'POST', body: minimal })).status);
  assert.deepEqual(codes, [201, 201, 429]);
  t.close();
});

test('API: admin is disabled without a token and protected with one', async () => {
  const off = await start({ adminToken: '' });
  assert.equal((await off.call('/api/admin/requests')).status, 503);
  off.close();

  const t = await start();
  await t.call('/api/requests', { method: 'POST', body: minimal });
  assert.equal((await t.call('/api/admin/requests')).status, 401);
  assert.equal((await t.call('/api/admin/requests', { headers: { 'x-admin-token': 'wrong' } })).status, 401);
  const list = await (await t.call('/api/admin/requests', { headers: { 'x-admin-token': 'secret' } })).json();
  assert.equal(list.requests.length, 1);
  assert.equal('editToken' in list.requests[0], false);
  const id = list.requests[0].id;
  const upd = await t.call(`/api/admin/requests/${id}`, { method: 'PATCH', body: { status: 'contacted', notes: 'Called' }, headers: { 'x-admin-token': 'secret' } });
  assert.equal((await upd.json()).status, 'contacted');
  const bad = await t.call(`/api/admin/requests/${id}`, { method: 'PATCH', body: { status: 'weird' }, headers: { 'x-admin-token': 'secret' } });
  assert.equal(bad.status, 400);
  t.close();
});

