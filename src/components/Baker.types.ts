import type { ExportPlan, MediaEdit } from '../lib/mediaEdit';

/** What a bake draws over the picture. */
export interface BakeJob {
  edit: MediaEdit | null;
  caption: string | null;
  captionY: number | null;
}

/** Caps for the output: by width (a saved photo on a phone) or by the long side (a small copy). */
export interface BakeOpts {
  maxW?: number;
  maxLong?: number;
}

export interface Baker {
  /** The photo with its edits and caption, as a new JPEG (a temp file or a Blob URL); `dropBaked` it after. */
  bake(uri: string, job: BakeJob, opts?: BakeOpts): Promise<string>;
  /** The lines and caption alone on a clear PNG of the plan's output size; null when there are none. */
  bakeOverlay(src: { w: number; h: number }, job: BakeJob, plan: ExportPlan): Promise<string | null>;
}
