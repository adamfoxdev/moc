import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, chmodSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SCRIPT = join(ROOT, 'scripts', 'fly.mjs');
// Names of every secret a healthy app has on Fly (what "fly secrets list" prints; never the values).
const ALL_SECRETS = 'BUCKET_NAME OIDC_ISSUER OIDC_CLIENT_ID OIDC_CLIENT_SECRET ADMIN_EMAILS MAIL_API_KEY MAIL_FROM MAIL_REPLY_TO NOTIFY_TO SESSION_SECRET';
const skip = process.platform === 'win32' ? 'uses a shell-script stand-in for fly' : false;

// A fake `fly` that records its arguments and answers the few questions the script asks.
function sandbox(manifest) {
  const dir = mkdtempSync(join(tmpdir(), 'flytest-'));
  const bin = join(dir, 'bin'); mkdirSync(bin);
  writeFileSync(join(bin, 'fly'), `#!/bin/sh
printf '%s\\n' "$*" >> "$FLY_LOG"
case "$1" in
  status) [ "$FLY_APP_EXISTS" = "1" ] && echo "App $3" && exit 0; exit 1;;
  volumes) [ "$2" = "list" ] && echo "$FLY_VOLUMES";;
  ssh) [ "$FLY_SSH_FAIL" = "1" ] && echo "ssh failed" >&2 && exit 1;;
  secrets) [ "$2" = "list" ] && echo "$FLY_SECRETS";;
esac
exit 0
`);
  chmodSync(join(bin, 'fly'), 0o755);
  const manifestPath = join(dir, 'brands.json');
  writeFileSync(manifestPath, JSON.stringify(manifest || {
    region: 'ams', volume: 'northbound_data', volumeSizeGb: 1,
    brands: {
      voltage: { app: 'moc-voltage', url: 'https://moc-voltage.fly.dev' },
      steward: { app: 'moc-steward', url: 'https://moc-steward.fly.dev' },
    },
  }));
  const run = (args, env = {}) => {
    const log = join(dir, 'fly.log');
    const r = spawnSync('node', ['--disable-warning=ExperimentalWarning', SCRIPT, ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FLY_LOG: log, FLY_MANIFEST: manifestPath, FLY_SECRETS_DIR: join(dir, 'secrets'), FLY_CONFIG_DIR: dir, ...env },
    });
    return { ...r, calls: existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [], out: r.stdout + r.stderr };
  };
  const fill = () => {
    const sd = join(dir, 'secrets');
    writeFileSync(join(sd, '_shared.env'), 'OIDC_ISSUER=https://accounts.google.com\nOIDC_CLIENT_ID=abc.apps.googleusercontent.com\nOIDC_CLIENT_SECRET=GOCSPX-supersecret\nADMIN_EMAILS=a@example.com,b@example.com\nMAIL_API_KEY=re_supersecretkey\n');
    for (const b of ['voltage', 'steward']) {
      const f = join(sd, `${b}.env`);
      writeFileSync(f, readFileSync(f, 'utf8').replaceAll('CHANGE_ME@example.com', `${b}@example.com`).replace(/<onboarding@resend.dev>/, '<hello@mail.example.com>'));
    }
  };
  return { dir, run, fill, close: () => rmSync(dir, { recursive: true, force: true }) };
}

test('plan: shows each brand, its app, focus and what is missing, and runs nothing', { skip }, () => {
  const s = sandbox();
  const r = s.run(['plan']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /Voltage AI\s+focus: ai/);
  assert.match(r.out, /app moc-steward\s+https:\/\/moc-steward\.fly\.dev/);
  assert.match(r.out, /secrets: 9 still to fill in/);
  assert.deepEqual(r.calls, [], 'no fly commands');
  s.close();
});

test('init-secrets: writes templates with a different generated SESSION_SECRET per brand, and never overwrites', { skip }, () => {
  const s = sandbox();
  assert.equal(s.run(['init-secrets', 'all']).status, 0);
  const read = (f) => readFileSync(join(s.dir, 'secrets', f), 'utf8');
  const secretOf = (t) => /SESSION_SECRET=(\w+)/.exec(t)[1];
  const a = secretOf(read('voltage.env')), b = secretOf(read('steward.env'));
  assert.ok(a.length >= 32 && b.length >= 32);
  assert.notEqual(a, b);
  assert.match(read('_shared.env'), /OIDC_ISSUER=https:\/\/accounts\.google\.com/);
  assert.match(read('voltage.env'), /MAIL_FROM=Voltage AI </);
  writeFileSync(join(s.dir, 'secrets', 'voltage.env'), 'MY EDIT\n');
  const again = s.run(['init-secrets', 'voltage']);
  assert.match(again.out, /Kept .*voltage\.env/);
  assert.equal(read('voltage.env'), 'MY EDIT\n');
  s.close();
});

test('setup refuses to start while secrets are unfilled, and creates nothing', { skip }, () => {
  const s = sandbox();
  s.run(['init-secrets', 'all']);
  const r = s.run(['setup', 'voltage', '--yes']);
  assert.notEqual(r.status, 0);
  assert.match(r.out, /not filled in yet: OIDC_CLIENT_ID.*OIDC_CLIENT_SECRET.*ADMIN_EMAILS.*MAIL_API_KEY.*MAIL_REPLY_TO.*NOTIFY_TO/);
  assert.deepEqual(r.calls, []);
  s.close();
});

test('setup: creates the app, volume and bucket, stages secrets, writes the brand config, and never prints secret values', { skip }, () => {
  const s = sandbox();
  s.run(['init-secrets', 'all']); s.fill();
  const r = s.run(['setup', 'voltage', '--yes']);
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(r.calls.map((c) => c.split(' ').slice(0, 2).join(' ')), ['status --app', 'apps create', 'volumes create', 'storage create', 'secrets set']);
  assert.ok(r.calls.includes('apps create moc-voltage'));
  assert.ok(r.calls.includes('volumes create northbound_data --app moc-voltage --region ams --size 1 --yes'));
  assert.match(r.calls.find((c) => c.startsWith('storage create')), /--app moc-voltage --name moc-voltage-backup/);
  const sec = r.calls.find((c) => c.startsWith('secrets set'));
  assert.match(sec, /--stage --app moc-voltage/);
  for (const k of ['OIDC_ISSUER', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'ADMIN_EMAILS', 'MAIL_API_KEY', 'MAIL_FROM=Voltage AI <hello@mail.example.com>', 'MAIL_REPLY_TO=voltage@example.com', 'NOTIFY_TO=voltage@example.com', 'SESSION_SECRET']) assert.ok(sec.includes(k), k);
  assert.doesNotMatch(r.out, /GOCSPX-supersecret|re_supersecretkey/, 'secret values are masked in what is printed');
  assert.match(r.out, /OIDC_CLIENT_SECRET=\*\*\*/);
  const cfg = readFileSync(join(s.dir, 'fly.voltage.toml'), 'utf8');
  assert.match(cfg, /^app = "moc-voltage"$/m);
  assert.match(cfg, /BRAND = "voltage"/);
  assert.match(cfg, /PUBLIC_URL = "https:\/\/moc-voltage\.fly\.dev"/);
  assert.match(r.out, /moc-voltage\.fly\.dev\/auth\/callback/, 'prints the redirect address to register');
  s.close();
});

test('setup is safe to re-run: things that already exist are left alone', { skip }, () => {
  const s = sandbox();
  s.run(['init-secrets', 'all']); s.fill();
  const r = s.run(['setup', 'voltage', '--yes'], { FLY_APP_EXISTS: '1', FLY_VOLUMES: 'vol_1 created northbound_data 1GB ams', FLY_SECRETS: 'BUCKET_NAME  AWS_REGION' });
  assert.equal(r.status, 0, r.out);
  assert.ok(!r.calls.some((c) => /^(apps|volumes|storage) create/.test(c)), r.calls.join('\n'));
  assert.ok(r.calls.some((c) => c.startsWith('secrets set --stage')));
  s.close();
});

test('setup asks before creating billable things, and stops if it cannot ask', { skip }, () => {
  const s = sandbox();
  s.run(['init-secrets', 'all']); s.fill();
  const r = s.run(['setup', 'voltage']); // no --yes, and no terminal
  assert.notEqual(r.status, 0);
  assert.match(r.out, /incur charges.*Re-run with --yes/s);
  assert.ok(!r.calls.some((c) => /create/.test(c)));
  s.close();
});

test('deploy: refuses without a backup bucket; otherwise deploys one machine with the brand config', { skip }, () => {
  const s = sandbox();
  s.run(['init-secrets', 'all']); s.fill();
  const noBucket = s.run(['deploy', 'voltage', '--no-health'], { FLY_APP_EXISTS: '1', FLY_VOLUMES: 'northbound_data', FLY_SECRETS: 'ADMIN_EMAILS' });
  assert.notEqual(noBucket.status, 0);
  assert.match(noBucket.out, /BUCKET_NAME missing/);
  assert.ok(!noBucket.calls.some((c) => c.startsWith('deploy')));

  const ok = s.run(['deploy', 'voltage', '--no-health'], { FLY_APP_EXISTS: '1', FLY_VOLUMES: 'northbound_data', FLY_SECRETS: ALL_SECRETS });
  assert.equal(ok.status, 0, ok.out);
  assert.ok(ok.calls.includes(`deploy -c ${join(s.dir, 'fly.voltage.toml')} --app moc-voltage --ha=false`), ok.calls.join('\n'));
  assert.ok(ok.calls.includes('scale count 1 --app moc-voltage --yes'));
  s.close();
});

test('deploy: refuses when required secrets are missing on Fly, and needs no local secrets files', { skip }, () => {
  const s = sandbox();
  // note: no init-secrets here, as in CI. Fly has the bucket but is missing most required secrets.
  const missing = s.run(['deploy', 'voltage', '--no-health'], { FLY_APP_EXISTS: '1', FLY_VOLUMES: 'northbound_data', FLY_SECRETS: 'BUCKET_NAME ADMIN_EMAILS' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.out, /not set on Fly: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, MAIL_API_KEY/);
  assert.ok(!missing.calls.some((c) => c.startsWith('deploy')));
  const ok = s.run(['deploy', 'voltage', '--no-health'], { FLY_APP_EXISTS: '1', FLY_VOLUMES: 'northbound_data', FLY_SECRETS: ALL_SECRETS });
  assert.equal(ok.status, 0, ok.out);
  assert.ok(ok.calls.some((c) => c.startsWith('deploy -c')));
  s.close();
});

test('deploy --skip-checks (for CI) does not ask Fly about secrets or volumes first', { skip }, () => {
  const s = sandbox();
  const r = s.run(['deploy', 'voltage', '--no-health', '--skip-checks']); // nothing exists on the stub, and that is fine here
  assert.equal(r.status, 0, r.out);
  assert.ok(!r.calls.some((c) => c.startsWith('secrets list') || c.startsWith('volumes list')));
  assert.ok(r.calls.some((c) => c.startsWith('deploy -c')));
  s.close();
});

test('"all" skips brands marked live: false, but naming one still works', { skip }, () => {
  const s = sandbox({ region: 'ams', volume: 'northbound_data', brands: {
    voltage: { app: 'moc-voltage', url: 'https://moc-voltage.fly.dev' },
    steward: { app: 'moc-steward', url: 'https://moc-steward.fly.dev', live: false },
  } });
  const all = s.run(['urls', 'all']);
  assert.match(all.out, /voltage/);
  assert.doesNotMatch(all.out, /steward/);
  assert.match(s.run(['urls', 'steward']).out, /steward/);
  s.close();
});

test('restore-test: rehearses a restore into a scratch file on the machine, and reports failure loudly', { skip }, () => {
  const s = sandbox();
  const ok = s.run(['restore-test', 'voltage']);
  assert.equal(ok.status, 0, ok.out);
  const call = ok.calls.find((c) => c.startsWith('ssh console'));
  assert.match(call, /--app moc-voltage/);
  assert.match(call, /litestream restore -config \/etc\/litestream\.yml -o \/tmp\/restore-test\.db \/data\/platform\.db/);
  assert.match(call, /rm -f \/tmp\/restore-test\.db\*/, 'the scratch copy is deleted afterwards');
  assert.ok(!/-o \/data\//.test(call), 'never restores over the live database');
  assert.match(ok.out, /the backup restored successfully/);

  const bad = s.run(['restore-test', 'voltage'], { FLY_SSH_FAIL: '1' });
  assert.notEqual(bad.status, 0);
  assert.match(bad.out, /restore rehearsal FAILED/);
  s.close();
});

test('deploy: with several brands, a failure stops the rest', { skip }, () => {
  const s = sandbox();
  s.run(['init-secrets', 'all']); s.fill();
  // steward has no volume: the first (voltage) is fine, the second is refused
  const r = s.run(['deploy', 'voltage', 'steward', '--no-health'], { FLY_APP_EXISTS: '1', FLY_VOLUMES: 'x', FLY_SECRETS: ALL_SECRETS });
  assert.notEqual(r.status, 0);
  assert.ok(!r.calls.some((c) => c.startsWith('deploy')), 'nothing deployed when the first brand is refused');
  assert.match(r.out, /no "northbound_data" volume/);
  s.close();
});

test('--dry-run prints the commands and runs none of them', { skip }, () => {
  const s = sandbox();
  s.run(['init-secrets', 'all']); s.fill();
  const r = s.run(['setup', 'voltage', '--dry-run']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /\$ fly apps create moc-voltage/);
  assert.match(r.out, /\$ fly volumes create northbound_data/);
  assert.deepEqual(r.calls, []);
  s.close();
});

test('urls, unknown brands and a missing fly program give clear messages', { skip }, () => {
  const s = sandbox();
  const urls = s.run(['urls', 'all']);
  assert.match(urls.out, /voltage\s+https:\/\/moc-voltage\.fly\.dev\/auth\/callback/);
  assert.match(urls.out, /steward\s+https:\/\/moc-steward\.fly\.dev\/auth\/callback/);
  const bad = s.run(['setup', 'nope', '--yes']);
  assert.notEqual(bad.status, 0);
  assert.match(bad.out, /"nope" is not in deploy\/brands\.json\. Known: voltage, steward/);
  const none = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', SCRIPT, 'status', 'voltage'], { encoding: 'utf8', env: { ...process.env, PATH: '/nonexistent', FLY_MANIFEST: join(s.dir, 'brands.json') } });
  assert.match(none.stdout + none.stderr, /Fly CLI \("fly"\) was not found/);
  s.close();
});

test('the real manifest covers every brand file, with unique apps and valid settings', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'deploy', 'brands.json'), 'utf8'));
  const files = readdirSyncBrands();
  assert.deepEqual(Object.keys(manifest.brands).sort(), files);
  const apps = Object.values(manifest.brands).map((b) => b.app);
  assert.equal(new Set(apps).size, apps.length, 'unique Fly app names');
  for (const b of Object.values(manifest.brands)) {
    assert.match(b.app, /^[a-z0-9][a-z0-9-]{0,62}$/);
    assert.match(b.url, /^https:\/\//);
  }
  assert.match(manifest.region, /^[a-z]{3}$/);
});

import { readdirSync } from 'node:fs';
function readdirSyncBrands() {
  return readdirSync(join(ROOT, 'brands')).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => f.slice(0, -5)).sort();
}

// ---- check-sites: against real local servers
import http from 'node:http';
async function fakeSite(brandId, { ready = true } = {}) {
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/ready') { res.statusCode = ready ? 200 : 503; return res.end(JSON.stringify({ ok: ready })); }
    if (req.url === '/api/brand') return res.end(JSON.stringify({ id: brandId, name: brandId.toUpperCase() }));
    res.statusCode = 404; res.end('{}');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  server.unref();
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

// The fake sites live in this process, so the script must run without blocking it.
const runCheck = (env) => execFileAsync(process.execPath, [join(ROOT, 'scripts', 'check-sites.mjs')], { encoding: 'utf8', env: { ...process.env, ...env } })
  .then((r) => ({ status: 0, stdout: r.stdout }), (e) => ({ status: e.code, stdout: e.stdout }));

test('check-sites: reports up, down, wrong-brand and skipped sites, and exits non-zero on any problem', async () => {
  const up = await fakeSite('voltage');
  const wrong = await fakeSite('landing-gear'); // an app that is serving the wrong brand
  const down = await fakeSite('steward', { ready: false });
  const skipped = await fakeSite('anchorpoint', { ready: false });
  const dir = mkdtempSync(join(tmpdir(), 'check-'));
  try {
    const manifest = join(dir, 'brands.json');
    writeFileSync(manifest, JSON.stringify({ brands: {
      voltage: { app: 'a', url: up.url },
      steadfast: { app: 'b', url: wrong.url },
      steward: { app: 'c', url: down.url },
      anchorpoint: { app: 'd', url: skipped.url, live: false },
    } }));
    const r = await runCheck({ FLY_MANIFEST: manifest, CHECK_TRIES: '2', CHECK_WAIT_MS: '10' });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /OK\s+voltage\s+.*VOLTAGE/);
    assert.match(r.stdout, /DOWN\s+steadfast.*serving brand "landing-gear" but should be "steadfast"/);
    assert.match(r.stdout, /DOWN\s+steward.*\/api\/ready answered 503/);
    assert.doesNotMatch(r.stdout, /anchorpoint/, 'live: false is skipped');
    assert.match(r.stdout, /2 of 3 sites need attention/);

    writeFileSync(manifest, JSON.stringify({ brands: { voltage: { app: 'a', url: up.url } } }));
    const ok = await runCheck({ FLY_MANIFEST: manifest });
    assert.equal(ok.status, 0);
    assert.match(ok.stdout, /All 1 sites are up/);

    writeFileSync(manifest, JSON.stringify({ brands: { voltage: { app: 'a', url: 'http://127.0.0.1:1' } } }));
    const refused = await runCheck({ FLY_MANIFEST: manifest, CHECK_TRIES: '1' });
    assert.equal(refused.status, 1);
    assert.match(refused.stdout, /DOWN\s+voltage/);
  } finally { rmSync(dir, { recursive: true, force: true }); [up, wrong, down, skipped].forEach((s) => s.close()); }
});
