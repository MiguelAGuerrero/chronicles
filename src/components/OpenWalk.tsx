import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { db } from '../lib/db';
import { checkRecalls } from '../lib/discovery/recallCheck';
import type { Pause, Walk } from '../lib/types';
import { useLiveTrace, type LiveTrace } from '../lib/useLiveTrace';
import { onWalkChange } from '../lib/walkEvents';

/**
 * The open walk, kept above the tabs and the walk screen (NV8): a minimized
 * walk's screen is unmounted, so what must keep running lives here. The
 * recorder is already its own module (and the phone's location task its own);
 * this holds the walk and its pauses, the live trace that the walk screen and
 * the recording bar both show, and, on the web, the Remind me here check on
 * each accepted fix (a phone's task checks every batch itself).
 *
 * Rendered around the root stack: a new trace re-renders this and its
 * consumers only (the walk screen, the bar), never the stack or the tabs.
 */
export interface OpenWalkState {
  /** Whether storage has been read yet. */
  known: boolean;
  walk: Walk | null;
  pauses: Pause[];
  live: LiveTrace;
}

const OpenWalkContext = createContext<OpenWalkState | null>(null);

/** Gaps in the trace (the page hidden), for the walk screen's notice while it is up. */
let gapListener: ((ms: number) => void) | null = null;
export function onWalkGap(fn: (ms: number) => void): () => void {
  gapListener = fn;
  return () => {
    if (gapListener === fn) gapListener = null;
  };
}
const onGap = (ms: number) => gapListener?.(ms);

export function OpenWalkProvider(props: { children: ReactNode }) {
  const [open, setOpen] = useState<{ known: boolean; walk: Walk | null; pauses: Pause[] }>({ known: false, walk: null, pauses: [] });
  useEffect(() => {
    let alive = true;
    const load = () =>
      readOpen().then((next) => {
        if (!alive) return;
        setOpen((prev) =>
          prev.known && prev.walk?.id === next.walk?.id && samePauses(prev.pauses, next.pauses) ? prev : { known: true, ...next },
        );
      });
    load().catch(() => {});
    const off = onWalkChange(load);
    return () => {
      alive = false;
      off();
    };
  }, []);

  const live = useLiveTrace(open.walk?.id ?? null, open.walk?.started_at ?? null, open.pauses, onGap);

  // Remind me here on the web, on each accepted fix, wherever the walk is shown or minimized (NV8, R3).
  const walkId = open.walk?.id ?? null;
  useEffect(() => {
    const at = live.here;
    if (!walkId || !at || Platform.OS !== 'web') return;
    checkRecalls(walkId, [at]).catch(() => {});
  }, [walkId, live.here]);

  const value = useMemo<OpenWalkState>(() => ({ ...open, live }), [open, live]);
  return <OpenWalkContext.Provider value={value}>{props.children}</OpenWalkContext.Provider>;
}

async function readOpen(): Promise<{ walk: Walk | null; pauses: Pause[] }> {
  const walk = await db.getOpenWalk().catch(() => null);
  // Pauses with the walk, in one update: a paused walk never shows as running.
  const pauses = walk ? await db.getPauses(walk.id).catch(() => []) : [];
  return { walk, pauses };
}

function samePauses(a: Pause[], b: Pause[]): boolean {
  return a.length === b.length && a.every((p, i) => p.started_at === b[i].started_at && p.ended_at === b[i].ended_at);
}

export function useOpenWalk(): OpenWalkState {
  const v = useContext(OpenWalkContext);
  if (!v) throw new Error('useOpenWalk outside OpenWalkProvider');
  return v;
}
