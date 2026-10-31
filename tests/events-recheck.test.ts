// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { recheck } from '../src/scripts/events-recheck';

function setup(ends: string[], max = 3) {
  document.body.innerHTML = `
    <div class="ev" data-max="${max}">
      <div data-upcoming>${ends.map((e, i) => `<article data-end="${e}" id="u${i}"></article>`).join('')}</div>
      <div data-fallback hidden><article id="p0"></article></div>
    </div>`;
  return document.querySelector<HTMLElement>('.ev')!;
}
const now = new Date('2026-11-10T12:00:00Z');

describe('recheck', () => {
  it('hides upcoming cards that have already ended', () => {
    const root = setup(['2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z']);
    recheck(root, now);
    expect(document.getElementById('u0')!.hidden).toBe(true);
    expect(document.getElementById('u1')!.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('[data-fallback]')!.hidden).toBe(true);
  });

  it('shows at most data-max upcoming cards', () => {
    const root = setup(['2026-12-01T00:00:00Z', '2026-12-02T00:00:00Z', '2026-12-03T00:00:00Z', '2026-12-04T00:00:00Z'], 3);
    recheck(root, now);
    expect([...root.querySelectorAll<HTMLElement>('[data-upcoming] article')].filter((a) => !a.hidden)).toHaveLength(3);
  });

  it('reveals the past-events fallback when every upcoming card has ended', () => {
    const root = setup(['2026-11-01T00:00:00Z']);
    recheck(root, now);
    expect(root.querySelector<HTMLElement>('[data-fallback]')!.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('[data-upcoming]')!.hidden).toBe(true);
  });
});
