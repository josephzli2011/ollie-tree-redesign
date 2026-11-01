# Placeholders still to build

The redesign is a static site (no server, no database), so everything that needed a WordPress plugin was replaced with a clearly labelled placeholder. This is the list to hand to whoever wires them up. Each placeholder is a `<div class="form-placeholder">` (or the giving form mock-up), so they're easy to find with a search.

## 1. Online giving — highest priority

**Pages:** `/cn/奉献2/` (Chinese) and `/en/give/` (English). Every "捐款 / Donate" button on the site links here, and the old donation URLs (`/cn/奉献1/`, `/cn/donation-*`, `/cn/donor-dashboard/`, the `/en/` equivalents) redirect here.

**What's there now:** `src/components/GivingPlaceholder.astro`, a finished-looking form with the six funds, preset amounts ($25/$50/$100/$250/other) and a name/note box. The **Next** button is disabled, and a banner says 在线捐款即将上线（占位） / Online giving coming soon — placeholder. Zelle and check details next to it are real and work today.

**Funds (names must match the old form exactly):**
- General Fund - 日常运营
- OllieTree Health Clinic - 年度义诊
- OllieTree Senior Care - 老人关怀
- OllieTree 5K Run Walk - 社区健康跑步,健行
- OllieTree Youth Development - 青少年发展
- Medical trip to China - 中国医疗行

**What the old site used:** a custom "ot_form" donation form, plus GiveWP (donor dashboard, donation history, receipts) and the "PayPal Donations" widget.

**To decide / build:**
- Pick a processor that works without a server. Options: a PayPal Donate button, Stripe Payment Links, or a hosted page from Zeffy / Givebutter / Donorbox, which are free or low-fee for nonprofits and send tax receipts.
- Pass the chosen fund and amount to it, or embed its form in place of the mock-up.
- Receipts: the old page promised 捐款收据 for tax purposes, so the provider must email receipts.
- There is no replacement for GiveWP's donor dashboard / donation history; most hosted providers give donors their own history page.

## 2. Registration forms

Each of these pages keeps all its original text; only the form itself is a placeholder (报名表即将上线（占位） / Registration form coming soon):

| Page | What the form did on the old site |
|---|---|
| `/cn/freeclinicregister/` 社区义诊注册 | Free-clinic registration. A custom "ot_form" with log in / create account, then pick a clinic location and time. This is the most complex one. |
| `/cn/事工项目/community-run-社区健行注册/` 社区健行注册 | 5K run/walk registration (WPForms) |
| `/cn/事工项目/chesscamp/` 橄榄树象棋夏令营 | Chess summer camp sign-up (WPForms) |
| `/cn/youthvolunteers/stem-ai/` STEM-AI | Youth STEM-AI sign-up (WPForms) |
| `/cn/联系我们/` 联系我们 | Contact form (WPForms). The email and phone shown in the footer work today. |

**Simplest path:** Google Forms, which the site already uses for OllieTree Youth Tutoring, or Tally / Jotform. Embed or link each form where the placeholder sits, in the page's JSON under `src/content/pages/cn/`. The clinic registration may need a proper tool (an appointment scheduler) because of its per-location time slots.

## 3. Smaller items

- **Password-protected page** `/en/2021社区义诊复核/` (hidden, not in menus): on the old site it needed a WordPress password; the new page shows the "This content is password-protected" notice only. Decide whether it should exist at all.
- **Social links:** the old footer had Facebook and Twitter icons that pointed nowhere (`#`). Only YouTube is shown now. Add real Facebook/WeChat links if there are any.
- **Events:** not a placeholder — events are files in `src/content/events/` (see README). If non-developers need to add events themselves, that's a future CMS decision.
- **Event data to clean up:** the 中国医疗行 event's venue is "test 5k"; the 课外辅导 event spans Feb 1–Apr 5 as one continuous event (probably meant to be weekly).
