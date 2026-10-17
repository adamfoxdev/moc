import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sha256 = (s) => createHash('sha256').update(s).digest();
const equal = (a, b) => {
  const x = sha256(String(a)), y = sha256(String(b));
  return timingSafeEqual(x, y);
};

export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
const LOGIN_STATE_MS = 10 * 60 * 1000;

/**
 * Staff sign-in settings. Returns null when OpenID Connect is not configured
 * (the shared ADMIN_TOKEN is then used, for local development and early pilots).
 */
export function authConfigFromEnv(env = process.env) {
  const keys = ['OIDC_ISSUER', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'ADMIN_EMAILS', 'SESSION_SECRET'];
  if (!keys.some((k) => env[k])) return null;
  const missing = keys.filter((k) => !env[k]);
  if (!env.PUBLIC_URL) missing.push('PUBLIC_URL');
  if (missing.length) throw new Error(`Staff sign-in needs: ${missing.join(', ')}`);
  if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters (for example: openssl rand -hex 32)');
  const emails = env.ADMIN_EMAILS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) throw new Error('ADMIN_EMAILS must list at least one staff email address');
  const publicUrl = new URL(env.PUBLIC_URL);
  const issuer = env.OIDC_ISSUER.replace(/\/$/, '');
  return {
    issuer,
    // Google's tokens may carry the issuer with or without the scheme; both are Google's.
    acceptedIssuers: issuer === 'https://accounts.google.com' ? [issuer, 'accounts.google.com'] : [issuer],
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    sessionSecret: env.SESSION_SECRET,
    allowedEmails: new Set(emails),
    redirectUri: new URL('/auth/callback', publicUrl).toString(),
    secureCookies: publicUrl.protocol === 'https:',
    allowAdminToken: env.ALLOW_ADMIN_TOKEN === 'true',
  };
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore */ }
  }
  return out;
}

/**
 * OpenID Connect sign-in (authorization code flow with PKCE) for named staff,
 * plus server-side sessions. Works with Microsoft Entra ID, Google, Okta, etc.
 */
export function createAuth({ store, config, now = () => Date.now(), fetchImpl = fetch, limiter = () => false, audit = () => {} }) {
  const enabled = !!config;
  const secure = enabled && config.secureCookies;
  const SESSION_COOKIE = secure ? '__Host-nb_admin' : 'nb_admin';
  const LOGIN_COOKIE = secure ? '__Host-nb_login' : 'nb_login';

  const cookie = (name, value, maxAgeMs) =>
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=${Math.floor(maxAgeMs / 1000)}`;
  const clear = (name) => cookie(name, '', 0);

  // The short-lived login state is kept in a signed cookie, so it needs no server storage.
  const sign = (payload) => {
    const body = b64url(JSON.stringify(payload));
    return `${body}.${b64url(createHmac('sha256', config.sessionSecret).update(body).digest())}`;
  };
  const unsign = (value = '') => {
    const [body, mac] = value.split('.');
    if (!body || !mac) return null;
    const expected = b64url(createHmac('sha256', config.sessionSecret).update(body).digest());
    if (!equal(mac, expected)) return null;
    try { return JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
  };

  let discovery = null;
  let jwks = null;
  async function discover() {
    if (discovery && now() - discovery.at < 60 * 60 * 1000) return discovery.doc;
    const res = await fetchImpl(`${config.issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`discovery failed (${res.status})`);
    const doc = await res.json();
    if (doc.issuer?.replace(/\/$/, '') !== config.issuer) throw new Error('issuer in discovery document does not match OIDC_ISSUER');
    for (const k of ['authorization_endpoint', 'token_endpoint', 'jwks_uri']) {
      if (!doc[k]) throw new Error(`discovery document has no ${k}`);
      const u = new URL(doc[k]);
      const local = ['localhost', '127.0.0.1'].includes(u.hostname);
      if (u.protocol !== 'https:' && !local) throw new Error(`${k} must be https`);
    }
    discovery = { doc, at: now() };
    jwks = createRemoteJWKSet(new URL(doc.jwks_uri));
    return doc;
  }

  const router = express.Router();

  router.get('/config', (_req, res) => res.json({ mode: enabled ? 'oidc' : 'token' }));

  router.get('/login', async (req, res) => {
    if (!enabled) return res.status(404).end();
    if (limiter(req.ip)) return res.status(429).send('Too many attempts. Try again later.');
    try {
      const doc = await discover();
      const state = b64url(randomBytes(16));
      const nonce = b64url(randomBytes(16));
      const verifier = b64url(randomBytes(32));
      const url = new URL(doc.authorization_endpoint);
      url.search = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge: b64url(sha256(verifier)),
        code_challenge_method: 'S256',
      }).toString();
      res.append('Set-Cookie', cookie(LOGIN_COOKIE, sign({ state, nonce, verifier, exp: now() + LOGIN_STATE_MS }), LOGIN_STATE_MS));
      res.redirect(url.toString());
    } catch (e) {
      console.error('[auth] login start failed:', e.message);
      res.redirect('/admin?auth_error=unavailable');
    }
  });

  router.get('/callback', async (req, res) => {
    if (!enabled) return res.status(404).end();
    if (limiter(req.ip)) return res.status(429).send('Too many attempts. Try again later.');
    const fail = (reason, detail = '') => {
      audit('anonymous', 'login-failed', '', `${reason}${detail ? `: ${detail}` : ''}`);
      res.append('Set-Cookie', clear(LOGIN_COOKIE));
      res.redirect(`/admin?auth_error=${reason === 'not-allowed' ? 'denied' : 'failed'}`);
    };
    try {
      const saved = unsign(parseCookies(req.headers.cookie)[LOGIN_COOKIE]);
      const { code, state, error } = req.query;
      if (error) return fail('idp-error', String(error).slice(0, 60));
      if (!saved || saved.exp < now()) return fail('expired');
      if (typeof code !== 'string' || typeof state !== 'string' || !equal(state, saved.state)) return fail('state-mismatch');

      const doc = await discover();
      const tokenRes = await fetchImpl(doc.token_endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code_verifier: saved.verifier,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const tokens = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokens.id_token) return fail('token-exchange', String(tokenRes.status));

      const { payload } = await jwtVerify(tokens.id_token, jwks, {
        issuer: config.acceptedIssuers,
        audience: config.clientId,
        algorithms: ['RS256', 'ES256'],
        clockTolerance: 60,
        currentDate: new Date(now()),
      });
      if (payload.nonce !== saved.nonce) return fail('nonce-mismatch');
      if (payload.email_verified === false) return fail('email-unverified');

      // Entra often omits "email" and gives the sign-in name as preferred_username.
      const email = String(payload.email || payload.preferred_username || payload.upn || '').trim().toLowerCase();
      if (!email || !config.allowedEmails.has(email)) {
        return fail('not-allowed', `domain ${email.split('@')[1] || 'unknown'}`);
      }

      store.purgeExpiredSessions(now());
      const sessionId = b64url(randomBytes(32)); // fresh id on every login
      const t = now();
      store.createSession({
        idHash: sha256(sessionId).toString('hex'),
        email,
        name: String(payload.name || '').slice(0, 120),
        csrf: b64url(randomBytes(24)),
        now: t,
        expiresAt: t + SESSION_ABSOLUTE_MS,
      });
      audit(`staff:${email}`, 'login');
      res.append('Set-Cookie', clear(LOGIN_COOKIE));
      res.append('Set-Cookie', cookie(SESSION_COOKIE, sessionId, SESSION_ABSOLUTE_MS));
      res.redirect('/admin');
    } catch (e) {
      console.error('[auth] callback failed:', e.message);
      fail('verification', e.code || e.name);
    }
  });

  /** The signed-in staff member for a request, or null. Extends the idle timeout. */
  function sessionFor(req) {
    if (!enabled) return null;
    const id = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!id) return null;
    const idHash = sha256(id).toString('hex');
    const s = store.getSession(idHash);
    const t = now();
    if (!s) return null;
    if (s.expiresAt < t || t - s.lastSeen > SESSION_IDLE_MS) { store.deleteSession(idHash); return null; }
    store.touchSession(idHash, t);
    return { email: s.email, name: s.name, csrf: s.csrf, idHash };
  }

  return {
    enabled,
    allowAdminToken: enabled && config.allowAdminToken,
    router,
    sessionFor,
    csrfOk: (req, staff) => equal(req.get('x-csrf-token') || '', staff.csrf),
    endSession: (res, staff) => {
      store.deleteSession(staff.idHash);
      res.append('Set-Cookie', clear(SESSION_COOKIE));
    },
  };
}
