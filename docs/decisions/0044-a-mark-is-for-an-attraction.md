# 0044. A mark is for an attraction

Date: 2026-11-02 · Status: accepted · Area: explore, discovery

## Context
The owner's call, Nov 2: scans kept offering food, bars and a Domino's.

## Decision
A mark is for an attraction. The ordinary activity of an area shows as its busy streets instead. `MARK_CATEGORIES` (`discovery/noise.ts`): art, history, parks, culture, viewpoints. Food, shops and nightlife stay in the place cache only to feed the landing's density.

## Consequences
- `discovery/tilePois.ts` sets `markable` per place. Cinemas, dog parks and picnic sites are never marks. Places of worship, town halls, courthouses, cemeteries and libraries are marks only when the name holds a word from `notable.json` (whole words after `normalizeBrand`).
- Chains (`chains.json`, per category, whole leading words) are never marks. Food courts are dropped in `tilePois`.
- `isMarkable` gates what goes on a checklist. A row without `markable` (cached before it) is not a mark until read again.
- SQLite migration 8 adds the column (`db/placeRow.ts` maps it); IndexedDB stores the whole object.
