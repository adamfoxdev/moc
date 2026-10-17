import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const BrandContext = createContext(null);
const ReloadContext = createContext(() => {});
export const useBrand = () => useContext(BrandContext);
export const useReloadBrand = () => useContext(ReloadContext);

/** The brand's name as a wordmark: one or two parts, the second picked out in the accent colour. */
export function Wordmark({ brand }) {
  const [a, b] = brand.wordmark;
  return <>{a}{b && <span>{b}</span>}</>;
}

// Apply a brand to the document: stylesheet, favicon and title. `bust` forces the browser to refetch the stylesheet.
function applyBrand(brand, bust) {
  document.title = brand.tagline ? `${brand.name}: ${brand.tagline}` : brand.name;
  const css = document.querySelector('link[rel="stylesheet"][href^="/brand.css"]');
  if (css && bust) css.href = `/brand.css?v=${bust}`;
  const icon = document.querySelector('link[rel="icon"]');
  if (icon && bust) icon.href = `/favicon.svg?v=${bust}`;
}

/** Loads the brand before the first render and can reload it live (used by the dev design switcher). */
export function BrandProvider({ children }) {
  const [brand, setBrand] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (bust = 0) => {
    try {
      const res = await fetch('/api/brand', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || String(res.status));
      applyBrand(data, bust);
      setBrand(data);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error && !brand) {
    return <p style={{ padding: 24, font: '16px system-ui' }} role="alert">This page could not be loaded: {error}. Please refresh, or try again shortly.</p>;
  }
  if (!brand) return null;
  return (
    <ReloadContext.Provider value={() => load(Date.now())}>
      <BrandContext.Provider value={brand}>
        {error && <p className="note" role="alert">Brand problem (development): {error}</p>}
        {children}
      </BrandContext.Provider>
    </ReloadContext.Provider>
  );
}
