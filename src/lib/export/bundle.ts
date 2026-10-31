import { strToU8, zipSync, type Zippable } from 'fflate';
import { db } from '../db';
import type { Walk } from '../types';

/**
 * Everything a walk is made of, as a zip: walk.json (the walk, its raw trace,
 * captures, pauses and summary) plus each capture's media file under media/.
 * The trace and captures are the truth; everything else can be rebuilt.
 */
export async function walkBundle(walkId: string, readMedia: (ref: string) => Promise<Uint8Array | null>): Promise<{ walk: Walk; zip: Uint8Array }> {
  const walk = await db.getWalk(walkId);
  if (!walk) throw new Error('This walk could not be found.');
  const [points, captures, pauses, summaries] = await Promise.all([
    db.getPoints(walkId),
    db.getCaptures(walkId),
    db.getPauses(walkId),
    db.listSummaries(),
  ]);
  const files: Zippable = {};
  const media: Record<string, string> = {};
  for (const c of captures) {
    if (!c.file_path) continue;
    const bytes = await readMedia(c.file_path).catch(() => null);
    if (!bytes) continue;
    const name = `media/${c.id}.${c.file_path.split('.').pop() ?? 'bin'}`;
    files[name] = [bytes, { level: 0 }]; // already compressed formats
    media[c.id] = name;
  }
  const json = {
    format: 'chronicles-walk',
    version: 1,
    exported_at: new Date().toISOString(),
    walk,
    summary: summaries.find((s) => s.walk_id === walkId) ?? null,
    pauses,
    captures: captures.map((c) => ({ ...c, media: media[c.id] ?? null })),
    trace: points,
  };
  files['walk.json'] = strToU8(JSON.stringify(json, null, 1));
  return { walk, zip: zipSync(files) };
}

/** "chronicle-2026-10-30-fox-point.zip" */
export function bundleName(walk: Walk): string {
  const d = new Date(walk.started_at);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const slug = (walk.title ?? walk.area ?? 'walk').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `chronicle-${date}${slug ? `-${slug}` : ''}.zip`;
}
