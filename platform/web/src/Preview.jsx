import { useState } from 'react';
import { useBrand, useReloadBrand } from './brand.jsx';

// Development only: the server includes `preview` in /api/brand only when BRAND_PREVIEW=true.
const read = () => { try { return JSON.parse(decodeURIComponent((document.cookie.match(/(?:^|; )nb_preview=([^;]*)/) || [])[1] || '{}')); } catch { return {}; } };
const write = (sel) => { document.cookie = `nb_preview=${encodeURIComponent(JSON.stringify(sel))}; path=/; SameSite=Lax`; };

export default function Preview() {
  const brand = useBrand();
  const reload = useReloadBrand();
  const [open, setOpen] = useState(true);
  const p = brand.preview;
  if (!p) return null;

  const sel = read();
  const currentBrand = sel.brand && p.brands.some((b) => b.id === sel.brand) ? sel.brand : p.configured;
  const currentLayout = sel.layout && p.layouts.includes(sel.layout) ? sel.layout : '';
  const change = (next) => { write({ ...sel, ...next }); reload(); };

  return (
    <aside className="preview" aria-label="Design preview (development only)">
      <button type="button" className="preview-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        Design preview {open ? '−' : '+'}
      </button>
      {open && (
        <div className="preview-body">
          <label>Brand
            <select value={currentBrand} onChange={(e) => change({ brand: e.target.value, layout: '' })}>
              {p.brands.map((b) => <option key={b.id} value={b.id}>{b.name}{b.id === p.configured ? ' (configured)' : ''}</option>)}
            </select>
          </label>
          <label>Layout
            <select value={currentLayout} onChange={(e) => change({ layout: e.target.value })}>
              <option value="">Brand default</option>
              {p.layouts.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <button type="button" className="preview-reset" onClick={() => change({ brand: '', layout: '' })}>Reset to configured</button>
          <p className="preview-hint">Edit <code>brands/{currentBrand}.json</code> and refresh to see changes.</p>
        </div>
      )}
    </aside>
  );
}
