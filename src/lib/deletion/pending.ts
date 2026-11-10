// @layer core
import type { CaptureKind } from '../types';
import type { DeleteKind } from './core';

/**
 * The Undo window (D5, amended by UC1-UC2 and UC13, decision 0113), pure with its effects passed in. A delete
 * hides its ids at once and reaches storage only when the owner taps Close (`dismiss`), starts another delete,
 * or something calls `flush`; Undo takes back the newest one still waiting. It never ends on a timer, and the
 * app going to the background no longer stores it. A waiting delete is data (`DeleteSpec`), handed to `save` so
 * a killed app can store it at the next launch (`resume`).
 */

/** What a waiting delete stores: data, never a closure, so it can be saved and run after a relaunch. */
export type DeleteSpec =
  | { type: 'walk'; walkId: string }
  | { type: 'media'; walkId: string; captureIds: string[] }
  | { type: 'moment'; captureId: string }
  | { type: 'thread'; threadId: string }
  | { type: 'remove'; threadId: string; momentId: string };

export interface PendingJob {
  kind: DeleteKind;
  /** A single moment's kind, so the pill can name it. */
  what?: CaptureKind;
  /** Ids every screen hides while it waits, and after it went (a removal hides `thread/moment`). */
  ids: string[];
  spec: DeleteSpec;
}

/** The key a waiting removal from a thread hides (UC6). */
export const membershipKey = (threadId: string, momentId: string) => `${threadId}/${momentId}`;

export const ERROR_MS = 4000;
export const FAILED_TEXT = "Couldn't delete. Try again.";

export interface PendingState {
  /** The delete Undo would reach, while it waits. */
  pending: { kind: DeleteKind; what?: CaptureKind } | null;
  error: string | null;
}

export function createPending(o: {
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
  /** Stores a delete. */
  run: (spec: DeleteSpec) => Promise<void>;
  /** Keeps the waiting delete (or none) where a relaunch can find it (UC13). */
  save?: (job: PendingJob | null) => void;
}) {
  let waiting: PendingJob | null = null;
  let errorTimer: unknown = null;
  // Waiting and gone ids, counted so two deletes of one id (a moment, then its walk) unhide right.
  const hiddenCount = new Map<string, number>();
  let hidden: ReadonlySet<string> = new Set();
  let state: PendingState = { pending: null, error: null };
  const listeners = new Set<() => void>();
  const committed = new Set<(job: PendingJob) => void>();

  const emit = () => {
    for (const l of [...listeners]) l();
  };
  const rebuild = () => {
    hidden = new Set(hiddenCount.keys());
  };
  const hide = (ids: string[]) => {
    for (const id of ids) hiddenCount.set(id, (hiddenCount.get(id) ?? 0) + 1);
    rebuild();
  };
  const unhide = (ids: string[]) => {
    for (const id of ids) {
      const n = (hiddenCount.get(id) ?? 0) - 1;
      if (n > 0) hiddenCount.set(id, n);
      else hiddenCount.delete(id);
    }
    rebuild();
  };
  const set = (next: Partial<PendingState>) => {
    state = { ...state, ...next };
    emit();
  };

  async function commit(job: PendingJob): Promise<void> {
    try {
      await o.run(job.spec);
      for (const fn of [...committed]) fn(job);
    } catch {
      unhide(job.ids);
      if (errorTimer != null) o.clearTimer(errorTimer);
      errorTimer = o.setTimer(() => {
        errorTimer = null;
        set({ error: null });
      }, ERROR_MS);
      set({ error: FAILED_TEXT });
    }
    // Stored (or failed): nothing to run after a relaunch, unless a newer delete waits and was saved meanwhile.
    if (!waiting) o.save?.(null);
  }

  /** Takes the waiting delete out of the window and stores it. */
  function release(): Promise<void> {
    if (!waiting) return Promise.resolve();
    const job = waiting;
    waiting = null;
    set({ pending: null });
    return commit(job);
  }

  return {
    /** A new delete: the one waiting is stored first (UC2), this one is hidden and waits for the owner (UC1). */
    schedule(job: PendingJob): void {
      void release();
      hide(job.ids);
      waiting = job;
      o.save?.(job);
      set({ pending: { kind: job.kind, what: job.what }, error: null });
    },
    /** Takes back the waiting delete: nothing was stored. */
    undo(): void {
      if (!waiting) return;
      const job = waiting;
      waiting = null;
      unhide(job.ids);
      o.save?.(null);
      set({ pending: null });
    },
    /** Close on the pill: the delete stands, stored now (UC2). */
    dismiss: release,
    /** Stores what waits now. */
    flush: release,
    /** A delete saved by a run that was killed: hidden, stored, and no pill (UC13). */
    resume(job: PendingJob): Promise<void> {
      if (waiting) return Promise.resolve();
      hide(job.ids);
      return commit(job);
    },
    hidden: () => hidden,
    state: () => state,
    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    /** Called once a delete reached storage, so screens read again. */
    onCommitted(fn: (job: PendingJob) => void): () => void {
      committed.add(fn);
      return () => {
        committed.delete(fn);
      };
    },
  };
}

export type Pending = ReturnType<typeof createPending>;
