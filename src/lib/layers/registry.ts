// @layer core
import { bandWhy } from '../walk/bandWords';

/*
 * Map layers (specs/map-layers, ML1, ML2): a layer puts some graphics on the base map. A layer is data: its name,
 * icon, default and legend. The panel, the store and the defaults are built from this list and never from a
 * layer's name, so adding a layer is one entry here and its drawing on the map.
 */

/** Which colour a legend row's swatch wears; the view maps these to the map's own colours (`components/map/types`). */
export type SwatchKey = 'foot' | 'car' | 'hotspot' | 'border-tint' | 'border-line' | 'past' | 'mark';

/** The maps that have a Layers panel (specs/places-layer PL9): a layer lists only on the maps it can draw on. */
export type LayerMap = 'explore' | 'navigate' | 'walk';

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
  /** The maps whose panel lists it; absent, every map (a layer is listed only where it can draw). */
  maps?: readonly LayerMap[];
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
    // Where I've been (specs/where-ive-been WB4, WB11; decision 0222): earlier walks' lines, one even tone, never a count.
    id: 'past',
    name: 'Where I\u2019ve been',
    icon: 'footsteps-outline',
    defaultOn: false,
    legend: [{ key: 'earlier', text: 'Your earlier walks', swatch: 'past' }],
  },
  {
    // Places layer (specs/places-layer PL1, decision 0230; every map since decision 0231): the "?" and dots for places worth the
    // stop, local information over the map, on by default on Explore and the ready map, off on a live walk (walkLayerDefaults).
    // Named for what it draws, never a task.
    id: 'places',
    name: 'Places',
    icon: 'help-circle-outline',
    defaultOn: true,
    legend: [{ key: 'places', text: 'A place worth the stop', swatch: 'mark' }],
  },
];

/** PL9, PL12: the layers a map's panel and key list, in the registry's order. */
export const layersFor = (map: LayerMap, layers: readonly LayerDef[] = LAYERS): readonly LayerDef[] => layers.filter((l) => !l.maps || l.maps.includes(map));
