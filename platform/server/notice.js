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
