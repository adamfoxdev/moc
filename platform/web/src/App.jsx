import { useEffect, useState } from 'react';
import Intake from './Intake.jsx';
import Result from './Result.jsx';
import Admin from './Admin.jsx';
import Privacy from './Privacy.jsx';
import Preview from './Preview.jsx';
import { getRequest, session } from './api.js';
import { useBrand, Wordmark } from './brand.jsx';

function Shell({ children }) {
  const brand = useBrand();
  return (
    <div className={`header-${brand.header}`}>
      <header className="top">
        <div className="wrap bar">
          <a className="logo" href="/"><Wordmark brand={brand} /></a>
        </div>
      </header>
      <main className="wrap">{children}</main>
      <footer className="wrap fine">
        {brand.footer}{brand.placeholder && '. Placeholder name; replace before launch'} · <a href="/privacy">Privacy Notice</a>
      </footer>
    </div>
  );
}

function Customer() {
  const brand = useBrand();
  const [state, setState] = useState(null);
  const [deleted, setDeleted] = useState(false);
  const [restoring, setRestoring] = useState(() => !!session.load());

  // Come back to the same page after a refresh.
  useEffect(() => {
    const saved = session.load();
    if (!saved) return;
    getRequest(saved.reference, saved.editToken)
      .then((r) => setState({ ...saved, name: r.name, answers: r.answers, recommendation: r.recommendation }))
      .catch(() => session.clear())
      .finally(() => setRestoring(false));
  }, []);

  const update = (s) => {
    setState(s);
    session.save({ reference: s.reference, editToken: s.editToken });
  };
  const reset = () => { session.clear(); setState(null); setDeleted(false); };
  const afterDelete = () => { session.clear(); setState(null); setDeleted(true); };

  if (restoring) return <p className="muted">One moment…</p>;
  if (state) return <Result state={state} onUpdated={update} onReset={reset} onDeleted={afterDelete} />;
  if (deleted) {
    return (
      <div className="card narrow" role="status">
        <h1>Deleted</h1>
        <p>We've deleted your request from our system. Emails we already sent you stay in your inbox, and copies in our own mailbox are removed under our email retention rules.</p>
        <p><button className="link" onClick={reset}>Send a new request</button></p>
      </div>
    );
  }

  return (
    <div className={`hero layout-${brand.layout}`}>
      <div className="hero-copy">
        {brand.copy.eyebrow && <p className="eyebrow">{brand.copy.eyebrow}</p>}
        <h1>{brand.copy.headline}</h1>
        <p className="lead">{brand.copy.lead}</p>
        {brand.copy.points.length > 0 && (
          <ul className="points">
            {brand.copy.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
      </div>
      <Intake onCreated={update} />
    </div>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '');
  return (
    <>
      <Shell>{path === '/admin' ? <Admin /> : path === '/privacy' ? <Privacy /> : <Customer />}</Shell>
      <Preview />
    </>
  );
}
