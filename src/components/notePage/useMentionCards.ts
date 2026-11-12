import { useState } from 'react';
import { useHidden } from '../../lib/deletion/useDeletions';
import { formatElapsed } from '../../lib/format';
import { GONE, refIds } from '../../lib/refs';
import { fromLine } from '../../lib/resurface/views';
import { refCardLine } from '../../lib/threads/lines';
import { useMomentPool } from '../threads/useMomentPool';

const KIND_WORD = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' } as const;

/** A mention as the page's reader draws it (RF4, RF5): its words and line, or that it is no longer kept. JSON, for the DOM. */
export type MentionCard = { gone: true; text: string } | { gone: false; name: string; line: string; spoken: string };

/**
 * The cards of a note's mentions (RF4, RF5 on the page's reader; note pages NP5): each moment's kind and words, its
 * date, place and walk, as `NoteText` draws them; a moment gone or waiting in Undo reads "A moment no longer kept".
 * Undefined until the moments are read, so nothing is called gone while it loads.
 */
export function useMentionCards(body: string): Record<string, MentionCard> | undefined {
  const pool = useMomentPool(body);
  const hidden = useHidden();
  const [now] = useState(() => Date.now());
  if (!pool.ready) return undefined;
  const out: Record<string, MentionCard> = {};
  for (const id of refIds(body)) {
    const v = pool.byId.get(id);
    if (!v || hidden.has(v.id)) {
      out[id] = { gone: true, text: GONE[0].toUpperCase() + GONE.slice(1) };
      continue;
    }
    const line = refCardLine({ place: v.place, t: v.t, walkLine: fromLine(v.walkId ? pool.walks.get(v.walkId) : undefined) }, now);
    const what = v.kind === 'text' ? (v.words ?? KIND_WORD.text) : v.kind === 'voice' ? `${KIND_WORD.voice}, ${formatElapsed(Number(v.capture.body) || 0)}` : (v.words ?? KIND_WORD[v.kind]);
    out[id] = { gone: false, name: `${KIND_WORD[v.kind]}: ${what}`, line, spoken: `${KIND_WORD[v.kind]}: ${what}. ${line}. Open` };
  }
  return out;
}
