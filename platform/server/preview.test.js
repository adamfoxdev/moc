import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { createStore } from './db.js';
import { loadBrand, brandCss } from './brand.js';
import { productionProblems } from './config.js';
import { renderNotice } from './notice.js';

async function start(opts = {}) {
  const store = createStore(':memory:');
  const app = createApp({ store, serveStatic: false, authConfig: null, brand: loadBrand('northbound'), ...opts });
  const server = await new Promise((r) => { const s = app.listen(0, () => { s.unref(); r(s); }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path, cookie) => fetch(base + path, { headers: cookie ? { cookie: `nb_preview=${encodeURIComponent(JSON.stringify(cookie))}` } : {} });
  return { base, store, get, close: () => { server.close(); store.close(); } };
}

test('preview is OFF by default: a preview cookie changes nothing and the switcher data is not sent', async () => {
  const t = await start();
  const info = await (await t.get('/api/brand', { brand: 'pulse', layout: 'banner' })).json();
  assert.equal(info.id, 'northbound');
  assert.equal(info.layout, 'split');
  assert.equal('preview' in info, false);
  assert.equal(await (await t.get('/brand.css', { brand: 'pulse' })).text(), brandCss(loadBrand('northbound')));
  assert.match((await (await t.get('/api/notice', { brand: 'pulse' })).json()).markdown, /Northbound/);
  t.close();
});

test('preview ON: a cookie switches brand, stylesheet, favicon, notice and layout for that browser', async () => {
  const t = await start({ brandPreview: true });
  const sel = { brand: 'pulse' };
  const info = await (await t.get('/api/brand', sel)).json();
  assert.equal(info.id, 'pulse');
  assert.equal(info.layout, 'split-reverse');
  assert.equal(info.preview.configured, 'northbound');
  assert.deepEqual(info.preview.brands.map((b) => b.id), ['brightline', 'meridian', 'northbound', 'oakridge', 'pulse']);
  assert.ok(info.preview.layouts.includes('banner'));
  assert.equal(await (await t.get('/brand.css', sel)).text(), brandCss(loadBrand('pulse')));
  assert.match(await (await t.get('/favicon.svg', sel)).text(), /fill="#c6ff3d"/);
  assert.match((await (await t.get('/api/notice', sel)).json()).markdown, /Pulse Digital/);

  const layout = await (await t.get('/api/brand', { brand: 'pulse', layout: 'banner' })).json();
  assert.equal(layout.layout, 'banner');
  assert.equal((await (await t.get('/api/brand', { layout: 'centered' })).json()).id, 'northbound', 'layout alone keeps the configured brand');

  // other browsers (no cookie) still see the configured brand
  assert.equal((await (await t.get('/api/brand')).json()).id, 'northbound');
  t.close();
});

test('preview ON: bad or hostile cookies are ignored', async () => {
  const t = await start({ brandPreview: true });
  for (const sel of [{ brand: '../etc/passwd' }, { brand: 'nope' }, { brand: 'pulse', layout: 'zigzag' }, { brand: ['pulse'] }, 'not an object']) {
    const info = await (await t.get('/api/brand', sel)).json();
    assert.ok(['northbound', 'pulse'].includes(info.id), JSON.stringify(sel));
    assert.ok(['split', 'split-reverse'].includes(info.layout), JSON.stringify(sel));
  }
  const garbage = await fetch(t.base + '/api/brand', { headers: { cookie: 'nb_preview=%7Bnot-json' } });
  assert.equal((await garbage.json()).id, 'northbound');
  t.close();
});

test('preview never touches stored data: consent is recorded against the configured brand', async () => {
  const t = await start({ brandPreview: true });
  const res = await fetch(t.base + '/api/requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `nb_preview=${encodeURIComponent(JSON.stringify({ brand: 'pulse' }))}` },
    body: JSON.stringify({ goal: 'A goal long enough to count', name: 'Sam', email: 'sam@example.com', consent: true }),
  });
  const { reference } = await res.json();
  assert.equal(t.store.get(reference).noticeVersion, renderNotice(loadBrand('northbound')).version);
  t.close();
});

test('production refuses to start with the design preview on', () => {
  const prod = { NODE_ENV: 'production', MAIL_TRANSPORT: 'resend', MAIL_API_KEY: 'k', MAIL_FROM: 'a@b.c', PUBLIC_URL: 'https://x.test', NOTIFY_TO: 't@x.test' };
  assert.deepEqual(productionProblems(prod), []);
  assert.match(productionProblems({ ...prod, BRAND_PREVIEW: 'true' }).join(), /BRAND_PREVIEW=true is a development tool/);
  assert.deepEqual(productionProblems({ BRAND_PREVIEW: 'true' }), [], 'allowed outside production');
});
