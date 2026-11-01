import type { LngLat } from './types';

type Bounds = [number, number, number, number];
type Padding = { top: number; right: number; bottom: number; left: number };

/** maplibre's tiles are 512 px: the world is 512 * 2^zoom pixels wide. */
const WORLD_PX = 512;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/**
 * The walks list's zoom-out (motion M6, audit 7): a fit only when the padded
 * view doesn't already hold every place walked, and never closer than the
 * current zoom, so a single place never zooms in to street level and a view
 * that already shows everything is left alone. Pure: the camera is the
 * canvas's own middle (`onCameraChange`).
 */
export function zoomOutFor(o: {
  camera: { center: LngLat; zoom: number } | null;
  size: { width: number; height: number };
  padding: Padding;
  places: Bounds;
}): { bounds: Bounds; maxZoom: number | undefined } | null {
  if (!o.camera) return { bounds: o.places, maxZoom: undefined };
  const scale = (WORLD_PX * 2 ** o.camera.zoom) / (2 * Math.PI);
  const cx = o.camera.center[0];
  const cy = mercY(o.camera.center[1]);
  const x = (lon: number) => o.size.width / 2 + ((lon - cx) * Math.PI) / 180 * scale;
  const y = (lat: number) => o.size.height / 2 - (mercY(lat) - cy) * scale;
  const [w, s, e, n] = o.places;
  const inside =
    x(w) >= o.padding.left && x(e) <= o.size.width - o.padding.right && y(n) >= o.padding.top && y(s) <= o.size.height - o.padding.bottom;
  return inside ? null : { bounds: o.places, maxZoom: o.camera.zoom };
}
