# OllieTree Website Redesign — Design

Date: 2026-10-31
Repo: `josephzli2011/ollie-tree-redesign` (to be created)

## Intent

OllieTree Foundation (橄榄树基金会, Charlotte NC) runs community health clinics, senior care, a 5K run/walk, youth programs and a medical trip to China. Its site, ollietree.org, is a WordPress multisite built with Elementor. It works, but it looks dated and inconsistent, and it has years of leftover pages.

This project rebuilds the site with **identical content and a new, much better design**. It is meant to be able to **replace the WordPress site**, not just serve as a mockup. The user wants to see how good the site can look when the design is done well. The design should be based on researched nonprofit best practices, not on the current look.

The site serves different communities: Chinese-speaking families and English-speaking youth/volunteers/community. **The Chinese and English sites stay separate sites with their own content and menus.** They are not translations of each other.

## Goals

1. Every real page of content on ollietree.org exists on the new site, with its text, images, links and embedded media kept.
2. A clearly better visual design: modern, warm and trustworthy, easy to read for older visitors and in Chinese.
3. An events feature: events are stored as files in the repo, upcoming events show as cards on the homepages, and there is a full events page with a calendar.
4. Static and fast, hosted for free, and deployable to the real domain later without breaking existing links.

## Non-goals

- No CMS or no-code editor. Content is edited in the repo by a developer or by Claude.
- No working donation processing and no working registration forms. These are **placeholders** (see below).
- No translation of content between languages, and no new copy. Small UI labels such as "Upcoming events" / "近期活动" and button text are fine.
- No WordPress plugin features such as donor dashboards, password reset or donation history.

## Anti-goals (would make this a failure even if it works)

- Losing or paraphrasing real content. Text is carried over verbatim; fixing obvious markup junk is fine, rewording is not.
- Breaking old URLs. Paths must match the current site so the domain can be switched over later.
- Hotlinking images from ollietree.org. The new site must not depend on WordPress staying up.
- A pretty desktop site that is hard to use on phones or for 60+ readers.

## Current site (from recon)

- `ollietree.org/`: a language chooser linking to 中文站 and English Site. The root site's other pages (Sample Page, Contact, FAQ, etc.) are theme demo leftovers.
- `ollietree.org/cn/`: the Chinese site, about 40 pages, 1 post, about 460 media files, and The Events Calendar (2 events, both past). Main menu: 首页, 赞助商列表, 异象和使命, 事工项目, 关于我们, 联系我们, QRcodes 常用二维码, Privacy Policy 隐私协议, 橄榄树资讯, 健康讲座, 疫言堂 (`/疫情通报/`), 温馨之家, 社区健行, 社区健行注册, 健康5公里2023采风, 社区义诊, 中国医疗行, 社区义诊注册, 2022/2021/2020/2019社区义诊, 青少年义工, STEM-AI, OllieTree Youth Tutoring (external Google Form), 橄榄树象棋夏令营. The header has a "Donation 捐款" button that links to `/cn/奉献2/`.
- `ollietree.org/en/`: the English site, about 49 pages, 2 posts, about 400 media files. Main menu: Home, OllieTree Youth, Youth Leaders, Sunday Study Group, Volunteer Opportunities, OllieTree Health, OllieTree Community, 2023 Run for Health, 2022 Run for Health, OllieTree Living, About Us. Other real pages that aren't in the menu include Blog, 2025 OllieTree 5K Run and 2K Walk, Past Clinics, About Us, and Run & Walk for Health. `/en/` also holds copies of several Chinese pages and many duplicate theme pages.
- Donations: the GiveWP plugin plus PayPal. Funds are General Fund 日常运营, Health Clinic 年度义诊, Senior Care 老人关怀, 5K Run Walk 社区健康跑步/健行, Youth Development 青少年发展, and Medical trip to China 中国医疗行. Zelle is also mentioned.
- Registration pages appear to use WPForms.
- Every page and post is available as published HTML through the public WP REST API (`/{cn|en}/wp-json/wp/v2/pages|posts|media`, plus `/tribe/events/v1/events`), and every page can also be scraped directly.

## What content counts ("ensure all content is retained")

Keep **every published page or post with real, organization-specific content**, whether or not it's in a menu. Drop only:
- theme demo or boilerplate pages (Sample Page, the generic Contact/FAQ/Projects/Services/About/Home/Home2 demo pages),
- exact or near duplicates (keep the one the menu links to; the others become redirects),
- WordPress plugin system pages (donor dashboard, donation history/confirmation/failed, reset password, Debug Dashboard),
- pages that are clearly internal backups (`社区健行backup`).

If a page is unclear, such as `义诊复核`, `5k健身复核`, `2021社区义诊复核` or `感谢您 Thank you`, **keep it**, but leave it out of the menus. Each dropped page must still resolve: its old path redirects to the closest kept page (for example, the donation pages go to the giving placeholder). The builder writes `docs/content-audit.md`, which lists every source URL as kept, merged/redirected, or dropped, with the reason. This is my call on how to interpret "all content".

## How it's built (my calls, approved direction)

- **Framework:** Astro, as a fully static build. Plain CSS with design tokens (custom properties), and no UI framework. Small vanilla JS only where needed (mobile menu, calendar view switching).
- **Hosting:** GitHub Pages, deployed with a GitHub Actions workflow on push to `main`. The repo is **public**, because Pages on a free account needs that and the site is public anyway. Astro's `base` is set to `/ollie-tree-redesign` for the Pages preview, and switching to the real domain later should only need a one-line config change.
- **Content storage:** each page is a file under `src/content/pages/{cn,en}/...`, holding the cleaned body HTML or MDX and frontmatter (title, original URL, menu placement, hero image). Images are downloaded into the repo, kept in a structure that matches their original upload paths, and served through Astro image optimization where practical.
- **URL parity:** output paths match the old ones exactly, including Chinese slugs (for example `/cn/社区义诊/`). The root `/` stays a language chooser, redesigned.
- **Scraper:** a Node script in `scripts/` that pulls pages, posts, menus and events from the REST API and the live HTML, downloads the referenced media, and turns the Elementor markup into clean semantic HTML. It is re-runnable, so the site can be refreshed if WordPress content changes before cutover.
- **Content-parity check:** a script that compares the visible text of each source page with the matching new page and flags missing text. It must pass, or every difference must be explained in the content audit.

## Design direction (based on research; details left to the builder)

Principles, drawn from NN/g donation usability findings, M+R benchmarks, the W3C/WAI guidance on older users, and the bilingual typography research:
- **Mission first.** Each homepage opens with who OllieTree is, what it does and who it serves, followed by the program areas (Health/义诊, Senior care/温馨之家, Run & Walk/社区健行, Youth/青少年, China medical trip, health talks), with real photos.
- **Donate is always visible.** A distinct donate button sits in the header on every page. The giving page says where money goes (the six funds).
- **Trust signals.** Sponsors (赞助商列表), years of clinics (2019 to 2023 and later), impact numbers *only if they already appear in the source content*, and contact details plus nonprofit status if the source content states them.
- **Readability.** Body text at least 18px; line height about 1.75 for Chinese pages and about 1.6 for English; line length 60 to 75 characters for English; body text contrast of at least 7:1 (AAA), and AA everywhere else; visible focus states; works at 200% zoom; respects `prefers-reduced-motion`; tap targets at least 44px.
- **Type.** Chinese pages use a system CJK stack with a web fallback (PingFang SC, Noto Sans SC, Microsoft YaHei). English pages use a warm, humane sans or serif pairing chosen by the builder. Set `lang` correctly on each page (`zh-CN` or `en`).
- **Palette.** Rooted in the olive/olive tree brand and the existing logo: deep olive green, warm cream or off-white, and one warm accent for the donate button and calls to action. The existing logo stays as it is.
- **Navigation.** The current menus are long and flat. Regroup them into a few clear top-level groups with dropdowns or a mega-menu, without dropping any item (for example, Chinese: 关于我们 / 事工项目 / 活动 / 资讯 / 联系我们 + 捐款). On mobile, use a full-screen menu. A language switch (中文 ↔ English) in the header links to the other site's homepage.
- **Image-heavy archive pages** (past clinics, 2023采风) get a clean gallery with a lightbox.

## Events feature

- **Storage:** one Markdown file per event in `src/content/events/{cn,en}/YYYY-MM-DD-slug.md`. Frontmatter: `title`, `start`, `end` (ISO datetime with time zone America/New_York), `allDay`, `venue`, `address`, `image` (optional poster), `category` (clinic / run / youth / talk / senior / other), `registerUrl` (optional), `summary`. The body is the full description.
- **Seed data:** import the 2 existing Chinese events from The Events Calendar, including their dates, venue and description. The English site starts empty but fully wired up.
- **Homepage block:** up to 3 upcoming event cards, poster-style when an image exists and a date tile when it doesn't, plus a "查看全部活动 / View all events" link. If nothing is upcoming, show the 3 most recent past events labelled 已结束/Past, matching the WordPress draft behaviour the user already approved.
- **Events page:** `/cn/events/` and `/en/events/`, matching TEC's paths. It has a month calendar grid and a list view. Upcoming and past events are split, with a category filter.
- **Event pages:** `/cn/event/<slug>/` and `/en/event/<slug>/`, matching TEC's paths. Each shows the details, an "Add to calendar" `.ics` download and the register link, if one exists.
- **Upcoming vs past:** because the site is static, the grouping is computed when the site is built. A small client-side script re-checks against today's date so a stale build never shows a past event as upcoming. A scheduled daily rebuild in Actions is optional.

## Placeholders

- **Giving page** (`/cn/奉献2/` and an English equivalent; the old donation URLs redirect here): a well-designed page with the six funds, preset amount buttons and the thank-you copy from the source, with a clear "Online giving coming soon — placeholder" notice in place of the payment step. All donate buttons link here.
- **Registration forms** (社区义诊注册, 社区健行注册 and any other WPForms): keep the page and its copy, and put a clearly labelled form placeholder where the form was. External Google Form links stay as they are.

## Verification

- The content-parity script passes, or differences are explained in `content-audit.md`.
- A link checker finds no broken internal links, and every old URL from the source returns a page or a redirect.
- Lighthouse accessibility ≥ 95 and performance ≥ 90 on the homepages and one archive page.
- Visual check at 390, 768 and 1280 widths on both homepages, an archive page, the events page and the giving page.
- Deployed preview URL on GitHub Pages.

## Settled after builder review (my calls)

- **Which old URLs must keep working:** pages, posts, event pages, the events list, and **every uploaded media file at its exact original path** (`/{cn|en}/wp-content/uploads/...`). Printed QR codes may point straight at those files, so originals are copied as-is into `public/` at the same paths, and optimized copies are used in page layouts. Attachment pages, category/tag/author/date archives, feeds and `?p=` links are not reproduced.
- **Homepages:** all existing homepage content is carried over, and the parity check runs against it. The mission and program sections may *quote* text verbatim from other pages (异象和使命, program pages), but must not invent new copy. Where no suitable text exists, the section uses page titles and links only.
- **Redirects:** the site stays host-agnostic. Each redirect is generated as a meta-refresh HTML page (which works on GitHub Pages) **and** as a `_redirects` file (which Netlify and Cloudflare Pages use), so the real host can be chosen at cutover.
- **Large media:** images are compressed. Any single file over 50 MB, or a media total that would push the Pages site past about 1 GB, is logged in `content-audit.md`. Video that's already on YouTube stays embedded. A large self-hosted video gets a placeholder plus a note, and is never silently dropped.

## Left to the builder

The exact typefaces, the colour values (within the direction above), the layout and visual details of each template, the scraper implementation, how the menus are grouped (as long as nothing is dropped), the image optimization approach, and whether to add the scheduled daily rebuild.
