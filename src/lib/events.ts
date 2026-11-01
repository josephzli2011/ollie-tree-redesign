// Event helpers. All dates are shown and grouped in America/New_York, whatever machine builds the site.
export const TZ = 'America/New_York';

export type Category = 'clinic' | 'run' | 'youth' | 'talk' | 'senior' | 'other';
export interface Ev {
  slug: string;
  title: string;
  start: string; // ISO 8601 with offset
  end: string;
  allDay: boolean;
  category: Category;
  venue?: string;
  address?: string;
  image?: string;
  registerUrl?: string;
  summary?: string;
}

export const CATEGORY_LABELS: Record<'zh-CN' | 'en', Record<Category, string>> = {
  'zh-CN': { clinic: '义诊', run: '健行', youth: '青少年', talk: '讲座', senior: '长者关怀', other: '其他' },
  en: { clinic: 'Clinic', run: 'Run & Walk', youth: 'Youth', talk: 'Talk', senior: 'Senior care', other: 'Other' },
};

/** Validates a hand-written event file and returns its URL slug. Throws (failing the build) on mistakes that would
 *  otherwise show silently wrong times or broken links. */
export function checkEvent(id: string, ev: { start: string; end: string }): string {
  const [site, ...rest] = id.split('/');
  if (!['cn', 'en'].includes(site) || !rest.length) throw new Error(`Event "${id}": slug must look like "cn/<name>" or "en/<name>"`);
  for (const k of ['start', 'end'] as const) {
    if (!/(Z|[+-]\d\d:\d\d)$/.test(ev[k])) throw new Error(`Event "${id}": ${k} "${ev[k]}" needs a time-zone offset, e.g. 2026-11-14T09:00:00-05:00`);
  }
  return rest.join('/');
}

const parts = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { y: p.year, m: p.month, d: p.day, H: p.hour, M: p.minute, S: p.second };
};

/** New York calendar date (YYYY-MM-DD) of an ISO instant. */
export const nyDate = (iso: string) => { const p = parts(iso); return `${p.y}-${p.m}-${p.d}`; };

export function splitEvents(events: Ev[], now: Date) {
  const t = now.getTime();
  const upcoming = events.filter((e) => new Date(e.end).getTime() > t).sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const past = events.filter((e) => new Date(e.end).getTime() <= t).sort((a, b) => +new Date(b.start) - +new Date(a.start));
  return { upcoming, past };
}

export function homepageEvents(events: Ev[], now: Date, max = 3): { mode: 'upcoming' | 'past'; items: Ev[] } {
  const { upcoming, past } = splitEvents(events, now);
  return upcoming.length ? { mode: 'upcoming', items: upcoming.slice(0, max) } : { mode: 'past', items: past.slice(0, max) };
}

export function formatWhen(ev: Ev, lang: 'zh-CN' | 'en'): string {
  const locale = lang === 'en' ? 'en-US' : 'zh-CN';
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: TZ, weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
  const time = (iso: string) => new Intl.DateTimeFormat(locale, lang === 'en'
    ? { timeZone: TZ, hour: 'numeric', minute: '2-digit' }
    : { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  const sameDay = nyDate(ev.start) === nyDate(ev.end);
  if (ev.allDay) return sameDay ? date(ev.start) : `${date(ev.start)} – ${date(ev.end)}`;
  return sameDay ? `${date(ev.start)} ${time(ev.start)} – ${time(ev.end)}` : `${date(ev.start)} ${time(ev.start)} – ${date(ev.end)} ${time(ev.end)}`;
}

/** 42 cells (6 weeks, Sunday first) covering the given month; month is 1–12. */
export function monthGrid(year: number, month: number, events: Ev[]) {
  const first = Date.UTC(year, month - 1, 1);
  const start = first - new Date(first).getUTCDay() * 86400000;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start + i * 86400000);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      inMonth: d.getUTCMonth() === month - 1,
      events: events.filter((e) => nyDate(e.start) <= date && date <= nyDate(e.end)),
    };
  });
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const icsLocal = (iso: string) => { const p = parts(iso); return `${p.y}${p.m}${p.d}T${p.H}${p.M}${p.S}`; };
const icsDate = (iso: string) => nyDate(iso).replace(/-/g, '');

export function toICS(ev: Ev, url: string): string {
  const stamp = new Date(ev.start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endDate = new Date(Date.parse(nyDate(ev.end) + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OllieTree Foundation//Events//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.slug}@ollietree.org`,
    `DTSTAMP:${stamp}`,
    ...(ev.allDay
      ? [`DTSTART;VALUE=DATE:${icsDate(ev.start)}`, `DTEND;VALUE=DATE:${endDate}`]
      : [`DTSTART;TZID=${TZ}:${icsLocal(ev.start)}`, `DTEND;TZID=${TZ}:${icsLocal(ev.end)}`]),
    `SUMMARY:${icsText(ev.title)}`,
    ...(ev.venue || ev.address ? [`LOCATION:${icsText([ev.venue, ev.address].filter(Boolean).join(', '))}`] : []),
    ...(ev.summary ? [`DESCRIPTION:${icsText(ev.summary)}`] : []),
    `URL:${url}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
