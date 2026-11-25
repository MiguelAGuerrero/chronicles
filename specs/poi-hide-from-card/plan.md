# Hide a kind of place from its card: the plan (HK1-HK10)

Built under `/tend inbox G12 yes` (`/slice poi-hide-from-card --from=G12`): read by the steward, not held for the owner.
No migration, no stored field, no dependency, no new route (the card's sheet reaches the existing `/into` page by its
one gate, with one more parameter). One derivation bump, the one G12 names: `PRESENCE_CODE` p12.

The base it lands on (`node scripts/tend.js base explore walk-screen presence`, Nov 25):

- lands on a rough base: explore (a change since its sweep added a screen or a control (db7c6ba, e51f4e9, d14f6fa))
- lands on a rough base: walk-screen (a change since its sweep added a screen or a control (264773e, 5212633, 1b4d486, 0cee290))
- lands on a rough base: presence (two above low open (the latest sweep found no high and two medium, shipped no); waits
  on the owner: Open before the loop: "`.claude/rules/presence.md` l.17 still says `ATLAS_CODE` (`a14.p4`)")

A warning only: the slice builds its own criteria and takes none of those items on.

## Files

| File | Change |
|---|---|
| `src/lib/discovery/types.ts` | `Kind` gains `clock_towers` and `water_towers`; `towers` stays in the union as a retired kind, documented: a checklist item or a find kept before p12 may carry it (HK10). |
| `src/lib/discovery/subtypes.ts` | `SUBTYPES`: "Water and clock towers" becomes two rows in its place under Buildings and structures, "Clock towers" (plural "Clock towers") and "Water towers" (plural "Water towers"), both `on`, neither small (HK9). `RETIRED`: `towers` → its label "Water and clock towers", its parent `structures`, and the kinds that replaced it. |
| `src/lib/discovery/refinements.ts` | `kindParent` reads a retired kind's parent; `isKindHidden` hides a retired kind when its parent is off or every kind that replaced it is (HK10). |
| `src/lib/presence/presence.ts` | `water_tower` → subset `water_towers`, `clock_tower` → `clock_towers` (weights, bars, categories and kinds unchanged); `PRESENCE_CODE` p12, `PRESENCE_CARRIED` empty: an atlas tally keeps each subset's share by its key, and a p11 row's `towers` share would light a bar whatever the new switches say, so every area is derived again, as at p6-p11. The fingerprint test records p12. |
| `src/lib/explore/explore.ts` | `SUBTYPE_ICON` for the two (`time-outline` for clock towers, as the shared row had; `beaker-outline` for water towers, unused elsewhere); `parseHidden`: a stored `towers` with no `clock_towers` known puts both off (HK9); `kindOf` names a retired kind by its old label (a find of one still reads "Water and clock towers", HK10). |
| `src/lib/explore/placeCard.ts` | `cardKinds(kind)`: the card's title row (the kind at the top of its chain) and subtitle row (the kind itself when it has a parent; none for a retired one), and the card's muted line "<title> · <subtitle>"; `cardMore(found)` (no More on a found card, HK5); `KINDS_SHEET_TITLE` "Show on the map". Pure; the words only from `KINDS`. |
| `src/lib/explore/intoPage.ts` | `intoAt(raw)`: a `?at=` parameter read as a kind of `KINDS`, else none; `intoScrollY(children, heights, at, headH)`: where the page scrolls so that kind's row stands just under its pinned heading, null until every row above it is measured. |
| `src/lib/intoGate.ts`, `src/lib/intoNav.ts` | `open(from, at?)`: `/into?from=walk&at=<kind>`; the gate and the detour as today. |
| `src/app/into.tsx` | Reads `at` through `intoAt` and hands it to the page. |
| `src/components/IntoPage.tsx` | `at`: once the rows above it are measured, one `scrollTo` (no animation), never again on that visit. |
| `src/components/walk/PlaceKinds.tsx` (new, view) | The sheet (`components/Modal`, as `MemoryMenu`): the head row "Show on the map" and Done (ink, 44 pt); the title row and the subtitle row, `SwitchRow`s (the title heavy, the subtitle indented, its hint "Part of …" as What I'm into's); a hairline; "What I’m into ›" (`PageRow`, as the drawer's row). Its own copy of the settings through `useExploreSettings` (null until read: no switch drawn; a failed read says so in words). A switch saves at once (`setKind`: `withKind`, `saveSettings`), which the walk hears (`onSettings`). |
| `src/app/walk.tsx` | The card's head: the name (or "A place to find") with the muted kind line under it, and More at the top right for an unfound place; `kindsFor` state opening the sheet; the sheet closing on Done, the dimmed map, Back (the Modal's `onRequestClose`) and Escape (react-native-web's Modal, only while it is up); "What I’m into ›" closes the sheet, then `openInto('walk', title kind)`; closing with the card's kind now off closes the card too (HK10). |

Thirteen source files (the entry estimated about nine: `intoGate.ts`, `intoPage.ts`, `refinements.ts` and `into.tsx`
are the parameter's and the retired kind's homes). Tests, the journey and the records are apart.

## Data

No new truth, no stored field, no migration. The settings key is the same (`explore_hidden`, `explore_kinds_known`): the
two new kinds join `KINDS`, so a save writes them as known. Cache: `PRESENCE_CODE` p12 re-derives every atlas and landing
row (as each bump since p3); the places cache keeps its classes (unchanged), and checklist items keep their kind until
their area is read under a new tile build (E4, E13), which is why a retired kind is handled at read time (HK10).
`SNAP_RULES`, `STREET_CODE`, `LANDING_CODE` and the atlas's own part are untouched; `ATLAS_CODE` and `LANDING_VERSION`
move only through `PRESENCE_CODE`.

## Tests per criterion

All in `src/lib/__tests__/explore/hideFromCard.test.ts` (feature `explore`) unless named; journey `hidekind` (new,
`scripts/e2e/journeys/hidekind.js`, feature `explore`).

| Id | Unit test | Journey check |
|---|---|---|
| HK1 | "HK1: an unfound card's muted line names its kind and its subtype, from the kinds' own names" (a plaque "Monuments and memorials · Plaques", a museum "Museums and galleries", a community park "Parks and gardens · Community parks") | "HK1: a plaque's card has More at its top right, 44 pt, in ink, spoken More, the kind line under the name" (390 and 320) |
| HK2 | "HK2: the sheet's rows are the kind as a title and its subtype as a subtitle; a kind with no subtype has its title alone" | "HK2: More opens Show on the map with Done, Monuments and memorials, Plaques indented, then What I’m into" |
| HK3 | "HK3: each switch is What I'm into's: the subtype off hides only it, the kind off hides it and its subtypes, on brings them back" (over `visibleMarks` with `withKind`) | "HK3: Plaques off takes the plaque off the map at once, the war memorial stays, the sheet up; on brings it back"; "HK3: the kind off takes the war memorial too" |
| HK4 | "HK4: a ? card's sheet and line name its kind and subtype, never the place" | "HK4: a ? card's sheet names its kind, never the place" |
| HK5 | "HK5: a found card has no More" | "HK5: a found place's card has no More" |
| HK6 | "HK6: the page opens at a kind's row: the param is read as a kind, and the scroll stands it under its heading" | "HK6: What I’m into from the sheet opens the page at Monuments and memorials, Back reads Walk" |
| HK7 | (view only) | "HK7: Done, the dimmed map and Escape each close the sheet, the card staying" |
| HK8 | "HK8: no numeral in the card's line or the sheet's words" | "HK8: no digit in the sheet; the capture row first and unchanged" |
| HK9 | "HK9: Clock towers and Water towers are two rows, both on; the shared switch off keeps both off" (and presence: `clock_tower` → `clock_towers`, `water_tower` → `water_towers`, nothing else moved) | "HK9: a clock tower's sheet turns clock towers off; the water tower's pin stays" |
| HK10 | "HK10: a tower kept before the split is shown or hidden as the old switch said, and a find of one reads Water and clock towers"; "HK10: the sheet draws no switch before the settings are read" (`kindsSheet` state from `intoBody`) | "HK10: closed with the plaque's kind off, the sheet leaves no card" |

Existing tests that pin the old table move with it, each named for its criterion: `explore/subtypes.test.ts` (the class
table: `water_tower` and `clock_tower` to their own subtypes), `explore/explore.test.ts` (the kinds' order: Clock towers,
Water towers in the place of Water and clock towers), `presence/fingerprint.test.ts` (p12's fingerprint added, p11's
kept), the p11 asserts in `presence/overtureStorefronts.test.ts` and `explore/moreAttractionsAudit.test.ts` (p11 → p12, nothing carried).

Each unit test is written first as a todo and seen failing for its reason; each made real with its code and its wiring
reverted once to see it fail.

## The testing's size

Flow (`docs/TESTING.md`, "Size the testing to the change", decision 0223): a new sheet on the walk screen and a param on
a page. Journeys: `hidekind` (new: its checks are the criteria's; about 3 minutes); `walk` (it reads the card's words,
`mark-card`, CA1-CA5 and the "?" card; about 6 minutes), `marks` (reads the card's title, RP20), `placeoffer` (opens a
card), `into` and `subtypes` (the page and its rows: the new rows at 320 px, XS22), `small-places` (`refinements.ts`), and
`launch` (the smoke). No control is removed or renamed but the "Water and clock towers" row (grep `scripts/e2e`: no
journey names `kind-towers`). About 20 minutes in all, run once at the end; the slice's own journey alone until green
first.

## Screens and actions (goal to control)

| Action | Goal, how often, situation | Control | Matrix row (`docs/research/ui-references.md` section 2) | Adjacent apps |
|---|---|---|---|---|
| Open the card's More | Stop being shown this kind; now and then, mid-walk, one hand, the card just opened | More (…) icon button, 44 pt, ink, top right of the card | 3, a rare secondary action on an item: the More (ellipsis) menu | Discover's card More, YouTube's three dots beside a title |
| Turn the kind or its subtype off or on | The same, at two levels; the switch is its own undo | `SwitchRow` (the whole row one target), as What I'm into's | 14, toggle a setting: a switch in a list row, effective immediately (outside lists a toggle button: these are list rows) | Discover's two levels ("Not interested in [Topic]" / "[Source]"); ours shows the switch itself |
| Close the sheet | Back to the map | Done (text, ink, top right), the dimmed map, Back, Escape | 23, dismiss a sheet: a button, the system Back, and 24, a quick scoped sub-task in a sheet, one at a time (S2; `MemoryMenu`'s Done) | iOS sheets' Done |
| Go to every kind | See all the switches | "What I’m into ›" (`PageRow`, the drawer's row's look) | 11, navigate to a related item: a row with a disclosure indicator | OsmAnd's Configure map |

**Where the owner looks first:** on the card of the place that prompted it, at the top right, where a moment's More and
a thread's More sit (`MemoryMenu`, `ThreadScreen`'s ellipsis). **Defaults that make a control quieter:** More is an icon
without a word (a known symbol, spoken "More", 44 pt, in ink on the page's own ground, as drawn); the kind line is muted
(it is status, not a control; ui-patterns, "Found before quiet").

**Against precedent:** Discover and YouTube act on one tap with a word ("Not interested") and keep the choice in a list
elsewhere, undone there; this sheet shows the switches themselves, which are their own undo while it is up, and the page
they live on is one row away (the owner's redraw, decision 0254). No "show less" (Never, rankings of places).

## Cost

Per open of the sheet: one read of the settings (`loadSettings`, five meta keys). Per switch: one save and the walk's
`onSettings`, which already recomputes `visibleMarks` over the checklist (n: the items of the areas read, hundreds;
nothing new per fix or per frame). The page's scroll: one `scrollTo` after layout. p12's re-derivation of every atlas and
landing row on first open is the cost every presence bump has had (`docs/DEFERRED.md` names none open for it). No harness
needed: nothing runs per fix or per frame that did not.

## The judgment calls (for the steward)

1. **The "?" card's muted line** (HK1): criterion 1 reads "an unfound place's card", so the "?" card gets the kind line
   too ("A place to find" over "Monuments and memorials · Plaques"). Its pin already speaks its category ("History"), and
   HK4's sheet names kind and subtype; the drawing's older Unnamed board had no line. The name is never said (E7).
2. **The subtitle row with its kind off** (HK3): What I'm into hides a subtype's row while its kind is off; the sheet keeps
   it, off and dimmed (`kindSwitch`'s `locked`), so the sheet never jumps under the thumb and the kind's own row is the
   one way back.
3. **The card after its kind goes** (HK10): the pin leaves the map at once, the card waits under the dimmed sheet, and
   closing the sheet with the card's own kind off closes the card too; with it back on, the card stays.
4. **"At that kind's row"** (HK6): the page scrolls to the title row's kind (Monuments and memorials), its subtypes under
   it, not to the subtype's row.
5. **A retired `towers`** (HK10): read as Buildings and structures alone on the card and in the sheet (no subtitle row,
   whose switch no longer exists), hidden when both new switches are off or its parent is; a find keeps its old words.
6. **Water towers' icon**: `beaker-outline` (no Ionicons glyph is a water tower; the clock keeps `time-outline`).
7. **The failed read** (HK10): "Your choices couldn’t be read just now." in the sheet, What I'm into's row still there.

## Deferred

Nothing of G12's criteria. "Not this one" and "Show less like this" stay out (the owner, decision 0254).

## Native

No native module. Never run on a phone: the Modal sheet over the walk map with a card up, its switches acting under it,
Back on Android closing it, VoiceOver's "More" and the switches' hints, and What I'm into's scroll to a row
(`docs/NATIVE_UNVERIFIED.md`, one item each in "Map, walk screen and motion polish").
