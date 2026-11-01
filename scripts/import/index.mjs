// Turns scrape/raw + scrape/media into site content: page JSON, menus, footer, redirects, public media and the content audit.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { pathFromLink } from '../lib/paths.mjs';
import { classifyPage, textHash, normalizeText } from './classify.mjs';
import { cleanContent, stripElementor } from './clean.mjs';
import { buildMenu, flattenScraped } from './menus.mjs';

const BASE = ''; // content stores root-relative paths; the site base is added at render time (src/lib/base.ts)
const SITES = ['root', 'cn', 'en'];
const RAW = path.resolve('scrape/raw');
const MEDIA = path.resolve('scrape/media');
const OUT_PAGES = path.resolve('src/content/pages');
const OUT_DATA = path.resolve('src/data');
const PUBLIC = path.resolve('public');
// Real English pages that weren't in the old menu; added so visitors can find them.
const EN_EXTRAS = [
  { path: '/en/past-clinics/', group: 'Programs' },
  { path: '/en/2025-ollietree-5k-run-and-2k-walk/', group: 'Run & Walk' },
  { path: '/en/5k-run-walk/', group: 'Run & Walk' },
  { path: '/en/blog/', group: 'About' },
];

const readJson = (f) => JSON.parse(fss.readFileSync(f, 'utf8'));
const decodeEntities = (s) => cheerio.load(`<p>${s}</p>`, null, false).root().text();
const textOf = (html) => normalizeText(cheerio.load(html, null, false).root().text());

/** Main content: the live page's .entry-content unless the REST body has more text. */
function mainHtml(doc, liveHtml) {
  const rest = doc.content?.rendered || '';
  if (!liveHtml) return rest;
  const live = cheerio.load(liveHtml)('.entry-content').first().html() || '';
  return textOf(live).length >= textOf(rest).length ? live : rest;
}

function footerHtml(liveHtml) {
  if (!liveHtml) return '';
  const $ = cheerio.load(liveHtml);
  return $('footer').last().html() || '';
}

async function listFiles(dir) {
  const out = [];
  const walk = async (d) => {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p); else out.push(p);
    }
  };
  await walk(dir);
  return out;
}

// 1. Media → public/ at original paths (skip Elementor's generated CSS).
const mediaFiles = (await listFiles(MEDIA)).filter((f) => !/[\\/]uploads[\\/]elementor[\\/]/.test(f));
const localMedia = new Set();
for (const f of mediaFiles) {
  const rel = path.relative(MEDIA, f).split(path.sep).join('/');
  const dest = path.join(PUBLIC, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (!fss.existsSync(dest)) await fs.copyFile(f, dest);
  localMedia.add('/' + rel);
}

// 2. Gather every page and post with its main HTML and text.
const docs = [];
const menus = {};
for (const site of SITES) {
  menus[site] = readJson(path.join(RAW, site, 'menus.json'));
  const items = [...readJson(path.join(RAW, site, 'pages.json')), ...readJson(path.join(RAW, site, 'posts.json')).map((p) => ({ ...p, isPost: true }))];
  for (const d of items) {
    const htmlFile = path.join(RAW, site, 'html', `${d.id}.html`);
    const live = fss.existsSync(htmlFile) ? fss.readFileSync(htmlFile, 'utf8') : null;
    const html = mainHtml(d, live);
    docs.push({
      site, id: d.id, isPost: !!d.isPost, date: d.date,
      path: pathFromLink(d.link), link: d.link,
      title: decodeEntities(d.title?.rendered || ''),
      html, text: textOf(stripElementor(html)),
    });
  }
}

// 3. Classification context.
const menuPaths = new Set(SITES.flatMap((s) => flattenScraped(menus[s]).map((i) => i.href)).filter((h) => /ollietree\.org/.test(h)).map(pathFromLink));
for (const e of EN_EXTRAS) menuPaths.add(e.path);
const pathsByTitle = new Map(docs.map((d) => [`${d.site}:${normalizeText(d.title)}`, d.path]));
const pagesByTextHash = new Map();
const priority = (d) => (menuPaths.has(d.path) ? 0 : d.site === 'cn' ? 1 : d.site === 'en' ? 2 : 3);
for (const d of [...docs].sort((a, b) => priority(a) - priority(b) || a.id - b.id)) {
  if (d.text && !pagesByTextHash.has(textHash(d.text))) pagesByTextHash.set(textHash(d.text), d.path);
}
const ctx = { menuPaths, pathsByTitle, pagesByTextHash };

// 4. Classify, clean and write.
await fs.rm(OUT_PAGES, { recursive: true, force: true });
const audit = [];
const redirects = [];
for (const d of docs) {
  const c = classifyPage(d, ctx);
  audit.push({ ...d, ...c });
  if (c.status === 'redirect') {
    if (c.target !== d.path) redirects.push({ from: d.path, to: c.target });
    continue;
  }
  const cleaned = cleanContent(d.html, { site: d.site === 'root' ? 'cn' : d.site, base: BASE, localMedia });
  const page = {
    title: d.title,
    site: d.site,
    lang: d.site === 'en' ? 'en' : 'zh-CN',
    path: d.path,
    originalUrl: d.link,
    hidden: c.status === 'hidden',
    giving: d.path === '/cn/奉献2/',
    isPost: d.isPost,
    date: d.date,
    hero: cleaned.hero ?? null,
    gallery: cleaned.gallery,
    hasForm: cleaned.hasForm,
    html: cleaned.html,
  };
  const dir = path.join(OUT_PAGES, d.site);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${d.id}${d.isPost ? '-post' : ''}.json`), JSON.stringify(page, null, 2));
}

// 5. Menus, footers, redirects.
await fs.mkdir(OUT_DATA, { recursive: true });
const titleOf = (p) => docs.find((d) => d.path === p)?.title ?? p;
const enExtras = EN_EXTRAS.filter((e) => audit.some((a) => a.path === e.path && a.status !== 'redirect')).map((e) => ({ ...e, href: e.path, label: titleOf(e.path) }));
await fs.writeFile(path.join(OUT_DATA, 'menu.cn.json'), JSON.stringify(buildMenu('cn', menus.cn), null, 2));
await fs.writeFile(path.join(OUT_DATA, 'menu.en.json'), JSON.stringify(buildMenu('en', menus.en, enExtras), null, 2));
for (const site of ['cn', 'en']) {
  const home = docs.find((d) => d.site === site && d.path === `/${site}/`);
  const live = fss.readFileSync(path.join(RAW, site, 'html', `${home.id}.html`), 'utf8');
  const footer = cleanContent(footerHtml(live), { site, base: BASE, localMedia });
  await fs.writeFile(path.join(OUT_DATA, `footer.${site}.json`), JSON.stringify({ html: footer.html }, null, 2));
}
await fs.writeFile(path.join(OUT_DATA, 'redirects.json'), JSON.stringify(redirects, null, 2));

// 6. Content audit.
const missing = SITES.flatMap((s) => readJson(path.join(RAW, s, 'media-missing.json')));
const rows = audit
  .sort((a, b) => a.site.localeCompare(b.site) || a.path.localeCompare(b.path))
  .map((a) => `| ${a.site} | \`${a.path}\` | ${a.title.replace(/\|/g, '/')} | ${a.status} | ${a.target ? `\`${a.target}\`` : ''} | ${a.reason} |`);
const counts = audit.reduce((m, a) => ({ ...m, [a.status]: (m[a.status] || 0) + 1 }), {});
await fs.writeFile('docs/content-audit.md', `# Content audit

Generated by \`npm run import\` from the scrape of ollietree.org. Every published page and post on the old site is listed with what happened to it.

- **keep**: on the new site and linked from the menus
- **hidden**: on the new site at the same address, not linked from the menus
- **redirect**: not a real content page (theme demo, duplicate, plugin system page, backup); its old address redirects to the target

Totals: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}; media files copied: ${localMedia.size}.

| Site | Old path | Title | Status | Target | Reason |
|---|---|---|---|---|---|
${rows.join('\n')}

## Media missing on the live site

These files are listed in the WordPress media library but return 404 on ollietree.org today, so they could not be copied:

${missing.map((m) => `- ${decodeURI(m)}`).join('\n') || '- none'}

## Known differences

See \`docs/known-differences.md\`.
`);
console.log(`pages written: ${audit.filter((a) => a.status !== 'redirect').length}, redirects: ${redirects.length}, media: ${localMedia.size}`, counts);
