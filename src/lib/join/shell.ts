// @layer shell
import type { PendingJob } from '../deletion/pending';
import type { Refs } from './rules';
import { withPiece } from '../moment';
import type { MomentView } from '../resurface/types';
import type { Ports } from '../ports/types';
import { createStore, type Store } from '../store';
import type { Capture, Moment } from '../types';

/**
 * Stack with previous (decision 0197, SW7, SW9): an entry's pieces join the previous moment through the Undo window,
 * as Split out leaves one (0123, MS16) the other way. At once the entry is gone and its pieces show in the previous
 * moment (`merged`, read by the journal page and the viewer); `db.joinMoment` stores the join once the window has
 * passed, so Undo never leaves a half-joined moment. A killed app finishes it from the saved spec (0113).
 */
export function createJoin(p: Pick<Ports, 'db'>, deps: { schedule: (job: Pick<PendingJob, 'kind' | 'what' | 'ids' | 'spec'>) => void; /** Closes the open moment (the Add to this moment pill's), so the next capture is its own (audit 3). */ closeOpen?: () => void }) {
  /** Each join waiting or done in this run of the app: the entry that went, the moment it joined and the pieces it brought. */
  const store: Store<{ pending: { from: string; into: string; pieces: Capture[] }[] }> = createStore<{ pending: { from: string; into: string; pieces: Capture[] }[] }>({ pending: [] });
  return {
    store,
    /**
     * The moments as the page shows them now: each pending join's entry gone, its pieces in the moment it joined.
     * `hidden`, when given, is the Undo window's hidden ids: a join whose entry is no longer hidden was undone.
     */
    merged(moments: readonly Moment[], hidden?: ReadonlySet<string>): Moment[] {
      let out = [...moments];
      for (const j of store.get().pending) {
        if (hidden && !hidden.has(j.from)) continue;
        const into = out.find((m) => m.id === j.into);
        // Stored already (the live moment holds a piece it brought): the live pieces rule, so an edit or a delete shows (audit 2).
        if (!into || into.pieces.some((x) => j.pieces.some((y) => y.id === x.id))) continue;
        out = out.filter((m) => m.id !== j.from).map((m) => (m.id === j.into ? j.pieces.reduce((acc, piece) => withPiece(acc, piece), m) : m));
      }
      return out;
    },
    /** The page's moment views as `merged` does the moments: the entry gone, its pieces in the view it joined (SW9). */
    mergedViews(views: readonly MomentView[], hidden?: ReadonlySet<string>): MomentView[] {
      let out = [...views];
      for (const j of store.get().pending) {
        if (hidden && !hidden.has(j.from)) continue;
        const live = out.find((v) => v.id === j.into);
        if (!live || live.capture.pieces.some((x) => j.pieces.some((y) => y.id === x.id))) continue;
        out = out.filter((v) => v.id !== j.from).map((v) => (v.id === j.into ? { ...v, capture: { ...v.capture, pieces: [...v.capture.pieces.filter((x) => !j.pieces.some((y) => y.id === x.id)), ...j.pieces.map((x) => ({ ...x, moment_id: j.into }))].sort((a, b) => a.t - b.t) } } : v));
      }
      return out;
    },
    /** Everything that points at an entry by its id: the Db's tables and what the page knows of Hidden, the slip and notes (SW8). */
    async refs(id: string, extra: Pick<Refs, 'hidden' | 'pick' | 'mention'>): Promise<Refs> {
      return { ...(await p.db.referencesTo(id)), ...extra };
    },
    async join(entry: Moment, into: Moment): Promise<void> {
      if (entry.id === into.id) throw new Error('A moment is not stacked with itself.');
      if ((entry.walk_id ?? null) !== (into.walk_id ?? null)) throw new Error('Moments on different walks are never stacked.');
      const [stored] = await p.db.getMomentsByIds([into.id]);
      if (!stored) throw new Error('That moment is gone.');
      // Something that came to point at it since it was offered (a reaction, a thread) makes it not joinable (audit 1).
      if (Object.values(await p.db.referencesTo(entry.id)).some(Boolean)) throw new Error('Something points at that entry.');
      store.set({ pending: [...store.get().pending.filter((x) => x.from !== entry.id), { from: entry.id, into: into.id, pieces: entry.pieces }] });
      // The join as data, so a killed app stores it at the next launch (decision 0113).
      deps.closeOpen?.();
      deps.schedule({ kind: 'join', what: entry.pieces[0]?.kind, ids: [entry.id], spec: { type: 'join', fromId: entry.id, intoId: into.id } });
    },
  };
}

export type Join = ReturnType<typeof createJoin>;
