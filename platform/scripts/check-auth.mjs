// Checks staff sign-in settings before you try to sign in:
//   node --env-file=.env scripts/check-auth.mjs
// It reads the same environment variables as the server, reaches your identity provider,
// and prints the redirect address to register with it. It does not sign anyone in.
import { authConfigFromEnv } from '../server/auth.js';

let config;
try {
  config = authConfigFromEnv();
} catch (e) {
  console.error(`Not ready: ${e.message}`);
  process.exit(1);
}
if (!config) {
  console.error('Not configured: set OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, ADMIN_EMAILS, SESSION_SECRET and PUBLIC_URL.');
  process.exit(1);
}

let failed = false;
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => { failed = true; console.log(`  FIX   ${m}`); };

console.log('Staff sign-in check');
console.log(`  Register this exact redirect URI with your identity provider:\n        ${config.redirectUri}\n`);

try {
  const res = await fetch(`${config.issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const doc = await res.json();
  if (doc.issuer?.replace(/\/$/, '') === config.issuer) ok(`identity provider reachable, issuer matches (${config.issuer})`);
  else bad(`OIDC_ISSUER is "${config.issuer}" but the provider says its issuer is "${doc.issuer}"`);
  if (doc.code_challenge_methods_supported?.includes('S256') ?? true) ok('supports PKCE (S256)');
  else bad('provider does not advertise PKCE S256');
  const methods = doc.token_endpoint_auth_methods_supported;
  if (!methods || methods.includes('client_secret_post')) ok('accepts the client secret in the request body');
  else bad(`provider only supports ${methods.join(', ')} for client authentication`);
} catch (e) {
  bad(`could not read the provider's discovery document: ${e.message}`);
}

if (config.secureCookies) ok('PUBLIC_URL is https: cookies will be Secure');
else console.log('  note  PUBLIC_URL is http: fine for local trials only');
ok(`${config.allowedEmails.size} allowed address${config.allowedEmails.size === 1 ? '' : 'es'}: ${[...config.allowedEmails].join(', ')}`);
if (/@(gmail|googlemail)\.com$/.test([...config.allowedEmails].join(','))) {
  console.log('  note  Gmail accounts cannot have 2-step verification enforced centrally; ask each person to turn it on.');
}

console.log(failed ? '\nFix the items above, then run this again.' : '\nLooks good. Start the app and open /admin.');
process.exit(failed ? 1 : 0);
