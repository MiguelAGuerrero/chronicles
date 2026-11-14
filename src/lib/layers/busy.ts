// @layer shell
import { db } from '../db';
import { readArea, rememberArea } from '../landing/read';
import { rulesCurrent, type LandingRow } from '../landing/view';
import { ensureTileBuild } from '../tiles';
import type { LngLat } from '../types';
import { caught, fallback } from '../diagnostics/sink';

/*
 * Busy streets as a layer (ML8, ML9): what is remembered, and the one read that fills a blank. The same read and the
 * same remembered areas What's good here and an exploring walk use; nothing here is new data.
 */

/** The remembered areas read under the current rules. */
export async function rememberedAreas(): Promise<LandingRow[]> {
  const rows = await db.listLandings().catch(fallback('lib/layers/busy · rememberedAreas', [] as LandingRow[], 'what listLandings read'));
  return rows.filter((r) => rulesCurrent(r.rules));
}

/** ML9: reads the area around `at` as What's good here does and remembers it; false when it could not be read. */
export async function readBusyAround(at: LngLat, shouldStop: () => boolean): Promise<boolean> {
  const read = await readArea(at, shouldStop);
  if (!read.ok) return false;
  const build = await ensureTileBuild().catch(fallback('lib/layers/busy · readBusyAround', 'unknown', 'what ensureTileBuild read'));
  await rememberArea(read.centre, read.analysis, build, read.overture).catch(caught('cache', 'lib/layers/busy · readBusyAround'));
  return true;
}
