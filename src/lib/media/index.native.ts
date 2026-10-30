import { Directory, File, Paths } from 'expo-file-system';

/**
 * Moves a captured file into the app's Documents folder, which iOS backs up
 * and never purges. Photos stay out of the camera roll until exported.
 */
export async function keepFile(tempUri: string, walkId: string, name: string): Promise<string> {
  const dir = new Directory(Paths.document, 'walks', walkId);
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, name);
  await new File(tempUri).copy(dest);
  return dest.uri;
}
