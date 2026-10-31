import { getCollection, render } from 'astro:content';
import type { Ev } from './events';
import type { Site } from './site';

export type SiteEvent = Ev & { site: Site; website?: string; entry: Awaited<ReturnType<typeof getCollection<'events'>>>[number] };

/** All events for a site, with `slug` being the URL segment after /{site}/event/. */
export async function getEvents(site: Site): Promise<SiteEvent[]> {
  const entries = await getCollection('events', (e) => e.data.site === site);
  return entries.map((entry) => ({ ...entry.data, slug: entry.id.split('/').slice(1).join('/'), site, entry }));
}

export { render };
