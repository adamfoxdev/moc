const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Keep user-supplied text out of header territory.
const oneLine = (s, max = 100) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

const LABELS = {
  stage: { idea: 'Just an idea', prototype: 'Prototype or demo', mvp: 'MVP with real users', live: 'Live in production', existing: 'Existing system to extend' },
  team: { none: 'No developers (wants us to take it on)', some: 'A small team', strong: 'Strong in-house team' },
  data: { none: 'Nothing sensitive', business: 'Confidential business information', personal: 'Personal data', regulated: 'Regulated data' },
  timing: { flexible: 'No fixed deadline', quarter: 'Within a few months', urgent: 'Urgent' },
  users: { few: 'A few people', tens: 'Tens', hundreds: 'Hundreds', thousands: 'Thousands or more', unknown: 'Unknown' },
};
const list = (arr) => (arr || []).join(', ');

function summaryRows(a) {
  return [
    ['Stage', LABELS.stage[a.stage]],
    ['Built with', list(a.builtWith)],
    ['Developers on their side', LABELS.team[a.team]],
    ['Wants help with', list(a.helpWith)],
    ['Users', LABELS.users[a.users]],
    ['Data', LABELS.data[a.data]],
    ['Timing', [LABELS.timing[a.timing], a.timingNote].filter(Boolean).join(': ')],
    ['Industry', a.industry],
    ['Role', a.role],
    ['Stack', a.stack],
    ['Link', a.link],
    ['Good outcome', a.outcome],
    ['Contact preference', a.contactPref],
    ['Wants NDA first', a.wantsNda ? 'Yes' : ''],
    ['Anything else', a.notes],
  ].filter(([, v]) => v);
}

function layout(bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#12182e">
<div style="max-width:600px;margin:0 auto;padding:24px"><div style="background:#fff;border:1px solid #d9dfef;border-radius:12px;padding:24px">${bodyHtml}</div></div></body></html>`;
}

function confirmation(r, { publicUrl, brand } = {}) {
  const company = brand?.name || 'Northbound';
  const privacy = publicUrl ? `${publicUrl.replace(/\/$/, '')}/privacy` : '';
  const first = oneLine(r.name).split(' ')[0] || 'there';
  const { paths, flags } = r.recommendation;
  const text = [
    `Hi ${first},`,
    '',
    `Thanks for telling us what you're working on. Your reference is ${r.id}.`,
    '',
    paths.length ? "Here's our first read, based on what you've told us so far:" : '',
    ...paths.map((p) => `  - ${p.title}`),
    '',
    ...flags.flatMap((f) => [f, '']),
    `A person at ${company} will read your request and reply by email within one business day. If it helps, we will suggest a 30-minute call. There is nothing to sign or pay to find out whether we can help.`,
    '',
    'You can reply to this email to add anything, or to ask for an NDA before you share more. Please do not send passwords, keys or customer data.',
    '',
    company,
    '',
    "If you didn't make this request, you can ignore this email.",
    privacy ? `We use your details only to reply to this request and keep a record of it. Privacy Notice: ${privacy}` : '',
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');

  const html = layout(`
<p>Hi ${esc(first)},</p>
<p>Thanks for telling us what you're working on. Your reference is <strong>${esc(r.id)}</strong>.</p>
${paths.length ? `<p>Here's our first read, based on what you've told us so far:</p><ul>${paths.map((p) => `<li>${esc(p.title)}</li>`).join('')}</ul>` : ''}
${flags.map((f) => `<p style="border-left:3px solid #2b63d9;padding-left:12px;color:#52608a">${esc(f)}</p>`).join('')}
<p>A person at ${esc(company)} will read your request and reply by email within one business day. If it helps, we'll suggest a 30-minute call. There's nothing to sign or pay to find out whether we can help.</p>
<p>You can reply to this email to add anything, or to ask for an NDA before you share more. Please don't send passwords, keys or customer data.</p>
<p>${esc(company)}</p>
<p style="color:#52608a;font-size:13px">If you didn't make this request, you can ignore this email.${privacy ? ` We use your details only to reply to this request and keep a record of it. <a href="${esc(privacy)}">Privacy Notice</a>.` : ''}</p>`);

  return { subject: `We've got your request (${r.id})`, text, html };
}

function team(r, { isUpdate, publicUrl, brand }) {
  const who = oneLine(r.name) + (r.company ? ` (${oneLine(r.company, 60)})` : '');
  const rows = summaryRows(r.answers);
  const { paths, flags } = r.recommendation;
  const link = publicUrl ? `${publicUrl.replace(/\/$/, '')}/admin` : '';
  const lead = isUpdate ? 'They added more detail to an existing request.' : 'A new request just came in.';

  const text = [
    lead,
    '',
    `Reference: ${r.id}`,
    `From: ${oneLine(r.name, 120)} <${r.email}>${r.company ? `, ${oneLine(r.company, 160)}` : ''}`,
    `Received: ${r.createdAt}`,
    '',
    'In their words:',
    r.goal,
    '',
    ...(rows.length ? ['Details:', ...rows.map(([k, v]) => `  ${k}: ${v}`), ''] : []),
    'First read shown to them:',
    ...paths.map((p) => `  - ${p.title}`),
    ...(flags.length ? ['', 'Flags:', ...flags.map((f) => `  - ${f}`)] : []),
    '',
    link ? `Open the inbox: ${link}` : '',
    'Reply to this email to answer them directly.',
  ].join('\n');

  const html = layout(`
<p style="margin-top:0"><strong>${esc(lead)}</strong></p>
<p>Reference <strong>${esc(r.id)}</strong><br>${esc(r.name)} &lt;<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>&gt;${r.company ? `, ${esc(r.company)}` : ''}</p>
<p style="white-space:pre-wrap;background:#eef1fa;border-radius:8px;padding:12px">${esc(r.goal)}</p>
${rows.length ? `<table style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#52608a;vertical-align:top">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
<p><strong>First read shown to them</strong></p><ul>${paths.map((p) => `<li>${esc(p.title)}</li>`).join('')}</ul>
${flags.map((f) => `<p style="border-left:3px solid #2b63d9;padding-left:12px;color:#52608a">${esc(f)}</p>`).join('')}
${link ? `<p><a href="${esc(link)}">Open the inbox</a></p>` : ''}
<p style="color:#52608a;font-size:13px">Reply to this email to answer them directly.</p>`);

  return {
    subject: `${brand?.shortName ? `[${brand.shortName}] ` : ''}${isUpdate ? 'Updated' : 'New'} request ${r.id}: ${who}`.slice(0, 160),
    text,
    html,
    replyTo: r.email,
  };
}

export function renderEmail(kind, request, { publicUrl, brand } = {}) {
  if (kind === 'confirmation') return confirmation(request, { publicUrl, brand });
  if (kind === 'team-new') return team(request, { isUpdate: false, publicUrl, brand });
  if (kind === 'team-update') return team(request, { isUpdate: true, publicUrl, brand });
  throw new Error(`Unknown email kind: ${kind}`);
}
