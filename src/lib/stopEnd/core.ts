// @layer core

/** A memo save under way: its number, and the capture path whose memo it is. */
export interface SaveUnderWay {
  n: number;
  owner: unknown;
}

export type StopUnder = { go: true; under: number[] } | { go: false; saving: number[] } | { go: false; recording: true };

/**
 * What a Stop meets once its wait is over (T35, decision 0227; tend tabs audit 43): it goes, through the saves `warned`
 * already named, which keep saving into the ended walk; or it is refused, as saving (the numbers to name, for the next
 * hold) or as a memo recording. A memo stopping to be saved is saving, not recording.
 */
export function stopUnderOf(s: { saving: readonly SaveUnderWay[]; on: readonly unknown[]; warned: readonly number[] }): StopUnder {
  const saving = s.saving.map((x) => x.n);
  if (saving.length) return saving.every((n) => s.warned.includes(n)) ? { go: true, under: saving } : { go: false, saving };
  return s.on.length ? { go: false, recording: true } : { go: true, under: [] };
}
