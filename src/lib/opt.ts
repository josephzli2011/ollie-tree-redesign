// Picks the small WebP copies made by scripts/import/optimize.mjs for an image, falling back to the original.
type Variant = { w: number; path: string };
export type OptMap = Record<string, Variant[]>;

/** Points every <img> that has WebP copies at them (with `sizes`), keeping the original in data-full for the lightbox. */
export function responsiveHtml(html: string, map: OptMap, base: string, sizes: string): string {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
    if (!src) return tag;
    const r = responsive(src, map, base);
    if (!r.srcset) return tag;
    const rest = tag.replace(/\s(src|srcset|sizes)="[^"]*"/g, '').replace(/^<img/, '');
    return `<img src="${r.src}" srcset="${r.srcset}" sizes="${sizes}" data-full="${src}"${rest}`;
  });
}

export function responsive(path: string, map: OptMap, base: string): { src: string; srcset?: string } {
  let p = path.startsWith(base + '/') ? path.slice(base.length) : path;
  try { p = decodeURI(p); } catch {}
  const v = map[p];
  if (!v?.length) return { src: base + encodeURI(p) };
  const sorted = [...v].sort((a, b) => a.w - b.w);
  return {
    src: base + sorted[sorted.length - 1].path,
    srcset: sorted.map((x) => `${base}${x.path} ${x.w}w`).join(', '),
  };
}
