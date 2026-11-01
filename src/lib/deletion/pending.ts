import type { CaptureKind } from '../types';
import type { DeleteKind } from './core';

/**
 * The Undo window (D5, D6), pure with its clock passed in. A delete hides its
 * ids at once and reaches storage only after `waitMs`, or sooner on `flush`
 * (the app going to the background) or when another delete is confirmed. Undo
 * reaches only the newest delete still waiting. Nothing is ever put back in
 * storage: a delete that waits is only hidden, and a killed app drops it.
 */

export interface PendingJob {
  kind: DeleteKind;
  /** A single moment's kind, so the pill can name it. */
  what?: CaptureKind;
  /** Walk and capture ids every screen hides while it waits, and after it went. */
  ids: string[];
  /** Does the delete in storage. */
  run(): Promise<void>;
}

export const UNDO_MS = 5000;
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
  waitMs?: number;
}) {
  const waitMs = o.waitMs ?? UNDO_MS;
  let waiting: { job: PendingJob; timer: unknown } | null = null;
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
      await job.run();
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
  }

  /** Takes the waiting delete out of the window and stores it. */
  function release(): Promise<void> {
    if (!waiting) return Promise.resolve();
    const { job, timer } = waiting;
    waiting = null;
    o.clearTimer(timer);
    set({ pending: null });
    return commit(job);
  }

  return {
    schedule(job: PendingJob): void {
      void release();
      hide(job.ids);
      const timer = o.setTimer(() => void release(), waitMs);
      waiting = { job, timer };
      set({ pending: { kind: job.kind, what: job.what }, error: null });
    },
    undo(): void {
      if (!waiting) return;
      const { job, timer } = waiting;
      waiting = null;
      o.clearTimer(timer);
      unhide(job.ids);
      set({ pending: null });
    },
    /** Stores what waits now (the app is going to the background). */
    flush: release,
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
