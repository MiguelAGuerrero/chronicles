// @layer shell
import { computeReadPaced, type ComputeInput, type ComputeOutput } from './compute';

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
export function createOffPage(p: OffPagePorts, timeoutMs = 60000): { run(input: ComputeInput, shouldStop?: () => boolean): Promise<ComputeOutput> } {
  const onPage = (input: ComputeInput) => computeReadPaced(input, p.pause);
  const offPage = (input: ComputeInput, w: WorkerLike) =>
    new Promise<ComputeOutput | null>((resolve) => {
      let done = false;
      const end = (out: ComputeOutput | null) => {
        if (done) return;
        done = true;
        p.clearTimeout(timer);
        w.onmessage = null;
        w.onerror = null;
        w.terminate();
        resolve(out);
      };
      const timer = p.setTimeout(() => end(null), timeoutMs);
      w.onmessage = (e) => {
        const reply = e.data as { ok?: boolean; out?: ComputeOutput } | null;
        end(reply?.ok && reply.out ? reply.out : null);
      };
      w.onerror = () => end(null);
      try {
        w.postMessage(input);
      } catch {
        end(null);
      }
    });
  return {
    async run(input) {
      let w: WorkerLike | null = null;
      try {
        w = p.makeWorker?.() ?? null;
      } catch {
        w = null;
      }
      if (!w) return onPage(input);
      const out = await offPage(input, w);
      if (!out) return onPage(input);
      p.onWorker?.();
      return out;
    },
  };
}
