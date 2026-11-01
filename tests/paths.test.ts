import { describe, it, expect } from 'vitest';
import { pathFromLink, originalCandidates } from '../scripts/lib/paths.mjs';

describe('originalCandidates', () => {
  it('derives the full-size original and the unscaled original of a WordPress size variant', () => {
    expect(originalCandidates('https://www.ollietree.org/cn/wp-content/uploads/a/b-1024x768.jpg')).toEqual([
      'https://www.ollietree.org/cn/wp-content/uploads/a/b.jpg',
    ]);
    expect(originalCandidates('https://www.ollietree.org/cn/wp-content/uploads/a/b-scaled.jpg')).toEqual([
      'https://www.ollietree.org/cn/wp-content/uploads/a/b.jpg',
    ]);
    expect(originalCandidates('https://www.ollietree.org/cn/wp-content/uploads/a/b-scaled-300x200.jpg')).toEqual([
      'https://www.ollietree.org/cn/wp-content/uploads/a/b-scaled.jpg',
      'https://www.ollietree.org/cn/wp-content/uploads/a/b.jpg',
    ]);
  });

  it('returns nothing for a file that is already an original', () => {
    expect(originalCandidates('https://www.ollietree.org/cn/wp-content/uploads/a/b.jpg')).toEqual([]);
  });
});

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
