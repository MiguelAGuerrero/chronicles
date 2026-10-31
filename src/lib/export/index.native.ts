import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { db } from '../db';
import { resolveMedia } from '../media';
import type { Capture } from '../types';
import { bundleName, KeeperError, writeWalkBundle } from './bundle';

export { KeeperError };

const CHUNK = 1 << 20;

/**
 * Saves a keeper to the Photos library. `bakedUri` is a captioned copy of a
 * photo made for this export; otherwise the stored file is saved as it is.
 */
export async function saveKeeper(capture: Capture, bakedUri?: string): Promise<void> {
  const perm = await requestPermissionsAsync(true);
  if (!perm.granted) throw new KeeperError('Photos access is off for Chronicles. Allow adding photos in Settings.', true);
  const uri = bakedUri ?? (capture.file_path ? await resolveMedia(capture.file_path) : null);
  if (!uri) throw new KeeperError('This capture has no file to save.');
  await Asset.create(uri);
}

/** Deletes a captioned copy made for one save. */
export function dropBaked(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // a temp file; the system clears the cache anyway
  }
}

async function* chunksOf(file: File): AsyncIterable<Uint8Array> {
  const h = file.open(FileMode.ReadOnly);
  try {
    for (;;) {
      const bytes = await h.readBytes(CHUNK);
      if (bytes.length === 0) return;
      yield bytes;
    }
  } finally {
    h.close();
  }
}

/** Zips the walk to a file and opens the share sheet (Files, AirDrop, Mail) for it. */
export async function exportWalk(walkId: string): Promise<{ missing: number }> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const dir = new Directory(Paths.cache, 'exports');
  dir.create({ intermediates: true, idempotent: true });
  const walk = await db.getWalk(walkId);
  if (!walk) throw new Error('This walk could not be found.');
  const out = new File(dir, bundleName(walk));
  if (out.exists) out.delete();
  out.create();
  const h = out.open(FileMode.WriteOnly);
  let missing = 0;
  try {
    ({ missing } = await writeWalkBundle(walkId, {
      async readMedia(ref) {
        const uri = await resolveMedia(ref);
        const f = uri ? new File(uri) : null;
        return f?.exists ? chunksOf(f) : null;
      },
      write: (chunk) => h.writeBytesSync(chunk),
    }));
  } finally {
    h.close();
  }
  await Sharing.shareAsync(out.uri, { mimeType: 'application/zip', dialogTitle: 'Save a copy of this walk', UTI: 'public.zip-archive' });
  return { missing };
}
