import { describe, it, expect } from 'vitest';
import { pathFromLink } from '../scripts/lib/paths.mjs';

describe('pathFromLink', () => {
  it('decodes percent-encoded Chinese slugs', () => {
    expect(pathFromLink('https://www.ollietree.org/cn/%E7%A4%BE%E5%8C%BA%E4%B9%89%E8%AF%8A/')).toBe('/cn/社区义诊/');
  });

  it('preserves the zero-width space in /cn/疫情通报​/', () => {
    expect(pathFromLink('http://www.ollietree.org/cn/疫情通报​/')).toBe('/cn/疫情通报​/');
  });

  it('adds a trailing slash', () => {
    expect(pathFromLink('https://www.ollietree.org/en')).toBe('/en/');
  });

  it('drops query string and hash', () => {
    expect(pathFromLink('https://www.ollietree.org/cn/?page_id=4913#x')).toBe('/cn/');
  });
});
