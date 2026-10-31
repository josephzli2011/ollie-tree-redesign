// Decides what happens to each scraped page: keep (in menus), hidden (kept, not in menus) or redirect.
import crypto from 'node:crypto';

const HOMES = { root: '/', cn: '/cn/', en: '/en/' };
const GIVING = { root: '/cn/奉献2/', cn: '/cn/奉献2/', en: '/en/give/' };
const DEMO_TITLES = new Set(['sample page', 'contact', 'faq', 'projects', 'services', 'about', 'home', 'home2', 'homepage']);
const DEMO_TEXT = /example page|lorem ipsum|sample page|astra|wp-admin|this is a page/i;

export const normalizeText = (text) => (text || '').replace(/\s+/g, ' ').trim();
export const textHash = (text) => crypto.createHash('sha1').update(normalizeText(text)).digest('hex');

const lastSegment = (p) => p.split('/').filter(Boolean).pop() ?? '';

export function classifyPage(page, ctx) {
  const { site, path, title } = page;
  const home = HOMES[site];
  const seg = lastSegment(path);
  const redirect = (target, reason) => ({ status: 'redirect', target, reason });

  if (path === home) return { status: 'keep', reason: 'site homepage' };

  // WordPress plugin/system pages (GiveWP, account pages)
  if (/^(donation-|donor-dashboard)/.test(seg) || seg === '奉献1' || (site !== 'cn' && seg === '奉献2')) {
    return redirect(GIVING[site], 'GiveWP donation system page → giving placeholder');
  }
  if (site === 'cn' && seg === '奉献2') return { status: 'keep', reason: 'giving page (rendered as placeholder)' };
  if (seg === 'reset-password') return redirect(home, 'account system page');

  if (/backup/i.test(seg)) {
    const base = normalizeText(title.replace(/backup/i, ''));
    return redirect(ctx.pathsByTitle.get(`${site}:${base}`) ?? home, 'internal backup copy');
  }

  if (site === 'root') return redirect('/', 'root site theme demo page');

  const inMenu = ctx.menuPaths.has(path);
  if (!inMenu && DEMO_TITLES.has(normalizeText(title).toLowerCase()) && (DEMO_TEXT.test(page.text) || !normalizeText(page.text))) {
    return redirect(home, 'theme demo/boilerplate page');
  }

  const canonical = normalizeText(page.text) ? ctx.pagesByTextHash.get(textHash(page.text)) : undefined;
  if (canonical && canonical !== path) return redirect(canonical, `duplicate of ${canonical}`);

  if (inMenu) return { status: 'keep', reason: 'linked from menu' };
  return { status: 'hidden', reason: 'real content not linked from menu' };
}
