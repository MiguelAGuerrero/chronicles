import type { CategoryId } from './types';

export interface Category {
  id: CategoryId;
  label: string;
  /** Ionicons name. */
  icon: string;
}

/** The eight broad categories (the owner's call). The order is the picker's. */
export const CATEGORIES: readonly Category[] = [
  { id: 'art', label: 'Art', icon: 'color-palette-outline' },
  { id: 'food', label: 'Food & coffee', icon: 'cafe-outline' },
  { id: 'shops', label: 'Shops', icon: 'bag-handle-outline' },
  { id: 'history', label: 'History', icon: 'library-outline' },
  { id: 'parks', label: 'Parks', icon: 'leaf-outline' },
  { id: 'culture', label: 'Culture', icon: 'ticket-outline' },
  { id: 'viewpoints', label: 'Viewpoints', icon: 'eye-outline' },
  { id: 'nightlife', label: 'Nightlife', icon: 'wine-outline' },
];

export const categoryOf = (id: CategoryId): Category => CATEGORIES.find((c) => c.id === id)!;
