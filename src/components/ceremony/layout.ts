/**
 * Where the stage puts things (RR9-RR15): shared by the overlay views, so a
 * card tucks into the pile where the pile is drawn.
 */
import { metersPerPixel } from '../../lib/pins';
import type { Capture, LngLat } from '../../lib/types';

export interface StageCtx {
  width: number;
  height: number;
  insets: { top: number; bottom: number };
  /** Where the map is centred and its zoom, while it follows the walker; null when it doesn't (reduce motion). */
  center: LngLat | null;
  zoom: number;
  held: boolean;
  reduceMotion: boolean;
  /** Opens captures in the viewer (the replay holds while it is open). */
  open(captures: Capture[]): void;
}

export const PILE = { w: 64, h: 80, thumb: 56 } as const;

/** Above the map's credits button and level with the bubbles, clear of the scale bar. */
export const STAGE_BOTTOM = 44;
export const pileCenter = (c: StageCtx): [number, number] => [c.width - 14 - PILE.w / 2, c.height - c.insets.bottom - STAGE_BOTTOM - PILE.h / 2];
export const cardWidth = (c: StageCtx) => Math.min(c.width * 0.66, 260);
export const restCenter = (c: StageCtx): [number, number] => [c.width / 2, c.height * 0.4];

/** A place on screen, from its offset to the map's centre at the map's zoom; null when the map isn't following. */
export function project(c: StageCtx, at: LngLat): [number, number] | null {
  if (!c.center) return null;
  const mpp = metersPerPixel(c.zoom, c.center[1]);
  const east = (at[0] - c.center[0]) * 111_320 * Math.cos((c.center[1] * Math.PI) / 180);
  const north = (at[1] - c.center[1]) * 111_320;
  return [c.width / 2 + east / mpp, c.height / 2 - north / mpp];
}

/** A small, fixed tilt per capture, so the pile looks dropped, not stacked. */
export function tiltOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return [-7, 5, -3, 8, -5][Math.abs(h) % 5];
}

export const timeOf = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
