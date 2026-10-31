# OllieTree Website Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild ollietree.org (root chooser, `/cn/`, `/en/`) as a static Astro site with verbatim content, a new research-based design, an events-as-files calendar, and placeholders for giving/forms, deployed to GitHub Pages.

**Architecture:** A re-runnable Node scraper pulls pages/posts/events/media from the WP REST API and live HTML into `scrape/raw/`; an importer classifies, cleans and writes them into Astro content collections plus `public/` media at original paths. Astro renders everything through shared layouts; events come from Markdown files and pure helper functions. Verification scripts compare scraped text against built output.

**Tech Stack:** Node 24, Astro 5 (static), TypeScript, Vitest, cheerio (HTML parsing), sharp (via Astro image), GitHub Actions + Pages, `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-10-31-ollietree-redesign-design.md`

## Global Constraints

- Content is carried over **verbatim**; no rewording, no new copy beyond small UI labels ("近期活动", "Upcoming events", button text).
- Output paths equal the old paths exactly, including Chinese slugs and the zero-width space in `/cn/疫情通报​/`.
- Every uploaded media file is served at its original path `/{cn|en}/wp-content/uploads/...` (copied as-is into `public/`).
- No runtime dependency on ollietree.org: no hotlinked images, no API calls to WordPress from the built site.
- Astro `base: '/ollie-tree-redesign'`, `site: 'https://josephzli2011.github.io'`; switching domains = changing these two lines.
- Repo `josephzli2011/ollie-tree-redesign`, **public**, deploy via Actions on push to `main`.
- Body text ≥ 18px; line-height ≈1.75 (`zh-CN`), ≈1.6 (`en`); body contrast ≥ 7:1, everything else ≥ 4.5:1; focus visible; usable at 200% zoom; `prefers-reduced-motion` honored; tap targets ≥ 44px.
- `<html lang>` is `zh-CN` on `/cn/` pages, `en` on `/en/` pages.
- Donate button in the header on every page → giving placeholder (`/cn/奉献2/`, `/en/give/`).
- Event times are interpreted and displayed in `America/New_York` regardless of build machine timezone.
- Homepage events: up to 3 upcoming; if none, 3 most recent past labelled `已结束` / `Past`.
- Placeholders (giving payment step, WPForms) are visibly labelled as placeholders.

## Review Focus

- **Encoded vs raw Chinese URLs** — a visitor following `/cn/%E7%A4%BE%E5%8C%BA%E4%B9%89%E8%AF%8A/` or `/cn/社区义诊/` lands on the same page → Task 2 test `pathFromLink decodes and preserves zero-width chars`, Task 5 check of `dist/` folder names.
- **Event across a DST change built on a UTC runner** — an event at 2026-03-08 10:00 shows "10:00" not "09:00"/"14:00" → Task 7 test `formatWhen` with `TZ=UTC`.
- **`srcset`/`-scaled`/sized image variants in content** — every `<img>` and `srcset` URL in imported content resolves to a local file → Task 4 test `rewriteMedia drops srcset entries with no local file`, Task 9 link check covers `img`.
- **Absolute links back to ollietree.org inside content** — internal links become base-prefixed local links; only true externals remain → Task 4 test `rewriteLinks maps ollietree.org links to base paths`.
- **Stale build after an event passes** — a page built yesterday must not show today-past events as upcoming → Task 7 `homepageEvents(now)` tests + client `recheck` test.

---

### Task 1: Project scaffold, repo and Pages deploy

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.github/workflows/deploy.yml`, `src/pages/index.astro` (temporary), `README.md`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `test`, `scrape`, `import`, `verify`; Astro config with `base` and `site` per Global Constraints; `trailingSlash: 'always'`, `build.format: 'directory'`.

- [ ] **Step 1:** `git init`, create Astro project files (Astro 5, TypeScript strict), add vitest, cheerio. `.gitignore` excludes `node_modules`, `dist`, `scrape/raw/**/html` (keep JSON).
- [ ] **Step 2:** Run `npm run build`. Expected: `dist/index.html` exists.
- [ ] **Step 3:** `deploy.yml` using `actions/upload-pages-artifact` + `actions/deploy-pages`, Node 24, on push to `main` and `workflow_dispatch`.
- [ ] **Step 4:** Commit; `gh repo create josephzli2011/ollie-tree-redesign --public --source . --push`; enable Pages with build type `workflow` (`gh api -X POST repos/josephzli2011/ollie-tree-redesign/pages -f build_type=workflow`).
- [ ] **Step 5:** Verify: `gh run watch` succeeds; `https://josephzli2011.github.io/ollie-tree-redesign/` returns 200.

### Task 2: Scraper

**Files:**
- Create: `scripts/scrape/index.mjs`, `scripts/scrape/wp.mjs`, `scripts/lib/paths.mjs`
- Test: `tests/paths.test.ts`

**Interfaces:**
- Produces: `scrape/raw/{root|cn|en}/pages.json`, `posts.json`, `media.json` (REST objects, `_fields` incl. `id,parent,link,slug,title,content,status,featured_media,menu_order,date`), `events.json` (TEC `/tribe/events/v1/events?start_date=2000-01-01&per_page=50`), `menus.json` (`[{label, href, children[]}]` parsed from the live homepage `<nav>`), `html/{id}.html` (live rendered page). Media files downloaded to `scrape/media/{cn|en}/wp-content/uploads/...` (all items in `media.json` plus any `wp-content/uploads` URL found in page HTML, including `srcset` entries).
- Produces `pathFromLink(link: string): string` in `scripts/lib/paths.mjs` — strips origin, decodes percent-encoding, preserves U+200B, ensures leading/trailing slash.

- [ ] **Step 1: Failing tests** in `tests/paths.test.ts`:
  - `pathFromLink('https://www.ollietree.org/cn/%E7%A4%BE%E5%8C%BA%E4%B9%89%E8%AF%8A/')` → `'/cn/社区义诊/'`
  - `pathFromLink('http://www.ollietree.org/cn/疫情通报​/')` → `'/cn/疫情通报​/'`
  - `pathFromLink('https://www.ollietree.org/en')` → `'/en/'`
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `pathFromLink`; implement scraper with paging (`X-WP-TotalPages`), concurrency ≤ 4, retries ×3, skips already-downloaded media (re-runnable).
- [ ] **Step 4:** `npm test` → PASS. Run `npm run scrape`. Expected: page counts match REST totals (root 8, cn 40, en 49 pages; cn 2 events); media count logged.
- [ ] **Step 5:** Commit (JSON + script; media committed in Task 4 after copy).

### Task 3: Content classification and audit

**Files:**
- Create: `scripts/import/classify.mjs`, `scripts/import/audit.mjs`
- Test: `tests/classify.test.ts`
- Output: `docs/content-audit.md`

**Interfaces:**
- Produces `classifyPage(page: {site, path, title, text, id}, ctx: {menuPaths: Set<string>, pagesByTextHash: Map}) → {status: 'keep'|'hidden'|'redirect', reason: string, target?: string}`. `hidden` = kept but not in menus. `redirect` always carries `target` (dropped pages redirect; root demo pages target `/`).

- [ ] **Step 1: Failing tests:**
  - Sample Page on en → `{status:'redirect', target:'/en/'}`
  - `/cn/社区健行backup/` → `redirect` to `/cn/community-run/`
  - `/cn/donation-history/`, `/cn/donor-dashboard/`, `/cn/奉献1/` → `redirect` to `/cn/奉献2/`; `/en/donation-*` and `/en/donor-dashboard/` → `/en/give/`
  - `/cn/义诊复核/`, `/cn/5k健身复核/`, `/cn/thank-you/` → `hidden`
  - a menu path → `keep`
  - `/en/2019社区义诊/` whose text equals `/cn/2019社区义诊/` → `redirect` to the cn path
  - `/cn/reset-password/` → `redirect` to `/cn/`
- [ ] **Step 2:** FAIL → **Step 3:** implement (rules in order: plugin/system → backup → demo boilerplate (title in demo list AND text matches theme demo) → duplicate by normalized-text hash → menu → hidden) → **Step 4:** PASS.
- [ ] **Step 5:** `audit.mjs` writes `docs/content-audit.md` table: site, old path, title, status, target, reason. Commit.

### Task 4: Content importer (clean HTML, media, menus)

**Files:**
- Create: `scripts/import/index.mjs`, `scripts/import/clean.mjs`, `scripts/import/menus.mjs`
- Create (generated): `src/content/pages/{cn,en}/**.md`, `src/data/menu.cn.json`, `src/data/menu.en.json`, `src/data/redirects.json`, `public/{cn,en}/wp-content/uploads/**`
- Test: `tests/clean.test.ts`, `tests/menus.test.ts`

**Interfaces:**
- Consumes: `classifyPage`, `pathFromLink`.
- Produces page files with frontmatter `{title, lang: 'zh-CN'|'en', path, originalUrl, hidden: boolean, hero?: string, gallery: boolean, hasForm: boolean}` and cleaned HTML body.
- Produces `cleanContent(html: string, ctx: {site, base, localMedia: Set<string>}) → {html, hasForm, gallery, hero}` in `clean.mjs`, composed of exported `rewriteLinks(html, base)`, `rewriteMedia(html, base, localMedia)`, `stripElementor(html)`, `replaceForms(html, lang)`.
- Produces `src/data/menu.{cn,en}.json`: `[{label, href?, children: [{label, href}]}]` and `src/data/redirects.json`: `[{from, to}]`.

- [ ] **Step 1: Failing tests** (`tests/clean.test.ts`):
  - `rewriteLinks('<a href="https://www.ollietree.org/cn/%E5%85%B3%E4%BA%8E%E6%88%91%E4%BB%AC/">x</a>', '/ollie-tree-redesign')` → href `/ollie-tree-redesign/cn/%E5%85%B3%E4%BA%8E%E6%88%91%E4%BB%AC/`
  - external `https://docs.google.com/...` unchanged
  - `rewriteMedia` maps `https://www.ollietree.org/cn/wp-content/uploads/sites/3/2026/04/4467.jpg` → `/ollie-tree-redesign/cn/wp-content/uploads/sites/3/2026/04/4467.jpg`; drops `srcset` entries whose file isn't in `localMedia`
  - `stripElementor` keeps all visible text and images of a fixture Elementor section (`tests/fixtures/elementor-section.html`, saved from a real scraped page) while removing `elementor-*` wrapper divs, inline styles and `<style>`/`<script>`
  - `replaceForms` swaps `<form class="wpforms-form">…</form>` and GiveWP blocks with `<div class="form-placeholder">` containing `报名表即将上线（占位）` / `Registration form coming soon (placeholder)`; sets `hasForm`
  - `gallery` true when ≥ 6 images and text < 300 chars
- [ ] **Step 2:** FAIL → **Step 3:** implement with cheerio; body source = live HTML main content (Elementor root / `.entry-content`) when it has more visible text than REST `content.rendered`, else REST → **Step 4:** PASS.
- [ ] **Step 5: Menus test** (`tests/menus.test.ts`): every `href` from scraped `menus.json` appears exactly once in `menu.cn.json`/`menu.en.json` (no item dropped). Grouping for cn: `关于我们` (异象和使命, 关于我们, 赞助商列表, 联系我们, Privacy, QRcodes), `事工项目` (事工项目, 社区义诊 + years + 注册, 温馨之家, 中国医疗行, 健康讲座), `社区健行` (社区健行, 注册, 2023采风), `青少年` (青少年义工, STEM-AI, Tutoring, 象棋夏令营), `资讯` (橄榄树资讯, 疫言堂), `活动` (/cn/events/). en: `Programs`, `Youth`, `Run & Walk`, `About`, `Events`. Implement → PASS.
- [ ] **Step 6:** Run `npm run import`; copy media to `public/`; commit. If a single media file > 50 MB or total `public/` > 900 MB, log to audit and use placeholder instead (spec).

### Task 5: Design system, layouts and page template

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/prose.css`, `src/layouts/BaseLayout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/Gallery.astro`, `src/components/LangSwitch.astro`, `src/pages/[...path].astro`, `src/content.config.ts`, `src/lib/url.ts`, `scripts/verify/contrast.mjs`
- Test: `tests/build-output.test.ts` (runs against `dist/` after `npm run build`)

**Interfaces:**
- Consumes: page collection, `menu.{cn,en}.json`.
- Produces `BaseLayout` props `{title: string, lang: 'zh-CN'|'en', site: 'cn'|'en'|'root', description?: string}`; `url(path: string): string` in `src/lib/url.ts` (prefixes `import.meta.env.BASE_URL`, encodes).
- Token names fixed for later tasks: `--color-olive-900/700/500/100`, `--color-cream`, `--color-accent` (donate/CTA), `--color-ink`, `--font-zh`, `--font-en`, `--space-*`, `--radius-*`. Values: builder's choice satisfying contrast constraints.

- [ ] **Step 1: Failing build-output tests:** every `dist/**/index.html` has `<html lang="zh-CN">` under `/cn/` and `lang="en"` under `/en/`; has one header donate link to `奉献2` (cn) or `/en/give/` (en); `dist/cn/社区义诊/index.html` and `dist/cn/疫情通报​/index.html` exist; hidden pages are not linked from header nav.
- [ ] **Step 2:** FAIL → **Step 3:** implement tokens, layouts (sticky header with grouped dropdown nav, full-screen mobile menu, lang switch, donate button), prose styles for imported HTML, Gallery with lightbox (vanilla JS, keyboard + Esc), footer with contact info from source pages → **Step 4:** PASS; `node scripts/verify/contrast.mjs` (body ≥ 7, others ≥ 4.5) → PASS.
- [ ] **Step 5:** Visual check at 390/768/1280 on `/cn/关于我们/` and a gallery page. Commit.

### Task 6: Homepages and root chooser

**Files:**
- Create: `src/pages/index.astro` (replace temp), `src/pages/cn/index.astro`, `src/pages/en/index.astro`, `src/components/Hero.astro`, `src/components/ProgramGrid.astro`, `src/components/SponsorStrip.astro`

**Interfaces:**
- Consumes: imported homepage content (`cn/index`, `en/index`), `EventCards` from Task 7 (slot left until then).
- Mission/program text is quoted verbatim from `异象和使命` / program pages; where none exists use titles + links only.

- [ ] **Step 1:** Extend `tests/build-output.test.ts`: every source homepage text block (≥ 8 chars, whitespace-normalized) is present in `dist/cn/index.html`/`dist/en/index.html`; root `dist/index.html` links to `/cn/` and `/en/`.
- [ ] **Step 2:** FAIL → **Step 3:** build homepages (hero with mission, program grid with source photos, events slot, original homepage blocks, sponsors, donate CTA band) and root chooser → **Step 4:** PASS. Visual check 3 widths. Commit.

### Task 7: Events feature

**Files:**
- Create: `scripts/import/events.mjs`, `src/content/events/cn/*.md`, `src/lib/events.ts`, `src/components/EventCards.astro`, `src/components/EventCalendar.astro`, `src/scripts/events-recheck.ts`, `src/pages/[site]/events/index.astro`, `src/pages/[site]/event/[slug]/index.astro`, `src/pages/[site]/event/[slug]/event.ics.ts`
- Test: `tests/events.test.ts`, `tests/events-recheck.test.ts`

**Interfaces:**
- Event schema (zod in `content.config.ts`): `{title: string, start: string (ISO with offset), end: string, allDay: boolean, venue?: string, address?: string, image?: string, category: 'clinic'|'run'|'youth'|'talk'|'senior'|'other', registerUrl?: string, summary?: string}`.
- Produces in `src/lib/events.ts`:
  - `splitEvents(events: Ev[], now: Date) → {upcoming: Ev[] (asc), past: Ev[] (desc)}` — upcoming iff `end > now`
  - `homepageEvents(events: Ev[], now: Date, max = 3) → {mode: 'upcoming'|'past', items: Ev[]}`
  - `formatWhen(ev: Ev, lang: 'zh-CN'|'en') → string` via `Intl.DateTimeFormat` with `timeZone: 'America/New_York'`
  - `monthGrid(year: number, month: number /*1-12*/, events: Ev[]) → {date: string, inMonth: boolean, events: Ev[]}[]` (42 cells, weeks start Sunday)
  - `toICS(ev: Ev, url: string) → string`
- Cards carry `data-end="<ISO>"`; `events-recheck.ts` exports `recheck(root: HTMLElement, now: Date): void` that hides upcoming cards whose end < now and reveals the past-fallback list when no upcoming remain.

- [ ] **Step 1: Failing tests** (`tests/events.test.ts`):
  - events ending 2026-02-01 and 2026-03-01, `now=2026-10-31` → `homepageEvents` = `{mode:'past', items:[Mar, Feb]}`
  - add one ending 2026-11-15 → `{mode:'upcoming', items:[Nov]}`
  - `formatWhen` for `2026-03-08T10:00:00-04:00`, `zh-CN`, with `process.env.TZ='UTC'` contains `3月8日` and `10:00`
  - `monthGrid(2026, 2, …)` length 42, first cell `2026-02-01` (a Sunday), event on `2026-02-01` lands in that cell
  - `toICS` contains `BEGIN:VEVENT`, `DTSTART;TZID=America/New_York:20260201T080000`, `SUMMARY:青少年义工-课外辅导`
  - recheck test (happy-dom): upcoming card with past `data-end` gets `hidden`; fallback list revealed
- [ ] **Step 2:** FAIL → **Step 3:** implement helpers; import the 2 TEC events verbatim (venue "test 5k" as-is) → **Step 4:** PASS.
- [ ] **Step 5:** Build components/pages: poster cards (image or date tile; 3/2/1 columns; compact rows < 600px as in the approved draft), events page with month grid + list toggle + category filter (vanilla JS; list works without JS), event detail with `.ics` link + register button; insert `EventCards` into both homepages and `活动/Events` menu. Visual check. Commit.

### Task 8: Giving and form placeholders, redirects

**Files:**
- Create: `src/pages/cn/奉献2/index.astro`, `src/pages/en/give/index.astro`, `src/components/GivingPlaceholder.astro`, `scripts/import/redirects.mjs`, `src/pages/[...redirect].astro`, `public/_redirects` (generated)
- Test: `tests/redirects.test.ts`

**Interfaces:**
- Consumes: `src/data/redirects.json`, scraped `奉献2` copy.
- Giving page: six funds verbatim (`General Fund - 日常运营`, `OllieTree Health Clinic - 年度义诊`, `OllieTree Senior Care - 老人关怀`, `OllieTree 5K Run Walk - 社区健康跑步,健行`, `OllieTree Youth Development - 青少年发展`, `Medical trip to China - 中国医疗行`), preset amounts `$25 $50 $100 $250` + `其他/Other`, Zelle mention if in source, banner `在线捐款即将上线（占位）` / `Online giving coming soon — placeholder`.

- [ ] **Step 1: Failing tests:** for every `{from,to}` in `redirects.json`, `dist{from}index.html` contains a meta refresh to base + `to` and a canonical link; `public/_redirects` has a `from to 301` line for each.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS. Visual check of giving page and a form placeholder page. Commit.

### Task 9: Verification and deploy

**Files:**
- Create: `scripts/verify/parity.mjs`, `scripts/verify/links.mjs`

**Interfaces:**
- `parity.mjs`: for each `keep`/`hidden` page, every normalized text block (≥ 8 chars) from scraped main content appears in the built page; prints misses; exit 1 unless each miss is listed under "Known differences" in `docs/content-audit.md`.
- `links.mjs`: crawls `dist/` — every internal `href`/`src`/`srcset` resolves to a file; every source URL (pages, posts, events, media) resolves to a page, redirect or file; reports any `ollietree.org` URL left in output.

- [ ] **Step 1:** `npm run build && npm run verify`. Expected: 0 unexplained parity misses, 0 broken links, 0 ollietree.org references.
- [ ] **Step 2:** Lighthouse on preview server for `/cn/`, `/en/`, one gallery page: accessibility ≥ 95, performance ≥ 90. Fix until met.
- [ ] **Step 3:** Visual check at 390/768/1280: both homepages, gallery page, events page, giving page.
- [ ] **Step 4:** Push to `main`; `gh run watch` green; spot-check `/cn/社区义诊/`, `/cn/events/`, an old donation URL redirect on the Pages URL.
- [ ] **Step 5:** Update `README.md` (add an event, re-scrape, change domain). Commit and push.
