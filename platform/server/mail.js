import nodemailer from 'nodemailer';

// "smtp" suits hosts that allow outbound SMTP. "resend" and "postmark" send over HTTPS,
// which works on platforms (such as Fly.io) that restrict outbound SMTP ports.
const TRANSPORTS = ['log', 'smtp', 'resend', 'postmark'];
const API_URLS = { resend: 'https://api.resend.com/emails', postmark: 'https://api.postmarkapp.com/email' };

/**
 * Read mail settings from the environment. Defaults to the "log" transport,
 * which prints emails to the console so nothing leaves the machine in dev.
 */
export function mailConfigFromEnv(env = process.env) {
  const transport = (env.MAIL_TRANSPORT || 'log').toLowerCase();
  if (!TRANSPORTS.includes(transport)) {
    throw new Error(`MAIL_TRANSPORT must be one of ${TRANSPORTS.join(', ')} (got "${env.MAIL_TRANSPORT}")`);
  }
  const notifyTo = (env.NOTIFY_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  const cfg = {
    transport,
    from: env.MAIL_FROM || '',
    replyTo: env.MAIL_REPLY_TO || '',
    notifyTo,
    publicUrl: env.PUBLIC_URL || '',
    api: { key: env.MAIL_API_KEY || '', url: env.MAIL_API_URL || API_URLS[transport] || '' },
    smtp: {
      host: env.SMTP_HOST || '',
      port: Number(env.SMTP_PORT) || 587,
      // Port 465 is implicit TLS; 587 upgrades with STARTTLS.
      secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : Number(env.SMTP_PORT) === 465,
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
    },
  };
  if (transport === 'smtp') {
    const missing = [];
    if (!cfg.smtp.host) missing.push('SMTP_HOST');
    if (!cfg.from) missing.push('MAIL_FROM');
    if (Boolean(cfg.smtp.user) !== Boolean(cfg.smtp.pass)) missing.push('SMTP_USER and SMTP_PASS together');
    if (missing.length) throw new Error(`MAIL_TRANSPORT=smtp needs: ${missing.join(', ')}`);
  }
  if (transport === 'resend' || transport === 'postmark') {
    const missing = [];
    if (!cfg.api.key) missing.push('MAIL_API_KEY');
    if (!cfg.from) missing.push('MAIL_FROM');
    if (missing.length) throw new Error(`MAIL_TRANSPORT=${transport} needs: ${missing.join(', ')}`);
  }
  if (!cfg.from) cfg.from = 'Northbound <onboarding@localhost>';
  return cfg;
}

/** A mailer is { send({ to, replyTo, subject, text, html }) }. */
export function createMailer(cfg, log = console) {
  if (cfg.transport === 'smtp') {
    const t = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: cfg.smtp.secure,
      auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    return {
      send: (m) => t.sendMail({ from: cfg.from, replyTo: m.replyTo || cfg.replyTo || undefined, to: m.to, subject: m.subject, text: m.text, html: m.html }),
    };
  }
  if (cfg.transport === 'resend' || cfg.transport === 'postmark') return createApiMailer(cfg);
  return {
    async send(m) {
      log.log(`[mail:log] to=${m.to} reply-to=${m.replyTo || cfg.replyTo || '-'} subject=${JSON.stringify(m.subject)}\n${m.text}\n`);
    },
  };
}

const list = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean);

function createApiMailer(cfg) {
  const { key, url } = cfg.api;
  const build = (m) => {
    const replyTo = m.replyTo || cfg.replyTo || undefined;
    if (cfg.transport === 'resend') {
      return {
        headers: { Authorization: `Bearer ${key}` },
        body: { from: cfg.from, to: list(m.to), reply_to: replyTo, subject: m.subject, text: m.text, html: m.html },
      };
    }
    return {
      headers: { 'X-Postmark-Server-Token': key },
      body: { From: cfg.from, To: list(m.to).join(','), ReplyTo: replyTo, Subject: m.subject, TextBody: m.text, HtmlBody: m.html, MessageStream: 'outbound' },
    };
  };
  return {
    async send(m) {
      const { headers, body } = build(m);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return;
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      const err = new Error(`${cfg.transport} responded ${res.status}: ${detail}`);
      // The queue treats responseCode 5xx as "never retry". For an HTTP API that means a rejected
      // request (bad address, bad key, unverified domain), not a server error or rate limit.
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) err.responseCode = 550;
      throw err;
    },
  };
}
