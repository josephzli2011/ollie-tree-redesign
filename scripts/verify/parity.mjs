// Content parity: every text block (≥ 8 chars) of each kept page on the old site must appear on the matching new page.
// Misses fail the check unless listed under "Known differences" in docs/content-audit.md as: - `<path>`: <text start> — reason
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const RAW = 'scrape/raw';
const squash = (s) => s.replace(/\s+/g, '').replace(/​/g, '');
const pages = fs.readdirSync('src/content/pages', { recursive: true }).map(String).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join('src/content/pages', f), 'utf8')));
// Kept in its own file so re-running the importer (which rewrites content-audit.md) doesn't lose it.
const known = fs.readFileSync('docs/known-differences.md', 'utf8');

function sourceHtml(page) {
  const site = page.site;
  for (const kind of ['pages', 'posts']) {
    const doc = JSON.parse(fs.readFileSync(path.join(RAW, site, `${kind}.json`), 'utf8')).find((d) => d.link === page.originalUrl);
    if (!doc) continue;
    const file = path.join(RAW, site, 'html', `${doc.id}.html`);
    const live = fs.existsSync(file) ? cheerio.load(fs.readFileSync(file, 'utf8'))('.entry-content').first() : null;
    const rest = doc.content?.rendered || '';
    const liveHtml = live?.html() || '';
    return squash(cheerio.load(liveHtml).text()).length >= squash(cheerio.load(rest).text()).length ? liveHtml : rest;
  }
  return '';
}

let misses = 0;
let unexplained = 0;
for (const page of pages) {
  const $src = cheerio.load(sourceHtml(page));
  $src('script, style, noscript, form, .screen-reader-text').remove();
  const blocks = [...new Set($src('h1, h2, h3, h4, h5, h6, p, li, blockquote, td, th, figcaption, summary, .elementor-tab-title, .elementor-button-text')
    .toArray().map((e) => squash($src(e).text())).filter((t) => t.length >= 8))];
  const builtFile = path.join('dist', page.path, 'index.html');
  if (!fs.existsSync(builtFile)) { console.log(`MISSING PAGE ${page.path}`); unexplained++; continue; }
  const $out = cheerio.load(fs.readFileSync(builtFile, 'utf8'));
  const built = squash($out('main').text() + $out('footer').text());
  for (const b of blocks) {
    if (built.includes(b)) continue;
    misses++;
    const explained = known.includes(`\`${page.path}\``) && known.includes(b.slice(0, 12));
    if (!explained) { unexplained++; console.log(`${page.path}: ${b.slice(0, 80)}`); }
  }
}
console.log(`parity: ${pages.length} pages, ${misses} missing blocks, ${unexplained} unexplained`);
process.exit(unexplained ? 1 : 0);
