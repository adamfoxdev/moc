#!/usr/bin/env node
// Plan, set up, deploy and check every brand's Fly app from one place.
//
//   npm run fly -- plan                          what would be deployed (changes nothing)
//   npm run fly -- init-secrets <brand|all>      create the secrets files to fill in
//   npm run fly -- setup <brand|all>             create the app, volume and backup bucket; stage secrets
//   npm run fly -- deploy <brand|all>            deploy one machine per app and check it is healthy
//   npm run fly -- status [brand|all]            machines, volumes and health
//   npm run fly -- urls                          the sign-in redirect addresses to register with Google
//   npm run fly -- restore-test <brand>          rehearse restoring the database from the backup (changes nothing live)
//
// Flags: --yes (do not ask before creating things)  --dry-run (print the fly commands, run nothing)
//        --no-health (skip the web check after a deploy)
//        --skip-checks (deploy without checking the app's secrets and volume first; for CI, where setup was done by hand)
//
// Apps, addresses and region live in deploy/brands.json. Secrets live in .fly-secrets/ (never committed).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { listBrands, loadBrand } from '../server/brand.js';
import { ROOT, configProblems, writeFlyConfig } from './lib/flyconfig.mjs';

const manifestPath = process.env.FLY_MANIFEST || resolve(ROOT, 'deploy', 'brands.json');
const secretsDir = process.env.FLY_SECRETS_DIR || resolve(ROOT, '.fly-secrets');
const configDir = process.env.FLY_CONFIG_DIR || ROOT;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [command, ...rest] = args.filter((a) => !a.startsWith('--'));
const YES = flags.has('--yes');
const DRY = flags.has('--dry-run');

const REQUIRED = ['OIDC_ISSUER', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'ADMIN_EMAILS', 'MAIL_API_KEY', 'MAIL_FROM', 'MAIL_REPLY_TO', 'NOTIFY_TO', 'SESSION_SECRET'];
const PLACEHOLDER = /CHANGE_ME/;

const die = (m) => { console.error(`\n${m}`); process.exit(1); };
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : die(`Missing ${manifestPath}`);

function pickBrands(names) {
  const all = Object.keys(manifest.brands);
  // "all" means every brand not marked "live": false in deploy/brands.json (naming a brand always works).
  const chosen = !names.length || names.includes('all') ? all.filter((b) => manifest.brands[b].live !== false) : names;
  for (const b of chosen) {
    if (!manifest.brands[b]) die(`"${b}" is not in deploy/brands.json. Known: ${all.join(', ')}`);
    if (!listBrands().includes(b)) die(`"${b}" has no brand file in brands/.`);
  }
  return chosen;
}
const target = (b) => ({ ...manifest.brands[b], region: manifest.brands[b].region || manifest.region, volume: manifest.volume || 'northbound_data', size: manifest.volumeSizeGb || 1 });

// ---- running fly --------------------------------------------------------------------------------
function fly(argv, { capture = false, allowFail = false, show = argv } = {}) {
  console.log(`$ fly ${show.join(' ')}`);
  if (DRY) return { status: 0, stdout: '' };
  const r = spawnSync('fly', argv, { encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  if (r.error?.code === 'ENOENT') die('The Fly CLI ("fly") was not found. Install it from https://fly.io/docs/flyctl/install/ and run "fly auth login".');
  if (r.status !== 0 && !allowFail) die(`fly ${argv[0]} failed (exit ${r.status}).${capture && r.stderr ? `\n${r.stderr.trim()}` : ''}`);
  return r;
}

// ---- secrets files ------------------------------------------------------------------------------
function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  return out;
}
const readEnv = (f) => (existsSync(f) ? parseEnv(readFileSync(f, 'utf8')) : {});
const sharedFile = () => resolve(secretsDir, '_shared.env');
const brandFile = (b) => resolve(secretsDir, `${b}.env`);

function initSecrets(brands) {
  mkdirSync(secretsDir, { recursive: true });
  if (!existsSync(sharedFile())) {
    writeFileSync(sharedFile(), `# Values shared by every brand. Keep this file private: it is not committed.\nOIDC_ISSUER=https://accounts.google.com\nOIDC_CLIENT_ID=CHANGE_ME.apps.googleusercontent.com\nOIDC_CLIENT_SECRET=CHANGE_ME\nADMIN_EMAILS=CHANGE_ME@example.com\n# One Resend key can serve every brand if all their sending domains are verified in the same account.\nMAIL_API_KEY=CHANGE_ME\n`);
    console.log(`Created ${sharedFile()}`);
  }
  for (const b of brands) {
    if (existsSync(brandFile(b))) { console.log(`Kept ${brandFile(b)} (already exists)`); continue; }
    const name = loadBrand(b).name;
    writeFileSync(brandFile(b), `# ${name}. Anything here overrides _shared.env.\n# MAIL_FROM must use a domain verified at Resend. onboarding@resend.dev only delivers to your own Resend email address.\nMAIL_FROM=${name} <onboarding@resend.dev>\nMAIL_REPLY_TO=CHANGE_ME@example.com\nNOTIFY_TO=CHANGE_ME@example.com\n# A different value for every brand. Generated for you.\nSESSION_SECRET=${randomBytes(32).toString('hex')}\n`);
    console.log(`Created ${brandFile(b)}`);
  }
  console.log('\nFill in every CHANGE_ME, then run: npm run fly -- setup all');
}

/** The secrets to set for a brand, and which required ones are still missing. */
function secretsFor(b) {
  const values = { ...readEnv(sharedFile()), ...readEnv(brandFile(b)) };
  const missing = REQUIRED.filter((k) => !values[k] || PLACEHOLDER.test(values[k]));
  const shortSecret = values.SESSION_SECRET && values.SESSION_SECRET.length < 32 && !missing.includes('SESSION_SECRET');
  if (shortSecret) missing.push('SESSION_SECRET (needs 32+ characters)');
  return { values: Object.fromEntries(REQUIRED.filter((k) => values[k] && !PLACEHOLDER.test(values[k])).map((k) => [k, values[k]])), missing };
}

async function confirm(question) {
  if (YES || DRY) return true;
  if (!process.stdin.isTTY) die(`${question}\nNot a terminal, so I cannot ask. Re-run with --yes to go ahead.`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

// ---- commands -----------------------------------------------------------------------------------
function plan(brands) {
  console.log(`Region ${manifest.region}, one machine and a ${manifest.volumeSizeGb || 1} GB volume per app.\n`);
  for (const b of brands) {
    const t = target(b);
    const brand = loadBrand(b);
    const { missing } = secretsFor(b);
    const problems = configProblems({ app: t.app, url: t.url, region: t.region });
    console.log(`${b.padEnd(13)} ${brand.name.padEnd(20)} focus: ${(brand.focus.join(', ') || 'all services').padEnd(18)} ${brand.layout}/${brand.scheme}`);
    console.log(`${' '.repeat(13)} app ${t.app}   ${t.url}`);
    console.log(`${' '.repeat(13)} secrets: ${missing.length ? `${missing.length} still to fill in (${missing.join(', ')})` : 'complete'}`);
    for (const p of problems) console.log(`${' '.repeat(13)} PROBLEM: ${p}`);
  }
  console.log('\nNext: npm run fly -- init-secrets all, fill in .fly-secrets/, then setup and deploy.');
}

async function setup(brands) {
  for (const b of brands) {
    const t = target(b);
    const problems = configProblems({ app: t.app, url: t.url, region: t.region });
    if (problems.length) die(`${b}: ${problems.join(' ')}`);
    const { missing } = secretsFor(b);
    if (missing.length) die(`${b}: these secrets are not filled in yet: ${missing.join(', ')}\nRun "npm run fly -- init-secrets ${b}", then edit ${brandFile(b)} and ${sharedFile()}.`);
  }
  for (const b of brands) {
    const t = target(b);
    console.log(`\n=== ${b}: ${loadBrand(b).name} (${t.app}) ===`);
    const out = writeFlyConfig({ brandId: b, app: t.app, url: t.url, region: t.region, outDir: configDir });
    console.log(`Wrote ${out}`);

    // A dry run cannot ask Fly, so it assumes nothing exists yet and shows the full first-time sequence.
    const exists = !DRY && fly(['status', '--app', t.app], { capture: true, allowFail: true }).status === 0;
    const vols = exists ? fly(['volumes', 'list', '--app', t.app], { capture: true, allowFail: true }).stdout : '';
    const secs = exists ? fly(['secrets', 'list', '--app', t.app], { capture: true, allowFail: true }).stdout : '';
    const hasVolume = vols.includes(t.volume);
    const hasBucket = secs.includes('BUCKET_NAME');

    const todo = [!exists && `create the app ${t.app}`, !hasVolume && `create a ${t.size} GB volume in ${t.region}`, !hasBucket && 'create a backup bucket'].filter(Boolean);
    if (todo.length && !(await confirm(`${b}: about to ${todo.join(', ')}. This can incur charges on your Fly account. Continue?`))) die('Stopped. Nothing further was created.');

    if (!exists) fly(['apps', 'create', t.app]);
    if (!hasVolume) fly(['volumes', 'create', t.volume, '--app', t.app, '--region', t.region, '--size', String(t.size), '--yes']);
    if (!hasBucket) fly(['storage', 'create', '--app', t.app, '--name', `${t.app}-backup`, '--yes']);
    else console.log('Backup bucket already set up.');

    const { values } = secretsFor(b);
    const pairs = Object.entries(values).map(([k, v]) => `${k}=${v}`);
    fly(['secrets', 'set', '--stage', '--app', t.app, ...pairs], { show: ['secrets', 'set', '--stage', '--app', t.app, ...Object.keys(values).map((k) => `${k}=***`)] });
    console.log(`Done. Deploy with: npm run fly -- deploy ${b}`);
  }
  console.log('\nRegister these sign-in addresses with Google (APIs & Services > Credentials), then deploy:');
  urls(brands);
}

async function healthy(url) {
  for (let i = 1; i <= 12; i++) {
    try {
      const r = await fetch(`${url}/api/ready`, { signal: AbortSignal.timeout(8000) });
      if (r.ok && (await r.json()).ok) return true;
    } catch { /* not up yet, or this computer cannot resolve the name yet */ }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

async function deploy(brands) {
  for (const b of brands) {
    const t = target(b);
    console.log(`\n=== ${b}: ${loadBrand(b).name} (${t.app}) ===`);
    // Check what is really on Fly (names only), so this also works in CI where the local secrets files do not exist.
    const CHECKS = !flags.has('--skip-checks');
    const secs = CHECKS ? fly(['secrets', 'list', '--app', t.app], { capture: true, allowFail: true }) : { status: 0, stdout: '' };
    if (CHECKS && !DRY && secs.status !== 0) die(`${b}: the Fly app ${t.app} was not found. Run "npm run fly -- setup ${b}" first.`);
    if (CHECKS && !DRY && !secs.stdout.includes('BUCKET_NAME')) die(`${b}: no backup bucket is set up (BUCKET_NAME missing). Run "npm run fly -- setup ${b}" first, or the database would not be backed up.`);
    const absent = CHECKS ? REQUIRED.filter((k) => !secs.stdout.includes(k)) : [];
    if (CHECKS && !DRY && absent.length) die(`${b}: these secrets are not set on Fly: ${absent.join(', ')}. Run "npm run fly -- setup ${b}" first.`);
    const vols = CHECKS ? fly(['volumes', 'list', '--app', t.app], { capture: true, allowFail: true }) : { stdout: '' };
    if (CHECKS && !DRY && !vols.stdout.includes(t.volume)) die(`${b}: no "${t.volume}" volume found. Run "npm run fly -- setup ${b}" first.`);

    const out = writeFlyConfig({ brandId: b, app: t.app, url: t.url, region: t.region, outDir: configDir });
    fly(['deploy', '-c', out, '--app', t.app, '--ha=false']);
    fly(['scale', 'count', '1', '--app', t.app, '--yes']);

    if (flags.has('--no-health') || DRY) { console.log('Skipped the web check.'); continue; }
    console.log(`Checking ${t.url}/api/ready ...`);
    if (await healthy(t.url)) console.log(`OK: ${b} is up.`);
    else die(`${b}: deployed, but ${t.url}/api/ready did not answer from this computer.\nThat can be DNS on your network rather than the app. Check: fly status --app ${t.app}  and  fly logs --app ${t.app}\nStopping here so the other brands are not deployed on top of a problem.`);
  }
  console.log('\nAll requested brands deployed.');
}

function status(brands) {
  for (const b of brands) {
    const t = target(b);
    console.log(`\n=== ${b}: ${loadBrand(b).name} (${t.app}) ===`);
    fly(['status', '--app', t.app], { allowFail: true });
    fly(['volumes', 'list', '--app', t.app], { allowFail: true });
  }
}

// Restores the latest backup into a scratch file on the running machine and counts what is in it.
// It never touches the live database. (Needs the backup settings to be visible in the ssh session: if it
// reports a credentials or bucket error, check "fly ssh console" can see BUCKET_NAME and the AWS_* values.)
function restoreTest(brands) {
  for (const b of brands) {
    const t = target(b);
    console.log(`\n=== ${b}: ${loadBrand(b).name} (${t.app}) ===`);
    const counter = "const d=new (require('node:sqlite').DatabaseSync)('/tmp/restore-test.db');console.log('requests in the restored copy:',d.prepare('select count(*) n from requests').get().n)";
    const remote = `sh -c 'rm -f /tmp/restore-test.db* && litestream restore -config /etc/litestream.yml -o /tmp/restore-test.db /data/platform.db && node --disable-warning=ExperimentalWarning -e "${counter}"; rc=$?; rm -f /tmp/restore-test.db*; exit $rc'`;
    const r = fly(['ssh', 'console', '--app', t.app, '-C', remote], { allowFail: true, show: ['ssh', 'console', '--app', t.app, '-C', '"<restore into /tmp, count rows, delete>"'] });
    if (!DRY && r.status !== 0) die(`${b}: the restore rehearsal FAILED. Treat the backup as unproven: see RUNBOOKS.md, "Restore the database".`);
    console.log(DRY ? 'Dry run: nothing executed.' : `${b}: the backup restored successfully.`);
  }
}

function urls(brands) {
  for (const b of brands) console.log(`  ${b.padEnd(13)} ${target(b).url.replace(/\/$/, '')}/auth/callback`);
}

const names = rest;
switch (command) {
  case 'plan': plan(pickBrands(names)); break;
  case 'init-secrets': initSecrets(pickBrands(names)); break;
  case 'setup': await setup(pickBrands(names)); break;
  case 'deploy': await deploy(pickBrands(names)); break;
  case 'status': status(pickBrands(names)); break;
  case 'restore-test': restoreTest(pickBrands(names)); break;
  case 'urls': console.log('Sign-in redirect addresses (add each to the Google OAuth client):'); urls(pickBrands(names)); break;
  default:
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 15).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(command ? 1 : 0);
}
