// @layer adapter
// The web store's still spells (Motion, MO8), moved out of index.web.ts, which a file over the size limit may not grow
// (decision 0178), when a failed save's retry needed `putStill` (errors-handled audit 3).
import type { Still } from '../types';
import type { IdbHelpers } from './idbLogs';
import type { Db } from './types';

type Stills = Pick<Db, 'startStill' | 'endStill' | 'putStill' | 'getStills'>;

export function idbStills(h: IdbHelpers): Stills {
  return {
    async startStill(walkId, at) {
      const tx = (await h.conn()).transaction('still', 'readwrite');
      const st = tx.objectStore('still');
      const mine = (await h.done(st.index('walk_id').getAll(walkId))) as Still[];
      if (!mine.some((p) => p.ended_at == null)) st.put({ walk_id: walkId, started_at: at, ended_at: null });
      await h.committed(tx);
    },
    async endStill(walkId, at) {
      const tx = (await h.conn()).transaction('still', 'readwrite');
      const st = tx.objectStore('still');
      for (const p of (await h.done(st.index('walk_id').getAll(walkId))) as Still[]) {
        if (p.ended_at == null) st.put({ ...p, ended_at: at });
      }
      await h.committed(tx);
    },
    async putStill(s) {
      const tx = (await h.conn()).transaction('still', 'readwrite');
      tx.objectStore('still').put(s);
      await h.committed(tx);
    },
    async getStills(walkId) {
      const st = await h.store('still');
      return ((await h.done(st.index('walk_id').getAll(walkId))) as Still[]).sort((a, b) => a.started_at - b.started_at);
    },
  };
}
