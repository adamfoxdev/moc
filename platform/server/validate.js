export const OPTIONS = {
  stage: ['idea', 'prototype', 'mvp', 'live', 'existing'],
  builtWith: ['ai-tools', 'in-house', 'agency', 'low-code', 'not-sure'],
  team: ['none', 'some', 'strong'],
  helpWith: ['production', 'poc', 'ai', 'build', 'data', 'hosting', 'support', 'advice', 'microsoft', 'unsure'],
  users: ['few', 'tens', 'hundreds', 'thousands', 'unknown'],
  data: ['none', 'business', 'personal', 'regulated'],
  timing: ['flexible', 'quarter', 'urgent'],
  contactPref: ['email', 'call', 'either'],
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate and normalise an intake payload. Only goal, name, email and consent
 * are required to get in the door; every other answer is optional and can be
 * added later. Unknown keys are dropped.
 */
export function validateAnswers(body, { requireCore }) {
  const errors = {};
  const value = {};
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  const text = (key, max, { required = false, min = 0 } = {}) => {
    const raw = b[key];
    if (raw === undefined || raw === null || raw === '') {
      if (required) errors[key] = 'This is needed so we can get back to you.';
      return;
    }
    if (typeof raw !== 'string') { errors[key] = 'Please enter text.'; return; }
    const s = raw.trim();
    if (!s && required) { errors[key] = 'This is needed so we can get back to you.'; return; }
    if (s.length < min) { errors[key] = `Please give us a little more (at least ${min} characters).`; return; }
    if (s.length > max) { errors[key] = `Please keep this under ${max} characters.`; return; }
    if (s) value[key] = s;
  };
  const one = (key) => {
    const raw = b[key];
    if (raw === undefined || raw === null || raw === '') return;
    if (!OPTIONS[key].includes(raw)) errors[key] = 'Please choose one of the options.';
    else value[key] = raw;
  };
  const many = (key) => {
    const raw = b[key];
    if (raw === undefined || raw === null) return;
    if (!Array.isArray(raw) || raw.some((x) => !OPTIONS[key].includes(x))) {
      errors[key] = 'Please choose from the options.';
      return;
    }
    if (raw.length) value[key] = [...new Set(raw)];
  };

  text('goal', 4000, { required: requireCore, min: requireCore ? 10 : 0 });
  text('name', 120, { required: requireCore });
  text('email', 254, { required: requireCore });
  if (value.email && !EMAIL.test(value.email)) errors.email = 'That email address does not look right.';

  text('company', 160);
  text('role', 120);
  text('outcome', 2000);
  text('stack', 500);
  text('industry', 120);
  text('timingNote', 500);
  text('notes', 3000);
  text('link', 500);
  if (value.link) {
    try {
      const u = new URL(value.link);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocol');
    } catch {
      errors.link = 'Please enter a web address starting with http:// or https://';
    }
  }

  ['stage', 'team', 'users', 'data', 'timing', 'contactPref'].forEach(one);
  ['builtWith', 'helpWith'].forEach(many);

  if (b.wantsNda !== undefined) value.wantsNda = b.wantsNda === true;

  if (requireCore && b.consent !== true) {
    errors.consent = 'We need your OK to reply to this request.';
  }
  if (b.consent === true) value.consent = true;

  return { errors, value, ok: Object.keys(errors).length === 0 };
}

export function validateAdminUpdate(body, statuses) {
  const errors = {};
  const value = {};
  const b = body && typeof body === 'object' ? body : {};
  if (b.status !== undefined) {
    if (!statuses.includes(b.status)) errors.status = 'Unknown status.';
    else value.status = b.status;
  }
  if (b.notes !== undefined) {
    if (typeof b.notes !== 'string' || b.notes.length > 10000) errors.notes = 'Notes must be text under 10,000 characters.';
    else value.notes = b.notes;
  }
  if (b.hold !== undefined) {
    if (typeof b.hold !== 'boolean') errors.hold = 'Hold must be true or false.';
    else value.hold = b.hold;
  }
  return { errors, value, ok: Object.keys(errors).length === 0 };
}
