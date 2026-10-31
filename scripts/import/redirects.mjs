// Writes public/_redirects (Netlify / Cloudflare Pages) from src/data/redirects.json. Paths are for the real domain (no base).
import fs from 'node:fs';

const redirects = JSON.parse(fs.readFileSync('src/data/redirects.json', 'utf8'));
const lines = redirects.map(({ from, to }) => `${encodeURI(from)} ${encodeURI(to)} 301`);
fs.writeFileSync('public/_redirects', lines.join('\n') + '\n');
console.log(`_redirects: ${lines.length} rules`);
