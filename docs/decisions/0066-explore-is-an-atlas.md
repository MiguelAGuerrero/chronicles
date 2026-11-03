# 0066. Explore is an atlas of the areas near you

Date: 2026-11-03 · Status: accepted · Area: explore, tabs

## Context
The Explore tab was a lens over the map. It showed the same "?" marks and busy streets that a walk already shows, so it didn't justify a tab of its own. The owner wanted a structure for "what's available to me, how do I browse it, and later how do I plan for it", like a mission select. A first mock had swipeable area cards with a petal glyph. An adversarial review found five problems:
- it named unfound places;
- it drew neighborhood borders the data doesn't have;
- its encoding was redundant;
- its tiers read like ratings;
- swiping didn't scale.

A second mock answered these with a grid of same-scale mini-maps.

## Decision
- Explore lists the neighborhoods (or towns) near you as a grid of tiles, nearest first, under a small map.
- Each tile shows the same 800 m ring at the same scale, and eight kinds with 0 to 3 bars.
- A tile opens the area's card.
- Rings are read by themselves while the tab is open.
- The bars show **presence, not quality**: they come from fixed steps per kind over the same ring in every area, never relative to the neighbors. The steps are named in "How bars count".
- **Familiarity is the only progress**: "New to you", "Walked once", "Walked N times".
- Unfound places are never named; a "?" shows their kind.

The owner said to proceed with reasonable defaults for the open items:
- a town's bars describe the ring around its point;
- the steps are shown as an explanation;
- tiles show the mini-map, not your photos;
- Keep (planning) is left out;
- the long press keeps What's good here and Walk here.

## Consequences
- Food, shops and nightlife now show as an area's character on the tab. They are still never marks (0044).
- Busy streets stay information only (0034): chips and magenta lines on the card and the pictures.
- A new derived store, `atlas_area` (SQLite migration 15, IndexedDB v13), is cleared with the other derived stores.
- The app gains react-native-svg for the mini-maps.
- Green counts park places until the decoder reads park outlines.
- The drawer's "?" marks and finds on the tab's map are gone. The finds moved onto the cards.
