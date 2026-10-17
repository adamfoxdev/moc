import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

/**
 * A tiny OpenID Connect provider for tests and local trials: discovery, authorize
 * (signs the configured user in immediately), token and keys. Not for real use.
 */
export async function startFakeIdp({ clientId = 'cid', clientSecret = 'sec', user = { email: 'sam@staff.test', name: 'Sam Staff' } } = {}) {
  const good = await generateKeyPair('RS256');
  const other = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(good.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  const codes = new Map();
  const s = { user, tweak: {}, authorizeRequests: [], tokenRequests: 0 };
  let base = '';

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const send = (status, body, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };

    if (url.pathname === '/.well-known/openid-configuration') {
      return send(200, { issuer: base, authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`, jwks_uri: `${base}/jwks` });
    }
    if (url.pathname === '/jwks') return send(200, { keys: [jwk] });

    if (url.pathname === '/authorize') {
      const q = Object.fromEntries(url.searchParams);
      s.authorizeRequests.push(q);
      if (q.client_id !== clientId) return send(400, { error: 'bad client' });
      const code = randomBytes(12).toString('hex');
      codes.set(code, { nonce: q.nonce, challenge: q.code_challenge, redirectUri: q.redirect_uri, user: s.user, used: false });
      const back = new URL(q.redirect_uri);
      back.searchParams.set('code', code);
      back.searchParams.set('state', s.tweak.state ?? q.state);
      res.writeHead(302, { location: back.toString() });
      return res.end();
    }

    if (url.pathname === '/token' && req.method === 'POST') {
      s.tokenRequests++;
      let raw = '';
      for await (const c of req) raw += c;
      const f = Object.fromEntries(new URLSearchParams(raw));
      const entry = codes.get(f.code);
      if (f.client_id !== clientId || f.client_secret !== clientSecret) return send(401, { error: 'invalid_client' });
      if (!entry || entry.used || f.redirect_uri !== entry.redirectUri) return send(400, { error: 'invalid_grant' });
      entry.used = true; // authorization codes are single-use
      const challenge = createHash('sha256').update(f.code_verifier || '').digest('base64url');
      if (challenge !== entry.challenge) return send(400, { error: 'invalid_grant', error_description: 'PKCE failed' });

      const t = s.tweak;
      const claims = {
        sub: 'user-' + entry.user.email,
        nonce: t.nonce ?? entry.nonce,
        name: entry.user.name,
        ...(t.omitEmail ? { preferred_username: entry.user.email } : { email: entry.user.email }),
        ...(t.email_verified !== undefined ? { email_verified: t.email_verified } : {}),
      };
      const id_token = await new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
        .setIssuer(t.iss ?? base)
        .setAudience(t.aud ?? clientId)
        .setIssuedAt()
        .setExpirationTime(t.expired ? Math.floor(Date.now() / 1000) - 3600 : '5m')
        .sign(t.wrongKey ? other.privateKey : good.privateKey);
      return send(200, { access_token: 'unused', token_type: 'Bearer', id_token });
    }
    send(404, { error: 'not found' });
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  server.unref();
  base = `http://127.0.0.1:${server.address().port}`;

  return {
    issuer: base,
    clientId,
    clientSecret,
    state: s,
    setUser: (u) => { s.user = u; },
    tweak: (t) => { s.tweak = t; },
    close: () => server.close(),
  };
}
