import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAnswers, validateAdminUpdate } from './validate.js';
import { recommend } from './recommend.js';
import { STATUSES } from './db.js';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

const digest = (s) => createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => timingSafeEqual(digest(a), digest(b));

export function createApp({
  store,
  adminToken = process.env.ADMIN_TOKEN,
  maxSubmissions = 5,
  windowMs = 15 * 60 * 1000,
  serveStatic = true,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);
  app.use(express.json({ limit: '64kb' }));

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
    });
    next();
  });

  // Minimal in-memory limiter for the public form. Good enough for one
  // instance; put a shared limiter in front when this is scaled out.
  const hits = new Map();
  const limited = (ip) => {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= maxSubmissions) { hits.set(ip, recent); return true; }
    recent.push(now);
    hits.set(ip, recent);
    return false;
  };

  const publicView = (r) => ({ reference: r.id, name: r.name, answers: r.answers, recommendation: r.recommendation });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Get in the door: only goal, name, email and consent are required.
  app.post('/api/requests', (req, res) => {
    if (limited(req.ip)) {
      return res.status(429).json({ error: 'Lots of requests from your connection just now. Please try again in a little while, or email us directly.' });
    }
    // Honeypot: bots fill the hidden field. Pretend success, store nothing.
    if (typeof req.body?.website === 'string' && req.body.website.trim()) {
      return res.status(201).json({ reference: 'NB-SENT', editToken: 'none', recommendation: { headline: '', paths: [], flags: [], questions: [] } });
    }
    const { ok, errors, value } = validateAnswers(req.body, { requireCore: true });
    if (!ok) return res.status(400).json({ errors });
    const recommendation = recommend(value);
    const { id, editToken } = store.create(value, recommendation);
    res.status(201).json({ reference: id, editToken, recommendation });
  });

  // Add detail afterwards. The edit token is only ever given to the person
  // who created the request, so a guessed reference cannot change anything.
  app.put('/api/requests/:id/details', (req, res) => {
    const token = req.get('x-edit-token');
    const stored = store.editTokenFor(req.params.id);
    if (!stored || !token || !safeEqual(token, stored)) return res.status(403).json({ error: 'Not allowed.' });
    const { ok, errors, value } = validateAnswers(req.body, { requireCore: false });
    if (!ok) return res.status(400).json({ errors });
    const current = store.get(req.params.id);
    delete value.consent; // consent is given once, at creation
    const merged = { ...current.answers, ...value };
    const recommendation = recommend(merged);
    store.updateAnswers(req.params.id, merged, recommendation);
    res.json({ reference: req.params.id, recommendation });
  });

  app.get('/api/requests/:id', (req, res) => {
    const token = req.get('x-edit-token');
    const stored = store.editTokenFor(req.params.id);
    if (!stored || !token || !safeEqual(token, stored)) return res.status(403).json({ error: 'Not allowed.' });
    res.json(publicView(store.get(req.params.id)));
  });

  const admin = express.Router();
  admin.use((req, res, next) => {
    if (!adminToken) return res.status(503).json({ error: 'Admin is disabled. Set ADMIN_TOKEN to enable it.' });
    const given = req.get('x-admin-token');
    if (!given || !safeEqual(given, adminToken)) return res.status(401).json({ error: 'Unauthorised.' });
    next();
  });
  admin.get('/requests', (_req, res) => res.json({ statuses: STATUSES, requests: store.list() }));
  admin.get('/requests/:id', (req, res) => {
    const r = store.get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found.' });
    res.json(r);
  });
  admin.patch('/requests/:id', (req, res) => {
    const { ok, errors, value } = validateAdminUpdate(req.body, STATUSES);
    if (!ok) return res.status(400).json({ errors });
    if (!store.updateAdmin(req.params.id, value)) return res.status(404).json({ error: 'Not found.' });
    res.json(store.get(req.params.id));
  });
  app.use('/api/admin', admin);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  if (serveStatic && existsSync(dist)) {
    app.use(express.static(dist));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(join(dist, 'index.html')) : next()));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'That did not look like valid JSON.' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'That was too large.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our side.' });
  });

  return app;
}
