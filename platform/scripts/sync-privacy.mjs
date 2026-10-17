// Copies the public part of ../PRIVACY_NOTICE.md into web/src/privacy-notice.md,
// which the /privacy page renders. Run `npm run sync:privacy` after editing the notice.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPublicNotice, NOTICE_PATH } from '../server/notice.js';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'PRIVACY_NOTICE.md');
if (!existsSync(source)) {
  console.warn('sync-privacy: ../PRIVACY_NOTICE.md not found; using the committed copy.');
  process.exit(0);
}
const next = extractPublicNotice(readFileSync(source, 'utf8'));
writeFileSync(NOTICE_PATH, next);
console.log(`sync-privacy: wrote ${NOTICE_PATH}`);
if (next.includes('{{')) console.warn('sync-privacy: the notice still contains {{placeholders}}; the page will show a draft banner.');
