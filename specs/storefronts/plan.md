# Storefronts: the plan

The owner said go straight through (Nov 14): this plan is the record, not a stop.

## Files

**Presence (SF10, SF11)**
- `src/lib/presence/presence.ts`: each `ClassDef` gains `storefront?: true`; `storefrontWeight(classes)` is the greatest weight among storefront classes. `PRESENCE_CODE` p3, `PRESENCE_CARRIED` emptied (a weight changes). `densityWeight` stays for complexes (CX's shopping word).
- `src/lib/activity/weights.ts`: `osmWeight` and `overtureWeight` read `storefrontWeight`. Every density reader (`activity/points.ts`: the layer, What's good here?, a town's pockets, the atlas's strips, the route leaning) follows.

**Words (SF1-SF9)**
- `layers/registry.ts`: id `storefronts`, name, legend and tip.
- `components/atlas/AtlasCard.tsx`: one "Storefronts" section, one list of rows; `atlas/atlas.ts`: `storefrontsOf(area, from)` (a graded town's pockets and the profile's strips, each once, nearest first, ties by name), `walkViaLine`; `tileLabel`, `WHOLE_TOWN_LINE`, the via line. `atlas/profile.ts` keeps each strip's peak (`stripPeaks`), so the list can be ordered by distance; `ATLAS_OWN` a13.
- `atlas/look.ts` and `landing/analyze.ts`: the density reason "Where storefronts gather", the pocket's fallback name.
- `app/walk.tsx`: the help line. `components/RouteLeaningSettings.tsx`, `nav/scenic.ts`: the leaning `storefronts`, its label, note and title.

**Saved choices (SF12)**: `layers/state.ts` `decodeLayers` reads a saved `busy` as `storefronts`; `nav/scenic.ts` `leaningsIn` reads `busy` as `storefronts` (used by `routeLeanings` and `nav/store`). No schema change: both are JSON in meta, read through these functions; the next save writes the new word.

**Names (SF13)**: `layers/busy.ts` → `layers/storefronts.ts`, `useBusyLayer` → `useStorefrontsLayer`, `landing/names.ts`'s `busyNames` → `storefrontNames`, the map's `busy-names*` layers → `storefront-names*`, the `busyNames*` props, carousel helpers, layer notes, scenic signals (`storefronts`, `StorefrontLine`, `SCENIC.storefrontM`), the analysis's `busyMinM`, test ids (`atlas-storefronts`, `atlas-storefront`, `atlas-storefront-walk`, `layer-*-storefronts`), the web map's e2e hooks (`data-storefronts*`, `__storefrontNamesIn`, `__storefrontNamePoint`) and perf counters (`storefronts:list|read|worker`, `storefront-names:clear`). Tests and journeys follow; `scripts/perf-*.js` read the new counters. Test files `busyRead`, `busyNames*` are renamed.

**Docs (SF14)**: a line "Amended by specs/storefronts (SF…)" in decisions 0080 and 0127 and in the shipped specs that pin the old words: activity-density, explore-carousel, free-look, scenic-routes, complexes, v1.5-landing, explore-dense-city, town-presence, explore-atlas, map-layers. Decision 0180 records the owner's two calls. `.claude/rules` lines naming the old identifiers follow.

## Data

No new truth, no schema change. Cache: landing rows (`LANDING_VERSION` holds `PRESENCE_CODE`) and atlas rows (`ATLAS_CODE` a13.p3) are re-derived by the code change, as presence's rule says.

## Tests (feature: layers, where the spec is listed)

| Id | Test |
|---|---|
| SF1 | `layers/storefronts.test.ts` `SF1: the layer is named Storefronts …`; e2e `layers` checks the panel's row |
| SF2 | `explore/atlas.test.ts` `SF2: …` (`storefrontsOf`); e2e `atlas` checks the heading |
| SF3 | `explore/atlas.test.ts` `SF3: nearest you first …` |
| SF4 | `explore/atlas.test.ts` `SF4: …` (`walkViaLine`) |
| SF5 | `explore/look.test.ts` `SF5: …` (`runLook`'s line, the analysis's reason) |
| SF6 | `landing/landing.test.ts` `SF6: …` |
| SF7 | `explore/atlas.test.ts` `SF7: …` (tile line, town line), `layers/storefronts.test.ts` for the help line source |
| SF8 | `navigation/storefronts.test.ts` and `navigation/scenic.test.ts` `SF8: …` |
| SF9 | `layers/storefronts.test.ts` `SF9: …` (a guard over the app's strings) |
| SF10 | `presence/storefronts.test.ts` `SF10: …` |
| SF11 | `presence/storefronts.test.ts` `SF11: …` |
| SF12 | `layers/storefronts.test.ts` and `navigation/storefronts.test.ts` `SF12: …` (decode, `routeLeanings.load`, nav store load over `fakePorts`) |
| SF13 | `layers/storefronts.test.ts` `SF13: …` (a guard over `src/`, the other meanings allowed by pattern) |
| SF14 | `layers/storefronts.test.ts` `SF14: …` (the docs carry the line) |

## Screens, goals and controls

- **Layers panel** (Explore, the walk, Navigate): goal "see where the shops are", occasional, before or while walking; the control is the existing layer switch, now worded Storefronts (matrix row "toggle an overlay": a switch row in a sheet). Where the owner looks first: the map's layers button; they see "Storefronts" with the storefront icon. Nothing quieter than before.
- **Area card**: goal "where are the shops in this area, and walk there", occasional; the rows' Walk to: no matrix row of its own (the nearest, 11, is navigating to a related item); it keeps the card's existing row pattern (the complexes' rows, CX4), a trailing text button. Where they look: the card, under the kinds; one "Storefronts" heading. Default taken: one section instead of two.
- **Walk settings, Scenic routes**: goal "lean my route along the shops"; the switch row, now "Storefronts". Default taken: the label changes from "Streets with life".

## Deferred

- The pocket alert and Navigate's line may say the same word (G2's "After it"): nothing there says busy today, so nothing to do.
- Walk to's start and the tile's street stay the one with the most storefronts (AT8); only the words change.

## Native

No native module changes. `WalkMap.native.tsx` renames its layer ids and props only; never run on a device (the map's names were already unverified there, DC16).

## Steward (Nov 14), triaged

- **S1 accepted** into SF8: a storefronts route named its streets highest grade first (`passesOf`); now in the order passed.
- **S2 accepted** into SF2: the card's rows and chips were two tiers; now one list, nearest first, each row with Walk to where walkable.
- **S3 rejected, then taken by the owner**: G2 (point 4) kept the title, so it was filed; the owner chose "What's here?" the same day (SF15).
- **S4 accepted** into SF1: the tip names offices too, since they still weigh.
- Silent 1 (offices): kept, as the owner's list of what stops counting left them; a default in the spec. Silent 2 (Walk to's start and the tile's street are the one with the most storefronts): a default in the spec, the words never say so.
