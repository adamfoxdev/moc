import { useState } from 'react';
import { saveDetails, downloadMine, deleteMine } from './api.js';
import { useBrand } from './brand.jsx';
import { TextInput, TextArea, Select } from './fields.jsx';
import { Choice } from './fields.jsx';
import { STAGE, BUILT_WITH, TEAM, HELP_WITH, USERS, DATA, TIMING, CONTACT } from './options.js';

const FIELDS = ['stage', 'builtWith', 'team', 'helpWith', 'users', 'data', 'timing', 'contactPref',
  'stack', 'link', 'industry', 'role', 'outcome', 'timingNote', 'notes', 'wantsNda'];

function Paths({ recommendation }) {
  return (
    <>
      <h2>How we could help</h2>
      <div className="paths">
        {recommendation.paths.map((p, i) => (
          <article className={i === 0 ? 'path first' : 'path'} key={p.id}>
            {i === 0 && <span className="tag">Our first thought</span>}
            <h3>{p.title}</h3>
            <p>{p.why}</p>
            <p>{p.how}</p>
            <p className="step"><strong>Where we'd start:</strong> {p.firstStep}</p>
          </article>
        ))}
      </div>
      {recommendation.flags.length > 0 && (
        <div className="note">
          {recommendation.flags.map((f) => <p key={f}>{f}</p>)}
        </div>
      )}
    </>
  );
}

function Sharpen({ state, onUpdated }) {
  const [v, setV] = useState(state.answers || {});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fail, setFail] = useState('');
  const set = (k) => (val) => { setSaved(false); setV((s) => ({ ...s, [k]: val })); };

  async function save(e) {
    e.preventDefault();
    setBusy(true); setFail(''); setErrors({});
    const body = {};
    for (const k of FIELDS) {
      const x = v[k];
      if (x === undefined || x === '' || (Array.isArray(x) && !x.length)) continue;
      body[k] = x;
    }
    try {
      const res = await saveDetails(state.reference, state.editToken, body);
      setSaved(true);
      onUpdated({ ...state, answers: { ...state.answers, ...body }, recommendation: res.recommendation });
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length) setErrors(err.errors);
      else setFail(err.message);
    } finally { setBusy(false); }
  }

  return (
    <details className="card sharpen" open={false}>
      <summary>
        <strong>Want a sharper answer?</strong> <span className="muted">Optional. Add whatever you like and we'll update the above.</span>
      </summary>
      <form onSubmit={save} noValidate>
        <Choice legend="Where are things at?" options={STAGE} value={v.stage} onChange={set('stage')} error={errors.stage} />
        <Choice legend="What would help most?" hint="Pick any." multiple options={HELP_WITH} value={v.helpWith} onChange={set('helpWith')} error={errors.helpWith} />
        <Choice legend="Who built it?" hint="Pick any." multiple options={BUILT_WITH} value={v.builtWith} onChange={set('builtWith')} error={errors.builtWith} />
        <Choice legend="Do you have developers on your side?" options={TEAM} value={v.team} onChange={set('team')} error={errors.team} />
        <Choice legend="What kind of data is involved?" options={DATA} value={v.data} onChange={set('data')} error={errors.data} />
        <Choice legend="Timing" options={TIMING} value={v.timing} onChange={set('timing')} error={errors.timing} />
        <div className="row">
          <Select label="Roughly how many people use it?" options={USERS} value={v.users} onChange={set('users')} error={errors.users} />
          <TextInput label="Industry" value={v.industry} onChange={set('industry')} error={errors.industry} />
        </div>
        <TextInput label="Tech it's built on, if you know" hint="e.g. React and Supabase, or .NET and Azure SQL" value={v.stack} onChange={set('stack')} error={errors.stack} />
        <TextInput label="A link to a demo or the live app" hint="No passwords, please." value={v.link} onChange={set('link')} error={errors.link} />
        <TextArea label="What would a great outcome look like?" value={v.outcome} onChange={set('outcome')} error={errors.outcome} />
        <TextArea label="Anything else we should know?" value={v.notes} onChange={set('notes')} error={errors.notes} rows={3} />
        <Choice legend="How would you like us to reach you?" options={CONTACT} value={v.contactPref} onChange={set('contactPref')} error={errors.contactPref} />
        <label className="check">
          <input type="checkbox" checked={!!v.wantsNda} onChange={(e) => set('wantsNda')(e.target.checked)} />
          <span>Please send an NDA before we share anything.</span>
        </label>
        {fail && <p className="error" role="alert">{fail}</p>}
        <div className="actions">
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update our answer'}</button>
          {saved && <span className="saved" role="status">Updated. Have another look above.</span>}
        </div>
      </form>
    </details>
  );
}

function YourData({ state, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function run(fn, after) {
    setBusy(true); setMsg('');
    try { await fn(); after?.(); } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="yourdata">
      <h2>Your data</h2>
      <p className="muted">
        You can download everything we hold about this request, or delete it, whenever you like.
        See our <a href="/privacy" target="_blank" rel="noopener">Privacy Notice</a>.
      </p>
      <div className="actions">
        <button type="button" className="btn ghost" disabled={busy} onClick={() => run(() => downloadMine(state.reference, state.editToken))}>
          Download my data
        </button>
        {!confirming && (
          <button type="button" className="btn ghost danger" disabled={busy} onClick={() => setConfirming(true)}>Delete my request</button>
        )}
      </div>
      {confirming && (
        <div className="note" role="alertdialog" aria-label="Confirm deletion">
          <p><strong>Delete this request?</strong> We'll remove it from our system for good. It can't be undone. Emails already sent remain in mailboxes.</p>
          <div className="actions">
            <button type="button" className="btn danger" disabled={busy} onClick={() => run(() => deleteMine(state.reference, state.editToken), onDeleted)}>Yes, delete it</button>
            <button type="button" className="link" onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        </div>
      )}
      {msg && <p className="error" role="alert">{msg}</p>}
    </section>
  );
}

export default function Result({ state, onUpdated, onReset, onDeleted }) {
  const brand = useBrand();
  const first = (state.name || '').split(' ')[0];
  const { recommendation } = state;
  return (
    <div className="result">
      <p className="ref">Reference <strong>{state.reference}</strong></p>
      <h1>Thanks{first ? `, ${first}` : ''}. Here's our first read.</h1>
      <p className="lead">This is based on what you've told us so far. A person at {brand.name} will read your request and reply properly.</p>

      <Paths recommendation={recommendation} />

      {recommendation.questions.length > 0 && (
        <section>
          <h2>What we'll probably ask you</h2>
          <ul className="questions">
            {recommendation.questions.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </section>
      )}

      <section className="next">
        <h2>What happens next</h2>
        <ol>
          <li>A person at {brand.name} reads this and replies by email within one business day.</li>
          <li>If it helps, we'll suggest a 30-minute call. No preparation needed.</li>
          <li>There's nothing to sign or pay to find out whether we can help.</li>
        </ol>
      </section>

      <Sharpen state={state} onUpdated={onUpdated} />

      <YourData state={state} onDeleted={onDeleted} />

      <p className="fine">
        Quote your reference if you write to us. <button type="button" className="link" onClick={onReset}>Send another request</button>
      </p>
    </div>
  );
}
