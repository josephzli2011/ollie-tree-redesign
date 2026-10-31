import type { APIRoute } from 'astro';
import { getEvents, type SiteEvent } from '../../../../lib/events-data';
import { toICS } from '../../../../lib/events';
import { url } from '../../../../lib/url';

export async function getStaticPaths() {
  const all = [...(await getEvents('cn')), ...(await getEvents('en'))];
  return all.map((e) => ({ params: { site: e.site, slug: e.slug }, props: { ev: e } }));
}

export const GET: APIRoute = ({ props, site }) => {
  const ev = props.ev as SiteEvent;
  const page = new URL(url(`/${ev.site}/event/${ev.slug}/`), site).href;
  return new Response(toICS(ev, page), { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
