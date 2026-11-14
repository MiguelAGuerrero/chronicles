// @layer shell
import { strToU8, Zip, ZipPassThrough } from 'fflate';
import type { Ports } from '../../ports/types';
import type { Walk } from '../../types';
import { bundled, setsOf } from '../../reactions/core';

/** Raised when a keeper cannot leave the app; `openSettings` when a permission is off. */
export class KeeperError extends Error {
  constructor(message: string, readonly openSettings = false) {
    super(message);
  }
}

export interface BundleIO {
  /** A capture's media, in chunks, or null when the file is gone. */
  readMedia(ref: string): Promise<AsyncIterable<Uint8Array> | null>;
  /** Takes the zip's bytes, in order, as they are made. */
  write(chunk: Uint8Array): void;
}

/**
 * Everything a walk is made of, as a zip: walk.json (the walk, its raw trace,
 * captures, pauses and summary) plus each capture's media file under media/.
 * The trace and captures are the truth; everything else can be rebuilt.
 * Media is streamed through in chunks and stored as is (photos and videos
 * are compressed already), so a walk of long videos never sits in memory
 * whole. Returns how many media files were missing; walk.json marks them.
 */
export function createBundleWriter(p: Pick<Ports, 'db' | 'clock'>) {
  return { writeWalkBundle };

  async function writeWalkBundle(walkId: string, io: BundleIO): Promise<{ walk: Walk; missing: number }> {
    const walk = await p.db.getWalk(walkId);
    if (!walk) throw new Error('This walk could not be found.');
    const [points, moments, pauses, summaries, reactionRows] = await Promise.all([
      p.db.getPoints(walkId),
      p.db.getMoments(walkId),
      p.db.getPauses(walkId),
      p.db.listSummaries(),
      p.db.listReactions(),
    ]);
    // A moment's reactions go with it (RX32), as one set per moment.
    const sets = setsOf(reactionRows);
    let failed: Error | null = null;
    const zip = new Zip((err, chunk) => {
      if (err) failed = err;
      else io.write(chunk);
    });
    const media: Record<string, string> = {};
    let missing = 0;
    // Each piece's media, named by the piece's own id (MT8, decision 0123).
    const pieces = moments.flatMap((m) => m.pieces);
    for (const c of pieces) {
      if (!c.file_path) continue;
      const chunks = await io.readMedia(c.file_path).catch(() => null);
      if (!chunks) {
        missing++;
        continue;
      }
      const name = `media/${c.id}.${extensionOf(c.file_path)}`;
      const entry = new ZipPassThrough(name);
      zip.add(entry);
      // One chunk behind, so the last one can be marked final.
      let prev: Uint8Array | null = null;
      for await (const chunk of chunks) {
        if (prev) entry.push(prev);
        prev = chunk;
      }
      entry.push(prev ?? new Uint8Array(0), true);
      media[c.id] = name;
      if (failed) throw failed;
    }
    const json = {
      format: 'chronicles-walk',
      // Version 2: moments with their pieces (MT8, decision 0123); version 1 listed one capture per moment.
      version: 2,
      exported_at: new Date(p.clock.now()).toISOString(),
      walk,
      summary: summaries.find((s) => s.walk_id === walkId) ?? null,
      pauses,
      // A photo's small copy isn't in the bundle: its path would dangle (audit 9).
      moments: moments.map((m) => ({
        ...m,
        reactions: bundled(sets.get(m.id)),
        pieces: m.pieces.map(({ thumb_path: _thumb, ...c }) => ({ ...c, media: media[c.id] ?? null, media_missing: !!c.file_path && !media[c.id] })),
      })),
      trace: points,
    };
    const doc = new ZipPassThrough('walk.json');
    zip.add(doc);
    doc.push(strToU8(JSON.stringify(json, null, 1)), true);
    zip.end();
    if (failed) throw failed;
    return { walk, missing };
  }
}

/** A media ref's extension: the last dotted part of its file name, or "bin". */
export function extensionOf(ref: string): string {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(ref.split(/[?#]/)[0]);
  return m ? m[1].toLowerCase() : 'bin';
}

/** "chronicle-2026-10-30-cafe-paseo.zip"; accents fold, other scripts are kept. */
export function bundleName(walk: Walk): string {
  const d = new Date(walk.started_at);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const slug = (walk.title ?? walk.area ?? 'walk')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `chronicle-${date}${slug ? `-${slug}` : ''}.zip`;
}
