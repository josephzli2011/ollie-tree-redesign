# OllieTree Foundation website (redesign)

A static rebuild of [ollietree.org](https://www.ollietree.org) — the language chooser, the Chinese site (`/cn/`) and the English site (`/en/`) — with the same content, a new design and an events calendar. Built with [Astro](https://astro.build); deployed to GitHub Pages on every push to `main`.

Preview: https://josephzli2011.github.io/ollie-tree-redesign/

## Everyday tasks

### Add an event

Create a Markdown file in `src/content/events/cn/` (Chinese site) or `src/content/events/en/` (English site), named `YYYY-MM-DD-short-name.md`:

```markdown
---
slug: "cn/2026-health-clinic"          # "<site>/<url name>" → /cn/event/2026-health-clinic/
site: "cn"
title: "2026社区义诊"
start: "2026-11-14T09:00:00-05:00"     # include the time-zone offset (-05:00 winter, -04:00 summer)
end: "2026-11-14T13:00:00-05:00"
allDay: false
category: "clinic"                     # clinic | run | youth | talk | senior | other
venue: "Providence Presbytery Church"
address: "10140 Providence Church Ln, Charlotte, NC 28277"
image: "/cn/wp-content/uploads/sites/3/2026/08/88.jpg"   # optional poster, a file under public/
registerUrl: "https://docs.google.com/forms/..."          # optional
summary: "One line shown in calendar files and search results."
---

Full description (HTML or Markdown).
```

Push to `main`. The event appears on the homepage cards, the events calendar (`/cn/events/`, `/en/events/`) and gets its own page with an "Add to calendar" (.ics) download. If you add a new poster image, run `node scripts/import/optimize.mjs` so the homepage gets a fast WebP copy.

### Edit a page

Each page is a JSON file in `src/content/pages/{cn,en,root}/` whose `html` field holds the page body. Edit the HTML and push. Menus are in `src/data/menu.cn.json` and `src/data/menu.en.json`; contact details and labels are in `src/lib/site.ts`.

### Re-import from the old WordPress site

Only needed if content changes on ollietree.org before the switch-over. This overwrites `src/content/pages`, the menus and the content audit.

```bash
npm run scrape    # download pages, posts, events, menus and media into scrape/ (re-runnable)
npm run import    # clean the HTML, copy media to public/, write pages, events, redirects and image copies
npm run build
npm test
npm run verify    # content parity + link check
```

### Move to the real domain

In `astro.config.mjs` set `site: 'https://www.ollietree.org'` and `base: '/'`, then rebuild. Content stores root-relative paths and the base is added at render time, so no re-import is needed. (Also update `BASE` in `scripts/verify/links.mjs` and `tests/build-output.test.ts`.) Every old URL keeps working: kept pages live at their original paths, media at `/{cn,en}/wp-content/uploads/...`, and dropped pages redirect (meta-refresh pages, plus `public/_redirects` for Netlify or Cloudflare Pages).

## Not finished on purpose

- **Online giving** (`/cn/奉献2/`, `/en/give/`) and **registration forms** are labelled placeholders. Zelle and check details are live.

## Where things are

| Path | What |
|---|---|
| `src/pages/` | Routes: homepages, catch-all content pages + redirects, events, event pages, giving pages |
| `src/components/` | Header, footer, page header, event cards, event calendar, giving form mock-up |
| `src/styles/` | Design tokens (`tokens.css`), base styles, imported-content styles, homepage styles |
| `src/lib/` | URL, site labels, event helpers (time zone, calendar grid, .ics), image helpers |
| `scripts/scrape/`, `scripts/import/` | WordPress scraper and importer |
| `scripts/verify/` | Content parity, link and contrast checks |
| `docs/content-audit.md` | Every old URL and what happened to it |
| `docs/known-differences.md` | Content intentionally not reproduced word for word |
| `docs/superpowers/` | Design spec and implementation plan |
