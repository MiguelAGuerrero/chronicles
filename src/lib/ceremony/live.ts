// @layer view
/**
 * The frame on stage, kept outside the screen (replay ceremony RC2, RC7; decision 0206). The replay's frame loop writes
 * it every frame; the stage's leaves read it: each one the single thing it draws from (a selector, so it renders only
 * when that changes) or, for what moves every frame, a style it writes itself with no render at all
 * (`components/ceremony/useLive`). The screen above them never renders because time passed.
 *
 * One per replay screen, made by the screen; no React here, so `npm test` loads it.
 */
import type { Frame, Overlay, OverlayKind } from './types';

export interface StageLive {
  /** The frame on stage, or null when no path is being told. */
  frame(): Frame | null;
  /**
   * The stage's shape: which overlays are on it, by kind and key, and which telling they come from. It changes only
   * when an overlay arrives or leaves, the stack holds or shows something else, or the telling is rebuilt (a moment
   * deleted, a note edited: the same keys may hold other captures).
   */
  shape(): string;
  /**
   * The frame the stage's shape came with: the same object until the shape changes. A render takes the frame from here
   * (through `useSyncExternalStore`), never from `frame()`: the React Compiler keeps what a render read from the same
   * inputs, and a store read is no input (decision 0207).
   */
  staged(): Frame | null;
  /** Puts a frame on stage, from `telling` (the ceremony's own object for the story told), and tells every listener. */
  set(frame: Frame | null, telling?: unknown): void;
  /** Told after every `set`, whatever changed. */
  subscribe(listener: () => void): () => void;
}

export function createStageLive(): StageLive {
  let frame: Frame | null = null;
  let told: unknown = null;
  let turn = 0;
  let shape = '';
  let staged: Frame | null = null;
  const listeners = new Set<() => void>();
  return {
    frame: () => frame,
    shape: () => shape,
    staged: () => staged,
    set(next, telling) {
      if (telling !== undefined && telling !== told) {
        told = telling;
        turn++;
      }
      frame = next;
      const now = next ? shapeOf(next, turn) : '';
      if (now !== shape || !next) staged = next;
      shape = now;
      for (const l of [...listeners]) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * A frame's overlays by kind and key, in the frame's order, after the telling's turn. The stack says what it holds
 * and which entries the screen shows too (its newest, and the lowest one still on screen): its entries are drawn by
 * render, once for each that arrives or drops off.
 */
export function shapeOf(f: Frame, turn = 0): string {
  let s = String(turn);
  for (const o of f.overlays) {
    s += `|${o.kind}:${o.key}`;
    if (o.kind === 'stack') s += `#${o.captures.length}:${o.captures[o.captures.length - 1]?.id ?? ''}:${o.entries[0]?.key ?? ''}:${o.entries.length}`;
  }
  return s;
}

/**
 * Whether the stack is up in a frame (`replay-ceremony ui 3`): what is said over the map then ends short of its
 * column. Read from the end: the pictures come first in a frame, many of them, and the stack after the cards.
 */
export function stackUp(f: Frame | null): boolean {
  if (!f) return false;
  for (let i = f.overlays.length - 1; i >= 0; i--) {
    const kind = f.overlays[i].kind;
    if (kind === 'stack') return true;
    if (kind === 'picture') return false;
  }
  return false;
}

/** One overlay of a frame, by kind and key. */
export function overlayOf<K extends OverlayKind>(f: Frame | null, kind: K, key: string): Extract<Overlay, { kind: K }> | null {
  if (!f) return null;
  for (const o of f.overlays) if (o.kind === kind && o.key === key) return o as Extract<Overlay, { kind: K }>;
  return null;
}
