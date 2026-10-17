import nodemailer from 'nodemailer';

/**
 * Read mail settings from the environment. Defaults to the "log" transport,
 * which prints emails to the console so nothing leaves the machine in dev.
 */
export function mailConfigFromEnv(env = process.env) {
  const transport = (env.MAIL_TRANSPORT || 'log').toLowerCase();
  if (!['log', 'smtp'].includes(transport)) {
    throw new Error(`MAIL_TRANSPORT must be "log" or "smtp" (got "${env.MAIL_TRANSPORT}")`);
  }
  const notifyTo = (env.NOTIFY_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  const cfg = {
    transport,
    from: env.MAIL_FROM || '',
    replyTo: env.MAIL_REPLY_TO || '',
    notifyTo,
    publicUrl: env.PUBLIC_URL || '',
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
  return {
    async send(m) {
      log.log(`[mail:log] to=${m.to} reply-to=${m.replyTo || cfg.replyTo || '-'} subject=${JSON.stringify(m.subject)}\n${m.text}\n`);
    },
  };
}
