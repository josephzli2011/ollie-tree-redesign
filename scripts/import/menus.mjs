// Regroups the long, flat WordPress menus into a few clear top-level groups without dropping any link.
import { pathFromLink, isOllieTree } from '../lib/paths.mjs';

const GROUPS = {
  cn: [
    { label: '关于我们', paths: ['/cn/异象和使命/', '/cn/关于我们/', '/cn/赞助商列表/', '/cn/联系我们/', '/cn/联系我们/privacy-policy/', '/cn/commonlyqrcodes/'] },
    { label: '事工项目', paths: ['/cn/事工项目/', '/cn/freeclinic/', '/cn/freeclinicregister/', '/cn/中国医疗行/', '/cn/freeclinic2022/', '/cn/2021社区义诊/', '/cn/2020社区义诊/', '/cn/2019社区义诊/', '/cn/温馨之家/', '/cn/健康讲座/'] },
    { label: '社区健行', paths: ['/cn/community-run/', '/cn/事工项目/community-run-社区健行注册/', '/cn/健康5公里和你在一起2023采风/'] },
    { label: '青少年', paths: ['/cn/youthvolunteers/', '/cn/youthvolunteers/stem-ai/', 'https://docs.google.com/', '/cn/事工项目/chesscamp/'] },
    { label: '资讯', paths: ['/cn/橄榄树资讯/', '/cn/疫情通报​/'] },
    { label: '活动', paths: [], extra: [{ label: '活动日历', href: '/cn/events/' }] },
  ],
  en: [
    { label: 'Programs', paths: ['/en/health-clinic/', '/en/ollietree-living/'] },
    { label: 'Youth', paths: ['/en/grow-together/', '/en/leadership/', '/en/sunday-study-group/', '/en/youth-volunteers/'] },
    { label: 'Run & Walk', paths: ['/en/running-club/', '/en/2023-04-22/', '/en/2022-12-10-ollietree-run-for-health/'] },
    { label: 'About', paths: ['/en/about-us-2/'] },
    { label: 'Events', paths: [], extra: [{ label: 'Events Calendar', href: '/en/events/' }] },
  ],
};
const FALLBACK = { cn: '更多', en: 'More' };

export function flattenScraped(menu) {
  return menu.flatMap((i) => [{ label: i.label, href: i.href }, ...flattenScraped(i.children || [])]);
}

const norm = (href) => (isOllieTree(href) ? pathFromLink(href) : href);
const matches = (p, href) => (p.startsWith('https://') ? href.startsWith(p) : p === href);

/**
 * @param {'cn'|'en'} site
 * @param {{label:string, href:string, children:any[]}[]} scraped menu from the live site
 * @param {{label:string, href:string, group:string}[]} extras pages to add to a named group
 * @returns {{label:string, children:{label:string, href:string}[]}[]}
 */
export function buildMenu(site, scraped, extras = []) {
  const groups = GROUPS[site].map((g) => ({ label: g.label, children: [...(g.extra || [])], paths: g.paths }));
  const fallback = { label: FALLBACK[site], children: [], paths: [] };
  const seen = new Set([`/${site}/`]);
  for (const item of flattenScraped(scraped)) {
    const href = norm(item.href);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    (groups.find((g) => g.paths.some((p) => matches(p, href))) ?? fallback).children.push({ label: item.label, href });
  }
  for (const e of extras) {
    if (seen.has(e.href)) continue;
    seen.add(e.href);
    (groups.find((g) => g.label === e.group) ?? fallback).children.push({ label: e.label, href: e.href });
  }
  const rank = (paths, href) => {
    const i = paths.findIndex((p) => matches(p, href));
    return i === -1 ? (href.endsWith('/events/') ? -1 : 999) : i;
  };
  return [...groups, fallback].filter((g) => g.children.length).map(({ label, children, paths }) => ({
    label,
    children: [...children].sort((a, b) => rank(paths, a.href) - rank(paths, b.href)),
  }));
}
