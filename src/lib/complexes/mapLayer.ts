// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { kindWord } from './lines';
import type { Complex } from './types';

/**
 * CX9: how a complex's outline is drawn. No fill; a hue no other layer or kind uses (a deep plum); no wider and no more opaque than the
 * selected area's border (`BORDER`: 3 and 0.9); named only from a close zoom.
 */
export const COMPLEX_STYLE = { color: '#4a044e', width: 2, opacity: 0.8, labelMinZoom: 15 } as const;

export interface ComplexMap {
  /** One line feature per ring, each with its id, name and kind word only. */
  lines: { type: 'FeatureCollection'; features: { type: 'Feature'; geometry: { type: 'LineString'; coordinates: LngLat[] }; properties: { id: string; name: string; word: string } }[] };
  /** Names, only at close zoom: the text is the name and the kind word. */
  labels: { id: string; at: LngLat; text: string }[];
}

/** CX9: the complexes of one selected area (within its reach of its point), never every area in view. */
export const inArea = (complexes: readonly Complex[], area: { at: LngLat; reachM: number }): Complex[] => complexes.filter((c) => distanceM(area.at, c.at) <= area.reachM);

/** CX9: the selected area's complexes as outlines and, at close zoom, labels. */
export function complexMap(complexes: readonly Complex[], zoom: number): ComplexMap {
  const features = complexes.flatMap((c) =>
    c.polygons.flatMap((rings) => rings.map((ring) => ({ type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: ring.map((p) => [p[0], p[1]] as LngLat) }, properties: { id: c.id, name: c.name, word: kindWord(c.kind) } }))),
  );
  const labels = zoom >= COMPLEX_STYLE.labelMinZoom ? complexes.map((c) => ({ id: c.id, at: c.at, text: `${c.name} · ${kindWord(c.kind)}` })) : [];
  return { lines: { type: 'FeatureCollection', features }, labels };
}
