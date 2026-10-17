/**
 * Things that must be true before the app is allowed to run in production.
 * Returns a list of problems; empty means fine.
 */
export function productionProblems(env = process.env) {
  if (env.NODE_ENV !== 'production') return [];
  const problems = [];
  const transport = (env.MAIL_TRANSPORT || 'log').toLowerCase();
  if (transport === 'log') {
    problems.push('MAIL_TRANSPORT is "log", which prints email text (including personal data) to the logs and sends nothing. Use resend, postmark or smtp.');
  }
  if (!env.PUBLIC_URL || !env.PUBLIC_URL.startsWith('https://')) {
    problems.push('PUBLIC_URL must be set to the https:// address of the site (used in emails and the privacy link).');
  }
  if (env.ADMIN_TOKEN && env.ADMIN_TOKEN.length < 24) {
    problems.push('ADMIN_TOKEN is shorter than 24 characters. Use a long random value, for example: openssl rand -hex 32');
  }
  if (!env.NOTIFY_TO) {
    problems.push('NOTIFY_TO is not set, so nobody would be told about new requests.');
  }
  return problems;
}

/** Things worth saying loudly at startup that should not stop the app. */
export function productionWarnings(env = process.env) {
  if (env.NODE_ENV !== 'production') return [];
  const warnings = [];
  const signIn = !!env.OIDC_ISSUER;
  if (!signIn && env.ADMIN_TOKEN) {
    warnings.push('Staff sign-in is not configured: the single shared ADMIN_TOKEN is the only protection for /admin. Configure OIDC_* and ADMIN_EMAILS.');
  }
  if (signIn && env.ADMIN_TOKEN && env.ALLOW_ADMIN_TOKEN === 'true') {
    warnings.push('ALLOW_ADMIN_TOKEN=true: the shared token still works alongside staff sign-in. Remove it once sign-in is proven.');
  }
  if (!signIn && !env.ADMIN_TOKEN) {
    warnings.push('Neither staff sign-in nor ADMIN_TOKEN is set: /admin is disabled, so nobody can read requests except through email alerts.');
  }
  return warnings;
}
