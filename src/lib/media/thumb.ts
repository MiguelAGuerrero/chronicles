import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Capture } from '../types';
import { THUMB, thumbJob } from '../thumbPlan';
import { keepFile, releaseMedia, resolveMedia } from './index';

/**
 * Makes a photo's small copy (TH1) with expo-image-manipulator, on phones and
 * the web alike (TH5). One decode, bounded to 240 px as it loads (the full
 * photo is never in memory), its canvases released after (audit 2). Never
 * worth failing a capture over (TH2).
 */
export function makeThumb(c: Capture): Promise<string | null> {
  return thumbJob(c, {
    resolve: resolveMedia,
    async render(uri, max) {
      const ctx = ImageManipulator.manipulate(uri, { maxWidth: max, maxHeight: max });
      try {
        const ref = await ctx.renderAsync();
        try {
          const saved = await ref.saveAsync({ compress: THUMB.compress, format: SaveFormat.JPEG });
          return { uri: saved.uri, release: () => {} };
        } finally {
          ref.release();
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
