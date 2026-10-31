import type { LngLat } from '../types';

export type CategoryId =
  | 'art' | 'food' | 'shops' | 'history' | 'parks' | 'culture' | 'viewpoints' | 'nightlife';

/** A place worth offering, from whatever source; cache, tagged with the build it came from. */
export interface Place {
  /** category + normalized name + position rounded to 4 decimals (`placeKey`). */
  key: string;
  name: string;
  category: CategoryId;
  at: LngLat;
  /** Unnamed art or viewpoint, shown with a generic label. */
  generic: boolean;
  build: string;
  /**
   * False for a place that counts toward busy streets but is never a mark
   * (S19, S20): a cinema, a dog park, a church without a notable name.
   * Missing on rows cached before it: judged by category alone.
   */
  markable?: boolean;
}

/** Truth: a place the app has offered. Never cleared. */
export interface Offered {
  key: string;
  name: string;
  category: CategoryId;
  at: LngLat;
  generic: boolean;
  offered_at: number;
  origin: MarkOrigin;
}

export type MarkOrigin = 'scan' | 'ambient';
export type MarkState = 'open' | 'found' | 'dismissed' | 'replaced';

/** Truth: a mark offered on (or before) a walk. The place is a snapshot, so a cache purge leaves it whole. */
export interface Mark {
  id: string;
  /** Null when scanned from the home; the next walk adopts it. */
  walk_id: string | null;
  key: string;
  name: string;
  category: CategoryId;
  at: LngLat;
  generic: boolean;
  origin: MarkOrigin;
  state: MarkState;
  created_at: number;
  resolved_at: number | null;
  capture_id: string | null;
}

export type RecallFrequency = 'once' | 'visit' | 'weekly' | 'monthly';

/** Truth: "remind me here" on a capture. */
export interface Recall {
  capture_id: string;
  frequency: RecallFrequency;
  until: number | null;
  last_fired_at: number | null;
  fired_count: number;
  /** The walk it last fired in: at most once per walk. */
  last_walk_id: string | null;
}

/** Where places come from: map tiles first; a richer source plugs in later. */
export interface PlaceSource {
  placesIn(bounds: [number, number, number, number]): Promise<Place[]>;
}
