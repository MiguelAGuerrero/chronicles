import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { THUMB, thumbFolder, thumbName, thumbResize } from '../thumbPlan';
import { keepFile, releaseMedia, resolveMedia } from './index';

/**
 * Makes a photo's small copy (TH1) with expo-image-manipulator, on phones and
 * the web alike (TH5), and keeps it beside the photo. Resolves its stored
 * path, or null when the photo is already small or anything fails: a copy is
 * never worth failing a capture over (TH2).
 */
export async function makeThumb(ref: string): Promise<string | null> {
  let uri: string | null = null;
  try {
    uri = await resolveMedia(ref);
    if (!uri) return null;
    const full = await ImageManipulator.manipulate(uri).renderAsync();
    const resize = thumbResize(full.width, full.height);
    if (!resize) return null;
    const small = await ImageManipulator.manipulate(uri).resize(resize).renderAsync();
    const saved = await small.saveAsync({ compress: THUMB.compress, format: SaveFormat.JPEG });
    return await keepFile(saved.uri, thumbFolder(ref), thumbName(ref));
  } catch {
    return null;
  } finally {
    if (uri) releaseMedia(uri);
  }
}
