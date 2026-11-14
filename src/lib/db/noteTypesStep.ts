// @layer core
// IndexedDB version 22's step (reactions RX28, RX29, decision 0176), out of the web store's `migrate` so that
// function makes room for later steps without growing (decision 0178). It only calls what it is given.
import { migrateTypes, type StoredReaction } from '../reactions/core';

/** Every note type kept before moves onto its moment, the earliest note winning its family. */
export function copyNoteTypes(moments: IDBObjectStore, reactions: IDBObjectStore) {
  const cur = moments.openCursor();
  cur.onsuccess = () => {
    const c = cur.result;
    if (!c) return;
    // Read raw: the pieces' old `note_type` is no longer part of a capture's type.
    for (const r of migrateTypes((c.value as { pieces: { id: string; moment_id: string; t: number; note_type?: string | null }[] }).pieces) as StoredReaction[]) reactions.put(r);
    c.continue();
  };
}
