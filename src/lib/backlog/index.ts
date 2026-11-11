// @layer shell
// @instance: placing old walks, on the app's db, the snap and the tile reader
import { db } from '../db';
import { deletions } from '../deletion';
import { snapWalk } from '../finish';
import { tileCollector } from '../tileCollector';
import { ensureTileBuild } from '../tiles';
import { createBacklog } from './shell';

export const { placeBacklog, status: backlogStatus } = createBacklog({
  tileBuild: ensureTileBuild,
  snap: snapWalk,
  collector: tileCollector,
  still: async (id) => !deletions.hidden().has(id) && (await db.getWalk(id)) != null,
});
