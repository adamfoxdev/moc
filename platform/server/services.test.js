import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from './recommend.js';
import { loadBrand } from './brand.js';
import { validateAnswers } from './validate.js';
import { createApp } from './app.js';
import { createStore } from './db.js';

const ids = (r) => r.paths.map((p) => p.id);

test('data management: spreadsheets and messy data lead to the data route', () => {
  const r = recommend({ goal: 'Our customer data is in a dozen spreadsheets and nobody trusts the reporting' });
  assert.equal(r.paths[0].id, 'data');
  assert.match(r.paths[0].title, /data organised/);
  assert.ok(r.questions.some((q) => /spreadsheets hold the data/.test(q)));
  assert.equal(recommend({ goal: 'x', helpWith: ['data'] }).paths[0].id, 'data');
});

test('cloud and hosting: hosting, uptime and backups lead to the hosting route', () => {
  const r = recommend({ goal: 'Our app is on a free tier, went down twice last month, and has no backups' });
  assert.equal(r.paths[0].id, 'hosting');
  assert.ok(r.questions.some((q) => /what that cost|what does that cost|cost each month/.test(q)));
  assert.equal(recommend({ goal: 'x', helpWith: ['hosting'] }).paths[0].id, 'hosting');
});

test('support: asking for it, or a live system, offers the support route; advice stays separate', () => {
  assert.equal(recommend({ goal: 'We need ongoing support and a retainer for our portal' }).paths[0].id, 'support');
  assert.ok(ids(recommend({ goal: 'Our app is live and customers use it', stage: 'live' })).includes('support'));
  const advice = recommend({ goal: 'x', helpWith: ['advice'] });
  assert.ok(ids(advice).includes('advice'));
  assert.ok(!ids(advice).includes('support'));
});

test('the new help options are accepted by validation, and bad ones are not', () => {
  const base = { goal: 'A goal long enough to count', name: 'Sam', email: 'sam@example.com', consent: true };
  assert.equal(validateAnswers({ ...base, helpWith: ['data', 'hosting', 'support'] }, { requireCore: true }).ok, true);
  assert.ok(validateAnswers({ ...base, helpWith: ['crypto'] }, { requireCore: true }).errors.helpWith);
});

test('a brand\'s focus leads, even when the request does not mention it', () => {
  const vague = { goal: 'We would like some help with our business technology please' };
  assert.equal(recommend(vague, { focus: ['data'] }).paths[0].id, 'data');
  assert.equal(recommend(vague, { focus: ['hosting'] }).paths[0].id, 'hosting');
  assert.equal(recommend(vague, { focus: ['support'] }).paths[0].id, 'support');
  assert.equal(recommend(vague, { focus: ['ai'] }).paths[0].id, 'ai-addon');
  assert.equal(recommend({ ...vague, stage: 'prototype' }, { focus: ['production'] }).paths[0].id, 'vibe-migration');
  assert.equal(recommend(vague, { focus: ['production'] }).paths[0].id, 'vibe-migration', 'a production brand assumes there is something to take to production');
  assert.equal(recommend({ goal: 'I have an idea for a booking platform' }, { focus: ['production'] }).paths[0].id, 'poc', 'but still respects a stated idea');
});

test('a brand\'s focus boosts but does not hide what the request is really about', () => {
  const r = recommend({ goal: 'Our customer data is in a dozen spreadsheets and nobody trusts the reporting' }, { focus: ['hosting'] });
  assert.ok(ids(r).includes('data'), 'the data route is still offered');
  assert.equal(r.paths[0].id, 'hosting', 'but the brand\'s own line leads');
  assert.ok(r.paths.length <= 3);
});

test('no focus means no change: the general brand behaves as before', () => {
  const goal = 'We built a booking tool with Lovable and need it live';
  assert.deepEqual(recommend({ goal }), recommend({ goal }, { focus: [] }));
  assert.equal(recommend({ goal }).paths[0].id, 'vibe-migration');
});

test('no route mentions prices, whatever the focus', () => {
  for (const focus of [[], ['data'], ['hosting'], ['support'], ['ai'], ['production']]) {
    assert.doesNotMatch(JSON.stringify(recommend({ goal: 'Not sure what we need yet really' }, { focus })), /\$\s?\d/);
  }
});

test('each brand\'s deployment applies its own focus to the first read it shows', async () => {
  const expected = { steward: 'data', anchorpoint: 'hosting', steadfast: 'support', voltage: 'ai-addon', 'landing-gear': 'vibe-migration' };
  for (const [id, first] of Object.entries(expected)) {
    const store = createStore(':memory:');
    const app = createApp({ store, serveStatic: false, authConfig: null, brand: loadBrand(id) });
    const server = await new Promise((r) => { const s = app.listen(0, () => { s.unref(); r(s); }); });
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/requests`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ goal: 'We would like some help with our business technology please', name: 'Sam', email: 'sam@example.com', consent: true }),
    });
    const body = await res.json();
    assert.equal(body.recommendation.paths[0].id, first, id);
    server.close(); store.close();
  }
});
