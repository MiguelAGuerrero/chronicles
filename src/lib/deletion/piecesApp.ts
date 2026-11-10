// @layer shell
// @instance: the piece delete on the app's ports
import { ports } from '../ports';
import { createPieceDelete } from './pieces';

export const pieceDelete = createPieceDelete(ports);
