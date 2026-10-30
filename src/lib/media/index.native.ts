import { Directory, File, Paths } from 'expo-file-system';

/**
 * Moves a captured file into the app's Documents folder, which iOS backs up
 * and never purges. Photos stay out of the camera roll until exported.
 *
 * Returns a path relative to Documents: the container's absolute path can
 * change across app updates and restores, so it is rebuilt at read time.
 */
export async function keepFile(tempUri: string, walkId: string, name: string): Promise<string> {
  const dir = new Directory(Paths.document, 'walks', walkId);
  dir.create({ intermediates: true, idempotent: true });
  await new File(tempUri).move(new File(dir, name));
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
