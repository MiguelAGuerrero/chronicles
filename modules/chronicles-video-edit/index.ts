// The JS face of the local native module `ChroniclesVideoEdit` (ios/, android/).
// It renders an edited copy of a video to MP4. Never compiled or run on a device:
// see README.md and docs/NATIVE_UNVERIFIED.md.
//
// requireOptionalNativeModule returns null where the module isn't linked (web,
// Expo Go, a build made before this module existed), so importing this file never
// crashes; isAvailable() is false there and exportEditedVideo rejects.
import { requireOptionalNativeModule } from 'expo';

export interface VideoExportInput {
  /** file:// URI of the original video. */
  source: string;
  /** file:// URI to write (in the cache dir); overwritten if present. */
  output: string;
  /** Clockwise, applied after the source's own orientation has made it upright. */
  rotate: 0 | 90 | 180 | 270;
  /** Pixels, in the upright-then-rotated frame. */
  crop: { x: number; y: number; w: number; h: number };
  /** Output size in pixels (even numbers); the crop is scaled to exactly this. */
  out: { w: number; h: number };
  /** null = the whole clip. */
  trim: { start_ms: number; end_ms: number } | null;
  /** file:// URI of a transparent PNG exactly out.w x out.h drawn over every frame, or null. */
  overlay: string | null;
}

export interface AudioTrimInput {
  /** file:// URI of the recording. */
  source: string;
  /** file:// URI to write (in the cache dir); overwritten if present. */
  output: string;
  start_ms: number;
  end_ms: number;
}

interface NativeVideoEdit {
  exportEditedVideo(input: VideoExportInput): Promise<string>;
  exportTrimmedAudio(input: AudioTrimInput): Promise<string>;
}

const native = requireOptionalNativeModule<NativeVideoEdit>('ChroniclesVideoEdit');

/** False where the native module isn't linked (web, Expo Go). */
export function isAvailable(): boolean {
  return native != null;
}

/**
 * Renders the edited copy and resolves the output URI. Rejects with a message on
 * failure; the native side deletes any partial output first.
 */
export async function exportEditedVideo(input: VideoExportInput): Promise<string> {
  if (native == null) {
    throw new Error('Video editing is not available on this platform (the ChroniclesVideoEdit native module is not linked).');
  }
  return native.exportEditedVideo(input);
}

/**
 * Writes a copy of a recording's kept part as an audio-only file and resolves its URI (memo transcripts, TX13): the
 * speech recognizer reads it, and the caller deletes it. Rejects where the module isn't linked.
 */
export async function exportTrimmedAudio(input: AudioTrimInput): Promise<string> {
  if (native == null) {
    throw new Error('Audio trimming is not available on this platform (the ChroniclesVideoEdit native module is not linked).');
  }
  return native.exportTrimmedAudio(input);
}
