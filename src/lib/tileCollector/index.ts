// @layer shell
// @instance: the replay's tile reads, on the app's ports and the tile reader
import { fetchTiles } from '../discovery/tileFetch';
import { ports } from '../ports';
import { tileCollectorOf } from './shell';

/** A collector for one snap, reading tiles in code (Filling gaps, G12). */
export const tileCollector = () => tileCollectorOf({ ...ports, fetchTiles });
