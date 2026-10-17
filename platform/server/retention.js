const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes requests nobody has touched for `days` days, together with their email
 * records. Requests marked "working" (clients) or put on hold are kept.
 * `days` of 0 turns retention off.
 */
export function createRetention({ store, days, auditDays = 0, log = console }) {
  let timer = null;
  const api = {
    run(now = new Date()) {
      if (auditDays) {
        const gone = store.purgeAudit(new Date(now.getTime() - auditDays * DAY_MS));
        if (gone) log.log(`[retention] removed ${gone} audit entr${gone === 1 ? 'y' : 'ies'} older than ${auditDays} days`);
      }
      if (!days) return 0;
      const ids = store.expiredIds(new Date(now.getTime() - days * DAY_MS));
      let n = 0;
      for (const id of ids) {
        if (store.deleteRequest(id)) {
          store.audit('system', 'retention-delete', id, `no activity for ${days} days`, now);
          n++;
        }
      }
      if (n) log.log(`[retention] deleted ${n} request(s) inactive for over ${days} days`);
      return n;
    },
    start() {
      if (!days && !auditDays) { log.log('[retention] disabled: requests and the audit log are kept indefinitely'); return; }
      if (!days) log.log('[retention] RETENTION_DAYS=0: requests are kept indefinitely');
      const safe = () => { try { api.run(); } catch (e) { log.error('[retention]', e); } };
      safe();
      timer = setInterval(safe, DAY_MS);
      timer.unref();
    },
    stop() { if (timer) clearInterval(timer); timer = null; },
  };
  return api;
}
