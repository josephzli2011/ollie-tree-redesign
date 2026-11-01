import { describe, it, expect, beforeAll } from 'vitest';
import { splitEvents, homepageEvents, formatWhen, monthGrid, toICS, checkEvent, type Ev } from '../src/lib/events';

describe('checkEvent (hand-written event files)', () => {
  const ok = { start: '2026-11-14T09:00:00-05:00', end: '2026-11-14T13:00:00Z' };
  it('accepts times with an offset or Z and returns the URL slug', () => {
    expect(checkEvent('cn/2026-clinic', ok)).toBe('2026-clinic');
  });
  it('rejects a time without an offset (would be read as UTC on the build machine)', () => {
    expect(() => checkEvent('cn/x', { ...ok, start: '2026-11-14T09:00:00' })).toThrow(/offset/);
  });
  it('rejects a slug without the site prefix', () => {
    expect(() => checkEvent('2026-clinic', ok)).toThrow(/slug/);
  });
});

const ev = (slug: string, start: string, end: string, extra: Partial<Ev> = {}): Ev => ({
  slug, title: slug, start, end, allDay: false, category: 'other', ...extra,
});
const feb = ev('feb', '2026-02-01T08:00:00-05:00', '2026-02-01T17:00:00-05:00', { title: '青少年义工-课外辅导' });
const mar = ev('mar', '2026-03-01T00:00:00-05:00', '2026-03-01T23:59:00-05:00');
const nov = ev('nov', '2026-11-15T09:00:00-05:00', '2026-11-15T12:00:00-05:00');
const now = new Date('2026-10-31T12:00:00-04:00');

beforeAll(() => { process.env.TZ = 'UTC'; });

describe('splitEvents', () => {
  it('splits by end time: upcoming ascending, past descending', () => {
    const r = splitEvents([mar, nov, feb], now);
    expect(r.upcoming.map((e) => e.slug)).toEqual(['nov']);
    expect(r.past.map((e) => e.slug)).toEqual(['mar', 'feb']);
  });

  it('treats an event that has started but not ended as upcoming', () => {
    const live = ev('live', '2026-10-31T10:00:00-04:00', '2026-10-31T15:00:00-04:00');
    expect(splitEvents([live], now).upcoming).toHaveLength(1);
  });
});

describe('homepageEvents', () => {
  it('falls back to the most recent past events when nothing is upcoming', () => {
    expect(homepageEvents([feb, mar], now)).toEqual({ mode: 'past', items: [mar, feb] });
  });

  it('shows upcoming events when there are any', () => {
    expect(homepageEvents([feb, mar, nov], now)).toEqual({ mode: 'upcoming', items: [nov] });
  });

  it('caps at max', () => {
    const many = Array.from({ length: 5 }, (_, i) => ev(`e${i}`, `2026-12-0${i + 1}T10:00:00-05:00`, `2026-12-0${i + 1}T11:00:00-05:00`));
    expect(homepageEvents(many, now, 3).items).toHaveLength(3);
  });
});

describe('formatWhen', () => {
  it('formats in America/New_York on a DST change day even on a UTC machine', () => {
    const e = ev('dst', '2026-03-08T10:00:00-04:00', '2026-03-08T11:00:00-04:00');
    const zh = formatWhen(e, 'zh-CN');
    expect(zh).toContain('3月8日');
    expect(zh).toContain('10:00');
    expect(formatWhen(e, 'en')).toMatch(/March 8, 2026.*10:00/);
  });

  it('omits the time for all-day events', () => {
    const e = ev('allday', '2026-03-01T00:00:00-05:00', '2026-03-01T23:59:00-05:00', { allDay: true });
    expect(formatWhen(e, 'zh-CN')).not.toMatch(/\d:\d\d/);
  });
});

describe('monthGrid', () => {
  it('returns 6 weeks starting on Sunday with events in their New York date cell', () => {
    const grid = monthGrid(2026, 2, [feb]);
    expect(grid).toHaveLength(42);
    expect(grid[0].date).toBe('2026-02-01');
    expect(grid[0].inMonth).toBe(true);
    expect(grid[0].events.map((e) => e.slug)).toEqual(['feb']);
    expect(grid[41].inMonth).toBe(false);
  });

  it('pads the start of a month that does not begin on Sunday', () => {
    const grid = monthGrid(2026, 10, []);
    expect(grid[0].date).toBe('2026-09-27');
    expect(grid.find((c) => c.date === '2026-10-01')!.inMonth).toBe(true);
  });

  it('places a late-evening New York event on its local date, not the UTC date', () => {
    const late = ev('late', '2026-02-10T21:00:00-05:00', '2026-02-10T22:00:00-05:00');
    const grid = monthGrid(2026, 2, [late]);
    expect(grid.find((c) => c.date === '2026-02-10')!.events).toHaveLength(1);
    expect(grid.find((c) => c.date === '2026-02-11')!.events).toHaveLength(0);
  });
});

describe('toICS', () => {
  it('produces a VEVENT with local New York times', () => {
    const ics = toICS(feb, 'https://example.org/cn/event/feb/');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART;TZID=America/New_York:20260201T080000');
    expect(ics).toContain('DTEND;TZID=America/New_York:20260201T170000');
    expect(ics).toContain('SUMMARY:青少年义工-课外辅导');
    expect(ics).toContain('URL:https://example.org/cn/event/feb/');
    expect(ics.split('\r\n').length).toBeGreaterThan(5);
  });

  it('uses DATE values for all-day events', () => {
    const ics = toICS({ ...mar, allDay: true }, 'u');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260301');
  });

  it('escapes commas and semicolons in text', () => {
    expect(toICS({ ...feb, venue: 'Room 1, Hall; B' }, 'u')).toContain('LOCATION:Room 1\\, Hall\\; B');
  });
});
