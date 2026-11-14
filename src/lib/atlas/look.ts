// @layer core
import type { AreaAnalysis } from '../landing/analyze';
import type { LngLat } from '../types';
/**
 * Explore's "What's good here?" (tend explore 2): one look at a time, each with its own token, so a cancelled look stays
 * stopped when a newer one starts: its read ends, its line is never shown, and its end never clears the newer one.
 */
export type Look = { seq: number; live: number | null };
export const IDLE: Look = { seq: 0, live: null };

/** A new look, or null while one is live. */
export function startLook(s: Look): { state: Look; token: number } | null {
  if (s.live != null) return null;
  const token = s.seq + 1;
  return { state: { seq: token, live: token }, token };
}

/** Whether the look with this token is still the live one. */
export const isLive = (s: Look, token: number): boolean => s.live === token;

/** Cancel stops whichever look is live. */
export const cancelLook = (s: Look): Look => (s.live == null ? s : { ...s, live: null });

/** A look ends itself only while it is the live one; a stale end changes nothing. */
export const endLook = (s: Look, token: number): Look => (isLive(s, token) ? { ...s, live: null } : s);

/** What a look reads and writes, passed in by the screen (`readArea`, the tile build, `rememberArea`). */
export interface LookIo {
  read: () => Promise<{ ok: true; centre: LngLat; analysis: AreaAnalysis; overture: string | null } | { ok: false; reason: 'failed' | 'cancelled' }>;
  tileBuild: () => Promise<string | null>;
  remember: (centre: LngLat, analysis: AreaAnalysis, build: string, overture: string | null) => Promise<unknown>;
}
/** How a look ends: stopped (says nothing), failed (the error notice), nothing to say, or its line. */
export type LookEnd = { kind: 'stopped' } | { kind: 'failed' } | { kind: 'none' } | { kind: 'line'; message: string };

/**
 * One look's steps (tend explore 13): read, then the tile build, then remember the area, asking after each whether the look
 * was stopped, the write included, so a look cancelled while its area is written never shows or says its line.
 */
export async function runLook(io: LookIo, stopped: () => boolean): Promise<LookEnd> {
  const r = await io.read();
  if (stopped()) return { kind: 'stopped' };
  if (!r.ok) return r.reason === 'failed' ? { kind: 'failed' } : { kind: 'none' };
  const tile = await io.tileBuild().catch(() => null);
  if (stopped()) return { kind: 'stopped' };
  await io.remember(r.centre, r.analysis, tile ?? 'unknown', r.overture);
  if (stopped()) return { kind: 'stopped' };
  const top = r.analysis.pockets[0]?.name ?? r.analysis.landing?.street;
  return { kind: 'line', message: `${r.analysis.reason}${r.analysis.basis === 'density' && top ? `: ${top}` : ''}. A best guess from the map.` };
}
