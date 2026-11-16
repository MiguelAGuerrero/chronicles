// @layer shell
import { pictureKey } from './pictures';
import type { MediaEdit } from '../mediaEdit';

type Piece = { piece_id: string; edit?: MediaEdit | null };

/**
 * A page's pictures, each made once per photo and edit (NI11): `make` turns a moment into a `data:` URL, or null when
 * it cannot be drawn (NI9); a failure is the same as null and is not tried again on the next keystroke. Held in memory
 * for as long as the page's store lives: a derived view of the moment, never written anywhere.
 */
export function createPictureStore<P extends Piece = Piece, Ctx = undefined>(make: (c: P, ctx: Ctx) => Promise<string | null>) {
  const jobs = new Map<string, Promise<string | null>>();
  const done = new Map<string, string | null>();
  return {
    ask(c: P, ctx: Ctx): Promise<string | null> {
      const key = pictureKey(c);
      let job = jobs.get(key);
      if (!job) {
        job = make(c, ctx).then((u) => u, () => null);
        jobs.set(key, job);
        void job.then((u) => done.set(key, u));
      }
      return job;
    },
    /** The picture if it is made, null if it cannot be, undefined while it is not known. */
    peek: (c: Piece): string | null | undefined => done.get(pictureKey(c)),
  };
}
