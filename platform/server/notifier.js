import { renderEmail } from './emails.js';

// Delay before each retry after a failed attempt; after the last, the email is marked failed.
export const RETRY_MINUTES = [1, 5, 30, 120, 360];
const CONFIRMATIONS_PER_ADDRESS_PER_DAY = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Queues the emails for a request and drains the queue. Queueing is cheap
 * and synchronous; sending happens in tick() so a slow or broken mail server
 * never affects the person using the form.
 */
export function createNotifier({ store, mailer, config, log = console, autoSend = true }) {
  let busy = false;
  let timer = null;

  // Sending right after queueing keeps latency low; tests turn it off to drive tick() themselves.
  const kick = () => { if (autoSend) setImmediate(() => tick().catch((e) => log.error('mail worker', e))); };

  function enqueueTeam(kind, requestId) {
    if (!config.notifyTo.length) return;
    // One pending "update" email per request is enough: it is rendered at send time from the latest data.
    if (kind === 'team-update' && store.hasPendingEmail(kind, requestId)) return;
    store.enqueueEmail({ kind, requestId, to: config.notifyTo.join(', ') });
  }

  const api = {
    requestCreated(request) {
      enqueueTeam('team-new', request.id);
      // Only ever email the address the form was filled in with, and cap how many
      // confirmations one address can receive, so the form cannot be used to mail-bomb someone.
      const since = new Date(Date.now() - DAY_MS);
      if (store.countRecentEmails('confirmation', request.email, since) < CONFIRMATIONS_PER_ADDRESS_PER_DAY) {
        store.enqueueEmail({ kind: 'confirmation', requestId: request.id, to: request.email });
      }
      kick();
    },
    requestUpdated(requestId) {
      enqueueTeam('team-update', requestId);
      kick();
    },

    kick,

    async tick(now = new Date()) {
      if (busy) return 0;
      busy = true;
      let sent = 0;
      try {
        for (const e of store.dueEmails(now)) {
          const request = store.get(e.requestId);
          if (!request) { store.markEmailFailed(e.id, 'Request no longer exists'); continue; }
          try {
            const msg = renderEmail(e.kind, request, { publicUrl: config.publicUrl, brand: config.brand });
            await mailer.send({ to: e.to, replyTo: msg.replyTo, subject: msg.subject, text: msg.text, html: msg.html });
            store.markEmailSent(e.id, now);
            sent++;
          } catch (err) {
            const message = err?.message || String(err);
            const permanent = err?.responseCode >= 500 && err?.responseCode < 600;
            const delay = RETRY_MINUTES[e.attempts];
            if (permanent || delay === undefined) {
              store.markEmailFailed(e.id, message);
              log.error(`[mail] giving up on email ${e.id} (${e.kind}): ${message}`);
            } else {
              store.markEmailRetry(e.id, new Date(now.getTime() + delay * 60_000), message);
              log.warn(`[mail] email ${e.id} (${e.kind}) failed, will retry in ${delay} min: ${message}`);
            }
          }
        }
      } finally {
        busy = false;
      }
      return sent;
    },

    start(intervalMs = 30_000) {
      timer = setInterval(() => kick(), intervalMs);
      timer.unref();
      kick(); // pick up anything left over from before a restart
    },
    stop() { if (timer) clearInterval(timer); timer = null; },
  };
  const tick = api.tick;
  return api;
}
