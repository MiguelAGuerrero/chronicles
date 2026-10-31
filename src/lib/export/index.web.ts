import { releaseMedia, resolveMedia } from '../media';
import type { Capture } from '../types';
import { bundleName, extensionOf, KeeperError, writeWalkBundle } from './bundle';

export { KeeperError };

const CHUNK = 1 << 20;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** The stored media for a ref as a Blob, through the same resolver the app reads with (old data: refs too). */
async function mediaBlob(ref: string): Promise<Blob | null> {
  const uri = await resolveMedia(ref);
  if (!uri) return null;
  try {
    return await (await fetch(uri)).blob();
  } finally {
    releaseMedia(uri);
  }
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/webm': 'webm', 'video/mp4': 'mp4', 'audio/webm': 'webm', 'audio/mp4': 'm4a' };

/** On the web a keeper downloads as a file; `bakedUri` is a captioned copy of a photo. */
export async function saveKeeper(capture: Capture, bakedUri?: string): Promise<void> {
  const blob = bakedUri ? await (await fetch(bakedUri)).blob() : capture.file_path ? await mediaBlob(capture.file_path) : null;
  if (!blob) throw new KeeperError('This capture has no file to save.');
  // Named for what the bytes are: a photo re-encoded at capture is a JPEG whatever its ref says.
  const ext = EXT[blob.type] ?? (capture.file_path ? extensionOf(capture.file_path) : 'bin');
  download(blob, `chronicle-${capture.kind}-${new Date(capture.t).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`);
}

/** Frees a captioned copy made for one save. */
export function dropBaked(uri: string) {
  if (uri.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(uri), 10_000);
}

async function* chunksOf(blob: Blob): AsyncIterable<Uint8Array> {
  for (let at = 0; at < blob.size; at += CHUNK) yield new Uint8Array(await blob.slice(at, at + CHUNK).arrayBuffer());
}

/** Zips the walk and downloads it; the zip is kept as Blob parts, never as one array. */
export async function exportWalk(walkId: string): Promise<{ missing: number }> {
  const parts: BlobPart[] = [];
  const { walk, missing } = await writeWalkBundle(walkId, {
    async readMedia(ref) {
      const blob = await mediaBlob(ref);
      return blob ? chunksOf(blob) : null;
    },
    write: (chunk) => parts.push(chunk as BlobPart),
  });
  download(new Blob(parts, { type: 'application/zip' }), bundleName(walk));
  return { missing };
}
