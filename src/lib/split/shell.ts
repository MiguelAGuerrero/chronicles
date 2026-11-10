// @layer shell
import type { PendingJob } from '../deletion/pending';
import { pieceKey } from '../moment';
import type { Ports } from '../ports/types';
import { splitPlace } from '../splitPlace';
import { createStore, type Store } from '../store';
import type { Moment } from '../types';

/**
 * Split out (moment stacks MS16, decision 0123): a piece leaves its moment through the Undo window. At once it is
 * hidden from its stack (by `pieceKey`) and shown as a moment of its own (`store`, read by the viewer); the split is
 * stored once the window has passed (`db.splitPiece`), so Undo never joins two moments back. The moment's first
 * piece is its anchor and is never split. The new moment's id is the piece's; it is placed by `splitPlace`.
 */
export function createSplit(p: Pick<Ports, 'db'>, deps: { schedule: (job: PendingJob) => void }) {
  /** Each split waiting or done in this run of the app: the moment it came from, and the moment it became. */
  const store: Store<{ pending: { from: string; moment: Moment }[] }> = createStore<{ pending: { from: string; moment: Moment }[] }>({ pending: [] });
  return {
    store,
    pending: (): Moment[] => store.get().pending.map((x) => x.moment),
    async split(m: Moment, pieceId: string): Promise<void> {
      const i = m.pieces.findIndex((x) => x.id === pieceId);
      if (i < 0) throw new Error('That is not part of this moment.');
      if (i === 0) throw new Error('A moment keeps its first capture.');
      const piece = m.pieces[i];
      const walk = m.walk_id ? { fixes: await p.db.getPoints(m.walk_id), pauses: await p.db.getPauses(m.walk_id) } : null;
      const at = splitPlace(piece.t, walk, m);
      const own: Moment = { id: piece.id, walk_id: m.walk_id, t: piece.t, lat: at.lat, lon: at.lon, segment_id: null, pieces: [{ ...piece, moment_id: piece.id }] };
      store.set({ pending: [...store.get().pending.filter((x) => x.moment.id !== own.id), { from: m.id, moment: own }] });
      deps.schedule({
        kind: 'split',
        what: piece.kind,
        ids: [pieceKey(piece.id)],
        run: async () => {
          const { pieces: _p, ...moment } = own;
          await p.db.splitPiece(piece.id, moment);
        },
      });
    },
  };
}

export type Split = ReturnType<typeof createSplit>;
