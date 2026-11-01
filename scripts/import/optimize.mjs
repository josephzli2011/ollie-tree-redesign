// Makes WebP copies (640/1280/1920px, never upscaled) of every image used in page content, heroes, cards and strips,
// so pages load fast and stay sharp on high-DPI screens. Originals stay at their old paths; copies go to public/_img/
// and are listed in src/data/optimized.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import * as cheerio from 'cheerio';

const BASE = ''; // content stores root-relative paths
const WIDTHS = [640, 960, 1280, 1920]; // steps close enough that phones don't over-download; 1920 covers a ~960px image on a 2x screen
const OUT_DIR = '/_img';
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
fs.mkdirSync(path.join('public', OUT_DIR), { recursive: true });
for (const t of targets) {
  const file = path.join('public', t);
  if (!fs.existsSync(file) || !/\.(jpe?g|png|webp)$/i.test(t)) continue;
  const hash = crypto.createHash('sha1').update(t).digest('hex').slice(0, 10);
  const meta = await sharp(file).metadata();
  const full = meta.autoOrient?.width ?? meta.width;
  if (!full) continue;
  // never upscale; always include the image's own width (up to the cap) so high-DPI screens get every pixel there is
  const widths = [...new Set([...WIDTHS.filter((w) => w < full), Math.min(full, WIDTHS[WIDTHS.length - 1])])];
  // PNGs are usually graphics (posters, QR codes, logos): near-lossless keeps text and edges crisp at a fraction of lossless size
  const graphic = /\.png$/i.test(t);
  out[t] = [];
  for (const w of widths) {
    const rel = `${OUT_DIR}/${hash}-${w}${graphic ? '-g' : ''}.webp`;
    if (!fs.existsSync(path.join('public', rel))) {
      await sharp(file).rotate().resize({ width: w, withoutEnlargement: true })
        .webp(graphic ? { nearLossless: true, quality: 60, effort: 5 } : { quality: 82, smartSubsample: true, effort: 5 })
        .toFile(path.join('public', rel));
    }
    out[t].push({ w, path: rel });
  }
}
fs.writeFileSync('src/data/optimized.json', JSON.stringify(out, null, 2));
// This script owns public/_img: remove copies from earlier runs that nothing uses any more.
const used = new Set(Object.values(out).flat().map((v) => path.basename(v.path)));
const stale = fs.readdirSync(path.join('public', OUT_DIR)).filter((f) => !used.has(f));
stale.forEach((f) => fs.unlinkSync(path.join('public', OUT_DIR, f)));
if (stale.length) console.log(`removed ${stale.length} unused copies`);
console.log(`optimized: ${Object.keys(out).length} images`);
