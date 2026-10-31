import fs from 'node:fs/promises';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url, opts = {}, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...opts, headers: { 'User-Agent': 'ollie-tree-redesign-scraper', ...(opts.headers || {}) } });
      if (res.status >= 500) throw new Error(`HTTP ${res.status} ${url}`);
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(1000 * (i + 1));
    }
  }
  throw lastErr;
}

/** Fetches every page of a WP REST collection. Returns [] when the endpoint doesn't exist. */
export async function fetchAll(endpoint, params = {}) {
  const out = [];
  for (let page = 1; ; page++) {
    const qs = new URLSearchParams({ per_page: '100', page: String(page), ...params });
    const res = await fetchWithRetry(`${endpoint}?${qs}`);
    if (res.status === 404 || res.status === 400) break;
    const data = await res.json();
    if (!Array.isArray(data)) break;
    out.push(...data);
    const total = Number(res.headers.get('x-wp-totalpages') || 1);
    if (page >= total) break;
  }
  return out;
}

export async function fetchText(url) {
  const res = await fetchWithRetry(url);
  return res.ok ? await res.text() : null;
}

/** Downloads url to dest unless dest already exists. Returns 'skipped' | 'saved' | 'missing'. */
export async function download(url, dest) {
  try { await fs.access(dest); return 'skipped'; } catch {}
  const res = await fetchWithRetry(url);
  if (!res.ok) return 'missing';
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return 'saved';
}

/** Runs fn over items with at most `limit` in flight. */
export async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}
