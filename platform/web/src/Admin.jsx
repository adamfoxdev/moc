import { useCallback, useEffect, useState } from 'react';
import { admin } from './api.js';
import { STATUS_LABEL } from './options.js';

const TOKEN_KEY = 'northbound-admin-token';
const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const writeToken = (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

const when = (iso) => new Date(iso).toLocaleString();

function Detail({ r, statuses, token, onSaved }) {
  const [status, setStatus] = useState(r.status);
  const [notes, setNotes] = useState(r.notes);
  const [msg, setMsg] = useState('');
  // Reset the form only when a different request is opened, not after our own save.
  useEffect(() => { setStatus(r.status); setNotes(r.notes); setMsg(''); }, [r.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    try { onSaved(await admin.update(token, r.id, { status, notes })); setMsg('Saved.'); }
    catch (e) { setMsg(e.message); }
  }
  const a = r.answers;
  const rows = [
    ['Stage', a.stage], ['Built with', a.builtWith?.join(', ')], ['Developers on their side', a.team],
    ['Wants help with', a.helpWith?.join(', ')], ['Users', a.users], ['Data', a.data], ['Timing', a.timing],
    ['Timing note', a.timingNote], ['Industry', a.industry], ['Stack', a.stack], ['Link', a.link],
    ['Outcome', a.outcome], ['Role', a.role], ['Contact preference', a.contactPref],
    ['Wants NDA first', a.wantsNda ? 'Yes' : ''], ['Anything else', a.notes],
  ].filter(([, v]) => v);

  return (
    <section className="card detail">
      <h2>{r.name} <span className="muted">{r.company}</span></h2>
      <p><a href={`mailto:${r.email}?subject=${encodeURIComponent('Your request ' + r.id)}`}>{r.email}</a> · {r.id} · received {when(r.createdAt)}</p>
      <h3>Their words</h3>
      <p className="quote">{r.goal}</p>
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <h3>First read we showed them</h3>
      <ul>{r.recommendation.paths.map((p) => <li key={p.id}><strong>{p.title}</strong></li>)}</ul>
      {r.recommendation.flags.map((f) => <p className="note" key={f}>{f}</p>)}
      <h3>Your follow-up</h3>
      <div className="row">
        <label className="field">Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>)}
          </select>
        </label>
      </div>
      <label className="field">Notes
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="actions"><button className="btn" onClick={save}>Save</button> <span role="status" className="saved">{msg}</span></div>
    </section>
  );
}

export default function Admin() {
  const [token, setToken] = useState(readToken);
  const [input, setInput] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (t) => {
    try { setData(await admin.list(t)); setError(''); }
    catch (e) { setData(null); setError(e.message); if (e.status === 401) { writeToken(''); setToken(''); } }
  }, []);
  useEffect(() => { if (token) load(token); }, [token, load]);

  if (!token) {
    return (
      <form className="card narrow" onSubmit={(e) => { e.preventDefault(); writeToken(input); setToken(input); }}>
        <h1>Requests</h1>
        <label className="field">Admin token
          <input type="password" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit">Open</button>
      </form>
    );
  }
  if (!data) return <p className="muted">{error || 'Loading…'}</p>;

  const current = data.requests.find((r) => r.id === selected);
  const merge = (u) => setData((d) => ({ ...d, requests: d.requests.map((r) => (r.id === u.id ? u : r)) }));

  return (
    <div className="admin">
      <div className="bar2">
        <h1>Requests <span className="muted">({data.requests.length})</span></h1>
        <button className="link" onClick={() => { writeToken(''); setToken(''); setData(null); }}>Sign out</button>
      </div>
      {data.requests.length === 0 ? <p className="muted">Nothing yet.</p> : (
        <div className="split">
          <ul className="list">
            {data.requests.map((r) => (
              <li key={r.id}>
                <button className={r.id === selected ? 'item on' : 'item'} onClick={() => setSelected(r.id)}>
                  <span className={`dot ${r.status}`} aria-hidden="true" />
                  <span className="who"><strong>{r.name}</strong> <span className="muted">{r.company}</span></span>
                  <span className="muted small">{STATUS_LABEL[r.status]} · {when(r.createdAt)}</span>
                  <span className="small clip">{r.goal}</span>
                </button>
              </li>
            ))}
          </ul>
          {current ? <Detail r={current} statuses={data.statuses} token={token} onSaved={merge} /> : <p className="muted">Pick a request.</p>}
        </div>
      )}
    </div>
  );
}
