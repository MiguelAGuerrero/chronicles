// @layer core
/**
 * iOS Safari zooms the whole page when a text field under 16 px takes focus,
 * and the app is pinned to the viewport so the zoom is hard to undo. The caption
 * is sized as a fraction of the photo's width (a narrow photo or video gives
 * under 16 px), so the field being typed into never goes below this. The bar
 * shown and baked afterwards keeps its fractional size. Pure.
 */
export const IOS_NO_ZOOM_FONT = 16;

export function typingFontSize(fontSize: number): number {
  return Math.max(fontSize, IOS_NO_ZOOM_FONT);
}
