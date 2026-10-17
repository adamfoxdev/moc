import { marked } from 'marked';
import notice from './privacy-notice.md?raw';

// The notice is our own static text (generated from PRIVACY_NOTICE.md at build time), not user input.
const html = marked.parse(notice);
const isDraft = notice.includes('{{');

export default function Privacy() {
  return (
    <article className="privacy">
      {isDraft && (
        <p className="note" role="note">
          <strong>Draft.</strong> This notice is awaiting legal review and still has placeholders. It must not be relied on or published as it is.
        </p>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <p><a href="/">Back</a></p>
    </article>
  );
}
