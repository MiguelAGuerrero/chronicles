import type { CategoryId } from './types';

export interface Category {
  id: CategoryId;
  label: string;
  /** In a sentence: "2 food & drink · 1 art". */
  noun: string;
  /** Ionicons name. */
  icon: string;
}

/** The eight broad categories (the owner's call). The order is the picker's. */
export const CATEGORIES: readonly Category[] = [
  { id: 'art', label: 'Art', noun: 'art', icon: 'color-palette-outline' },
  { id: 'food', label: 'Food & drink', noun: 'food & drink', icon: 'cafe-outline' },
  { id: 'shops', label: 'Shops', noun: 'shops', icon: 'bag-handle-outline' },
  { id: 'history', label: 'History & landmarks', noun: 'history', icon: 'library-outline' },
  { id: 'parks', label: 'Parks & green spaces', noun: 'parks', icon: 'leaf-outline' },
  { id: 'culture', label: 'Culture', noun: 'culture', icon: 'ticket-outline' },
  { id: 'viewpoints', label: 'Viewpoints & oddities', noun: 'viewpoints', icon: 'eye-outline' },
  { id: 'nightlife', label: 'Nightlife', noun: 'nightlife', icon: 'wine-outline' },
];

export const categoryOf = (id: CategoryId): Category => CATEGORIES.find((c) => c.id === id)!;
