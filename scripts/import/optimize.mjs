// Makes small WebP copies (480/960px) of every image used in page content, heroes, cards and strips, so pages load fast.
// Originals stay at their old paths; copies go to public/_opt/ and are listed in src/data/optimized.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import * as cheerio from 'cheerio';

const BASE = '/ollie-tree-redesign';
const WIDTHS = [480, 960];
const pages = fs.readdirSync('src/content/pages', { recursive: true }).map(String).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join('src/content/pages', f), 'utf8')));
const events = fs.existsSync('src/content/events') ? fs.readdirSync('src/content/events', { recursive: true }).map(String).filter((f) => f.endsWith('.md'))
  .map((f) => fs.readFileSync(path.join('src/content/events', f), 'utf8')) : [];

const toPath = (src) => { let p = src.startsWith(BASE + '/') ? src.slice(BASE.length) : src; try { p = decodeURI(p); } catch {} return p; };
const targets = new Set();
for (const p of pages) {
  const $ = cheerio.load(p.html);
  const imgs = $('img').toArray().map((i) => $(i).attr('src')).filter(Boolean);
  imgs.forEach((s) => targets.add(toPath(s)));
}
for (const e of events) { const m = e.match(/^image: "(.+)"$/m); if (m) targets.add(m[1]); }

const out = {};
fs.mkdirSync('public/_opt', { recursive: true });
for (const t of targets) {
  const file = path.join('public', t);
  if (!fs.existsSync(file) || !/\.(jpe?g|png|webp)$/i.test(t)) continue;
  const hash = crypto.createHash('sha1').update(t).digest('hex').slice(0, 10);
  const meta = await sharp(file).metadata();
  out[t] = [];
  for (const w of WIDTHS) {
    if (meta.width && meta.width < w && w !== WIDTHS[0]) continue;
    const rel = `/_opt/${hash}-${w}.webp`;
    if (!fs.existsSync(path.join('public', rel))) {
      await sharp(file).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join('public', rel));
    }
    out[t].push({ w: Math.min(w, meta.width || w), path: rel });
  }
}
fs.writeFileSync('src/data/optimized.json', JSON.stringify(out, null, 2));
console.log(`optimized: ${Object.keys(out).length} images`);
