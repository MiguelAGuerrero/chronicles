import { mediaStore } from '../db/index.web';

/**
 * The web fallback has no Documents folder. Captured media is kept as Blobs
 * in its own IndexedDB store, keyed from the capture row, so capture rows
 * stay small and the log never loads photos. Photos are downscaled first:
 * the browser hands over the camera's full-size original.
 */

const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.8;

async function downscale(blob: Blob): Promise<Blob> {
  if (!blob.type.startsWith('image/') || typeof createImageBitmap === 'undefined') return blob;
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    // iOS keeps a canvas's memory until it is shrunk, and caps a tab's canvases in total.
    canvas.width = 0;
    canvas.height = 0;
    return out && out.size < blob.size ? out : blob;
  } catch {
    return blob; // an undecodable image is kept as it came
  }
}

export async function keepFile(tempUri: string, walkId: string, name: string, _opts: { replace?: boolean } = {}): Promise<string> {
  const blob = await downscale(await (await fetch(tempUri)).blob());
  const key = `walks/${walkId}/${name}`;
  await mediaStore.put(key, blob);
  // Only once it is stored: a failed put leaves the memo retryable.
  if (tempUri.startsWith('blob:')) URL.revokeObjectURL(tempUri);
  return key;
}

export async function resolveMedia(ref: string): Promise<string | null> {
  if (ref.startsWith('data:')) return ref; // written before the media store existed
  const blob = await mediaStore.get(ref);
  return blob ? URL.createObjectURL(blob) : null;
}

export function releaseMedia(uri: string) {
  if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
}

/** Releases a temporary capture that is not being kept (a discarded memo). */
export function dropTemp(tempUri: string | null) {
  if (tempUri?.startsWith('blob:')) URL.revokeObjectURL(tempUri);
}

/** A walk's own folder prefix, never the loose moments' shared one. */
const folderKeys = (walkFolders: string[]) => walkFolders.filter((id) => id && id !== 'moments').map((id) => `walks/${id}/`);

/** Deletes stored media (D1-D3): each key, and every key under each walk's folder. Resolves how many failed. */
export async function removeMedia(refs: string[], walkFolders: string[] = []): Promise<number> {
  try {
    await mediaStore.remove(refs.filter((r) => !r.startsWith('data:')), folderKeys(walkFolders));
    return 0;
  } catch {
    return refs.length + walkFolders.length;
  }
}

/** Bytes the keys and walk folders hold, for "Frees about N MB" (D11). */
export async function mediaBytes(refs: string[], walkFolders: string[] = []): Promise<number> {
  return mediaStore.bytes(refs, folderKeys(walkFolders)).catch(() => 0);
}
