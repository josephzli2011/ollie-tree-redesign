// Checks the built site in dist/. Run `npm run build` first (CI builds before testing).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const DIST = path.resolve('dist');
const BASE = '/ollie-tree-redesign';
const pages = fs.readdirSync('src/content/pages', { recursive: true })
  .map(String).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join('src/content/pages', f), 'utf8')));
const htmlFiles = (fs.existsSync(DIST) ? fs.readdirSync(DIST, { recursive: true }) : [])
  .map(String).filter((f) => f.endsWith('index.html')).map((f) => '/' + f.split(path.sep).join('/'));
const load = (rel: string) => cheerio.load(fs.readFileSync(path.join(DIST, rel), 'utf8'));
const isRedirect = ($: cheerio.CheerioAPI) => $('meta[http-equiv="refresh"]').length > 0;

describe('built site', () => {
  it('was built', () => {
    expect(htmlFiles.length).toBeGreaterThan(50);
  });

  it('writes every kept page at its original path, including the zero-width-space slug', () => {
    for (const p of pages) expect(fs.existsSync(path.join(DIST, p.path, 'index.html')), p.path).toBe(true);
    expect(fs.existsSync(path.join(DIST, 'cn/疫情通报​/index.html'))).toBe(true);
  });

  it('sets the page language per site', () => {
    for (const f of htmlFiles) {
      const $ = load(f);
      if (isRedirect($)) continue;
      if (f.startsWith('/cn/')) expect($('html').attr('lang'), f).toBe('zh-CN');
      if (f.startsWith('/en/')) expect($('html').attr('lang'), f).toBe('en');
    }
  });

  it('has one header donate link to the giving page on every cn and en page', () => {
    for (const f of htmlFiles) {
      const $ = load(f);
      if (isRedirect($) || f === '/index.html') continue;
      const donate = $('header a[data-donate]');
      expect(donate.length, f).toBe(1);
      const target = f.startsWith('/en/') ? `${BASE}/en/give/` : `${BASE}/cn/${encodeURI('奉献2')}/`;
      expect(donate.attr('href'), f).toBe(target);
    }
  });

  it('does not link hidden pages from the header navigation', () => {
    const $ = load('/cn/index.html');
    const navHrefs = $('header nav a').toArray().map((a) => decodeURI($(a).attr('href') || ''));
    for (const p of pages.filter((x: any) => x.hidden)) expect(navHrefs).not.toContain(BASE + p.path);
  });

  it.each([['cn', '/cn/'], ['en', '/en/'], ['root', '/']])('%s homepage keeps every source text block', (site, p) => {
    const src = pages.find((x: any) => x.site === site && x.path === p);
    const built = load(p + 'index.html')('main').text().replace(/\s+/g, '');
    const blocks = cheerio.load(src.html)('h1, h2, h3, h4, h5, h6, p, li, blockquote').toArray()
      .map((e) => cheerio.load(src.html)(e).text().replace(/\s+/g, ''))
      .filter((t) => t.length >= 8);
    const missing = blocks.filter((t) => !built.includes(t));
    // the en homepage's own contact block repeats the footer, which is outside <main>
    const allowed = site === 'en' ? missing.filter((t) => !/POBox2422|ollietreefoundation@gmail|Copyright|704-839-9583/i.test(t)) : missing;
    expect(allowed).toEqual([]);
  });

  it('root chooser links to both sites', () => {
    const $ = load('/index.html');
    const hrefs = $('a').toArray().map((a) => $(a).attr('href'));
    expect(hrefs).toContain(`${BASE}/cn/`);
    expect(hrefs).toContain(`${BASE}/en/`);
  });

  it('never references ollietree.org images', () => {
    for (const f of htmlFiles) {
      const $ = load(f);
      $('img').each((_, i) => expect($(i).attr('src') || '', f).not.toMatch(/^(https?:)?\/\/(www\.)?ollietree\.org/));
    }
  });
});
