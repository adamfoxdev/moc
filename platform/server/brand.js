import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const BRANDS_DIR = resolve(here, '..', 'brands');

// Fonts are limited to system stacks: nothing is downloaded from a third party, so the Content-Security-Policy
// stays strict and no visitor's address is sent to a font host.
export const FONT_STACKS = {
  sans: 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  humanist: '"Gill Sans","Gill Sans MT",Seravek,"Trebuchet MS","Segoe UI",Calibri,sans-serif',
  geometric: '"Avenir Next",Avenir,"Century Gothic",Montserrat,"Segoe UI",system-ui,sans-serif',
  rounded: 'ui-rounded,"SF Pro Rounded","Hiragino Maru Gothic ProN",Quicksand,Nunito,"Segoe UI",system-ui,sans-serif',
  serif: '"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Times New Roman",serif',
  mono: 'ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace',
};
export const LAYOUTS = ['split', 'split-reverse', 'centered', 'banner', 'minimal'];
export const HEADERS = ['left', 'center'];
export const SCHEMES = ['auto', 'light', 'dark'];
// The service lines a brand can lead with (see recommend.js): they are shown first in the suggested routes.
export const FOCUS = ['production', 'support', 'ai', 'data', 'hosting'];
const COLOR_KEYS = ['bg', 'bg2', 'card', 'line', 'text', 'muted', 'accent', 'accent2', 'err', 'onAccent'];

// What every brand starts from. A brand file only lists what it changes; "northbound" reproduces this exactly.
const DEFAULTS = {
  name: 'Northbound',
  tagline: "Tell us what you're working on. We'll tell you how we can help.",
  layout: 'split',
  header: 'left',
  scheme: 'auto',
  fonts: { body: 'sans', heading: 'sans' },
  shape: { radius: 14, controlRadius: 8, buttons: 'rounded', chips: 'pill' },
  weight: 700,
  tracking: '0',
  maxWidth: 1080,
  colors: {
    light: { bg: '#f7f8fc', bg2: '#eef1fa', card: '#ffffff', line: '#d9dfef', text: '#12182e', muted: '#52608a', accent: '#0b7a5e', accent2: '#2b63d9', err: '#b3261e', onAccent: '#ffffff' },
    dark: { bg: '#0b1020', bg2: '#121a33', card: '#161f3d', line: '#26325a', text: '#e8ecf8', muted: '#9aa6c9', accent: '#4cc9a7', accent2: '#6ea8ff', err: '#ff8a8a', onAccent: '#04120d' },
  },
  hero: { bg: '#0b7a5e', bg2: '', fg: '#ffffff' },
  copy: {
    eyebrow: "Let's start with you",
    headline: "Tell us what you're working on. We'll tell you how we can help.",
    lead: "Whether it's a prototype that needs to grow up, an idea you want to test, or AI you'd like inside the systems you already run: two minutes here and you'll get our first read straight away.",
    points: ['We read every request ourselves.', "If the honest answer is that you don't need us, we'll say so.", 'Nothing to sign, and nothing to pay, to find out.'],
    submitLabel: 'Show me how you could help',
    goalLabel: 'What are you working on, or hoping to?',
    goalHint: 'A sentence or two is plenty. Rough is fine.',
    goalPlaceholder: "e.g. We built a booking tool with Lovable and 40 people use it. We want to make sure it's safe and can grow.",
    finePrint: "No pitch, no pricing and no budget questions. Please don't include passwords, keys or customer data.",
  },
  focus: [],
  legal: {},
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const TRACKING = /^-?\d*\.?\d+(em|px)?$|^0$/;
const SAFE_TEXT = /^[^<>{}]*$/;

const clone = (o) => JSON.parse(JSON.stringify(o));
function merge(base, over) {
  if (Array.isArray(over) || typeof over !== 'object' || over === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = merge(base?.[k], v);
  return out;
}

/** Validate a merged brand. Returns a list of problems (empty = fine). */
export function brandProblems(b) {
  const p = [];
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(b.id || '')) p.push('id must be lower-case letters, digits and dashes');
  for (const k of ['name', 'shortName', 'tagline']) if (!b[k] || typeof b[k] !== 'string' || !SAFE_TEXT.test(b[k])) p.push(`${k} is required and must not contain < > { }`);
  if (!LAYOUTS.includes(b.layout)) p.push(`layout must be one of ${LAYOUTS.join(', ')}`);
  if (!HEADERS.includes(b.header)) p.push(`header must be one of ${HEADERS.join(', ')}`);
  if (!SCHEMES.includes(b.scheme)) p.push(`scheme must be one of ${SCHEMES.join(', ')}`);
  for (const k of ['body', 'heading']) if (!FONT_STACKS[b.fonts?.[k]]) p.push(`fonts.${k} must be one of ${Object.keys(FONT_STACKS).join(', ')}`);
  const s = b.shape || {};
  if (!(s.radius >= 0 && s.radius <= 40)) p.push('shape.radius must be 0 to 40');
  if (!(s.controlRadius >= 0 && s.controlRadius <= 30)) p.push('shape.controlRadius must be 0 to 30');
  if (!['rounded', 'pill'].includes(s.buttons)) p.push('shape.buttons must be rounded or pill');
  if (!['pill', 'square'].includes(s.chips)) p.push('shape.chips must be pill or square');
  if (!(b.weight >= 400 && b.weight <= 900)) p.push('weight must be 400 to 900');
  if (!TRACKING.test(String(b.tracking))) p.push('tracking must look like -0.02em or 0');
  if (!(b.maxWidth >= 640 && b.maxWidth <= 1400)) p.push('maxWidth must be 640 to 1400');
  for (const scheme of ['light', 'dark']) {
    for (const k of COLOR_KEYS) if (!HEX.test(b.colors?.[scheme]?.[k] || '')) p.push(`colors.${scheme}.${k} must be a #rrggbb colour`);
  }
  if (!HEX.test(b.hero?.bg || '') || !HEX.test(b.hero?.fg || '') || (b.hero?.bg2 && !HEX.test(b.hero.bg2))) p.push('hero.bg, hero.fg (and optional hero.bg2) must be #rrggbb colours');
  for (const [k, v] of Object.entries(b.copy || {})) {
    for (const t of Array.isArray(v) ? v : [v]) if (typeof t !== 'string' || !SAFE_TEXT.test(t)) p.push(`copy.${k} must be text without < > { }`);
  }
  if (!Array.isArray(b.copy?.points)) p.push('copy.points must be a list');
  if (!Array.isArray(b.focus) || b.focus.some((f) => !FOCUS.includes(f))) p.push(`focus must be a list drawn from ${FOCUS.join(', ')}`);
  for (const [k, v] of Object.entries(b.legal || {})) if (typeof v !== 'string' || !SAFE_TEXT.test(v)) p.push(`legal.${k} must be text without < > { }`);
  if (b.wordmark && (!Array.isArray(b.wordmark) || b.wordmark.length > 2 || b.wordmark.some((x) => typeof x !== 'string' || !SAFE_TEXT.test(x)))) p.push('wordmark must be one or two text parts');
  return p;
}

const expand = (s, b) => (typeof s === 'string' ? s.replaceAll('{name}', b.name).replaceAll('{shortName}', b.shortName) : s);

// Files starting with "_" are shared settings, not brands.
export function listBrands(dir = BRANDS_DIR) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => f.slice(0, -5)).sort() : [];
}

/** The company behind every brand (brands/_company.json): its legal details are the default for each brand's "legal" block. */
export function loadCompany(dir = BRANDS_DIR) {
  const file = join(dir, '_company.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

/** Load and validate one brand by id. Throws with every problem listed. */
export function loadBrand(id = 'northbound', dir = BRANDS_DIR) {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`BRAND "${id}" is not a valid brand id`);
  const file = join(dir, `${id}.json`);
  if (!existsSync(file)) throw new Error(`Unknown BRAND "${id}". Available brands: ${listBrands(dir).join(', ') || '(none found)'}`);
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  // The company's legal details apply to every brand unless the brand's own file says otherwise.
  const b = merge(clone(DEFAULTS), { ...raw, id, legal: { ...loadCompany(dir).legal, ...raw.legal } });
  b.shortName = b.shortName || b.name;
  b.wordmark = b.wordmark || [b.name];
  // Expand {name} and {shortName} first, so anything else in curly braces is still rejected.
  for (const [k, v] of Object.entries(b.copy)) b.copy[k] = Array.isArray(v) ? v.map((t) => expand(t, b)) : expand(v, b);
  b.tagline = expand(b.tagline, b);
  const problems = brandProblems(b);
  if (problems.length) throw new Error(`Brand "${id}" is invalid:\n  - ${problems.join('\n  - ')}`);
  return b;
}

/** The part of a brand the browser needs. No secrets live in brand files, but only send what is used. */
export function publicBrand(b) {
  return {
    id: b.id,
    name: b.name,
    shortName: b.shortName,
    wordmark: b.wordmark,
    tagline: b.tagline,
    layout: b.layout,
    header: b.header,
    placeholder: !!b.placeholder,
    footer: b.legal?.legalName && b.legal.legalName !== b.name ? `${b.name}, operated by ${b.legal.legalName}` : b.name,
    copy: b.copy,
  };
}

const vars = (c) => `--bg:${c.bg};--bg2:${c.bg2};--card:${c.card};--line:${c.line};--text:${c.text};--muted:${c.muted};--accent:${c.accent};--accent2:${c.accent2};--err:${c.err};--on-accent:${c.onAccent};`;

/** The stylesheet served at /brand.css. ":root:root" outranks the base stylesheet whatever order they load in. */
export function brandCss(b) {
  const shape = b.shape;
  const hero = b.hero.bg2 ? `linear-gradient(135deg,${b.hero.bg},${b.hero.bg2})` : b.hero.bg;
  const common = `--font-body:${FONT_STACKS[b.fonts.body]};--font-head:${FONT_STACKS[b.fonts.heading]};--head-weight:${b.weight};--head-tracking:${b.tracking};`
    + `--radius:${shape.radius}px;--radius-sm:${shape.controlRadius}px;--btn-radius:${shape.buttons === 'pill' ? 999 : shape.controlRadius}px;--chip-radius:${shape.chips === 'pill' ? 999 : shape.controlRadius}px;`
    + `--max:${b.maxWidth}px;--hero-bg:${hero};--hero-fg:${b.hero.fg};`;
  const light = vars(b.colors.light);
  const dark = vars(b.colors.dark);
  if (b.scheme === 'light') return `:root:root{${common}${light}color-scheme:light;}\n`;
  if (b.scheme === 'dark') return `:root:root{${common}${dark}color-scheme:dark;}\n`;
  return `:root:root{${common}${light}color-scheme:light dark;}\n@media (prefers-color-scheme:dark){:root:root{${dark}}}\n`;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** A simple favicon: the brand's initial on its accent colour. */
export function faviconSvg(b) {
  const c = b.scheme === 'dark' ? b.colors.dark : b.colors.light;
  const r = Math.min(b.shape.radius, 14) * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${r}" fill="${c.accent}"/><text x="32" y="44" font-family="system-ui,Segoe UI,Arial,sans-serif" font-size="36" font-weight="700" text-anchor="middle" fill="${c.onAccent}">${esc(b.shortName.trim().charAt(0).toUpperCase())}</text></svg>\n`;
}
