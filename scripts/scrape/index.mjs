// Scrapes ollietree.org (root, /cn, /en) into scrape/raw and scrape/media. Safe to re-run.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { fetchAll, fetchText, download, pool, fetchWithRetry } from './wp.mjs';
import { ORIGIN, pathFromLink, isOllieTree, originalCandidates } from '../lib/paths.mjs';

const ROOT = path.resolve('scrape');
const SITES = [
  { key: 'root', base: '' },
  { key: 'cn', base: '/cn' },
  { key: 'en', base: '/en' },
];
const PAGE_FIELDS = 'id,parent,link,slug,title,content,excerpt,status,featured_media,menu_order,date,modified,template';
const MEDIA_FIELDS = 'id,link,source_url,mime_type,media_details,alt_text,title,post';

const writeJson = async (file, data) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
};

/** Parses the theme's primary nav into [{label, href, children}]. */
export function parseMenu(html) {
  const $ = cheerio.load(html);
  const nav = $('nav').first();
  const walk = (ul) => ul.children('li').toArray().map((li) => {
    const a = $(li).children('a').first();
    return {
      label: a.text().replace(/\s+/g, ' ').trim(),
      href: a.attr('href') || '',
      children: walk($(li).children('ul').first()),
    };
  });
  return walk(nav.find('ul').first());
}

/** Every wp-content/uploads URL referenced in an HTML string (src, href, srcset, inline styles). */
export function uploadUrls(html) {
  const found = new Set();
  for (const m of html.matchAll(/(?:https?:)?\/\/(?:www\.)?ollietree\.org\/[^\s"'()<>,]*?wp-content\/uploads\/[^\s"'()<>,]+/gi)) {
    found.add(m[0].replace(/^\/\//, 'https://').replace(/^http:/, 'https:'));
  }
  return [...found];
}

async function scrapeSite(site) {
  const api = `${ORIGIN}${site.base}/wp-json`;
  const dir = path.join(ROOT, 'raw', site.key);
  const pages = await fetchAll(`${api}/wp/v2/pages`, { _fields: PAGE_FIELDS, status: 'publish' });
  const posts = await fetchAll(`${api}/wp/v2/posts`, { _fields: PAGE_FIELDS + ',categories,tags' });
  const media = await fetchAll(`${api}/wp/v2/media`, { _fields: MEDIA_FIELDS });
  let events = [];
  try {
    const res = await fetchWithRetry(`${api}/tribe/events/v1/events?start_date=2000-01-01&per_page=50`);
    if (res.ok) events = (await res.json()).events || [];
  } catch {}
  const home = await fetchText(`${ORIGIN}${site.base}/`);
  const menu = home ? parseMenu(home) : [];

  await writeJson(path.join(dir, 'pages.json'), pages);
  await writeJson(path.join(dir, 'posts.json'), posts);
  await writeJson(path.join(dir, 'media.json'), media);
  await writeJson(path.join(dir, 'events.json'), events);
  await writeJson(path.join(dir, 'menus.json'), menu);

  // Live rendered HTML for every page, post and event (Elementor output lives here, not in the REST content).
  const docs = [...pages, ...posts, ...events.map((e) => ({ id: `event-${e.id}`, link: e.url }))];
  const referenced = new Set();
  await pool(docs, 4, async (d) => {
    const html = await fetchText(d.link);
    if (!html) return;
    await fs.mkdir(path.join(dir, 'html'), { recursive: true });
    await fs.writeFile(path.join(dir, 'html', `${d.id}.html`), html);
    uploadUrls(html).forEach((u) => referenced.add(u));
  });
  if (home) uploadUrls(home).forEach((u) => referenced.add(u));

  // Originals from the media library plus every uploads URL the pages reference (sized variants, srcset).
  const urls = new Set(referenced);
  for (const m of media) if (m.source_url) urls.add(m.source_url.replace(/^http:/, 'https:'));
  const list = [...urls].filter(isOllieTree);
  const results = await pool(list, 4, async (u) => {
    const rel = pathFromLink(u).replace(/^\//, '');
    return [u, await download(u, path.join(ROOT, 'media', rel))];
  });
  const missing = results.filter(([, r]) => r === 'missing').map(([u]) => u);
  // Also fetch the full-resolution originals behind size variants and "-scaled" copies, so pages can show them sharp.
  // These are best-effort: WordPress doesn't keep every original, so a 404 here is not a missing file.
  const originals = [...new Set(list.flatMap(originalCandidates))].filter((u) => !urls.has(u));
  const got = await pool(originals, 4, async (u) => download(u, path.join(ROOT, 'media', pathFromLink(u).replace(/^\//, ''))));
  console.log(`${site.key}: ${got.filter((r) => r === 'saved').length} full-resolution originals fetched, ${got.filter((r) => r === 'skipped').length} already here`);
  await writeJson(path.join(dir, 'media-missing.json'), missing);
  console.log(`${site.key}: ${pages.length} pages, ${posts.length} posts, ${events.length} events, ${media.length} media items, ${list.length} files (${missing.length} missing)`);
}

for (const site of SITES) await scrapeSite(site);
