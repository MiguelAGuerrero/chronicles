// @layer core
/**
 * How far down the Explore map's top edge sits below the screen's top: the safe-area inset on a phone,
 * where the map runs under the status bar, and nothing on web. A browser tab starts below its own
 * toolbar, yet iOS Safari still reports a status-bar inset, which pushed the title chip a whole inset
 * away from the map's corner (title-chip-corner). Pure.
 */
export function mapTopInset(safeAreaTop: number, isWeb: boolean): number {
  return isWeb ? 0 : safeAreaTop;
}
