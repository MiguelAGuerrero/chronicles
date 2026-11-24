// @layer core
import type { CategoryId } from './types';

export interface Category {
  id: CategoryId;
  /**
   * Its name, the same on every screen (tend explore T49, decision 0239): the area card's row, a tile's spoken words, How
   * the marks work, What I'm into's heading, a find's line and a pin's spoken words.
   */
  label: string;
  /** In a sentence, lower case: "a walk for green", "plenty of views"; never the name with its "&" (decision 0239). */
  noun: string;
  /** The noun is plural: "where views are concentrated", "how many shops". */
  plural?: boolean;
  /** The muted line under its heading in What I'm into (decision 0239): only the five categories that page heads. */
  line?: string;
  /** Ionicons name. */
  icon: string;
}

/** The eight broad categories (the owner's call). The order is the picker's. The one table of their names (decision 0239). */
export const CATEGORIES: readonly Category[] = [
  { id: 'art', label: 'Art', noun: 'art', line: 'Statues, murals, fountains and signs', icon: 'color-palette-outline' },
  { id: 'food', label: 'Food', noun: 'food', icon: 'cafe-outline' },
  { id: 'shops', label: 'Shops', noun: 'shops', plural: true, icon: 'bag-handle-outline' },
  { id: 'history', label: 'History', noun: 'history', line: 'Monuments, buildings, worship and cemeteries', icon: 'library-outline' },
  { id: 'parks', label: 'Green', noun: 'green', line: 'Parks, gardens and nature', icon: 'leaf-outline' },
  { id: 'culture', label: 'Culture', noun: 'culture', line: 'Museums, theatres and community spaces', icon: 'ticket-outline' },
  { id: 'viewpoints', label: 'Views & oddities', noun: 'views', plural: true, line: 'Viewpoints, attractions and curiosities', icon: 'eye-outline' },
  { id: 'nightlife', label: 'Nightlife', noun: 'nightlife', icon: 'wine-outline' },
];

export const categoryOf = (id: CategoryId): Category => CATEGORIES.find((c) => c.id === id)!;

/** A kind's noun for a sentence (decision 0239): "green", "views". */
export const nounOf = (id: CategoryId): string => categoryOf(id).noun;
/** The verb its noun takes: "green is", "views are". */
export const nounIs = (id: CategoryId): string => `${nounOf(id)} ${categoryOf(id).plural ? 'are' : 'is'}`;
