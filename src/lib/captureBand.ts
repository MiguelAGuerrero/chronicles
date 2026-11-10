// @layer core
import type { Capture } from './types';

/**
 * Capture from Chronicle (HC6-HC10, HC15, decision 0112): the decisions behind Memories' capture band.
 * Pure, so `npm test` holds them; `MomentBar` and `MemoriesScreen` follow them.
 */

/** The band's gutter to the screen's edge and between its buttons (the stack's 4-point grid). */
export const BAND_GUTTER = 16;
const BAND_GAP = 12;
/** The band's buttons: as tall as the walk screen's capture buttons (56 pt), a thumb's target. */
export const BAND_BUTTON_H = 56;
/** The band's padding above and below its buttons. */
const BAND_PAD = 8;
/** The column every screen keeps to on a wide display. */
const COLUMN = 640;

export interface BandLayout {
  /** The band's height above whatever sits under it (the tab bar, the recording bar). */
  height: number;
  /** Camera, mic, note, left to right: each button's left edge and width. */
  buttons: { left: number; width: number }[];
}

/** Three equal buttons inside the 640 column (HC7): the same gutter as every screen, never narrower than a thumb. */
export function bandLayout(width: number): BandLayout {
  const side = Math.max(BAND_GUTTER, (width - COLUMN) / 2 + BAND_GUTTER);
  const inner = Math.max(0, width - side * 2);
  const w = Math.max(44, (inner - BAND_GAP * 2) / 3);
  return {
    height: BAND_BUTTON_H + BAND_PAD * 2,
    buttons: [0, 1, 2].map((i) => ({ left: side + i * (w + BAND_GAP), width: w })),
  };
}

/**
 * Where a moment from the band goes (HC9, HC10): into the open walk, as the recording bar's camera does, else a
 * moment of its own. Until the keeper knows whether a walk is open, nowhere: the band waits rather than keep a
 * loose moment for a walk that is open (capture-from-chronicle audit 7).
 */
export function captureTarget(openWalk: { id: string } | null, known = true): { walkId: string } | { loose: true } | { wait: true } {
  if (!known) return { wait: true };
  return openWalk ? { walkId: openWalk.id } : { loose: true };
}

/** The band's buttons, named for a screen reader (HC8): for the walk when one is open. */
export function bandLabels(walkOpen: boolean): { photo: string; voice: string; note: string } {
  const lead = walkOpen ? 'Add to your walk' : 'Keep a moment';
  return { photo: `${lead}: take a photo or video`, voice: `${lead}: record a voice memo`, note: `${lead}: write a note` };
}

/** The band's words for each kind, under its icon. */
export const BAND_WORDS = { photo: 'Photo', voice: 'Voice', note: 'Note' } as const;

const KIND_NAME: Record<Capture['kind'], string> = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' };

/**
 * What a moment's toast says (M2, HC15): where it landed once its fix came, or that no place came; with a
 * walk open, that it went to the walk, since Lately takes a walk's moments only once the walk is stopped.
 */
export function momentToast(kind: Capture['kind'], to: 'loose' | 'walk', reason?: 'denied' | 'timeout' | 'unavailable'): string {
  const what = KIND_NAME[kind];
  if (to === 'walk') return `${what} saved to your walk`;
  if (!reason) return `${what} kept here`;
  return reason === 'denied' ? `${what} kept · No location (location is off)` : `${what} kept · No location`;
}

/**
 * Whether the recording bar shows its camera (decision 0112): not on Chronicle's Memories, whose band
 * already files into the walk, so the foot of the screen holds one camera, not two. Everywhere else it does.
 */
export function barCamera(path: string, section: string): boolean {
  return !(path.split('?')[0] === '/' && section === 'memories');
}
