// @layer shell
/**
 * Opt-in counters for the long-walk harness (scripts/perf-walk.js): renders,
 * map data updates and camera moves. They cost nothing unless the page has
 * `window.__perf` (the harness defines it); the app never reads them.
 */
export function perfCount(name: string): void {
  const g = globalThis as { __perf?: Record<string, number> };
  if (g.__perf) g.__perf[name] = (g.__perf[name] ?? 0) + 1;
}

/** Opt-in, for the e2e: when `name` last happened, on the page's clock (explore-dense-city DC9). Nothing unless `__perf`. */
export function perfMark(name: string): void {
  const g = globalThis as { __perf?: Record<string, number>; performance?: { now(): number } };
  if (g.__perf && g.performance) g.__perf[name] = g.performance.now();
}
