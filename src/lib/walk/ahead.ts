// @layer core
import { pointSegmentDist, projector } from '../geo';
import type { LngLat } from '../types';
import type { Band } from './types';

/*
 * The quiet heads-up ahead of a stretch built around cars (WK15, WK16). Decisions only: where on a
 * route the car stretches lie, and when one is said. It carries nothing that changes the route.
 */

/** A stretch this long or longer is worth a word. */
export const STRETCH_MIN_M = 100;
/** Said when it is this far ahead. */
export const LEAD_M = 200;
/** Kept on screen at least this long, and until passed. */
export const KEEP_MS = 15_000;
const STEP_M = 20;
const ON_M = 15;

export interface Stretch {
  key: string;
  street: string | null;
  /** Metres along the route. */
  fromM: number;
  toM: number;
}

interface Seg {
  id: string;
  name: string | null;
  geometry: readonly (readonly LngLat[])[];
}

/** Every `car` stretch of at least STRETCH_MIN_M along a route (WK15). Segments with no band say nothing. */
export function carStretches(path: readonly LngLat[], segments: readonly Seg[], bands: ReadonlyMap<string, Band>): Stretch[] {
  if (path.length < 2) return [];
  const project = projector(path[0]);
  const pts = path.map(project);
  const lines = segments.map((s) => ({ s, ls: s.geometry.map((g) => g.map(project)) }));
  const out: Stretch[] = [];
  let run: { from: number; to: number; names: Map<string | null, number> } | null = null;
  const close = () => {
    if (run && run.to - run.from >= STRETCH_MIN_M) {
      let street: string | null = null;
      let most = 0;
      for (const [n, c] of run.names) if (c > most) [street, most] = [n, c];
      out.push({ key: `${Math.round(run.from / 10) * 10}:${street ?? ''}`, street, fromM: run.from, toM: run.to });
    }
    run = null;
  };
  let along = 0;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / STEP_M));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const p: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      let best: { s: Seg; d: number } | null = null;
      for (const { s, ls } of lines)
        for (const l of ls)
          for (let j = 1; j < l.length; j++) {
            const d = pointSegmentDist(p, l[j - 1], l[j]);
            if (d <= ON_M && (!best || d < best.d)) best = { s, d };
          }
      const from = along + (L * k) / n;
      const to = along + (L * (k + 1)) / n;
      if (best && bands.get(best.s.id) === 'car') {
        if (!run) run = { from, to, names: new Map() };
        run.to = to;
        run.names.set(best.s.name, (run.names.get(best.s.name) ?? 0) + 1);
      } else close();
    }
    along += L;
  }
  close();
  return out;
}

export interface AheadState {
  /** Keys of the stretches already said on this route. */
  said: string[];
  shown: { key: string; at: number; toM: number } | null;
}

/**
 * WK15: what to show now. A stretch is said once, `LEAD_M` before it; it stays up while the walker is on
 * it, and after it for `KEEP_MS` from when it was first shown.
 */
export function aheadStep(state: AheadState, stretches: readonly Stretch[], alongM: number, now: number): { state: AheadState; show: Stretch | null } {
  const { shown } = state;
  if (shown && (alongM <= shown.toM || now - shown.at < KEEP_MS)) {
    return { state, show: stretches.find((s) => s.key === shown.key) ?? { key: shown.key, street: null, fromM: shown.toM, toM: shown.toM } };
  }
  const next = stretches.find((s) => !state.said.includes(s.key) && s.fromM - alongM <= LEAD_M && s.toM > alongM);
  if (!next) return { state: { said: state.said, shown: null }, show: null };
  return { state: { said: [...state.said, next.key], shown: { key: next.key, at: now, toM: next.toM } }, show: next };
}

export const warningLine = (s: Pick<Stretch, 'street'>) => (s.street ? `Next: a stretch built around cars on ${s.street}` : 'Next: a stretch built around cars');
