import { describe, it, expect } from 'vitest';
import { responsive, responsiveHtml } from '../src/lib/opt';

const map = {
  '/cn/wp-content/uploads/a.jpg': [{ w: 480, path: '/_opt/abc-480.webp' }, { w: 960, path: '/_opt/abc-960.webp' }],
};

describe('responsive', () => {
  it('uses the optimized WebP copies when they exist', () => {
    expect(responsive('/cn/wp-content/uploads/a.jpg', map, '/base')).toEqual({
      src: '/base/_opt/abc-960.webp',
      srcset: '/base/_opt/abc-480.webp 480w, /base/_opt/abc-960.webp 960w',
    });
  });

  it('accepts an already base-prefixed, encoded path', () => {
    const r = responsive('/base/cn/wp-content/uploads/a.jpg', map, '/base');
    expect(r.src).toBe('/base/_opt/abc-960.webp');
  });

  it('rewrites content images to the WebP copies and keeps the original for the lightbox', () => {
    const out = responsiveHtml('<p>x</p><img src="/base/cn/wp-content/uploads/a.jpg" srcset="/base/cn/wp-content/uploads/a-300x200.jpg 300w" alt="A">', map, '/base', '50vw');
    expect(out).toContain('src="/base/_opt/abc-960.webp"');
    expect(out).toContain('srcset="/base/_opt/abc-480.webp 480w, /base/_opt/abc-960.webp 960w"');
    expect(out).toContain('sizes="50vw"');
    expect(out).toContain('data-full="/base/cn/wp-content/uploads/a.jpg"');
    expect(out).toContain('alt="A"');
  });

  it('leaves images without copies untouched', () => {
    const html = '<img src="/base/cn/wp-content/uploads/zzz.jpg" alt="">';
    expect(responsiveHtml(html, map, '/base', '50vw')).toBe(html);
  });

  it('falls back to the original file', () => {
    expect(responsive('/cn/wp-content/uploads/中文.jpg', map, '/base')).toEqual({ src: '/base/cn/wp-content/uploads/%E4%B8%AD%E6%96%87.jpg' });
  });
});
