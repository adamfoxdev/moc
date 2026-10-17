// Writes the Fly config for one brand's deployment, based on fly.toml:
//   npm run fly:config -- <brand> <fly-app-name> <public-url> [region]
// (Most people want "npm run fly -- setup <brand>" instead, which does this and the rest.)
import { listBrands, loadBrand } from '../server/brand.js';
import { configProblems, writeFlyConfig } from './lib/flyconfig.mjs';

const [brandId, app, url, region] = process.argv.slice(2);
const fail = (m) => { console.error(m); process.exit(1); };
if (!brandId || !app || !url) fail(`Usage: npm run fly:config -- <brand> <fly-app-name> <public-url> [region]\nBrands: ${listBrands().join(', ')}`);
try { loadBrand(brandId); } catch (e) { fail(e.message); }
const problems = configProblems({ app, url, region });
if (problems.length) fail(problems.join('\n'));
const out = writeFlyConfig({ brandId, app, url, region });
console.log(`Wrote ${out}\nDeploy it with: fly deploy -c fly.${brandId}.toml --ha=false`);
