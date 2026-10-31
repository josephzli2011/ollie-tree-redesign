// Per-site UI labels and organization facts. Facts are taken verbatim from the old site (footer, homepages).
export type Site = 'cn' | 'en';
export type Lang = 'zh-CN' | 'en';

// Contact details as each site's own footer wrote them.
export const CONTACT = {
  cn: { address: 'PO Box 2422 Matthews, NC 28106-2422， United States.', phone: '+1 704 839 9583', email: 'OllieTreeFoundation@gmail.com' },
  en: { address: 'PO Box 2422, Matthews, NC 28106', phone: '+1 704-839-9583', email: 'ollietreefoundation@gmail.com' },
} as const;

export const ORG = {
  youtube:'https://www.youtube.com/channel/UCJLlawoLRMB3TEXyhAji8YQ/videos',
  logo: '/en/wp-content/uploads/sites/2/2024/06/download-1.png',
};

export const LABELS = {
  cn: {
    name: '橄榄树基金会',
    altName: 'OllieTree Foundation',
    tagline: '凝聚爱，传递爱，播种爱，见证爱',
    donate: '捐款',
    givingPath: '/cn/奉献2/',
    otherLang: 'English',
    otherLangPath: '/en/',
    menu: '菜单',
    close: '关闭',
    skip: '跳到正文',
    contact: '联系方式',
    home: '首页',
    events: '活动日历',
    eventsPath: '/cn/events/',
  },
  en: {
    name: 'OllieTree Foundation',
    altName: '橄榄树基金会',
    tagline: 'Gather Love, Convey Love, Spread Love, Witness Love',
    donate: 'Donate',
    givingPath: '/en/give/',
    otherLang: '中文',
    otherLangPath: '/cn/',
    menu: 'Menu',
    close: 'Close',
    skip: 'Skip to content',
    contact: 'Contact',
    home: 'Home',
    events: 'Events Calendar',
    eventsPath: '/en/events/',
  },
} as const;

export const langOf = (site: Site): Lang => (site === 'en' ? 'en' : 'zh-CN');
