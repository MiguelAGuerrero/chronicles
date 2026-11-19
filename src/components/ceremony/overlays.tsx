/**
 * Each overlay kind's view (RR21, decision 0086). A ceremony that adds an
 * overlay kind adds it to `OVERLAY_KINDS` and its view here; the type below
 * makes the build fail until every kind has one.
 */
import type { ComponentType } from 'react';
import { OVERLAY_KINDS, type Overlay, type OverlayKind } from '../../lib/ceremony/types';
import { Bubbles } from './Bubbles';
import { Cards } from './Cards';
import type { StageCtx } from './layout';
import { Pictures } from './Pictures';
import { Stack } from './Stack';
import { PassedNames, Whispers } from './Whispers';

export type OverlayView<K extends OverlayKind> = ComponentType<{ items: Extract<Overlay, { kind: K }>[]; ctx: StageCtx }>;

export const OVERLAYS: { [K in OverlayKind]: OverlayView<K> } = {
  picture: Pictures,
  bubble: Bubbles,
  card: Cards,
  stack: Stack,
  whisper: Whispers,
  passed: PassedNames,
};

/** Where each kind sits, bottom to top: the pictures on the map lowest, a card in flight over all. */
const LAYER: Record<OverlayKind, number> = { picture: -1, whisper: 0, passed: 0, bubble: 1, stack: 2, card: 3 };
export const OVERLAY_ORDER: readonly OverlayKind[] = [...OVERLAY_KINDS].sort((a, b) => LAYER[a] - LAYER[b]);
/** The kinds that are part of the map as a card is looked at: they sit under the scrim a card lays over it (RC35). */
export const UNDER_SCRIM: readonly OverlayKind[] = ['picture'];
