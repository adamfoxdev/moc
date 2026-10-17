import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const defaultPath = resolve(here, '..', 'data', 'platform.db');

// Unambiguous characters only (no 0/O, 1/I/L) so references can be read over the phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newReference() {
  const bytes = randomBytes(6);
  let out = 'NB-';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const STATUSES = ['new', 'contacted', 'call-booked', 'working', 'closed'];

/**
 * Local persistence for onboarding requests. Everything the app needs from a
 * database goes through this object, so moving to another database later means
 * replacing this file and nothing else.
 */
export function createStore(path = process.env.DB_PATH || defaultPath) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  // WAL is required for Litestream's continuous backup and lets readers and the writer overlap.
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      goal TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      recommendation_json TEXT NOT NULL,
      edit_token TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS requests_created ON requests (created_at DESC);

    -- Emails are queued here and sent by a worker, so a mail outage never
    -- loses a notification or slows down a submission. Only the recipient and
    -- the kind are stored; the body is rendered from the request at send time.
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      kind TEXT NOT NULL,
      request_id TEXT NOT NULL,
      to_addr TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      sent_at TEXT,
      last_error TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS outbox_due ON outbox (status, next_attempt_at);
    CREATE INDEX IF NOT EXISTS outbox_request ON outbox (request_id);

    -- A record of deletions and exports. It holds a request reference and an
    -- action, never names, emails or request content.
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      request_id TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT ''
    );
  `);

  // Additive migrations, so databases created by earlier versions keep working.
  const have = new Set(db.prepare('PRAGMA table_info(requests)').all().map((c) => c.name));
  for (const [col, ddl] of [
    ['hold', 'hold INTEGER NOT NULL DEFAULT 0'],
    ['consent_at', "consent_at TEXT NOT NULL DEFAULT ''"],
    ['notice_version', "notice_version TEXT NOT NULL DEFAULT ''"],
  ]) {
    if (!have.has(col)) db.exec(`ALTER TABLE requests ADD COLUMN ${ddl}`);
  }

  const insert = db.prepare(`INSERT INTO requests
    (id, created_at, updated_at, name, email, company, goal, answers_json, recommendation_json, edit_token,
     consent_at, notice_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const selectOne = db.prepare('SELECT * FROM requests WHERE id = ?');
  const selectAll = db.prepare('SELECT * FROM requests ORDER BY created_at DESC LIMIT 500');
  const updateAnswers = db.prepare(`UPDATE requests SET updated_at = ?, name = ?, email = ?, company = ?,
    goal = ?, answers_json = ?, recommendation_json = ? WHERE id = ?`);
  const updateAdmin = db.prepare('UPDATE requests SET updated_at = ?, status = ?, notes = ?, hold = ? WHERE id = ?');
  const deleteOutbox = db.prepare('DELETE FROM outbox WHERE request_id = ?');
  const deleteRequest = db.prepare('DELETE FROM requests WHERE id = ?');
  const expired = db.prepare(`SELECT id FROM requests WHERE updated_at < ? AND hold = 0 AND status != 'working'`);
  const insertAudit = db.prepare('INSERT INTO audit (at, actor, action, request_id, detail) VALUES (?, ?, ?, ?, ?)');
  const selectAudit = db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT ?');
  const auditFor = db.prepare('SELECT * FROM audit WHERE request_id = ? ORDER BY id');

  const insertEmail = db.prepare(`INSERT INTO outbox (created_at, kind, request_id, to_addr, next_attempt_at)
    VALUES (?, ?, ?, ?, ?)`);
  const dueEmails = db.prepare(`SELECT * FROM outbox WHERE status = 'pending' AND next_attempt_at <= ?
    ORDER BY id LIMIT ?`);
  const markSent = db.prepare(`UPDATE outbox SET status = 'sent', sent_at = ?, attempts = attempts + 1, last_error = '' WHERE id = ?`);
  const markRetry = db.prepare(`UPDATE outbox SET attempts = attempts + 1, next_attempt_at = ?, last_error = ? WHERE id = ?`);
  const markFailed = db.prepare(`UPDATE outbox SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?`);
  const emailsFor = db.prepare('SELECT * FROM outbox WHERE request_id = ? ORDER BY id');
  const pendingOfKind = db.prepare(`SELECT 1 FROM outbox WHERE kind = ? AND request_id = ? AND status = 'pending' LIMIT 1`);
  const recentTo = db.prepare(`SELECT COUNT(*) AS n FROM outbox WHERE kind = ? AND to_addr = ? AND created_at >= ?`);
  const retryEmail = db.prepare(`UPDATE outbox SET status = 'pending', next_attempt_at = ?, last_error = '' WHERE id = ? AND status = 'failed'`);

  const email = (e) => e && ({
    id: e.id, kind: e.kind, requestId: e.request_id, to: e.to_addr, status: e.status,
    attempts: e.attempts, createdAt: e.created_at, nextAttemptAt: e.next_attempt_at,
    sentAt: e.sent_at, lastError: e.last_error,
  });

  const row = (r) => r && ({
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    status: r.status,
    name: r.name,
    email: r.email,
    company: r.company,
    goal: r.goal,
    answers: JSON.parse(r.answers_json),
    recommendation: JSON.parse(r.recommendation_json),
    notes: r.notes,
    hold: !!r.hold,
    consentAt: r.consent_at,
    noticeVersion: r.notice_version,
  });
  const auditRow = (a) => ({ id: a.id, at: a.at, actor: a.actor, action: a.action, requestId: a.request_id, detail: a.detail });

  const transaction = (fn) => {
    db.exec('BEGIN');
    try { const out = fn(); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
  };

  return {
    create(answers, recommendation, { noticeVersion = '' } = {}) {
      const id = newReference();
      const editToken = randomBytes(24).toString('hex');
      const now = new Date().toISOString();
      insert.run(id, now, now, answers.name, answers.email, answers.company || '', answers.goal,
        JSON.stringify(answers), JSON.stringify(recommendation), editToken, now, noticeVersion);
      return { id, editToken };
    },
    get: (id) => row(selectOne.get(id)) ?? null,
    editTokenFor: (id) => selectOne.get(id)?.edit_token ?? null,
    list: () => selectAll.all().map(row),
    updateAnswers(id, answers, recommendation) {
      updateAnswers.run(new Date().toISOString(), answers.name, answers.email, answers.company || '',
        answers.goal, JSON.stringify(answers), JSON.stringify(recommendation), id);
    },
    updateAdmin(id, { status, notes, hold }) {
      const cur = selectOne.get(id);
      if (!cur) return false;
      updateAdmin.run(new Date().toISOString(), status ?? cur.status, notes ?? cur.notes,
        hold === undefined ? cur.hold : hold ? 1 : 0, id);
      return true;
    },
    // Removes a request and every email record about it, together.
    deleteRequest: (id) => transaction(() => {
      deleteOutbox.run(id);
      return deleteRequest.run(id).changes > 0;
    }),
    // Requests untouched since `cutoff`, other than clients (status "working") and ones on hold.
    expiredIds: (cutoff) => expired.all(cutoff.toISOString()).map((r) => r.id),
    audit(actor, action, requestId = '', detail = '', at = new Date()) {
      insertAudit.run(at.toISOString(), actor, action, requestId, String(detail).slice(0, 300));
    },
    auditList: (limit = 200) => selectAudit.all(limit).map(auditRow),
    auditFor: (requestId) => auditFor.all(requestId).map(auditRow),
    enqueueEmail({ kind, requestId, to, at = new Date() }) {
      const iso = at.toISOString();
      insertEmail.run(iso, kind, requestId, to, iso);
    },
    dueEmails: (now = new Date(), limit = 20) => dueEmails.all(now.toISOString(), limit).map(email),
    markEmailSent: (id, now = new Date()) => { markSent.run(now.toISOString(), id); },
    markEmailRetry: (id, next, error) => { markRetry.run(next.toISOString(), String(error).slice(0, 500), id); },
    markEmailFailed: (id, error) => { markFailed.run(String(error).slice(0, 500), id); },
    emailsFor: (requestId) => emailsFor.all(requestId).map(email),
    hasPendingEmail: (kind, requestId) => !!pendingOfKind.get(kind, requestId),
    countRecentEmails: (kind, to, since) => recentTo.get(kind, to, since.toISOString()).n,
    retryEmail: (id, now = new Date()) => retryEmail.run(now.toISOString(), id).changes > 0,
    ping: () => db.prepare('SELECT 1 AS ok').get().ok === 1,
    close: () => db.close(),
  };
}
