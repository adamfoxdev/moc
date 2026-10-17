import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// The public privacy notice shown at /privacy. It is generated from PRIVACY_NOTICE.md
// (see scripts/sync-privacy.mjs) so there is one source of truth.
export const NOTICE_PATH = resolve(here, '..', 'web', 'src', 'privacy-notice.md');

const START = '<!-- PUBLIC-NOTICE:START -->';
const END = '<!-- PUBLIC-NOTICE:END -->';

export function extractPublicNotice(markdown) {
  const a = markdown.indexOf(START);
  const b = markdown.indexOf(END);
  if (a < 0 || b < a) throw new Error(`PRIVACY_NOTICE.md must contain ${START} and ${END}`);
  return markdown.slice(a + START.length, b).trim() + '\n';
}

/** A short fingerprint of the notice text, stored with each consent so we know which version someone saw. */
export function noticeVersion(path = NOTICE_PATH) {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8);
  } catch {
    return 'unknown';
  }
}

// Placeholders in the notice that a brand can fill from its "legal" block.
const TOKENS = {
  NORTHBOUND_LEGAL_NAME: 'legalName', ENTITY_TYPE: 'entityType', JURISDICTION: 'jurisdiction', REG_NO: 'regNo',
  ADDRESS: 'address', POSTAL_ADDRESS: 'address', PRIVACY_EMAIL: 'privacyEmail', REGION: 'region',
  DATE: 'lastUpdated', RETENTION: 'retention', LOG_RETENTION: 'logRetention',
};

/**
 * The privacy notice for one brand: the shared text with that brand's name and legal details filled in.
 * `draft` stays true while any {{placeholder}} is left, and `version` fingerprints exactly this text.
 */
export function renderNotice(brand, path = NOTICE_PATH) {
  let markdown = readFileSync(path, 'utf8');
  for (const [token, key] of Object.entries(TOKENS)) {
    const value = brand.legal?.[key];
    if (value) markdown = markdown.replaceAll(`{{${token}}}`, value);
  }
  markdown = markdown.replaceAll('Northbound', brand.name);
  return { markdown, draft: markdown.includes('{{'), version: createHash('sha256').update(markdown).digest('hex').slice(0, 8) };
}
