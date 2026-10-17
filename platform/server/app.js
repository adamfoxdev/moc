import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAnswers, validateAdminUpdate } from './validate.js';
import { recommend } from './recommend.js';
import { STATUSES } from './db.js';
import { noticeVersion as currentNoticeVersion } from './notice.js';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

const digest = (s) => createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => timingSafeEqual(digest(a), digest(b));

export function createApp({
  store,
  notifier = null,
  noticeVersion = currentNoticeVersion(),
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

  // Notification problems must never fail or slow a customer's request.
  const safely = (fn) => { try { fn(); } catch (e) { console.error('notification', e); } };

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
    const { id, editToken } = store.create(value, recommendation, { noticeVersion });
    safely(() => notifier?.requestCreated({ id, email: value.email }));
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
    safely(() => notifier?.requestUpdated(req.params.id));
    res.json({ reference: req.params.id, recommendation });
  });

  app.get('/api/requests/:id', (req, res) => {
    const token = req.get('x-edit-token');
    const stored = store.editTokenFor(req.params.id);
    if (!stored || !token || !safeEqual(token, stored)) return res.status(403).json({ error: 'Not allowed.' });
    res.json(publicView(store.get(req.params.id)));
  });

  // A person's own deletion and export, using the secret from their browser session.
  const owner = (req, res, next) => {
    const token = req.get('x-edit-token');
    const stored = store.editTokenFor(req.params.id);
    if (!stored || !token || !safeEqual(token, stored)) return res.status(403).json({ error: 'Not allowed.' });
    next();
  };

  const download = (res, name, data) => {
    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    });
    res.send(JSON.stringify(data, null, 2));
  };

  const ownerExport = (r, emails) => ({
    reference: r.id,
    submittedAt: r.createdAt,
    lastActivityAt: r.updatedAt,
    name: r.name,
    email: r.email,
    company: r.company,
    request: r.goal,
    details: Object.fromEntries(Object.entries(r.answers).filter(([k]) => !['name', 'email', 'company', 'goal'].includes(k))),
    firstReadWeShowedYou: r.recommendation,
    consent: { givenAt: r.consentAt, privacyNoticeVersion: r.noticeVersion },
    emailsAboutThisRequest: emails
      .filter((e) => e.kind === 'confirmation')
      .map((e) => ({ what: 'Confirmation to you', to: e.to, status: e.status, sentAt: e.sentAt })),
  });

  app.get('/api/requests/:id/export', owner, (req, res) => {
    const r = store.get(req.params.id);
    store.audit('customer', 'export', r.id);
    download(res, `northbound-request-${r.id}.json`, ownerExport(r, store.emailsFor(r.id)));
  });

  app.delete('/api/requests/:id', owner, (req, res) => {
    if (!store.deleteRequest(req.params.id)) return res.status(404).json({ error: 'Not found.' });
    store.audit('customer', 'delete', req.params.id);
    res.json({ deleted: true });
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
    res.json({ ...r, emails: store.emailsFor(r.id) });
  });
  admin.post('/emails/:id/retry', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || !store.retryEmail(id)) return res.status(404).json({ error: 'No failed email with that id.' });
    safely(() => notifier?.kick?.());
    res.json({ ok: true });
  });
  admin.get('/requests/:id/export', (req, res) => {
    const r = store.get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found.' });
    store.audit('admin', 'export', r.id);
    download(res, `northbound-request-${r.id}-full.json`, { ...r, emails: store.emailsFor(r.id), audit: store.auditFor(r.id) });
  });
  admin.delete('/requests/:id', (req, res) => {
    if (!store.deleteRequest(req.params.id)) return res.status(404).json({ error: 'Not found.' });
    store.audit('admin', 'delete', req.params.id);
    res.json({ deleted: true });
  });
  admin.get('/audit', (_req, res) => res.json({ entries: store.auditList() }));
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
