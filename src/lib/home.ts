// Helpers for laying out the imported homepage content in the new design.
import * as cheerio from 'cheerio';
import { getCollection } from 'astro:content';

export const load = (html: string) => cheerio.load(html, null, false);

/** Outer HTML of each top-level section/row of an imported page, in order. */
export function sections(html: string): string[] {
  const $ = load(html);
  return $.root().children('section').toArray().map((s) => $.html(s));
}

export const text = (html: string, sel: string) => load(html)(sel).first().text().replace(/\s+/g, ' ').trim();

export async function pageByPath(path: string) {
  const [p] = await getCollection('pages', (x) => x.data.path === path);
  if (!p) throw new Error(`No imported page at ${path}`);
  return p.data;
}
