#!/usr/bin/env node
// Is every live site up, and serving the right brand?   npm run check-sites
// Reads deploy/brands.json (brands with "live": false are skipped), asks each site's /api/ready and
// /api/brand, and exits non-zero if any site is down or serving the wrong brand. Used by the scheduled
// uptime check in .github/workflows/uptime.yml, and handy by hand after a deploy.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './lib/flyconfig.mjs';

const manifest = JSON.parse(readFileSync(process.env.FLY_MANIFEST || resolve(ROOT, 'deploy', 'brands.json'), 'utf8'));
const tries = Number(process.env.CHECK_TRIES || 3);
const wait = Number(process.env.CHECK_WAIT_MS ?? 4000);

async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

async function check(id, { url }) {
  const base = url.replace(/\/$/, '');
  let last = 'no answer';
  for (let i = 1; i <= tries; i++) {
    try {
      const ready = await get(`${base}/api/ready`);
      if (ready.status !== 200 || ready.json.ok !== true) { last = `/api/ready answered ${ready.status}`; }
      else {
        const brand = await get(`${base}/api/brand`);
        if (brand.json.id !== id) return { ok: false, why: `serving brand "${brand.json.id}" but should be "${id}"` };
        return { ok: true, why: brand.json.name };
      }
    } catch (e) { last = e.cause?.code || e.message; }
    if (i < tries) await new Promise((r) => setTimeout(r, wait));
  }
  return { ok: false, why: last };
}

const entries = Object.entries(manifest.brands).filter(([, b]) => b.live !== false);
const results = await Promise.all(entries.map(async ([id, b]) => [id, b, await check(id, b)]));
let failed = 0;
for (const [id, b, r] of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'OK  ' : 'DOWN'} ${id.padEnd(13)} ${b.url}  ${r.ok ? r.why : `(${r.why})`}`);
}
console.log(failed ? `\n${failed} of ${results.length} sites need attention. See RUNBOOKS.md, "Site is down".` : `\nAll ${results.length} sites are up.`);
process.exit(failed ? 1 : 0);
