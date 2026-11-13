// @layer core
import { computeRing, type RingInput } from '../atlas/ringCompute';
import { handleComputeMessage, type ComputeInput } from './compute';

/** The jobs the read's worker runs (explore-dense-city DC7, audit 2): a Busy or walk read, or an atlas ring. */
export type WorkerJob = { job: 'read'; input: ComputeInput } | { job: 'ring'; input: RingInput };

/** The worker's side of the exchange: a job in, its result or an error out; never throws. */
export function handleWorkerMessage(data: unknown): { ok: true; out: unknown } | { ok: false; error: string } {
  const m = data as Partial<WorkerJob> | null;
  if (m?.job === 'read') return handleComputeMessage(m.input);
  if (m?.job === 'ring') {
    const i = m.input as Partial<RingInput> | undefined;
    if (!i || !Array.isArray(i.bodies) || !Array.isArray(i.tiles) || i.bodies.length !== i.tiles.length || !Array.isArray(i.at)) return { ok: false, error: 'not a ring input' };
    try {
      return { ok: true, out: computeRing(i as RingInput) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return { ok: false, error: 'not a job' };
}
