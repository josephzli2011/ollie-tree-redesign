// Every dropped old URL must still resolve: a meta-refresh page in dist/ and a 301 line in public/_redirects.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const BASE = '/ollie-tree-redesign';
const redirects: { from: string; to: string }[] = JSON.parse(fs.readFileSync('src/data/redirects.json', 'utf8'));
const lines = fs.existsSync('public/_redirects') ? fs.readFileSync('public/_redirects', 'utf8').split('\n') : [];

describe('redirects', () => {
  it('has redirects to check', () => {
    expect(redirects.length).toBeGreaterThan(20);
  });

  it.each(redirects)('$from → $to has a meta-refresh page', ({ from, to }) => {
    const file = path.join('dist', from, 'index.html');
    expect(fs.existsSync(file), file).toBe(true);
    const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
    const target = BASE + encodeURI(to);
    expect($('meta[http-equiv="refresh"]').attr('content')).toBe(`0; url=${target}`);
    expect($('link[rel="canonical"]').attr('href')).toContain(target);
    expect($('a').attr('href')).toBe(target);
  });

  it.each(redirects)('$from → $to has a 301 line in _redirects', ({ from, to }) => {
    expect(lines).toContain(`${encodeURI(from)} ${encodeURI(to)} 301`);
  });

  it('sends every old donation page to a giving page that exists', () => {
    for (const r of redirects.filter((x) => /donat|donor|奉献/.test(x.from))) {
      expect(['/cn/奉献2/', '/en/give/']).toContain(r.to);
    }
    expect(fs.existsSync(path.join('dist', 'cn/奉献2/index.html'))).toBe(true);
    expect(fs.existsSync(path.join('dist', 'en/give/index.html'))).toBe(true);
  });
});
