import { useState } from 'react';
import { createRequest } from './api.js';
import { TextInput, TextArea } from './fields.jsx';

// The front door: the least we need in order to reply.
export default function Intake({ onCreated }) {
  const [v, setV] = useState({ goal: '', name: '', email: '', company: '', consent: false, website: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val }));

  async function submit(e) {
    e.preventDefault();
    setFail('');
    const local = {};
    if (v.goal.trim().length < 10) local.goal = 'A sentence or two is plenty.';
    if (!v.name.trim()) local.name = 'What should we call you?';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) local.email = 'We need an email address to reply to.';
    if (!v.consent) local.consent = 'We need your OK to reply.';
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const res = await createRequest({ ...v });
      onCreated({ reference: res.reference, editToken: res.editToken, name: v.name.trim(), recommendation: res.recommendation, answers: {} });
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length) setErrors(err.errors);
      else setFail(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card intake" onSubmit={submit} noValidate>
      <TextArea
        label="What are you working on, or hoping to?"
        hint="A sentence or two is plenty. Rough is fine."
        value={v.goal} onChange={set('goal')} error={errors.goal} rows={5}
        placeholder="e.g. We built a booking tool with Lovable and 40 people use it. We want to make sure it's safe and can grow."
      />
      <div className="row">
        <TextInput label="Your name" value={v.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <TextInput label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} autoComplete="email" />
      </div>
      <TextInput label="Company or project (optional)" value={v.company} onChange={set('company')} error={errors.company} autoComplete="organization" />

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div className="hp" aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set('website')(e.target.value)} /></label>
      </div>

      <label className="check">
        <input type="checkbox" checked={v.consent} onChange={(e) => set('consent')(e.target.checked)} />
        <span>OK to email me about this request. That's all we'll use it for.</span>
      </label>
      {errors.consent && <p className="error" role="alert">{errors.consent}</p>}
      {fail && <p className="error" role="alert">{fail}</p>}

      <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Show me how you could help'}</button>
      <p className="fine">No pitch, no pricing and no budget questions. Please don't include passwords, keys or customer data.</p>
    </form>
  );
}
