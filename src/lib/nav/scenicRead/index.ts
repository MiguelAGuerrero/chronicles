// @layer shell
// @instance: the scenic routes' corridor read, on the app's ports, the tile host and Overture
import { readOverture } from '../../activity/overture';
import { fetchTiles } from '../../discovery/tileFetch';
import { ports } from '../../ports';
import { createScenicRead } from './shell';

export const scenicRead = createScenicRead(ports, { fetchTiles, readOverture });
