// @layer shell
/**
 * News that a voice memo was just kept (specs/memo-transcripts, MX17): a plain channel, so the capture path never
 * imports the transcriber and never waits for it. The transcriber listens and reads the memo when a run is allowed.
 */
const listeners = new Set<() => void>();

/** Told by the capture path after a memo is kept; returns at once. */
export function memoKept() {
  for (const l of [...listeners]) l();
}

/** The transcriber's side. */
export function onMemoKept(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
