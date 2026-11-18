// @layer core
import { bandWhy } from '../walk/bandWords';

/*
 * Map layers (specs/map-layers, ML1, ML2): a layer puts some graphics on the base map. A layer is data: its name,
 * icon, default and legend. The panel, the store and the defaults are built from this list and never from a
 * layer's name, so adding a layer is one entry here and its drawing on the map.
 */

/** Which colour a legend row's swatch wears; the view maps these to the map's own colours (`components/map/types`). */
export type SwatchKey = 'foot' | 'car' | 'hotspot' | 'border-tint' | 'border-line' | 'past';

/** SF1, storefronts ui 2: what counts as a storefront, one sentence: the layer's tip and the line under the card's Storefronts heading. */
export const STOREFRONTS_WHAT = 'Streets lined with shops, food, drink, services and offices you walk into.';

export interface LegendRow {
  key: string;
  /** In words, never a number (ML6). */
  text: string;
  /** What it means, in a tooltip; a clause with no number (specs/walkability WK22, WK23). */
  tip?: string;
  swatch: SwatchKey;
  /** A walkability band whose icon (the pedestrian, with its badge) stands beside the swatch. */
  band?: 'foot' | 'car';
}

export interface LayerDef {
  id: string;
  name: string;
  /** An Ionicons name, chosen by the view. */
  icon: string;
  defaultOn: boolean;
  legend: readonly LegendRow[];
  /** One quiet line under the legend, in words (where the data is from, what it can't say). */
  note?: string;
}

export const LAYERS: readonly LayerDef[] = [
  {
    id: 'walkability',
    name: 'Walkability',
    icon: 'walk-outline',
    defaultOn: false,
    legend: [
      { key: 'foot', text: 'Easy on foot', swatch: 'foot', band: 'foot', tip: bandWhy('foot') ?? undefined },
      { key: 'car', text: 'Built around cars', swatch: 'car', band: 'car', tip: bandWhy('car') ?? undefined },
    ],
    note: "From OpenStreetMap and Overture. Judged from how the ground is built, so an area can read differently from how it feels.",
  },
  {
    id: 'storefronts',
    name: 'Storefronts',
    icon: 'storefront-outline',
    defaultOn: false,
    legend: [{ key: 'places', text: 'Storefronts', swatch: 'hotspot', tip: STOREFRONTS_WHAT }],
  },
  {
    id: 'borders',
    name: 'Town borders',
    icon: 'map-outline',
    defaultOn: false,
    legend: [
      { key: 'yours', text: 'Your town', swatch: 'border-tint' },
      { key: 'nearby', text: 'Nearby towns', swatch: 'border-line' },
    ],
  },
  {
    // Where I've been (specs/where-ive-been WB4, WB11; decision 0208): earlier walks' lines, one even tone, never a count.
    id: 'past',
    name: 'Where I\u2019ve been',
    icon: 'footsteps-outline',
    defaultOn: false,
    legend: [{ key: 'earlier', text: 'Your earlier walks', swatch: 'past' }],
  },
];
