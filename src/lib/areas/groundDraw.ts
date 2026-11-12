// @layer core
import type { Ground } from './hoods';

/*
 * What a map draws for a selected neighborhood (HB9, HB10, HB14, HB15): one line, the same for every
 * neighborhood, carrying nothing about it. Not written yet: the tests come first.
 */

/** The line's look: one for every neighborhood, no fill, no input from the walker's walks (HB14). */
export const groundStyle = (): { color: string; width: number } => {
  throw new Error('neighborhood boundaries: not written yet');
};

/** The ground as GeoJSON lines with no properties (HB10). */
export const groundGeoJSON = (_ground: Ground | null): GeoJSON.FeatureCollection => {
  throw new Error('neighborhood boundaries: not written yet');
};
