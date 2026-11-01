import { Directory, File, Paths } from 'expo-file-system';

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
