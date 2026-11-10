// @layer adapter
import type { Faced } from '../moment';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

import { cropToRotated, rotatedSize } from '../mediaEdit';
import { thumbJob } from '../thumbJob';
import { editedThumbName, THUMB } from '../thumbPlan';
import type { MediaEdit } from '../mediaEdit';
import { keepFile, releaseMedia, resolveMedia } from './index';

/**
 * The photo's crop and rotation on the bounded copy (ME20): a copy made
 * later, because its file was gone, keeps them. The filter and lines need
 * the baker, which only the editor has mounted.
 */
async function withCropAndRotation(ref: ImageRef, c: Faced): Promise<ImageRef> {
  const e = c.edit;
  if (!e || (e.rotate === 0 && !e.crop)) return ref;
  const ctx = ImageManipulator.manipulate(ref);
  try {
    if (e.rotate) ctx.rotate(e.rotate);
    if (e.crop) {
      const rs = rotatedSize(ref.width, ref.height, e.rotate);
      const k = cropToRotated(e.crop, e.rotate);
      ctx.crop({ originX: Math.round(k.x * rs.w), originY: Math.round(k.y * rs.h), width: Math.max(1, Math.round(k.w * rs.w)), height: Math.max(1, Math.round(k.h * rs.h)) });
    }
    return await ctx.renderAsync();
  } finally {
    ctx.release();
  }
}

/**
 * Makes a photo's small copy (TH1) with expo-image-manipulator, on phones and
 * the web alike (TH5). One decode, bounded to 240 px as it loads (the full
 * photo is never in memory), its canvases released after (audit 2). Never
 * worth failing a capture over (TH2).
 */
export function makeThumb(c: Faced): Promise<string | null> {
  // Named by the piece it is a copy of (decision 0106).
  return thumbJob({ ...c, id: c.piece_id }, {
    resolve: resolveMedia,
    async render(uri, max) {
      const ctx = ImageManipulator.manipulate(uri, { maxWidth: max, maxHeight: max });
      try {
        const loaded = await ctx.renderAsync();
        const ref = await withCropAndRotation(loaded, c).catch(() => loaded);
        try {
          const saved = await ref.saveAsync({ compress: THUMB.compress, format: SaveFormat.JPEG });
          return { uri: saved.uri, release: () => {} };
        } finally {
          ref.release();
          if (ref !== loaded) loaded.release();
        }
      } finally {
        ctx.release();
      }
    },
    // A copy left by an earlier try is replaced, never a reason to fail (audit 3).
    keep: (tmp, folder, name) => keepFile(tmp, folder, name, { replace: true }),
    releaseUri: releaseMedia,
  });
}

/**
 * Keeps a small copy baked from the edited photo (ME20): crop, rotation,
 * filter and lines, no caption. Named by the edit, so its ref changes and
 * previews load it (media-editing audit 3). Resolves its stored path.
 */
export function keepEditedThumb(c: Pick<Faced, 'piece_id' | 'walk_id'>, bakedUri: string, edit: MediaEdit | null): Promise<string> {
  return keepFile(bakedUri, c.walk_id ?? 'moments', editedThumbName({ id: c.piece_id }, edit), { replace: true });
}
