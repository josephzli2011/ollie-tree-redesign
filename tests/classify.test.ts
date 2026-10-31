import { describe, it, expect } from 'vitest';
import { classifyPage, textHash } from '../scripts/import/classify.mjs';

const ctx = (over: Partial<{ menuPaths: Set<string>; pagesByTextHash: Map<string, string>; pathsByTitle: Map<string, string> }> = {}) => ({
  menuPaths: new Set<string>(['/cn/社区义诊/', '/cn/community-run/', '/en/grow-together/']),
  pagesByTextHash: new Map<string, string>(),
  pathsByTitle: new Map<string, string>([['cn:社区健行', '/cn/community-run/']]),
  ...over,
});
const page = (site: string, path: string, title: string, text = 'Real OllieTree content about our clinic and volunteers.') =>
  ({ site, path, title, text, id: 1 });

describe('classifyPage', () => {
  it('redirects a theme Sample Page to the site home', () => {
    const r = classifyPage(page('en', '/en/sample-page/', 'Sample Page', 'This is an example page. It’s different from a blog post'), ctx());
    expect(r).toMatchObject({ status: 'redirect', target: '/en/' });
  });

  it('redirects an internal backup page to the page it backs up', () => {
    expect(classifyPage(page('cn', '/cn/社区健行backup/', '社区健行backup'), ctx())).toMatchObject({ status: 'redirect', target: '/cn/community-run/' });
  });

  it.each(['/cn/donation-history/', '/cn/donor-dashboard/', '/cn/奉献1/', '/cn/donation-failed/', '/cn/donation-confirmation/'])(
    'redirects GiveWP system page %s to the cn giving page', (p) => {
      expect(classifyPage(page('cn', p, 'x'), ctx())).toMatchObject({ status: 'redirect', target: '/cn/奉献2/' });
    });

  it.each(['/en/donation-failed-2/', '/en/donation-confirmation/', '/en/donor-dashboard/', '/en/奉献2/'])(
    'redirects en donation page %s to /en/give/', (p) => {
      expect(classifyPage(page('en', p, 'x'), ctx())).toMatchObject({ status: 'redirect', target: '/en/give/' });
    });

  it.each(['/cn/义诊复核/', '/cn/5k健身复核/', '/cn/thank-you/'])('keeps unclear page %s but hides it from menus', (p) => {
    expect(classifyPage(page('cn', p, 'x'), ctx()).status).toBe('hidden');
  });

  it('keeps a menu page', () => {
    expect(classifyPage(page('cn', '/cn/社区义诊/', '社区义诊'), ctx()).status).toBe('keep');
  });

  it('redirects an /en/ copy of a cn page to the cn original', () => {
    const text = '2019社区义诊 real report text';
    const r = classifyPage(page('en', '/en/2019社区义诊/', '2019社区义诊', text),
      ctx({ pagesByTextHash: new Map([[textHash(text), '/cn/2019社区义诊/']]) }));
    expect(r).toMatchObject({ status: 'redirect', target: '/cn/2019社区义诊/' });
  });

  it('does not redirect a page to itself when it is the canonical copy', () => {
    const text = '2019社区义诊 real report text';
    const r = classifyPage(page('cn', '/cn/2019社区义诊/', '2019社区义诊', text),
      ctx({ pagesByTextHash: new Map([[textHash(text), '/cn/2019社区义诊/']]) }));
    expect(r.status).toBe('hidden');
  });

  it('redirects reset-password to the site home', () => {
    expect(classifyPage(page('cn', '/cn/reset-password/', '密码重设'), ctx())).toMatchObject({ status: 'redirect', target: '/cn/' });
  });

  it('always keeps the site homepages', () => {
    expect(classifyPage(page('root', '/', 'homepage', ''), ctx()).status).toBe('keep');
    expect(classifyPage(page('cn', '/cn/', '首页'), ctx()).status).toBe('keep');
  });

  it('keeps a demo-titled page that is linked from the menu', () => {
    expect(classifyPage(page('en', '/en/grow-together/', 'Home'), ctx()).status).toBe('keep');
  });
});

describe('textHash', () => {
  it('ignores whitespace differences', () => {
    expect(textHash('a  b\n c')).toBe(textHash('a b c'));
  });
});
