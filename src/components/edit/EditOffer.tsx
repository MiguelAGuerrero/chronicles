import { useState } from 'react';
import { editAfter, editingOf } from '../../lib/editOffer';
import type { Faced } from '../../lib/moment';

/**
 * The editor after a capture (ME23 as decision 0240 amends it): `open` it with what the camera kept and the screen draws
 * `MediaEditor` for that capture as soon as its list holds it; Close or Done ends it. A piece opens none (`editAfter`).
 */
export function useEditAfterCapture(captures: readonly Faced[]) {
  const [id, setId] = useState<string | null>(null);
  return {
    editing: editingOf(id, captures),
    open: (kept: { kind: 'photo' | 'video'; id: string; momentId: string }) => setId(editAfter(kept)),
    close: () => setId(null),
  };
}
