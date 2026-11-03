import type { CategoryId } from '../../lib/discovery/types';
import { CATEGORIES } from '../../lib/discovery/categories';
import type { IconName } from '../icons';

/** One hue per kind for the atlas's bars and marks: each 3:1 or more on white (WCAG 1.4.11). */
export const KIND_COLOR: Record<CategoryId, string> = {
  history: '#8b5e34',
  art: '#6d4bc4',
  culture: '#2f6f8f',
  parks: '#3f7d3a',
  viewpoints: '#946405',
  food: '#c4501f',
  shops: '#a33d5c',
  nightlife: '#3b3f8f',
};

export const KIND_ICON_OF: Record<CategoryId, IconName> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.icon])) as Record<CategoryId, IconName>;

/** The mini-maps' ground, streets and parks: quiet, so the kinds and your walks read on top. */
export const SKETCH_COLORS = { land: '#ece9e3', road: '#d3cec5', park: '#cfe3c4', veil: '#f4f2ee', ring: '#8a857d' } as const;
