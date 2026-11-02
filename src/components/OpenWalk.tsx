import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { db } from '../lib/db';
import { checkRecalls } from '../lib/discovery/recallCheck';
import type { Pause, Walk } from '../lib/types';
import { useLiveTrace, type LiveTrace } from '../lib/useLiveTrace';
import { createLatestLoader } from '../lib/openWalkLoad';
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
export interface OpenWalkInfo {
  /** Whether storage has been read yet. */
  known: boolean;
  walk: Walk | null;
  pauses: Pause[];
}
export interface OpenWalkState extends OpenWalkInfo {
  live: LiveTrace;
}

const OpenWalkContext = createContext<OpenWalkState | null>(null);
/** The walk and its pauses alone: changes only when the walk starts, pauses, resumes or stops, never per fix. */
const OpenWalkInfoContext = createContext<OpenWalkInfo | null>(null);

/** Gaps in the trace (the page hidden), for the walk screen's notice while it is up. */
let gapListener: ((ms: number) => void) | null = null;
export function onWalkGap(fn: (ms: number) => void): () => void {
  gapListener = fn;
  return () => {
    if (gapListener === fn) gapListener = null;
  };
}
const onGap = (ms: number) => gapListener?.(ms);

/** How long a failed read of the open walk waits before it is tried again (tabs audit 9). */
const RETRY_MS = 1000;

export function OpenWalkProvider(props: { children: ReactNode }) {
  const [open, setOpen] = useState<OpenWalkInfo>({ known: false, walk: null, pauses: [] });
  useEffect(() => {
    // The latest read wins, and a failed one is tried again rather than settling as "no walk" (tabs audit 9).
    const loader = createLatestLoader({
      read: readOpen,
      apply: (next: { walk: Walk | null; pauses: Pause[] }) =>
        setOpen((prev) =>
          prev.known && prev.walk?.id === next.walk?.id && samePauses(prev.pauses, next.pauses) ? prev : { known: true, ...next },
        ),
      retryMs: RETRY_MS,
    });
    void loader.load();
    const off = onWalkChange(loader.load);
    return () => {
      loader.stop();
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
  return (
    <OpenWalkInfoContext.Provider value={open}>
      <OpenWalkContext.Provider value={value}>{props.children}</OpenWalkContext.Provider>
    </OpenWalkInfoContext.Provider>
  );
}

/** Throws when storage can't be read, so the walk is never taken for closed on a failure (tabs audit 9). */
async function readOpen(): Promise<{ walk: Walk | null; pauses: Pause[] }> {
  const walk = await db.getOpenWalk();
  // Pauses with the walk, in one update: a paused walk never shows as running.
  const pauses = walk ? await db.getPauses(walk.id) : [];
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

/**
 * Whether a walk is open, without its live trace: a screen that only needs to
 * know (Navigate's layout, Chronicle's reminder opener) isn't re-rendered by
 * every fix (perf).
 */
export function useOpenWalkInfo(): OpenWalkInfo {
  const v = useContext(OpenWalkInfoContext);
  if (!v) throw new Error('useOpenWalkInfo outside OpenWalkProvider');
  return v;
}
