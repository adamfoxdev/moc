import { useCallback, useEffect, useState } from 'react';
import { admin } from './api.js';
import { STATUS_LABEL } from './options.js';

const TOKEN_KEY = 'northbound-admin-token';
const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const writeToken = (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

const EMAIL_KIND = { confirmation: 'Confirmation to customer', 'team-new': 'Alert to team', 'team-update': 'Update alert to team' };
const when = (iso) => new Date(iso).toLocaleString();

function Detail({ r, statuses, token, onSaved, onDeleted }) {
  const [status, setStatus] = useState(r.status);
  const [hold, setHold] = useState(r.hold);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState(r.notes);
  const [msg, setMsg] = useState('');
  const [emails, setEmails] = useState(null);
  const loadEmails = useCallback(() => {
    admin.get(token, r.id).then((d) => setEmails(d.emails)).catch(() => setEmails([]));
  }, [token, r.id]);
  useEffect(() => { setEmails(null); loadEmails(); }, [loadEmails]);

  async function doDelete() {
    try { await admin.remove(token, r.id); onDeleted(r.id); } catch (e) { setMsg(e.message); }
  }
  async function doExport() {
    try { await admin.export(token, r.id); } catch (e) { setMsg(e.message); }
  }

  async function retry(id) {
    try { await admin.retryEmail(token, id); setTimeout(loadEmails, 1500); setMsg('Retrying…'); }
    catch (e) { setMsg(e.message); }
  }
  // Reset the form only when a different request is opened, not after our own save.
  useEffect(() => { setStatus(r.status); setNotes(r.notes); setHold(r.hold); setConfirmDelete(false); setMsg(''); }, [r.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    try { onSaved(await admin.update(token, r.id, { status, notes, hold })); setMsg('Saved.'); }
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
      <p className="muted small">Consent given {r.consentAt ? when(r.consentAt) : 'unknown'}, privacy notice version {r.noticeVersion || 'unknown'}.</p>
      <h3>Their words</h3>
      <p className="quote">{r.goal}</p>
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <h3>First read we showed them</h3>
      <ul>{r.recommendation.paths.map((p) => <li key={p.id}><strong>{p.title}</strong></li>)}</ul>
      {r.recommendation.flags.map((f) => <p className="note" key={f}>{f}</p>)}
      <h3>Emails</h3>
      {emails === null ? <p className="muted small">Loading…</p> : emails.length === 0 ? (
        <p className="muted small">No emails queued for this request.</p>
      ) : (
        <ul className="emails">
          {emails.map((e) => (
            <li key={e.id}>
              <span className={`pill ${e.status}`}>{e.status}</span>{' '}
              {EMAIL_KIND[e.kind] || e.kind} <span className="muted">to {e.to}</span>
              {e.status === 'sent' && <span className="muted small"> · {when(e.sentAt)}</span>}
              {e.status === 'pending' && e.attempts > 0 && <span className="muted small"> · attempt {e.attempts} failed, next {when(e.nextAttemptAt)}</span>}
              {e.lastError && e.status !== 'sent' && <div className="small error">{e.lastError}</div>}
              {e.status === 'failed' && <button className="link small" onClick={() => retry(e.id)}>Retry</button>}
            </li>
          ))}
        </ul>
      )}
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
      <label className="check">
        <input type="checkbox" checked={hold} onChange={(e) => setHold(e.target.checked)} />
        <span>Keep this request (exempt from automatic deletion). Requests set to “Working together” are kept too.</span>
      </label>
      <div className="actions"><button className="btn" onClick={save}>Save</button> <span role="status" className="saved">{msg}</span></div>
      <h3>Their data</h3>
      <div className="actions">
        <button className="btn ghost" onClick={doExport}>Export (JSON)</button>
        {!confirmDelete && <button className="btn ghost danger" onClick={() => setConfirmDelete(true)}>Delete request</button>}
      </div>
      {confirmDelete && (
        <div className="note" role="alertdialog" aria-label="Confirm deletion">
          <p><strong>Delete {r.id} permanently?</strong> The request and its email records are removed and this can't be undone. The deletion is logged by reference only. Alert emails already in the team mailbox are not touched.</p>
          <div className="actions">
            <button className="btn danger" onClick={doDelete}>Yes, delete</button>
            <button className="link" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      )}
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
  const removed = (id) => { setSelected(null); setData((d) => ({ ...d, requests: d.requests.filter((r) => r.id !== id) })); };
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
          {current ? <Detail r={current} statuses={data.statuses} token={token} onSaved={merge} onDeleted={removed} /> : <p className="muted">Pick a request.</p>}
        </div>
      )}
    </div>
  );
}
