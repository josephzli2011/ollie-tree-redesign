// Content stores root-relative paths ("/cn/..."); the site base is added when a page is rendered,
// so moving from the GitHub Pages preview to the real domain is just a config change.
const prefix = (v: string, base: string) => (v.startsWith('/') && !v.startsWith('//') && !v.startsWith(base + '/') ? base + v : v);

export function withBase(html: string, base: string): string {
  if (!base) return html;
  return html
    .replace(/\s(href|src|data-full)="([^"]*)"/g, (_, attr, v) => ` ${attr}="${prefix(v, base)}"`)
    .replace(/\ssrcset="([^"]*)"/g, (_, v: string) => ` srcset="${v.split(',').map((e) => {
      const [u, ...d] = e.trim().split(/\s+/);
      return [prefix(u, base), ...d].join(' ');
    }).join(', ')}"`);
}
