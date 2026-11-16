// @layer shell
import type { MediaEdit } from '../mediaEdit';

type Piece = { piece_id: string; edit?: MediaEdit | null };

/**
 * A page's pictures, each made once per photo and edit (NI11): `make` is what turns a moment into a `data:` URL
 * (null when it cannot be drawn, NI9). Nothing is stored; a stub until the tests pass.
 */
export function createPictureStore(make: (c: Piece) => Promise<string | null>) {
  return {
    ask: (c: Piece): Promise<string | null> => make(c),
    peek: (_c: Piece): string | null | undefined => undefined,
  };
}
