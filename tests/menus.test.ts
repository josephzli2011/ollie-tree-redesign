import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { buildMenu, flattenScraped } from '../scripts/import/menus.mjs';
import { pathFromLink, isOllieTree } from '../scripts/lib/paths.mjs';

const scraped = (site: string) => JSON.parse(fs.readFileSync(`scrape/raw/${site}/menus.json`, 'utf8'));
const norm = (href: string) => (isOllieTree(href) ? pathFromLink(href) : href);
const allHrefs = (menu: any[]) => menu.flatMap((g) => [g.href, ...g.children.map((c: any) => c.href)]).filter(Boolean);

describe.each(['cn', 'en'])('buildMenu(%s)', (site) => {
  const menu = buildMenu(site, scraped(site));
  const home = `/${site}/`;

  it('keeps every scraped menu link exactly once (home is the logo)', () => {
    const hrefs = allHrefs(menu);
    for (const item of flattenScraped(scraped(site))) {
      const h = norm(item.href);
      if (h === home) continue;
      expect(hrefs.filter((x: string) => x === h), `${item.label} ${h}`).toHaveLength(1);
    }
  });

  it('has at most 6 top-level groups and an events entry', () => {
    expect(menu.length).toBeLessThanOrEqual(6);
    expect(allHrefs(menu)).toContain(`/${site}/events/`);
  });

  it('uses decoded site-relative paths for internal links', () => {
    for (const h of allHrefs(menu)) expect(h.startsWith('/') || h.startsWith('https://')).toBe(true);
    expect(allHrefs(menu).some((h: string) => h.includes('ollietree.org'))).toBe(false);
  });
});

describe('buildMenu(cn) grouping', () => {
  it('puts the clinic years under 事工项目', () => {
    const g = buildMenu('cn', scraped('cn')).find((x: any) => x.label === '事工项目');
    expect(g.children.map((c: any) => c.href)).toEqual(expect.arrayContaining(['/cn/freeclinic/', '/cn/2019社区义诊/', '/cn/freeclinicregister/']));
  });
});
