// @layer core
import { termsOf } from './terms';
import type { MomentView, Signal, SignalExtractor } from './types';

/**
 * The signal sources that ship (RM13). Each reads the moment's own words by
 * the kind they came from. Memos have no words until a transcript source
 * fills them in; then `transcriptExtractor` reads them with no other change.
 */
const fromWords = (m: MomentView, source: string, weight: number): Signal[] => termsOf(m.words).map((t) => ({ term: t.term, shown: t.shown, weight, source }));

export const noteExtractor: SignalExtractor = { id: 'note', extract: (m) => (m.kind === 'text' ? fromWords(m, 'note', 1) : []) };
export const captionExtractor: SignalExtractor = { id: 'caption', extract: (m) => (m.kind === 'photo' || m.kind === 'video' ? fromWords(m, 'caption', 1) : []) };
export const transcriptExtractor: SignalExtractor = { id: 'transcript', extract: (m) => (m.kind === 'voice' ? fromWords(m, 'transcript', 0.8) : []) };

export const DEFAULT_EXTRACTORS: SignalExtractor[] = [noteExtractor, captionExtractor, transcriptExtractor];

/** Every signal a moment gives, one per term. */
export function signalsOf(m: MomentView, extractors: SignalExtractor[]): Signal[] {
  const best = new Map<string, Signal>();
  for (const e of extractors) for (const s of e.extract(m)) if ((best.get(s.term)?.weight ?? -1) < s.weight) best.set(s.term, s);
  return [...best.values()];
}
