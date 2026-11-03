// @layer shell
import { THUMB, thumbName, type ThumbCapture } from './thumbPlan';

/**
 * Making a photo's small copy (TH1-TH5): the job, with its platform parts
 * passed in (`media/thumb.ts` wires expo-image-manipulator). A shell because
 * it keeps the jobs in flight, so two asks at once share one (thumbs audit 3).
 */
export interface ThumbDeps {
  resolve(ref: string): Promise<string | null>;
  /** One decode bounded to `max` px on each edge, saved as a JPEG; `release` frees its canvases (audit 2). */
  render(uri: string, max: number): Promise<{ uri: string; release(): void }>;
  keep(tempUri: string, folder: string, name: string): Promise<string>;
  releaseUri(uri: string): void;
}

const inFlight = new Map<string, Promise<string | null>>();

/**
 * Makes a photo's copy: its stored path, `THUMB.none` when it won't decode, or
 * null when it can't be read now (tried again later). Two asks at once share
 * one job (audit 3).
 */
export function thumbJob(c: ThumbCapture, deps: ThumbDeps): Promise<string | null> {
  const running = inFlight.get(c.id);
  if (running) return running;
  const job = (async () => {
    if (!c.file_path) return null;
    const uri = await deps.resolve(c.file_path).catch(() => null);
    if (!uri) return null;
    let out: { uri: string; release(): void } | null = null;
    try {
      out = await deps.render(uri, THUMB.edge);
    } catch {
      return THUMB.none;
    } finally {
      deps.releaseUri(uri);
    }
    try {
      return await deps.keep(out.uri, c.walk_id ?? 'moments', thumbName(c));
    } catch {
      return null;
    } finally {
      out.release();
    }
  })().finally(() => inFlight.delete(c.id));
  inFlight.set(c.id, job);
  return job;
}
