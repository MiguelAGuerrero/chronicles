// @layer adapter
import { Directory, File, Paths } from 'expo-file-system';
import { createVideoPlayer, type VideoPlayer } from 'expo-video';
import type { SharedRef } from 'expo-modules-core/types';

/**
 * Moves a captured file into the app's Documents folder, which iOS backs up
 * and never purges. Photos stay out of the camera roll until exported.
 *
 * Returns a path relative to Documents: the container's absolute path can
 * change across app updates and restores, so it is rebuilt at read time.
 */
export async function keepFile(tempUri: string, walkId: string, name: string, opts: { replace?: boolean } = {}): Promise<string> {
  const dir = new Directory(Paths.document, 'walks', walkId);
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, name);
  // A thumbnail left by an earlier try is replaced (audit 3); a capture's own file is never overwritten.
  if (opts.replace && dest.exists) dest.delete();
  await new File(tempUri).move(dest);
  return `walks/${walkId}/${name}`;
}

/** A playable/displayable URI for a stored media reference. */
export async function resolveMedia(ref: string): Promise<string | null> {
  if (ref.startsWith('file://')) return ref; // written before paths were relative
  const f = new File(Paths.document, ref);
  return f.exists ? f.uri : null;
}

/** Native URIs need no cleanup; present for parity with web object URLs. */
export function releaseMedia(_uri: string) {}

/** Deletes a temporary capture file that is not being kept (a discarded memo). */
export function dropTemp(tempUri: string | null) {
  if (!tempUri) return;
  try {
    const f = new File(tempUri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}

const fileOf = (ref: string) => (ref.startsWith('file://') ? new File(ref) : new File(Paths.document, ref));
/** A walk's own folder (`walks/<id>`), never the loose moments' shared one. */
const folderOf = (walkId: string) => (walkId && walkId !== 'moments' ? new Directory(Paths.document, 'walks', walkId) : null);

/**
 * Deletes stored media (D1-D3): each ref, then each walk's whole folder, so a
 * file no row pointed to goes too. Rows are deleted first; a file that won't
 * delete is left behind, never a row without its file. Resolves how many failed.
 */
export async function removeMedia(refs: string[], walkFolders: string[] = []): Promise<number> {
  let failed = 0;
  for (const ref of refs) {
    try {
      const f = fileOf(ref);
      if (f.exists) f.delete();
    } catch {
      failed++;
    }
  }
  for (const id of walkFolders) {
    try {
      const d = folderOf(id);
      if (d?.exists) d.delete();
    } catch {
      failed++;
    }
  }
  return failed;
}

/** Bytes the refs and walk folders hold, for "Frees about N MB" (D11); a file inside a listed folder counts once. */
export async function mediaBytes(refs: string[], walkFolders: string[] = []): Promise<number> {
  let n = 0;
  const inFolder = (ref: string) => walkFolders.some((id) => ref.startsWith(`walks/${id}/`));
  for (const id of walkFolders) {
    try {
      n += folderOf(id)?.size ?? 0;
    } catch {
      // unreadable: not counted
    }
  }
  for (const ref of refs) {
    if (inFolder(ref)) continue;
    try {
      const f = fileOf(ref);
      if (f.exists) n += f.size;
    } catch {
      // unreadable: not counted
    }
  }
  return n;
}

/**
 * A video's upright picture size (ME17): a first-frame thumbnail from a
 * player made for the purpose (iOS applies the track's transform, Android's
 * retriever its rotation; the track's own size is the encoded one).
 */
/** Waits for a player to be ready to play, at most 10 s; rejects on an unreadable file. */
async function whenReady(player: VideoPlayer): Promise<void> {
  if (player.status === 'readyToPlay') return;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 10_000);
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' || status === 'error') {
        clearTimeout(t);
        sub.remove();
        if (status === 'readyToPlay') resolve();
        else reject(new Error('unreadable'));
      }
    });
  });
}

/**
 * A video's still at `atSec`, at most `max` px on its long edge (video thumbnails VT1): expo-video's frame, a
 * `SharedRef<'image'>` the image manipulator takes as it is. Rejects when no frame can be made. Not run on a device.
 */
export async function videoFrame(uri: string, atSec: number, max: number): Promise<{ source: string | SharedRef<'image'>; release(): void }> {
  const player = createVideoPlayer(uri);
  try {
    await whenReady(player);
    const [frame] = await player.generateThumbnailsAsync([atSec], { maxWidth: max, maxHeight: max });
    if (!frame) throw new Error('no frame');
    return { source: frame, release: () => frame.release() };
  } finally {
    player.release();
  }
}

export async function probeVideoSize(uri: string): Promise<{ w: number; h: number } | null> {
  const player = createVideoPlayer(uri);
  try {
    await whenReady(player);
    const [frame] = await player.generateThumbnailsAsync([0]);
    return frame?.width && frame.height ? { w: frame.width, h: frame.height } : null;
  } catch {
    return null;
  } finally {
    player.release();
  }
}
