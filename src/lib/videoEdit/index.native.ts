// @layer adapter
import { File, Paths } from 'expo-file-system';
import { exportEditedVideo } from '../../../modules/chronicles-video-edit';
import type { ExportPlan, MediaEdit } from '../mediaEdit';

/**
 * An edited video as one MP4 (ME17), made by the local native module
 * (`modules/chronicles-video-edit`: AVFoundation, Media3 Transformer): the
 * trim, the turn and crop through the plan, the lines and caption as a clear
 * PNG over every frame. Resolves a temp file; `dropBaked` it after. Never
 * run on a device.
 */
export async function exportVideo(sourceUri: string, plan: ExportPlan, edit: MediaEdit, overlayUri: string | null): Promise<string> {
  const out = new File(Paths.cache, `edited-${plan.out.w}x${plan.out.h}-${Math.random().toString(36).slice(2)}.mp4`);
  return exportEditedVideo({
    source: sourceUri,
    output: out.uri,
    rotate: plan.rotate,
    crop: { x: plan.crop.x, y: plan.crop.y, w: plan.crop.w, h: plan.crop.h },
    out: plan.out,
    trim: edit.trim,
    overlay: overlayUri,
  });
}
