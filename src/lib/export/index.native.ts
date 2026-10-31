import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { Capture } from '../types';
import { bundleName, walkBundle } from './bundle';

/**
 * Saves a keeper to the Photos library. `bakedUri` is a captioned copy of a
 * photo made for this export; otherwise the stored file is saved as it is.
 */
export async function saveKeeper(capture: Capture, bakedUri?: string): Promise<void> {
  const perm = await requestPermissionsAsync(true);
  if (!perm.granted) throw new Error('Photos access is off for Chronicles. Allow adding photos in Settings.');
  const uri = bakedUri ?? (capture.file_path ? new File(Paths.document, capture.file_path).uri : null);
  if (!uri) throw new Error('This capture has no file to save.');
  await Asset.create(uri);
}

/** Zips the walk and opens the share sheet (Files, AirDrop, Mail) for it. */
export async function exportWalk(walkId: string): Promise<void> {
  const { walk, zip } = await walkBundle(walkId, async (ref) => {
    const f = new File(Paths.document, ref);
    return f.exists ? f.bytes() : null;
  });
  const dir = new Directory(Paths.cache, 'exports');
  dir.create({ intermediates: true, idempotent: true });
  const out = new File(dir, bundleName(walk));
  if (out.exists) out.delete();
  out.create();
  await out.write(zip);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(out.uri, { mimeType: 'application/zip', dialogTitle: 'Back up this walk', UTI: 'public.zip-archive' });
}
