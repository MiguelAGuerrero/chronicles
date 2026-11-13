// @layer shell
import { facedAll, facedAt, type Faced } from '../moment';
import type { Ports } from '../ports/types';
import { createStore } from '../store';
import { wantsThumb } from '../thumbPlan';

/**
 * Small copies asked for by a preview that has no shell of its own (Memories' cards; video thumbnails VT2, VT9): a
 * photo's copy or a video's still, made once, one at a time, read fresh from storage first (the copy may have been
 * made since the card read its row), stored on the piece. `made` holds what was made or found this session, so a
 * card shows it at once without reading its list again.
 */
export interface ThumbsDeps {
  /** `media/thumb`'s `makeThumb`, passed in so Node tests run. */
  makeThumb: (c: Faced) => Promise<string | null>;
}

export function createThumbs(p: Pick<Ports, 'db'>, deps: ThumbsDeps) {
  const store = createStore<{ made: Record<string, string> }>({ made: {} });
  const asked = new Set<string>();
  let queue: Promise<unknown> = Promise.resolve();
  const put = (pieceId: string, ref: string) => store.set((s) => ({ made: { ...s.made, [pieceId]: ref } }));
  return {
    store,
    /** Asks once for the piece's copy; resolves when it is made, found, or cannot be made now (asked again next time). */
    ask(momentId: string, pieceId: string): Promise<void> {
      if (asked.has(pieceId)) return queue.then(() => {});
      asked.add(pieceId);
      queue = queue.then(async () => {
        try {
          const fresh = (await p.db.getMomentsByIds([momentId]).then(facedAll))[0];
          if (!fresh || !fresh.pieces.some((x) => x.id === pieceId)) return;
          const piece = facedAt(fresh, pieceId);
          if (!wantsThumb(piece)) {
            if (piece.thumb_path) put(pieceId, piece.thumb_path);
            return;
          }
          const ref = await deps.makeThumb(piece);
          if (!ref) {
            asked.delete(pieceId);
            return;
          }
          await p.db.updatePiece(pieceId, { thumb_path: ref });
          put(pieceId, ref);
        } catch {
          asked.delete(pieceId);
        }
      });
      return queue.then(() => {});
    },
  };
}

export type Thumbs = ReturnType<typeof createThumbs>;
