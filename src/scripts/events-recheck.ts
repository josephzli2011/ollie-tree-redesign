// The site is static, so "upcoming" is decided at build time. This re-checks in the browser so a stale build
// never shows a finished event as upcoming, and falls back to recent past events when none remain.
export function recheck(root: HTMLElement, now: Date): void {
  const max = Number(root.dataset.max || 3);
  const upcoming = root.querySelector<HTMLElement>('[data-upcoming]');
  const fallback = root.querySelector<HTMLElement>('[data-fallback]');
  if (!upcoming) return;
  let shown = 0;
  for (const card of upcoming.querySelectorAll<HTMLElement>('[data-end]')) {
    const live = new Date(card.dataset.end!).getTime() > now.getTime();
    card.hidden = !live || shown >= max;
    if (live && shown < max) shown++;
  }
  upcoming.hidden = shown === 0;
  if (fallback) fallback.hidden = shown > 0;
}
