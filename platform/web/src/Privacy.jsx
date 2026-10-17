import { useEffect, useState } from 'react';
import { marked } from 'marked';

// The notice is our own text with this brand's details filled in by the server, not user input.
export default function Privacy() {
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/notice').then((r) => r.json()).then(setNotice).catch(() => setError('The privacy notice could not be loaded. Please try again.'));
  }, []);
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!notice) return <p className="muted">Loading…</p>;
  return (
    <article className="privacy">
      {notice.draft && (
        <p className="note" role="note">
          <strong>Draft.</strong> This notice is awaiting legal review and still has placeholders. It must not be relied on or published as it is.
        </p>
      )}
      <div dangerouslySetInnerHTML={{ __html: marked.parse(notice.markdown) }} />
      <p><a href="/">Back</a></p>
    </article>
  );
}
