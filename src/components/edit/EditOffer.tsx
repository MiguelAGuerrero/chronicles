import { useState } from 'react';
import { editAfter, editingOf, type EditTarget } from '../../lib/editOffer';
import type { Faced } from '../../lib/moment';

/**
 * The editor after a capture (ME23 as decision 0240 amends it): `open` it with what the camera kept and the screen draws
 * `MediaEditor` for that capture (a piece as itself) as soon as its list holds it; Close or Done ends it.
 */
export function useEditAfterCapture(captures: readonly Faced[]) {
  const [target, setTarget] = useState<EditTarget | null>(null);
  return {
    editing: editingOf(target, captures),
    open: (kept: { kind: 'photo' | 'video'; id: string; momentId: string }) => setTarget(editAfter(kept)),
    close: () => setTarget(null),
  };
}
