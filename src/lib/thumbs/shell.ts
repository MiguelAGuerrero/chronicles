// @layer shell
import { serializeEdit, type MediaEdit } from '../mediaEdit';
import { facedAll, facedAt, type Faced } from '../moment';
import type { Ports } from '../ports/types';
import { createStore } from '../store';
import { editedThumbName, THUMB, wantsThumb, type MadeStill } from '../thumbPlan';

/**
 * Every preview's small copies (video thumbnails VS2, VS6, VS9; the audit's 1-4, 9): a photo's copy or a video's
 * still, made on one queue, one at a time, each from a row read fresh. A job stands down when the piece changed while
 * it ran (an edit's still landed), and an edit's still replaces the one stored, whatever a screen last read. `made`
 * holds what this session made or replaced, with the ref it replaced, so a preview whose row is older shows it
 * (`shownStill`, `useStill`).
 */
export interface ThumbsDeps {
  /** `media/thumb`'s `makeThumb`, passed in so Node tests run; `name` names an edited still (ME20). */
  makeThumb: (c: Faced, name?: string) => Promise<string | null>;
  /** Removes stored files (`media`'s `removeMedia`), best effort. */
  remove: (refs: string[]) => Promise<void>;
}

const editKey = (e: MediaEdit | null | undefined) => serializeEdit(e) ?? '';

export function createThumbs(p: Pick<Ports, 'db'>, deps: ThumbsDeps) {
  const store = createStore<{ made: Record<string, MadeStill> }>({ made: {} });
  const asked = new Set<string>();
  let queue: Promise<unknown> = Promise.resolve();
  const put = (pieceId: string, still: MadeStill) => store.set((s) => ({ made: { ...s.made, [pieceId]: still } }));
  const drop = (refs: (string | null | undefined)[]) => {
    const files = refs.filter((r): r is string => !!r && r !== THUMB.none && !r.startsWith('data:'));
    if (files.length) void deps.remove(files).catch(() => {});
  };
  const pieceOf = async (momentId: string, pieceId: string): Promise<Faced | null> => {
    const fresh = (await p.db.getMomentsByIds([momentId]).then(facedAll))[0];
    return fresh && fresh.pieces.some((x) => x.id === pieceId) ? facedAt(fresh, pieceId) : null;
  };
  const enqueue = (job: () => Promise<void>): Promise<void> => {
    queue = queue.then(job, job);
    return queue.then(() => {});
  };

  return {
    store,
    /**
     * A preview with no copy asks once (VS2): made from the row read fresh, and written only if the piece is as it was
     * read (audit 2); a copy that cannot be made now is asked again next time (audit 1).
     */
    ask(momentId: string, pieceId: string): Promise<void> {
      if (asked.has(pieceId)) return queue.then(() => {});
      asked.add(pieceId);
      return enqueue(async () => {
        try {
          const piece = await pieceOf(momentId, pieceId);
          if (!piece) return;
          // Already made since the asking row was read (a walk's memory pool is older, MR audit 3): shown as it is.
          if (piece.thumb_path) return void put(pieceId, { ref: piece.thumb_path, replaced: null });
          if (!wantsThumb(piece)) return;
          const ref = await deps.makeThumb(piece);
          if (!ref) return void asked.delete(pieceId);
          const now = await pieceOf(momentId, pieceId);
          if (!now || now.thumb_path || editKey(now.edit) !== editKey(piece.edit)) {
            // An edit's still (or another copy) landed meanwhile: this one stands down (audit 2).
            drop([ref]);
            return;
          }
          await p.db.updatePiece(pieceId, { thumb_path: ref });
          put(pieceId, { ref, replaced: null });
        } catch {
          asked.delete(pieceId);
        }
      });
    },
    /**
     * After an edit that moves the still (`stillChanged`, VS6): a new still of the kept part, under its edit's name,
     * replacing the one stored now, read fresh (audit 3). With none made now, the old one, which may show the part cut
     * away, is dropped and the glyph shows until a still is made (audit 9); a file that will not decode is marked so.
     */
    remake(momentId: string, pieceId: string, edit: MediaEdit | null): Promise<void> {
      return enqueue(async () => {
        const piece = await pieceOf(momentId, pieceId).catch(() => null);
        if (!piece || piece.kind !== 'video') return;
        const old = piece.thumb_path ?? null;
        let ref: string | null = null;
        try {
          ref = await deps.makeThumb({ ...piece, edit, thumb_path: null }, editedThumbName({ id: pieceId }, edit));
        } catch {
          ref = null;
        }
        try {
          await p.db.updatePiece(pieceId, { thumb_path: ref });
        } catch {
          return;
        }
        put(pieceId, { ref, replaced: old });
        // A dropped or unreadable still may be asked again later by a preview.
        if (!ref) asked.delete(pieceId);
        if (old && old !== ref) drop([old]);
      });
    },
  };
}

export type Thumbs = ReturnType<typeof createThumbs>;
