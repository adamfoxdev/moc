import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadBrand, listBrands, brandCss, faviconSvg, publicBrand, brandProblems, FONT_STACKS } from './brand.js';
import { renderNotice } from './notice.js';
import { renderEmail } from './emails.js';
import { recommend } from './recommend.js';
import { createApp } from './app.js';
import { createStore } from './db.js';

const ids = listBrands();

// WCAG contrast ratio between two #rrggbb colours.
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('there are five brands and each one loads, validates and is distinct', () => {
  assert.deepEqual(ids, ['brightline', 'meridian', 'northbound', 'oakridge', 'pulse']);
  const brands = ids.map((id) => loadBrand(id));
  assert.equal(new Set(brands.map((b) => b.name)).size, 5);
  assert.equal(new Set(brands.map((b) => b.layout)).size, 5, 'each brand uses a different layout');
  for (const b of brands) assert.deepEqual(brandProblems(b), [], b.id);
});

test('northbound keeps the original look (light accent darkened slightly for contrast)', () => {
  const b = loadBrand('northbound');
  assert.equal(b.colors.light.accent, '#0b7a5e');
  assert.equal(b.colors.dark.bg, '#0b1020');
  assert.equal(b.layout, 'split');
  assert.match(brandCss(b), /prefers-color-scheme:dark/);
});

test('every brand is readable: text, links, buttons and warnings meet WCAG contrast', () => {
  for (const id of ids) {
    const b = loadBrand(id);
    const schemes = b.scheme === 'auto' ? ['light', 'dark'] : [b.scheme];
    for (const s of schemes) {
      const c = b.colors[s];
      const check = (fg, bg, min, what) => assert.ok(ratio(c[fg], c[bg]) >= min, `${id}/${s}: ${what} (${fg} on ${bg}) is ${ratio(c[fg], c[bg]).toFixed(2)}, needs ${min}`);
      check('text', 'bg', 4.5, 'body text'); check('text', 'card', 4.5, 'text on cards'); check('text', 'bg2', 4.5, 'text in fields');
      check('muted', 'bg', 4.5, 'secondary text'); check('muted', 'card', 4.5, 'secondary text on cards'); check('muted', 'bg2', 4.5, 'secondary text in fields');
      check('accent2', 'bg', 4.5, 'links'); check('accent2', 'card', 4.5, 'links on cards');
      check('onAccent', 'accent', 4.5, 'button text');
      check('err', 'bg', 4.5, 'error text'); check('err', 'card', 4.5, 'error text on cards');
      check('accent', 'bg', 3, 'accent used for headings and ticks');
    }
    assert.ok(ratio(b.hero.fg, b.hero.bg) >= 4.5, `${id}: hero text on hero background`);
    if (b.hero.bg2) assert.ok(ratio(b.hero.fg, b.hero.bg2) >= 4.5, `${id}: hero text on hero gradient end`);
  }
});

test('validation: bad brands are rejected with every problem named', () => {
  const dir = mkdtempSync(join(tmpdir(), 'brands-'));
  try {
    writeFileSync(join(dir, 'bad.json'), JSON.stringify({ name: 'Bad <b>Co</b>', layout: 'zigzag', fonts: { body: 'comic' }, colors: { light: { accent: 'red' } }, shape: { radius: 400 }, copy: { headline: '{{x}}' } }));
    assert.throws(() => loadBrand('bad', dir), (e) => /layout must be one of/.test(e.message) && /fonts\.body/.test(e.message) && /colors\.light\.accent/.test(e.message) && /shape\.radius/.test(e.message) && /name is required and must not contain/.test(e.message) && /copy\.headline/.test(e.message));
    assert.throws(() => loadBrand('missing', dir), /Unknown BRAND "missing"\. Available brands: bad/);
    assert.throws(() => loadBrand('../etc/passwd', dir), /not a valid brand id/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a brand file only needs to list what it changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'brands-'));
  try {
    writeFileSync(join(dir, 'tiny.json'), JSON.stringify({ name: 'Tiny Co' }));
    const b = loadBrand('tiny', dir);
    assert.equal(b.shortName, 'Tiny Co');
    assert.deepEqual(b.wordmark, ['Tiny Co']);
    assert.equal(b.layout, 'split');
    assert.ok(b.copy.points.length >= 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('copy placeholders expand to the brand name', () => {
  assert.match(loadBrand('brightline').copy.lead, /how Brightline can help/);
  assert.match(loadBrand('oakridge').copy.lead, /A partner at Oakridge Advisory reads/);
});

test('css: only system fonts, fixed or adaptive colour scheme, and outranks the base stylesheet', () => {
  for (const id of ids) {
    const b = loadBrand(id);
    const css = brandCss(b);
    assert.match(css, /^:root:root\{/);
    assert.doesNotMatch(css, /url\(|@import|https?:/, 'nothing is fetched from elsewhere');
    assert.ok(css.includes(FONT_STACKS[b.fonts.body]));
    if (b.scheme === 'auto') assert.match(css, /@media \(prefers-color-scheme:dark\)/);
    else assert.doesNotMatch(css, /@media/);
  }
  assert.match(brandCss(loadBrand('pulse')), /color-scheme:dark;/);
  assert.match(brandCss(loadBrand('brightline')), /--btn-radius:999px/);
  assert.match(brandCss(loadBrand('brightline')), /--hero-bg:linear-gradient/);
});

test('favicon: the initial on the accent colour, with text escaped', () => {
  const svg = faviconSvg(loadBrand('pulse'));
  assert.match(svg, /fill="#c6ff3d"/);
  assert.match(svg, />P<\/text>/);
});

test('privacy notice: brand name replaces Northbound; legal details fill their placeholders; the fingerprint differs per brand', () => {
  const a = renderNotice(loadBrand('oakridge'));
  assert.doesNotMatch(a.markdown, /Northbound/);
  assert.match(a.markdown, /Oakridge Advisory/);
  assert.equal(a.draft, true, 'placeholders remain until the legal details are supplied');

  const b = loadBrand('oakridge');
  b.legal = { legalName: 'Oakridge Advisory Ltd', entityType: 'limited company', jurisdiction: 'England and Wales', regNo: '01234567', address: '1 High Street, Oakridge', privacyEmail: 'privacy@oakridge.test', region: 'Amsterdam (EU)', lastUpdated: '1 November 2026', retention: '12 months', logRetention: '30 days' };
  const filled = renderNotice(b);
  assert.match(filled.markdown, /\*\*Oakridge Advisory Ltd\*\*/);
  assert.match(filled.markdown, /privacy@oakridge\.test/);
  assert.match(filled.markdown, /Amsterdam \(EU\)/);
  assert.notEqual(filled.version, a.version);
  assert.notEqual(renderNotice(loadBrand('pulse')).version, a.version);
});

test('emails: use the brand name, and team alerts are tagged with the brand', () => {
  const answers = { goal: 'A goal long enough to count', name: 'Sam', email: 'sam@example.com' };
  const r = { id: 'NB-TEST22', name: 'Sam', email: 'sam@example.com', company: '', goal: answers.goal, answers, recommendation: recommend(answers), createdAt: '2026-01-01T00:00:00.000Z' };
  const brand = loadBrand('brightline');
  const c = renderEmail('confirmation', r, { brand });
  assert.match(c.text, /A person at Brightline Labs will read/);
  assert.doesNotMatch(c.text + c.html, /Northbound/);
  assert.match(renderEmail('team-new', r, { brand }).subject, /^\[Brightline\] New request NB-TEST22/);
  assert.match(renderEmail('team-new', r, {}).subject, /^New request/, 'still works without a brand');
});

test('API: each deployment serves its own brand, stylesheet, favicon and notice', async () => {
  for (const id of ['brightline', 'pulse']) {
    const store = createStore(':memory:');
    const app = createApp({ store, serveStatic: false, brand: loadBrand(id), authConfig: null });
    const server = await new Promise((r) => { const s = app.listen(0, () => { s.unref(); r(s); }); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const brand = await (await fetch(base + '/api/brand')).json();
    assert.equal(brand.id, id);
    assert.deepEqual(Object.keys(brand).sort(), ['copy', 'footer', 'header', 'id', 'layout', 'name', 'placeholder', 'shortName', 'tagline', 'wordmark']);
    const css = await fetch(base + '/brand.css');
    assert.match(css.headers.get('content-type'), /text\/css/);
    assert.match(await css.text(), /^:root:root\{/);
    const icon = await fetch(base + '/favicon.svg');
    assert.match(icon.headers.get('content-type'), /image\/svg\+xml/);
    const notice = await (await fetch(base + '/api/notice')).json();
    assert.match(notice.markdown, new RegExp(brand.name));
    assert.equal(notice.draft, true);
    // the consent record carries this brand's notice fingerprint
    const res = await fetch(base + '/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal: 'A goal long enough to count', name: 'Sam', email: 'sam@example.com', consent: true }) });
    const { reference } = await res.json();
    assert.equal(store.get(reference).noticeVersion, renderNotice(loadBrand(id)).version);
    server.close(); store.close();
  }
});
