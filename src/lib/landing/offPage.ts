// @layer shell
import type { ComputeInput, ComputeOutput } from './compute';

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

/** Runs a read's compute off the page when it can, else on it (DC7, DC8, DC11). Not built yet. */
export function createOffPage(_p: OffPagePorts, _timeoutMs = 60000): { run(input: ComputeInput): Promise<ComputeOutput> } {
  throw new Error('createOffPage: not built (explore-dense-city DC8)');
}
