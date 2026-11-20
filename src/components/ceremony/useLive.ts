import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import type { StageLive } from '../../lib/ceremony/live';
import type { Frame } from '../../lib/ceremony/types';
import type { LiveStyle } from './layout';
import { writeStyle } from './liveStyle';

/**
 * One thing a leaf of the stage draws from, read from the frame on stage (replay ceremony RC7): the leaf renders when
 * it changes and at no other time, however many frames pass. `select` answers with a primitive (a flag, a key, a
 * minute), never a new object, or the leaf would render every frame.
 */
export function useLive<T extends string | number | boolean | null>(live: StageLive, select: (f: Frame | null) => T): T {
  const read = () => select(live.frame());
  return useSyncExternalStore(live.subscribe, read, read);
}

const KEYS: (keyof LiveStyle)[] = ['opacity', 'left', 'top', 'maxHeight', 'translateX', 'translateY', 'rotate', 'scale', 'pointerEvents'];
const same = (a: LiveStyle | null, b: LiveStyle) => !!a && KEYS.every((k) => a[k] === b[k]);

/**
 * What moves every frame on one element (a card's place, a bubble's fade), written straight onto it as each frame comes
 * (replay ceremony RC7): no state, no render. `pose` reads the frame and answers with the element's style, or null for
 * nothing to write (its overlay has gone). Give the returned ref to the element, and leave those properties out of its
 * own `style`: they are written before the first paint and again after every render, so a render never undoes one.
 */
export function useLiveStyle(live: StageLive, pose: (f: Frame) => LiveStyle | null): (node: unknown) => void {
  const node = useRef<unknown>(null);
  const latest = useRef(pose);
  const last = useRef<LiveStyle | null>(null);
  const write = useCallback((again: boolean) => {
    const f = live.frame();
    const s = f && node.current ? latest.current(f) : null;
    if (!s || (!again && same(last.current, s))) return;
    last.current = s;
    writeStyle(node.current, s);
  }, [live]);
  // After every render: the pose's own inputs may have changed (the screen's size), and a render may have restated the
  // element's style.
  useLayoutEffect(() => {
    latest.current = pose;
    write(true);
  });
  useLayoutEffect(() => live.subscribe(() => write(false)), [live, write]);
  return useCallback((n: unknown) => {
    node.current = n;
  }, []);
}
