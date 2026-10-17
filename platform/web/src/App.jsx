import { useEffect, useState } from 'react';
import Intake from './Intake.jsx';
import Result from './Result.jsx';
import Admin from './Admin.jsx';
import Privacy from './Privacy.jsx';
import { getRequest, session } from './api.js';

function Shell({ children }) {
  return (
    <>
      <header className="top">
        <div className="wrap bar">
          <a className="logo" href="/">North<span>bound</span></a>
        </div>
      </header>
      <main className="wrap">{children}</main>
      <footer className="wrap fine">
        Northbound Consulting. Placeholder name; replace before launch. · <a href="/privacy">Privacy Notice</a>
      </footer>
    </>
  );
}

function Customer() {
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
    <div className="hero">
      <div>
        <p className="eyebrow">Let's start with you</p>
        <h1>Tell us what you're working on. We'll tell you how we can help.</h1>
        <p className="lead">
          Whether it's a prototype that needs to grow up, an idea you want to test, or AI you'd like inside the
          systems you already run: two minutes here and you'll get our first read straight away.
        </p>
        <ul className="points">
          <li>We read every request ourselves.</li>
          <li>If the honest answer is that you don't need us, we'll say so.</li>
          <li>Nothing to sign, and nothing to pay, to find out.</li>
        </ul>
      </div>
      <Intake onCreated={update} />
    </div>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '');
  return <Shell>{path === '/admin' ? <Admin /> : path === '/privacy' ? <Privacy /> : <Customer />}</Shell>;
}
