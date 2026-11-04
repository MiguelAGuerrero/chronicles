/**
 * Each overlay kind's view (RR21, decision 0082). A ceremony that adds an
 * overlay kind adds it to `OVERLAY_KINDS` and its view here; the type below
 * makes the build fail until every kind has one.
 */
import type { ComponentType } from 'react';
import { OVERLAY_KINDS, type Overlay, type OverlayKind } from '../../lib/ceremony/types';
import { Bubbles } from './Bubbles';
import { Cards } from './Cards';
import type { StageCtx } from './layout';
import { Pile } from './Pile';
import { Whispers } from './Whispers';

export type OverlayView<K extends OverlayKind> = ComponentType<{ items: Extract<Overlay, { kind: K }>[]; ctx: StageCtx }>;

export const OVERLAYS: { [K in OverlayKind]: OverlayView<K> } = {
  bubble: Bubbles,
  card: Cards,
  pile: Pile,
  whisper: Whispers,
};

/** Where each kind sits, bottom to top: a card in flight passes over the pile it tucks into. */
const LAYER: Record<OverlayKind, number> = { whisper: 0, bubble: 1, pile: 2, card: 3 };
export const OVERLAY_ORDER: readonly OverlayKind[] = [...OVERLAY_KINDS].sort((a, b) => LAYER[a] - LAYER[b]);
