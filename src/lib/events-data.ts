import { getCollection, render } from 'astro:content';
import { checkEvent, type Ev } from './events';
import type { Site } from './site';

export type SiteEvent = Ev & { site: Site; website?: string; imageSrcset?: string; entry: Awaited<ReturnType<typeof getCollection<'events'>>>[number] };

/** All events for a site, with `slug` being the URL segment after /{site}/event/. */
export async function getEvents(site: Site): Promise<SiteEvent[]> {
  const entries = await getCollection('events', (e) => e.data.site === site);
  return entries.map((entry) => ({
    ...entry.data,
    slug: checkEvent(entry.id, entry.data),
    site,
    // the body's first image lists the downloaded size variants; cards use them instead of the full original
    imageSrcset: entry.body?.match(/<img[^>]*\ssrcset="([^"]+)"/)?.[1],
    entry,
  }));
}

export { render };
