export const ORIGIN = 'https://www.ollietree.org';

const decodeSegment = (s) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

/** Site-relative, decoded path for an ollietree.org URL. Page paths get a trailing slash; file paths don't. */
export function pathFromLink(link) {
  const u = new URL(link, ORIGIN);
  let p = u.pathname.split('/').map(decodeSegment).join('/');
  if (!p.startsWith('/')) p = '/' + p;
  const last = p.split('/').pop() ?? '';
  if (!p.endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(last)) p += '/';
  return p;
}

/** True when the URL points at ollietree.org (any scheme, with or without www). */
export function isOllieTree(link) {
  try {
    return /^(www\.)?ollietree\.org$/i.test(new URL(link, ORIGIN).hostname);
  } catch { return false; }
}
