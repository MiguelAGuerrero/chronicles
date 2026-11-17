# Explore subtypes: the plan

Two repos. The data side (chronicles-data, ST1-ST10, contract v4) is built and merged first, so the app pins a
contract that exists; the app's side follows on this branch. Small places (contract v3) are already on chronicles-data's
`main` (Nov 17) and reach the pack at the next weekly or hand OSM run.

## The tree (XS3, XS4)

Rows of "What I'm into", under their headings. "Data" is the archive class (contract v4) or the map's tile
class/subclass. Default on unless marked. Weight is the bar weight of the stop (SP12's scale: 1, ½, ¼).

| Heading | Kind | Subtype (row) | Data | Weight | Small |
|---|---|---|---|---|---|
| Art | Public art | | tile `art_gallery/artwork`; `sculpture` | 1 | |
| | | Statues and busts | `statue` | 1 | |
| | | Murals and mosaics | `mural` | 1 | |
| | | Fountains (off) | `fountain` (an artistic fountain is `sculpture`, the kind itself) | ½ | yes |
| | | Signs and totems | `sign` | ¼ | yes |
| History | Monuments and memorials | | `monument`, `memorial`, `historic_site`; tile `monument`, `castle/castle` | 1 | |
| | | Markers | `marker` (Wikidata; kind `markers`, PK16) | ½ | yes |
| | | Plaques (off) | `plaque` (OSM) | ¼ | yes |
| | | War memorials | `war_memorial` | 1 | |
| | | Small memorials (off) | `small_memorial` | ¼ | yes |
| | | Battlefields | `battlefield` | 1 | |
| | | Archaeological sites and rock art | `archaeological_site` | 1 | |
| | Buildings and structures | | `building_structure` | 1 | |
| | | Bridges | `bridge` | 1 | |
| | | Mills | `mill` | 1 | |
| | | Stations and depots | `station` | 1 | |
| | | Lighthouses | `lighthouse` | 1 | |
| | | Courthouses, halls and libraries | `civic_building` | 1 | |
| | | Forts and armories | `fort` | 1 | |
| | | Water and clock towers | `water_tower`, `clock_tower` | ½ | |
| | | Cannons, locomotives and old machines | `historic_machine` | ½ | |
| | | Old taverns and inns | `tavern` | 1 | |
| | | Milestones and old stones (off) | `old_stone` | ¼ | yes |
| | Places of worship | | `church`; tile `place_of_worship` by notable name | ½ | |
| | | Wayside shrines and crosses (off) | `wayside_shrine` | ¼ | yes |
| | Cemeteries | | `cemetery`; tile `cemetery` by notable name | ½ | |
| | | Mausoleums and tombs | `mausoleum` | ½ | |
| Parks & green spaces | Parks and gardens | | tile `park`, `garden` | ½ | |
| | | Community parks | refinement (PC1-PC23) | ½ | |
| | | Botanical and Japanese gardens | `garden` | 1 | |
| | | Community gardens | `community_garden` | ½ | |
| | Nature (new) | | | | |
| | | Waterfalls | `waterfall` | 1 | |
| | | Caves | `cave` | 1 | |
| | | Hot springs and geysers | `hot_spring` | 1 | |
| | | Old trees (off) | `old_tree` | ¼ | yes |
| Culture | Museums and galleries | | `museum`; tile `museum`, `art_gallery/gallery` | 1 | |
| | | Observatories and planetariums | `observatory` | 1 | |
| | Theatres | | `theatre`; tile `theatre` | 1 | |
| | | Concert halls and opera houses | `concert_hall` | 1 | |
| | Community spaces | | tile `community_centre`, `arts_centre`, `library/library` | ½ | |
| | | Little libraries | `public_bookcase` | ½ | yes |
| | | Carousels and bandstands | `carousel` | ½ | |
| Viewpoints & oddities | Viewpoints | | `overlook`, `tower`; tile `viewpoint` | ½ | |
| | | Fire lookout towers | `fire_tower` | ½ | |
| | Zoos, aquariums and attractions (new) | | `zoo`; tile `attraction/attraction`, `zoo/*` (petting zoo, wildlife and safari parks too), `aquarium`, `theme_park` | 1 | |
| | Curiosities | | `odd_engineering` | 1 | |
| | | Ruins | `ruin`; tile `castle/ruins` (kind `old_ruins`: OSM spells `ruins`) | 1 | |
| | | Ghost towns (off) | `ghost_town` | ½ | |
| | | Natural arches and rocks | `natural_oddity` | 1 | |
| | | Roadside giants and follies | `roadside_giant`, `folly`, `novelty_building`, `art_environment` | 1 | |
| | | Survey marks and centre points (off) | `marks_a_fact` | ¼ | yes |
| | | Time capsules | `time_capsule` | ¼ | yes |

"Small" keeps a subtype out of the planner, scenic Sights and the community-park rule, and lets it be named in a
passed line only when nothing else was (SP16, SP19, SP20; XS17, XS18).

## Files

| File | Change |
|---|---|
| `src/lib/discovery/types.ts` | `Kind` gains `nature`, `attractions` and the 33 subtypes |
| `src/lib/presence/presence.ts` | new classes (weights, `bar`, `storefront` for concert hall, observatory, zoo, tavern; `subset`), the archive table for contract v4, `castle/ruins` to `ruin`, zoo subclasses to `attraction`, `attraction`'s kind to `attractions`, the unnamed words (XS13); `PRESENCE_CODE` p6, nothing carried |
| `src/lib/discovery/smallPlaces.ts` → `subtypes.ts` | `SMALL_SUBSETS` becomes `SUBTYPES` (kind, parent, label, plural, single, `on`, `small`); `isSmallPlace` reads `small`; `SMALL_REFINEMENTS` → `SUBTYPE_REFINEMENTS`; the imports moved (7 files) |
| `src/lib/discovery/refinements.ts` | registry reads `SUBTYPE_REFINEMENTS` |
| `src/lib/explore/explore.ts` | `KINDS` gains `category` per row and the new rows in the table's order; `kindHint`; `parseHidden` keeps `attractions` off when `viewpoints` was off and `attractions` unknown (XS7); `DEFAULT_OFF` adds `ghost_towns` |
| `src/components/ExploreSettings.tsx` | `KindSwitches` draws a heading (`accessibilityRole="header"`) before each category's first row (XS2, XS23) |
| `src/lib/discovery/archiveMerge.ts` | unnamed twins of one category within 20 m merge (XS14); the scan indexed (`Buckets`), not `tiles × archive` (cost) |
| `src/lib/atlas/atlas.ts` | `ALL_SMALL_OFF` → every subtype left out of `steps`, re-added by `stepsShown` (XS15); `ATLAS_CODE` follows `PRESENCE_CODE` |
| `src/lib/__tests__/explore/contract/` | chronicles-data's contract v4, copied (XS3) |
| `src/lib/__tests__/presence/golden.json`, `readers.golden.json` | re-captured; the changed pairs (`castle/ruins`, `zoo/*`, `attraction`) in `CHANGED` and listed here (PR8) |
| `docs/decisions/0187-…md`, `docs/VISION.md` Precedents | the owner's calls of Nov 17 |
| `.claude/rules/subtypes.md` (renamed from `small-places.md`) | the registry, the small flag, the traps |

No storage change: `kind` is a string on checklist items and finds; kept items keep their old kind until their area is
rebuilt (E4, PW12: a new archive version rebuilds them). No SQLite migration, no IndexedDB version.

## Tests per criterion

`src/lib/__tests__/explore/subtypes.test.ts` (new): XS3-XS13, XS15-XS21. `archiveMerge` cases in
`placesArchive.test.ts`: XS14. `kindPipeline.test.ts`: XS5. The e2e: a new journey `subtypes`
(`scripts/e2e/journeys/subtypes.js`, the `curiosities` journey's archive harness) for XS1, XS2, XS6, XS22, XS23,
XS24; `small-places` journey updated for the plaque split (XS10). Every test named by its id, committed first as todos.

## Defaults to overrule

- Weights and "small" per the table (fountains ½ and small; historical markers ½ and small, steward S3; ghost towns ½).
- **Every default, row by row** (steward S7): off are Plaques, Small memorials, Milestones and old stones, Wayside
  shrines and crosses, Ghost towns, Fountains, Old trees, Survey marks and centre points (the owner's calls of Nov 14
  and 17: small things off unless truly artistic); **on by this plan's default**: Signs and totems (art), Carousels and
  bandstands (½, not small), and every other row.
- An unnamed place of any subtype never pulls a route or counts as a scenic Sight (steward S4).
- "Zoos, aquariums and attractions" keeps the word "attractions" (steward's silent question 2, rejected): it is the
  shipped wording of "Viewpoints and attractions" (RP13) and the map's own class, never a measure of popularity.
  Theme parks stay in it (silent question 1): they are already marks today, as the map's `theme_park`.
- Rows stay always expanded under an on kind (the existing PC23 behaviour); no separate collapse control.
- Headings take the categories' labels as the atlas's bars say them.
- A subtype's icon: one Ionicons outline each, chosen for the plan's review in the code (no new icon set).
- OpenStreetMap caves only with a name; gardens from OSM only as `garden:type=botanical` (data side).
- Places of worship, house museums and chapels are not split (not asked).

## The screen (goal-to-control)

| Action | Goal, how often | Control | Matrix row |
|---|---|---|---|
| Turn a subtype on or off | Shape what Explore shows; rarely, before or during a walk | A labelled switch row, as today (SwitchRow) | 13, settings switch |
| Find a subtype's row | Once per subtype | A heading per category, its kinds in fixed order, subtypes indented | 14, grouped settings (iOS Settings sections) |

Where the owner looks first: the ready bar's settings (StartSettings) and the walk's drawer, "What I'm into", as
today. The headings are ink, not muted (Found before quiet).

## Cost

- A read's places grow with the archive: an estimated 1-3 MB more pack and roughly 1.5-2× archive places in a dense US
  town. The merge was O(tiles × archive) (`archiveMerge.ts:29`); indexed by a 200 m grid it is O(n). Measured with
  `scripts/perf-explore.js` before and after.
- The settings list: about 53 rows rendered when the drawer opens; no virtualisation needed at that size (measured by
  the journey's render count, `perfCount`).
- `stepsShown` runs over about 40 subtypes per area instead of 6: per drawer change, not per frame.

## Native

Nothing native changes. The settings list renders in the same components on a phone; never run on a device
(`docs/NATIVE_UNVERIFIED.md` gets one item: the 53-row list scrolls in the walk's drawer on a phone).

## Deferred

- Mountain peaks; places of worship by tradition; house museums; the bar's breakdown by type (0183).
- Kept checklist items keep their old kind (a plaque that is now a historical marker) until their area is rebuilt.
