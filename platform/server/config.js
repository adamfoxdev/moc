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
