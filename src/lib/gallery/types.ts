// @layer core
/**
 * Media gallery (specs/media-gallery): the shapes the gallery's core and shell share. Types only.
 */

/** Which kinds show (MG9): every photo, video and memo piece, or one kind. Notes never show. */
export type Show = 'all' | 'photo' | 'video' | 'voice';
/** The Sort (MG18). */
export type Order = 'newest' | 'oldest';
/** Years, Months or Days (MG19). */
export type Zoom = 'years' | 'months' | 'days';
/** The tile size in Days (MG20): 0 the largest, 2 the smallest. */
export type Size = 0 | 1 | 2;
/** Square Photo Grid or Aspect Ratio Grid (MG21). */
export type Shape = 'square' | 'aspect';

/** What is kept on the device (MG22). */
export interface GalleryView {
  order: Order;
  size: Size;
  shape: Shape;
}
