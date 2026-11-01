// Checks WCAG contrast of the design token pairs actually used for text. Body text needs 7:1 (AAA), everything else 4.5:1.
import fs from 'node:fs';

const css = fs.readFileSync('src/styles/tokens.css', 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const hex = (name) => tokens[name] ?? name;

const lum = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex(h).slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const PAIRS = [
  ['body text on cream', 'color-ink', 'color-cream', 7],
  ['body text on sand', 'color-ink', 'color-sand', 7],
  ['body text on green band', 'color-ink', 'color-olive-100', 7],
  ['secondary text on cream', 'color-ink-soft', 'color-cream', 7],
  ['headings on cream', 'color-olive-900', 'color-cream', 7],
  ['links on cream', 'color-teal-700', 'color-cream', 4.5],
  ['links on white', 'color-teal-700', '#ffffff', 4.5],
  ['donate button', '#ffffff', 'color-accent', 4.5],
  ['primary button', '#ffffff', 'color-olive-700', 4.5],
  ['footer text', '#c9d3cb', 'color-olive-900', 7],
  ['eyebrow on cream', 'color-olive-700', 'color-cream', 4.5],
  ['calendar out-of-month day', 'color-ink-faint', 'color-day-out', 4.5],
];

let failed = 0;
for (const [label, fg, bg, min] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2)}:1 (min ${min}) ${label}`);
}
process.exit(failed ? 1 : 0);
