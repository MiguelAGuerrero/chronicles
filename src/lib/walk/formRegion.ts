// @layer core
import type { LngLat } from '../types';

/*
 * Where the place-form line may show (specs/place-form PF18, the owner's default 2026-11-11): the northeastern United States, which is where the real places
 * the rule was learned from and held to are (Pennsylvania, and its neighbours from Ohio to Maine). Elsewhere the rule is unmeasured, so it says nothing. A coarse
 * outline, not a border: it keeps Toronto, Montreal and Ottawa out and everything the fixtures cover in. Pure.
 */

/** Longitude and latitude, clockwise from the south-west. */
export const FORM_REGION: readonly LngLat[] = [
  [-81.8, 38.3], [-81.8, 41.3], [-80.3, 42.0], [-79.0, 42.95], [-79.2, 43.35], [-76.6, 43.6], [-76.2, 44.2], [-75.2, 44.9],
  [-73.3, 45.05], [-71.5, 45.05], [-70.2, 46.1], [-67.0, 46.1], [-66.9, 45.0], [-66.9, 38.3],
];

/** Whether a point lies inside the outline (ray casting). */
export function inFormRegion([lon, lat]: LngLat): boolean {
  let inside = false;
  for (let i = 0, j = FORM_REGION.length - 1; i < FORM_REGION.length; j = i++) {
    const [xi, yi] = FORM_REGION[i];
    const [xj, yj] = FORM_REGION[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
