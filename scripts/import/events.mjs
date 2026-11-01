// Converts the old Events Calendar entries into event files (src/content/events/{site}/YYYY-MM-DD-slug.md).
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { cleanContent } from './clean.mjs';

const BASE = ''; // content stores root-relative paths; the site base is added at render time
const OUT = path.resolve('src/content/events');
const local = new Set();
const walk = (d) => { for (const e of fss.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : local.add('/' + path.relative('public', p).split(path.sep).join('/')); } };
walk(path.resolve('public'));

const CATEGORY = [[/义诊|医疗|clinic|health/i, 'clinic'], [/青少年|youth|辅导|tutor/i, 'youth'], [/健行|5k|run|walk/i, 'run'], [/讲座|talk|seminar/i, 'talk'], [/长者|老人|senior/i, 'senior']];
const categorize = (text) => CATEGORY.find(([re]) => re.test(text))?.[1] ?? 'other';
const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const utc = (s) => s.replace(' ', 'T') + 'Z';

for (const site of ['cn', 'en']) {
  const file = path.join('scrape/raw', site, 'events.json');
  if (!fss.existsSync(file)) continue;
  for (const e of JSON.parse(fss.readFileSync(file, 'utf8'))) {
    const slug = decode(e.slug);
    const title = cheerio.load(`<p>${e.title}</p>`).text();
    const cleaned = cleanContent(e.description || '', { site, base: BASE, localMedia: local });
    const $ = cheerio.load(cleaned.html, null, false);
    const summary = $('p').first().text().trim();
    const v = e.venue && !Array.isArray(e.venue) ? e.venue : {};
    const fm = {
      slug: `${site}/${slug}`,
      site,
      title,
      start: utc(e.utc_start_date),
      end: utc(e.utc_end_date),
      allDay: !!e.all_day,
      category: categorize(`${title} ${summary}`),
      ...(v.venue ? { venue: v.venue } : {}),
      ...(v.address ? { address: [v.address, v.city, v.state].filter(Boolean).join(', ') } : {}),
      ...(cleaned.hero ? { image: cleaned.hero } : {}),
      ...(e.website ? { website: decode(e.website).replace(/^https?:\/\/(www\.)?ollietree\.org/, '') } : {}),
      ...(summary ? { summary } : {}),
    };
    const yaml = Object.entries(fm).map(([k, val]) => `${k}: ${JSON.stringify(val)}`).join('\n');
    const body = cleaned.html.replace(/\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();
    const dir = path.join(OUT, site);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${fm.start.slice(0, 10)}-${slug}.md`), `---\n${yaml}\n---\n\n${body}\n`);
    console.log(`${site}: ${fm.start.slice(0, 10)} ${title}`);
  }
}
