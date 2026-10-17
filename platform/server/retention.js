const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes requests nobody has touched for `days` days, together with their email
 * records. Requests marked "working" (clients) or put on hold are kept.
 * `days` of 0 turns retention off.
 */
export function createRetention({ store, days, log = console }) {
  let timer = null;
  const api = {
    run(now = new Date()) {
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
      if (!days) { log.log('[retention] disabled (RETENTION_DAYS=0): requests are kept indefinitely'); return; }
      const safe = () => { try { api.run(); } catch (e) { log.error('[retention]', e); } };
      safe();
      timer = setInterval(safe, DAY_MS);
      timer.unref();
    },
    stop() { if (timer) clearInterval(timer); timer = null; },
  };
  return api;
}
