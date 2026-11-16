// @layer adapter
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Faced } from '../moment';
import type { Baker } from '../../components/Baker.types';
import { THUMB } from '../thumbPlan';
import { isEmptyEdit } from '../mediaEdit';
import { dropTemp, releaseMedia, resolveMedia } from './index';
import { withCropAndRotation } from './thumb';

/** A page's picture: wide enough for a phone's column at its pixel ratio (note pictures NI11). */
export const PICTURE_EDGE = 720;
const COMPRESS = 0.7;

const needsBaker = (c: Faced): boolean => !!c.edit && !isEmptyEdit(c.edit) && (c.edit.filter !== 'original' || c.edit.strokes.length > 0);

async function toData(uri: string, c: Faced | null): Promise<string | null> {
  const ctx = ImageManipulator.manipulate(uri, { maxWidth: PICTURE_EDGE, maxHeight: PICTURE_EDGE });
  try {
    const loaded = await ctx.renderAsync();
    // The crop and rotation of an edit that has no filter or lines; a baked copy already has them all.
    const ref = c ? await withCropAndRotation(loaded, c).catch(() => loaded) : loaded;
    try {
      const saved = await ref.saveAsync({ compress: COMPRESS, format: SaveFormat.JPEG, base64: true });
      return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
    } finally {
      ref.release();
      if (ref !== loaded) loaded.release();
    }
  } finally {
    ctx.release();
  }
}

/**
 * A photo or a video's picture for a page, as a `data:` URL (note pictures NI7, NI11, NI15): the web view that draws
 * the page reads no file of the app's, and a URL it fetched would be a network request. A photo is decoded bounded
 * to `PICTURE_EDGE` and carries its crop and rotation; with a filter or lines it is baked by the editor's own baker,
 * as the viewer shows it, without the caption (ME20); a video is its stored still (VS1), which already follows its
 * trim. Nothing is written: null when it cannot be drawn, so the page keeps the card (NI9, NI15).
 */
export async function makePicture(c: Faced, baker?: Baker): Promise<string | null> {
  const ref = c.kind === 'video' ? (c.thumb_path && c.thumb_path !== THUMB.none ? c.thumb_path : null) : c.file_path;
  if (!ref) return null;
  const uri = await resolveMedia(ref);
  if (!uri) return null;
  try {
    if (c.kind === 'photo' && baker && needsBaker(c)) {
      try {
        const baked = await baker.bake(uri, { edit: c.edit ?? null, caption: null, captionY: null }, { maxLong: PICTURE_EDGE });
        try {
          return await toData(baked, null);
        } finally {
          dropTemp(baked);
        }
      } catch {
        // A bake that cannot run keeps the crop and rotation, never a broken picture (NI15).
      }
    }
    return await toData(uri, c.kind === 'photo' ? c : null);
  } catch {
    return null;
  } finally {
    releaseMedia(uri);
  }
}
