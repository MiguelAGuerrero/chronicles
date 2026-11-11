// @layer core
import type { LngLat } from '../types';
import type { Complex } from './types';

/** CX9: how a complex's outline is drawn. No fill; a hue no other layer uses; no wider or more opaque than the selected area's border. */
export const COMPLEX_STYLE = { color: '#000000', width: 0, opacity: 0, labelMinZoom: 0 };

export interface ComplexMap {
  /** One line feature per polygon ring, each with `name` and `kind` properties. */
  lines: { type: 'FeatureCollection'; features: { type: 'Feature'; geometry: { type: 'LineString'; coordinates: LngLat[] }; properties: { id: string; name: string; word: string } }[] };
  /** Names, only at close zoom: text is the name and the kind word. */
  labels: { id: string; at: LngLat; text: string }[];
}

/** CX9: the complexes of one selected area (within its reach of its point), never every area in view. */
export function inArea(_complexes: readonly Complex[], _area: { at: LngLat; reachM: number }): Complex[] {
  throw new Error('complexes: not implemented');
}

/** CX9: the selected area's complexes as outlines and, at close zoom, labels. */
export function complexMap(_complexes: readonly Complex[], _zoom: number): ComplexMap {
  throw new Error('complexes: not implemented');
}
