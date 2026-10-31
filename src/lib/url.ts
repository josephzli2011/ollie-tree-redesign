/** Site base without trailing slash, e.g. "/ollie-tree-redesign" (or "" on the real domain). */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Base-prefixed, encoded URL for a site-relative path; external URLs pass through. */
export function url(path: string): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return BASE + encodeURI(path);
}
