// @layer shell
import type { ShopMarksStatus } from '../layers/notes';
import { createStore } from '../store';

/**
 * What the shop marks are doing, for the Layers panel's one line (SM7). A store of its own, read by the panel alone, so a read that
 * finishes re-renders the panel and not the screen under it (explore-dense-city DC12, the render budget: Explore may render twice
 * for a switch, and the first read lands inside one).
 */
export const shopMarksStatus = createStore<ShopMarksStatus | null>(null);
