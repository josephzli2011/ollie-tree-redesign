import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import * as cheerio from 'cheerio';
import { rewriteLinks, rewriteMedia, stripElementor, replaceForms, cleanContent } from '../scripts/import/clean.mjs';

const BASE = '/ollie-tree-redesign';
const text = (html: string) => cheerio.load(html).text().replace(/\s+/g, ' ').trim();

describe('rewriteLinks', () => {
  it('maps ollietree.org links to base-prefixed encoded local paths', () => {
    const out = rewriteLinks('<a href="https://www.ollietree.org/cn/%E5%85%B3%E4%BA%8E%E6%88%91%E4%BB%AC/">x</a>', BASE);
    expect(out).toContain('href="/ollie-tree-redesign/cn/%E5%85%B3%E4%BA%8E%E6%88%91%E4%BB%AC/"');
  });

  it('handles http and raw unicode links, keeping the hash', () => {
    const out = rewriteLinks('<a href="http://www.ollietree.org/cn/疫情通报​/#top">x</a>', BASE);
    expect(out).toContain('href="/ollie-tree-redesign/cn/%E7%96%AB%E6%83%85%E9%80%9A%E6%8A%A5%E2%80%8B/#top"');
  });

  it('leaves external links unchanged', () => {
    const href = 'https://docs.google.com/forms/d/e/abc/viewform';
    expect(rewriteLinks(`<a href="${href}">x</a>`, BASE)).toContain(`href="${href}"`);
  });
});

describe('rewriteMedia', () => {
  const local = new Set(['/cn/wp-content/uploads/sites/3/2026/04/4467.jpg', '/cn/wp-content/uploads/sites/3/2026/04/4467-300x200.jpg']);

  it('maps uploads URLs to local base-prefixed paths', () => {
    const out = rewriteMedia('<img src="https://www.ollietree.org/cn/wp-content/uploads/sites/3/2026/04/4467.jpg">', BASE, local);
    expect(out).toContain('src="/ollie-tree-redesign/cn/wp-content/uploads/sites/3/2026/04/4467.jpg"');
  });

  it('drops srcset entries with no local file', () => {
    const out = rewriteMedia(
      '<img src="https://www.ollietree.org/cn/wp-content/uploads/sites/3/2026/04/4467.jpg" srcset="https://www.ollietree.org/cn/wp-content/uploads/sites/3/2026/04/4467-300x200.jpg 300w, https://www.ollietree.org/cn/wp-content/uploads/sites/3/2026/04/4467-1024x683.jpg 1024w">',
      BASE, local);
    expect(out).toContain('/ollie-tree-redesign/cn/wp-content/uploads/sites/3/2026/04/4467-300x200.jpg 300w');
    expect(out).not.toContain('1024x683');
    expect(out).not.toContain('ollietree.org');
  });
});

describe('stripElementor', () => {
  const fixture = fs.readFileSync('tests/fixtures/elementor-section.html', 'utf8');

  it('keeps every word of visible text and every image', () => {
    const out = stripElementor(fixture);
    expect(text(out)).toBe(text(fixture));
    expect(cheerio.load(out)('img').length).toBe(cheerio.load(fixture)('img').length);
  });

  it('removes elementor wrappers, inline styles and scripts', () => {
    const out = stripElementor(fixture + '<script>alert(1)</script><style>.x{}</style>');
    expect(out).not.toMatch(/class="[^"]*elementor/);
    expect(out).not.toMatch(/style="/);
    expect(out).not.toMatch(/<script|<style/);
  });

  it('turns a multi-column section into a row with a column count', () => {
    const html = '<section class="elementor-section"><div class="elementor-container"><div class="elementor-column"><div class="elementor-widget-wrap"><p>A</p></div></div><div class="elementor-column"><div class="elementor-widget-wrap"><p>B</p></div></div></div></section>';
    const $ = cheerio.load(stripElementor(html));
    expect($('.row.cols-2').length).toBe(1);
    expect($('.row.cols-2 > .col').length).toBe(2);
  });

  it('turns a YouTube video widget into a privacy-friendly embed', () => {
    const html = `<div class="elementor-widget-video" data-widget_type="video.default" data-settings='{"youtube_url":"https:\\/\\/youtu.be\\/HYi3FqrWUNY","video_type":"youtube"}'><div class="elementor-wrapper"></div></div>`;
    expect(stripElementor(html)).toContain('https://www.youtube-nocookie.com/embed/HYi3FqrWUNY');
  });
});

describe('replaceForms', () => {
  it('swaps a WPForms form for a labelled placeholder (zh)', () => {
    const r = replaceForms('<p>报名</p><div class="wpforms-container"><form class="wpforms-validate"><input name="a"></form></div>', 'zh-CN');
    expect(r.hasForm).toBe(true);
    expect(r.html).toContain('class="form-placeholder"');
    expect(r.html).toContain('报名表即将上线（占位）');
    expect(r.html).not.toContain('<form');
    expect(r.html).toContain('<p>报名</p>');
  });

  it('swaps custom ot_form and PayPal forms (en)', () => {
    const r = replaceForms('<form class="ot_form"><input></form><form action="https://www.paypal.com/cgi-bin/webscr"></form>', 'en');
    expect(r.html).toContain('Registration form coming soon (placeholder)');
    expect(r.html).not.toContain('<form');
  });

  it('merges back-to-back forms into one placeholder', () => {
    const r = replaceForms('<p>x</p><form class="ot_form"></form>\n<form class="ot_form"></form>', 'zh-CN');
    expect(r.html.match(/form-placeholder/g)).toHaveLength(1);
  });

  it('reports no form when there is none', () => {
    expect(replaceForms('<p>hi</p>', 'en').hasForm).toBe(false);
  });
});

describe('cleanContent', () => {
  it('flags image-heavy, text-light pages as galleries', () => {
    const imgs = Array.from({ length: 6 }, (_, i) => `<img src="https://www.ollietree.org/cn/wp-content/uploads/a${i}.jpg">`).join('');
    const local = new Set(Array.from({ length: 6 }, (_, i) => `/cn/wp-content/uploads/a${i}.jpg`));
    const r = cleanContent(`<p>2019社区义诊</p>${imgs}`, { site: 'cn', base: BASE, localMedia: local });
    expect(r.gallery).toBe(true);
    expect(r.hero).toBe('/cn/wp-content/uploads/a0.jpg');
  });

  it('does not flag a text page as a gallery', () => {
    const r = cleanContent(`<p>${'长文本'.repeat(200)}</p><img src="https://www.ollietree.org/cn/wp-content/uploads/a.jpg">`, { site: 'cn', base: BASE, localMedia: new Set(['/cn/wp-content/uploads/a.jpg']) });
    expect(r.gallery).toBe(false);
  });
});
