// Link check over dist/: internal href/src/srcset must resolve to a file; every old URL (pages, posts, events, media)
// must resolve to a page, redirect or file; no href/src may point back at ollietree.org.
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { pathFromLink } from '../lib/paths.mjs';

const BASE = '/ollie-tree-redesign';
const DIST = 'dist';
const exists = (p) => {
  const rel = p.split('#')[0].split('?')[0];
  let decoded;
  try { decoded = decodeURI(rel); } catch { decoded = rel; }
  const f = path.join(DIST, decoded);
  return fs.existsSync(decoded.endsWith('/') ? path.join(f, 'index.html') : f);
};

const html = fs.readdirSync(DIST, { recursive: true }).map(String).filter((f) => f.endsWith('.html'));
const broken = new Map();
const hotlinks = new Set();
for (const f of html) {
  const $ = cheerio.load(fs.readFileSync(path.join(DIST, f), 'utf8'));
  const refs = [];
  $('[href]').each((_, e) => refs.push($(e).attr('href')));
  $('[src]').each((_, e) => refs.push($(e).attr('src')));
  $('[srcset]').each((_, e) => $(e).attr('srcset').split(',').forEach((s) => refs.push(s.trim().split(/\s+/)[0])));
  for (const r of refs) {
    if (!r) continue;
    if (/^(https?:)?\/\/(www\.)?ollietree\.org/i.test(r)) hotlinks.add(`${f}: ${r}`);
    if (!r.startsWith(BASE + '/') && r !== BASE) continue;
    if (!exists(r.slice(BASE.length) || '/')) broken.set(r, f);
  }
}

// Every old URL must still resolve on the new site.
const oldMissing = [];
for (const site of ['root', 'cn', 'en']) {
  const read = (n) => { const p = path.join('scrape/raw', site, n); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : []; };
  const missingMedia = new Set(read('media-missing.json'));
  const urls = [
    ...read('pages.json').map((d) => d.link), ...read('posts.json').map((d) => d.link), ...read('events.json').map((e) => e.url),
    ...read('media.json').map((m) => m.source_url).filter((u) => u && !missingMedia.has(u.replace(/^http:/, 'https:'))),
  ];
  for (const u of urls) if (!exists(pathFromLink(u))) oldMissing.push(u);
}

for (const [r, f] of broken) console.log(`BROKEN ${r}  (in ${f})`);
for (const h of hotlinks) console.log(`OLLIETREE.ORG ${h}`);
for (const u of oldMissing) console.log(`OLD URL NOT SERVED ${decodeURI(u)}`);
console.log(`links: ${html.length} html files, ${broken.size} broken, ${hotlinks.size} ollietree.org refs, ${oldMissing.length} old URLs not served`);
process.exit(broken.size || hotlinks.size || oldMissing.length ? 1 : 0);
