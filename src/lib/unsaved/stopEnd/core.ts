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
 * hold) or as a memo recording. A memo stopping to be saved is saving, not recording; one recording on a path with no
 * save of its own is recording, whatever else saves.
 */
export function stopUnderOf(s: { saving: readonly SaveUnderWay[]; on: readonly unknown[]; warned: readonly number[] }): StopUnder {
  // A memo recording whose path is not saving one: never a stop under it, on any hold (tabs audit 3; tend tabs audit 44).
  if (s.on.some((o) => !s.saving.some((x) => x.owner === o))) return { go: false, recording: true };
  const saving = s.saving.map((x) => x.n);
  if (saving.length) return saving.every((n) => s.warned.includes(n)) ? { go: true, under: saving } : { go: false, saving };
  return { go: true, under: [] };
}
