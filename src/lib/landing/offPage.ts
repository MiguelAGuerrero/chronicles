// @layer shell
import { computeRingPaced, type RingInput, type RingOutput } from '../atlas/ringCompute';
import { computeReadPaced, type ComputeInput, type ComputeOutput } from './compute';
import type { WorkerJob } from './workerJobs';

/** The smallest Worker the off-page runner needs, so a test can hand it a fake. */
export interface WorkerLike {
  postMessage(data: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export interface OffPagePorts {
  /** Makes the background reader; may throw (no workers, or its file is gone after a deploy). Null: none on this platform. */
  makeWorker: (() => WorkerLike) | null;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (t: unknown) => void;
  /** Gives the JS thread a turn, between the page-side compute's stages (DC11). */
  pause: () => Promise<void>;
  /** Called when a read ran off the page (the e2e's `busy:worker`). */
  onWorker?: () => void;
}

/**
 * Runs a read's compute off the page when it can, else on it (DC7, DC8, DC11). One worker per read, ended after. The tiles'
 * bytes are copied to it, not transferred, so the page still holds them if it has to compute them itself: a worker that
 * can't be made (none on this platform, or its file gone after a deploy), errors, answers an error or stays silent past
 * `timeoutMs` leaves the read to the page, which gives the same result (the same `computeRead`).
 */
export function createOffPage(p: OffPagePorts, timeoutMs = 60000): {
  run(input: ComputeInput, shouldStop?: () => boolean): Promise<ComputeOutput>;
  ring(input: RingInput, shouldStop?: () => boolean): Promise<RingOutput>;
} {
  const POLL_MS = 250;
  const cancelled = () => new Error('Read cancelled');
  // One worker serves job after job (audit 2: starting one per ring cost 1-2 s before Explore's first pins): a job that
  // ends well hands it back; one that fails, times out or is cancelled ends it, and the next job makes a new one.
  let idle: WorkerLike | null = null;
  const offPage = <O>(job: WorkerJob, w: WorkerLike, stopped: () => boolean) =>
    new Promise<O | 'failed' | 'stopped'>((resolve) => {
      let done = false;
      let poll: unknown = null;
      const end = (out: O | 'failed' | 'stopped') => {
        if (done) return;
        done = true;
        p.clearTimeout(timer);
        if (poll != null) p.clearTimeout(poll);
        w.onmessage = null;
        w.onerror = null;
        if (out === 'failed' || out === 'stopped' || idle) w.terminate();
        else idle = w;
        resolve(out);
      };
      const timer = p.setTimeout(() => end(stopped() ? 'stopped' : 'failed'), timeoutMs);
      // audit 9: a read cancelled while its worker runs ends the worker; nothing falls back to the page.
      const look = () => {
        poll = null;
        if (stopped()) return end('stopped');
        if (!done) poll = p.setTimeout(look, POLL_MS);
      };
      poll = p.setTimeout(look, POLL_MS);
      w.onmessage = (e) => {
        const reply = e.data as { ok?: boolean; out?: O } | null;
        end(stopped() ? 'stopped' : reply?.ok && reply.out ? reply.out : 'failed');
      };
      w.onerror = () => end(stopped() ? 'stopped' : 'failed');
      try {
        w.postMessage(job);
      } catch {
        end('failed');
      }
    });
  const runJob = async <I, O>(job: WorkerJob, input: I, paced: (input: I, pause: () => Promise<void>) => Promise<O>, shouldStop?: () => boolean): Promise<O> => {
    const stopped = () => shouldStop?.() ?? false;
    if (stopped()) throw cancelled();
    // On the page, each turn between stages looks again: a cancelled read stops there.
    const onPage = () => paced(input, async () => {
      await p.pause();
      if (stopped()) throw cancelled();
    });
    let w: WorkerLike | null = idle;
    idle = null;
    if (!w) {
      try {
        w = p.makeWorker?.() ?? null;
      } catch {
        w = null;
      }
    }
    if (!w) return onPage();
    const out = await offPage<O>(job, w, stopped);
    if (out === 'stopped' || stopped()) throw cancelled();
    if (out === 'failed') return onPage();
    p.onWorker?.();
    return out;
  };
  return {
    run: (input, shouldStop) => runJob({ job: 'read', input }, input, computeReadPaced, shouldStop),
    // explore-dense-city audit 2: an atlas ring's profile, off the page as a read is.
    ring: (input, shouldStop) => runJob({ job: 'ring', input }, input, computeRingPaced, shouldStop),
  };
}
