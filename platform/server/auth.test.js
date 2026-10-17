import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { createStore } from './db.js';
import { authConfigFromEnv, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from './auth.js';
import { startFakeIdp } from './testing/fake-idp.js';

const SECRET = 'x'.repeat(40);
const goodBody = { goal: 'We built a booking tool with Lovable and need it live', name: 'Cus Tomer', email: 'cus@example.com', consent: true };

function envFor(idp, extra = {}) {
  return { OIDC_ISSUER: idp.issuer, OIDC_CLIENT_ID: idp.clientId, OIDC_CLIENT_SECRET: idp.clientSecret, ADMIN_EMAILS: 'Sam@staff.test, pat@staff.test', SESSION_SECRET: SECRET, PUBLIC_URL: 'http://auth.test', ...extra };
}

async function start({ env = {}, idpOpts, appOpts = {} } = {}) {
  const idp = await startFakeIdp(idpOpts);
  const clock = { t: Date.now() };
  const store = createStore(':memory:');
  const app = createApp({
    store, serveStatic: false, maxSubmissions: 100, adminToken: 'tok-0123456789abcdef0123456789',
    authConfig: authConfigFromEnv(envFor(idp, env)),
    authDeps: { now: () => clock.t },
    ...appOpts,
  });
  const server = await new Promise((r) => { const s = app.listen(0, () => { s.unref(); r(s); }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const jar = {};
  const cookieHeader = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const take = (res) => {
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split('; ');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i), value = pair.slice(i + 1);
      if (/Max-Age=0/i.test(attrs.join(';')) || value === '') delete jar[name]; else jar[name] = decodeURIComponent(value);
    }
  };
  const call = async (path, init = {}) => {
    const res = await fetch(base + path, { redirect: 'manual', ...init, headers: { cookie: cookieHeader(), ...(init.headers || {}) } });
    take(res);
    return res;
  };
  // Walk the whole sign-in: our /auth/login, the IdP, back to our /auth/callback.
  const signIn = async () => {
    const r1 = await call('/auth/login');
    const authorize = r1.headers.get('location');
    const r2 = await fetch(authorize, { redirect: 'manual' });
    const back = new URL(r2.headers.get('location'));
    const r3 = await call(back.pathname + back.search);
    return { r1, r2, r3, authorize, back };
  };
  const json = async (res) => res.json();
  return { base, store, idp, clock, jar, call, signIn, json, close: () => { server.close(); store.close(); idp.close(); } };
}

test('config: absent means token mode; partial or weak settings are rejected with clear messages', async () => {
  assert.equal(authConfigFromEnv({}), null);
  assert.throws(() => authConfigFromEnv({ OIDC_ISSUER: 'https://x' }), /OIDC_CLIENT_ID.*ADMIN_EMAILS.*SESSION_SECRET.*PUBLIC_URL/);
  const idp = await startFakeIdp();
  assert.throws(() => authConfigFromEnv(envFor(idp, { SESSION_SECRET: 'short' })), /32 characters/);
  assert.throws(() => authConfigFromEnv(envFor(idp, { ADMIN_EMAILS: ' , ' })), /at least one/);
  const c = authConfigFromEnv(envFor(idp, { PUBLIC_URL: 'https://onboarding.example.com' }));
  assert.equal(c.redirectUri, 'https://onboarding.example.com/auth/callback');
  assert.equal(c.secureCookies, true);
  assert.ok(c.allowedEmails.has('sam@staff.test'), 'addresses are lower-cased');
  idp.close();
});

test('config: Google tokens are accepted with the issuer written either way; other providers only their own', async () => {
  const base = { OIDC_CLIENT_ID: 'c', OIDC_CLIENT_SECRET: 's', ADMIN_EMAILS: 'a@b.c', SESSION_SECRET: SECRET, PUBLIC_URL: 'http://localhost:5173' };
  assert.deepEqual(authConfigFromEnv({ ...base, OIDC_ISSUER: 'https://accounts.google.com' }).acceptedIssuers, ['https://accounts.google.com', 'accounts.google.com']);
  assert.deepEqual(authConfigFromEnv({ ...base, OIDC_ISSUER: 'https://accounts.google.com/' }).acceptedIssuers, ['https://accounts.google.com', 'accounts.google.com']);
  assert.deepEqual(authConfigFromEnv({ ...base, OIDC_ISSUER: 'https://login.example.com/tenant/v2.0' }).acceptedIssuers, ['https://login.example.com/tenant/v2.0']);
});

test('sign-in: full flow with PKCE, a named session, CSRF protection and per-person audit', async () => {
  const t = await start();
  const { r1, r2, r3, authorize } = await t.signIn();

  const a = new URL(authorize);
  assert.equal(a.searchParams.get('response_type'), 'code');
  assert.equal(a.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(a.searchParams.get('state') && a.searchParams.get('nonce') && a.searchParams.get('code_challenge'));
  assert.equal(a.searchParams.get('redirect_uri'), 'http://auth.test/auth/callback');
  assert.match(r1.headers.getSetCookie().join(), /nb_login=.*HttpOnly.*SameSite=Lax/);
  assert.equal(r2.status, 302);
  assert.equal(r3.status, 302);
  assert.equal(r3.headers.get('location'), '/admin');
  const sessionCookie = r3.headers.getSetCookie().find((c) => c.startsWith('nb_admin='));
  assert.match(sessionCookie, /HttpOnly/);
  assert.match(sessionCookie, /SameSite=Lax/);
  assert.doesNotMatch(sessionCookie, /Secure/, 'http in this test');

  const session = await t.json(await t.call('/api/admin/session'));
  assert.equal(session.mode, 'oidc');
  assert.equal(session.email, 'sam@staff.test');
  assert.equal(session.name, 'Sam Staff');

  // Reads work with the cookie alone; changes need the CSRF token.
  await t.call('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(goodBody) });
  const list = await t.json(await t.call('/api/admin/requests'));
  const id = list.requests[0].id;
  const patch = (headers = {}) => t.call(`/api/admin/requests/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ status: 'contacted' }) });
  assert.equal((await patch()).status, 403);
  assert.equal((await patch({ 'x-csrf-token': 'wrong' })).status, 403);
  assert.equal((await patch({ 'x-csrf-token': session.csrf })).status, 200);

  // Accountability: every action is attributed to the person.
  await t.call(`/api/admin/requests/${id}`);
  const audit = (await t.json(await t.call('/api/admin/audit'))).entries.map((e) => [e.actor, e.action]);
  assert.deepEqual(audit.reverse(), [['staff:sam@staff.test', 'login'], ['staff:sam@staff.test', 'update'], ['staff:sam@staff.test', 'view']]);
  assert.match(t.store.auditList().find((e) => e.action === 'update').detail, /changed: status/);

  // Sign out ends the session on the server, not just in the browser.
  assert.equal((await t.call('/api/admin/logout', { method: 'POST', headers: { 'x-csrf-token': session.csrf } })).status, 200);
  assert.equal(t.jar.nb_admin, undefined);
  t.close();
});

test('sign-in: the shared token stops working once staff sign-in is configured (unless explicitly allowed)', async () => {
  const t = await start();
  const tok = { 'x-admin-token': 'tok-0123456789abcdef0123456789' };
  assert.equal((await t.call('/api/admin/requests', { headers: tok })).status, 401);
  assert.equal((await t.call('/api/admin/requests')).status, 401);
  assert.equal((await t.json(await t.call('/auth/config'))).mode, 'oidc');
  t.close();

  const t2 = await start({ env: { ALLOW_ADMIN_TOKEN: 'true' } });
  assert.equal((await t2.call('/api/admin/requests', { headers: tok })).status, 200);
  t2.close();
});

test('sign-in: people not on the allowlist are refused and no session is created', async () => {
  const t = await start({ idpOpts: { user: { email: 'mallory@evil.test', name: 'Mallory' } } });
  const { r3 } = await t.signIn();
  assert.equal(r3.headers.get('location'), '/admin?auth_error=denied');
  assert.equal(t.jar.nb_admin, undefined);
  assert.equal((await t.call('/api/admin/requests')).status, 401);
  const e = t.store.auditList()[0];
  assert.deepEqual([e.actor, e.action], ['anonymous', 'login-failed']);
  assert.match(e.detail, /domain evil\.test/);
  assert.doesNotMatch(e.detail, /mallory/, 'the attempted address is not stored');
  t.close();
});

test('sign-in: Entra-style tokens with only preferred_username work; unverified emails do not', async () => {
  const t = await start();
  t.idp.tweak({ omitEmail: true });
  assert.equal((await t.signIn()).r3.headers.get('location'), '/admin');
  t.idp.tweak({ email_verified: false });
  assert.equal((await t.signIn()).r3.headers.get('location'), '/admin?auth_error=failed');
  t.close();
});

test('sign-in attacks: forged state, tampered or missing login cookie, replayed code', async () => {
  const t = await start();

  // 1. IdP returns a different state than we issued (login CSRF).
  t.idp.tweak({ state: 'attacker-chosen' });
  let r = await t.signIn();
  assert.equal(r.r3.headers.get('location'), '/admin?auth_error=failed');
  assert.equal(t.jar.nb_admin, undefined);
  t.idp.tweak({});

  // 2. No login cookie at all (callback opened in another browser).
  await t.call('/auth/login');
  const authorize = t.idp.state.authorizeRequests.length; // keep the IdP honest
  assert.equal(authorize, 1);
  const other = await fetch(`${t.base}/auth/callback?code=abc&state=def`, { redirect: 'manual' });
  assert.equal(other.headers.get('location'), '/admin?auth_error=failed');

  // 3. Tampered login cookie.
  const r1 = await t.call('/auth/login');
  const tampered = t.jar.nb_login.replace(/^./, (c) => (c === 'e' ? 'f' : 'e'));
  const loc = new URL((await fetch(r1.headers.get('location'), { redirect: 'manual' })).headers.get('location'));
  const res = await fetch(`${t.base}${loc.pathname}${loc.search}`, { redirect: 'manual', headers: { cookie: `nb_login=${encodeURIComponent(tampered)}` } });
  assert.equal(res.headers.get('location'), '/admin?auth_error=failed');

  // 4. Replaying an authorization code that was already used.
  const r2 = await t.call('/auth/login');
  const back = new URL((await fetch(r2.headers.get('location'), { redirect: 'manual' })).headers.get('location'));
  const first = await t.call(back.pathname + back.search);
  assert.equal(first.headers.get('location'), '/admin');
  const cookiesBefore = { ...t.jar };
  t.jar.nb_login = cookiesBefore.nb_login; // pretend the attacker also has the login cookie
  const r3 = await t.call('/auth/login');
  void r3;
  const replay = await fetch(`${t.base}${back.pathname}${back.search}`, { redirect: 'manual', headers: { cookie: `nb_login=${encodeURIComponent(cookiesBefore.nb_login || '')}` } });
  assert.equal(replay.headers.get('location'), '/admin?auth_error=failed');
  t.close();
});

test('sign-in attacks: tokens with the wrong audience, issuer, nonce, key or expiry are rejected', async () => {
  const t = await start();
  for (const tweak of [{ aud: 'someone-else' }, { iss: 'https://evil.test' }, { nonce: 'not-ours' }, { wrongKey: true }, { expired: true }]) {
    t.idp.tweak(tweak);
    const { r3 } = await t.signIn();
    assert.equal(r3.headers.get('location'), '/admin?auth_error=failed', JSON.stringify(tweak));
    assert.equal(t.jar.nb_admin, undefined, JSON.stringify(tweak));
  }
  t.idp.tweak({});
  assert.equal((await t.signIn()).r3.headers.get('location'), '/admin', 'a clean token still works');
  t.close();
});

test('sessions: expire after the idle and absolute limits, and an unknown cookie is useless', async () => {
  const t = await start();
  await t.signIn();
  assert.equal((await t.call('/api/admin/requests')).status, 200);

  t.clock.t += SESSION_IDLE_MS - 60_000; // active use keeps it alive...
  assert.equal((await t.call('/api/admin/requests')).status, 200);
  t.clock.t += SESSION_IDLE_MS + 60_000; // ...but a long gap does not
  assert.equal((await t.call('/api/admin/requests')).status, 401);

  t.clock.t = Date.now(); // the fake provider signs tokens in real time
  await t.signIn();
  // Six requests, each just inside the idle limit, reach 11h54m: still valid.
  for (let i = 0; i < 6; i++) { t.clock.t += SESSION_IDLE_MS - 60_000; assert.equal((await t.call('/api/admin/requests')).status, 200); }
  // Ten more minutes of continuous activity crosses the 12h absolute cap, however active the person is.
  t.clock.t += 10 * 60_000;
  assert.equal((await t.call('/api/admin/requests')).status, 401);

  const bad = await fetch(`${t.base}/api/admin/requests`, { headers: { cookie: 'nb_admin=not-a-real-session' } });
  assert.equal(bad.status, 401);
  t.close();
});

test('sessions: only a hash of the session id is stored', async () => {
  const t = await start();
  await t.signIn();
  const id = t.jar.nb_admin;
  const row = t.store.getSession(await import('node:crypto').then((c) => c.createHash('sha256').update(id).digest('hex')));
  assert.equal(row.email, 'sam@staff.test');
  assert.notEqual(row.idHash, id);
  t.close();
});

test('cookies: with an https PUBLIC_URL they are __Host- prefixed and Secure', async () => {
  const t = await start({ env: { PUBLIC_URL: 'https://onboarding.example.com' } });
  const r1 = await t.call('/auth/login');
  assert.match(r1.headers.getSetCookie().join(), /__Host-nb_login=.*Secure/);
  const back = new URL((await fetch(r1.headers.get('location'), { redirect: 'manual' })).headers.get('location'));
  const r3 = await t.call(back.pathname + back.search);
  const c = r3.headers.getSetCookie().find((x) => x.startsWith('__Host-nb_admin='));
  assert.match(c, /Secure/);
  assert.match(c, /Path=\//);
  assert.doesNotMatch(c, /Domain=/);
  t.close();
});

test('token mode still works exactly as before when staff sign-in is not configured', async () => {
  const store = createStore(':memory:');
  const app = createApp({ store, serveStatic: false, adminToken: 'secret', authConfig: null });
  const server = await new Promise((r) => { const s = app.listen(0, () => { s.unref(); r(s); }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await (await fetch(base + '/auth/config')).json()).mode, 'token');
  assert.equal((await fetch(base + '/auth/login', { redirect: 'manual' })).status, 404);
  assert.equal((await fetch(base + '/api/admin/requests', { headers: { 'x-admin-token': 'secret' } })).status, 200);
  const s = await (await fetch(base + '/api/admin/session', { headers: { 'x-admin-token': 'secret' } })).json();
  assert.equal(s.mode, 'token');
  server.close(); store.close();
});
