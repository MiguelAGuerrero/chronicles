// @layer adapter
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

/**
 * A video's picture size, as the browser shows it (ME4): expo-video's web
 * player has no video track, so a detached <video> reads the metadata.
 */
export function probeVideoSize(uri: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const done = (s: { w: number; h: number } | null) => {
      v.removeAttribute('src');
      v.load();
      resolve(s);
    };
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => done(v.videoWidth && v.videoHeight ? { w: v.videoWidth, h: v.videoHeight } : null);
    v.onerror = () => done(null);
    v.src = uri;
  });
}

/**
 * A video's still at `atSec`, at most `max` px on its long edge (video thumbnails VS1, VS8): a web exception, since
 * expo-video's web player cannot make one ("not supported on Web yet"). A detached, muted <video> loads the file from
 * its `blob:` URL, seeks to the frame and draws it on a canvas; the still is a `blob:` URL the image manipulator and
 * `keepFile` take. Nothing leaves the page. iOS Safari loads nothing until play() is called, so the video is played
 * muted and paused before the seek. Rejects when no frame can be made.
 */
export function videoFrame(uri: string, atSec: number, max: number): Promise<{ source: string; release(): void }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    let settled = false;
    // A load that runs out of time is asked again later, never marked undecodable (video-thumbnails audit 1).
    const t = setTimeout(() => finish(Object.assign(new Error('timeout'), { transient: true })), 15_000);
    function finish(err: Error | null, still?: string) {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      v.pause();
      v.removeAttribute('src');
      v.load();
      if (err || !still) reject(err ?? new Error('no frame'));
      else resolve({ source: still, release: () => URL.revokeObjectURL(still) });
    }
    v.onerror = () => finish(new Error('unreadable'));
    const seekTo = () => {
      const end = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : atSec;
      const at = Math.max(0, Math.min(atSec, Math.max(0, end - 0.05)));
      if (at === 0 && v.currentTime === 0) return draw();
      v.onseeked = draw;
      v.currentTime = at;
    };
    v.onloadeddata = () => {
      v.pause();
      if (atSec === 0 || Number.isFinite(v.duration)) return seekTo();
      // A MediaRecorder WebM has no duration in its header, and a seek into it may never land: a seek far past the end
      // makes the browser find the length first (the edit journey's trap), then the real seek follows.
      v.onseeked = () => {
        v.onseeked = null;
        seekTo();
      };
      v.currentTime = 1e101;
    };
    function draw() {
      const w = v.videoWidth;
      const h = v.videoHeight;
      if (!w || !h) return finish(new Error('no picture'));
      const k = Math.min(1, max / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * k));
      canvas.height = Math.max(1, Math.round(h * k));
      canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        // iOS keeps a canvas's memory until it is shrunk.
        canvas.width = 0;
        canvas.height = 0;
        if (!blob) finish(new Error('no still'));
        else finish(null, URL.createObjectURL(blob));
      }, 'image/jpeg', 0.8);
    }
    v.src = uri;
    void v.play().catch(() => {});
  });
}

