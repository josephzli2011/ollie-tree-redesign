// Committed content must not depend on the preview base path, so switching to the real domain is a config change only.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { withBase } from '../src/lib/base';

const files = (dir: string, ext: string) => fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));

describe('committed content', () => {
  it('stores root-relative paths, not the /ollie-tree-redesign preview base', () => {
    const offenders = [...files('src/content/pages', '.json'), ...files('src/content/events', '.md'), ...files('src/data', '.json')]
      .filter((f) => fs.readFileSync(f, 'utf8').includes('/ollie-tree-redesign/'));
    expect(offenders).toEqual([]);
  });
});

describe('withBase', () => {
  it('prefixes root-relative href, src, srcset entries and data-full', () => {
    const out = withBase('<a href="/cn/x/">a</a><img src="/cn/a.jpg" srcset="/cn/a-300.jpg 300w, /cn/a-600.jpg 600w" data-full="/cn/a.jpg">', '/b');
    expect(out).toBe('<a href="/b/cn/x/">a</a><img src="/b/cn/a.jpg" srcset="/b/cn/a-300.jpg 300w, /b/cn/a-600.jpg 600w" data-full="/b/cn/a.jpg">');
  });

  it('leaves external, protocol-relative, hash and mailto links alone', () => {
    const html = '<a href="https://x.org/">a</a><a href="//cdn.x/">b</a><a href="#top">c</a><a href="mailto:a@b.c">d</a>';
    expect(withBase(html, '/b')).toBe(html);
  });

  it('is a no-op on the real domain (empty base)', () => {
    expect(withBase('<a href="/cn/x/">a</a>', '')).toBe('<a href="/cn/x/">a</a>');
  });
});
