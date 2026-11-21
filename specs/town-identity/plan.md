# Town identity: the plan

For the owner's review before any code (`/slice` step 3). Spec: `specs/town-identity/spec.md` (TI1-TI10).
Branch `slice/town-identity`, from `fix/duplicate-city` (6ba318c), whose distance join this replaces.

## Why the row showed Philadelphia twice (measured Nov 20, Overture 2026-11-18.0)

The town near read (`readNear(..., 'town')`, `atlas/readShell.ts`) fetches the z11 place points within 12 km and the
z12 border tiles under you only (`outlines.read([at])`). `withOutlines` (`areas/outlines.ts`) joins a label whose own
tile was not read to a border only within 3 km of the piece read; City Hall is up to 6 km from the piece read from
West or South Philadelphia, so the border became a second "Philadelphia" at the middle of the piece. Rows are merged
only by name within 3 km (`SAME_M`), so both were listed. A grid of spots 2 km apart over the city, run through the
app's own decoder, listed two cards from 10 of them.

## How

1. **Decide by the border under the label (TI2, TI3, TI6).** After the first `withOutlines`, the read collects the
   town labels that share a name with a border in the set and whose own tile was not read, reads the border tiles
   under them (`outlines.read`, at most 12, kept in `outline_tile` as every border tile is), and joins again with the
   bigger set. A label inside its border is joined by containment, at any distance; a label outside it is a town of
   its own. The fix branch's `townJoinM` and `withOutlines`' `joinM` are removed: no distance decides it, for a city
   or a town.
2. **A town row keeps its border's identity (TI5).** `AtlasArea` gains `outline_id` (Overture's `division_id`, or
   null for a town with no border) and `point_from` (`'map'` for the map's label, `'outline'` for a point taken from the
   border). `newRows` and `nearList` take two town rows with one `outline_id` for one town; of them the row at the
   map's label is shown (its distance is to the label), else the first listed.
3. **Your town is always in the row (TI4).** The read keeps a candidate whose border holds you whatever its distance;
   `nearList` keeps a row beyond 12 km when its `outline_id` is the border holding you (from the borders kept under
   you, as `townOf` reads them today).
4. **"You're here" by identity (TI3, TI4).** `townOf` joins each row to the border of its `outline_id` first, then
   `withOutlines` as today for rows without one; the smallest border holding you wins (TO1), so of two same-named
   cities the one whose border holds you is here.
5. **The rows listed before are listed again (TI7).** `ATLAS_OWN` a16 (from the fix branch) stays: town rows and near
   reads of a15 are read again; neighborhood rows of a15 are carried (`CARRIED`). A test holds the carried code to the
   one just before `ATLAS_OWN`, so the next bump must decide its own carry (the review's F5).
6. **Placing is untouched (TI8).** `areas/assign.ts` keeps the 3 km join; `AREA_RULES` is unchanged; `familiarity` is
   unchanged (by name within 3 km of the card's point).

## Files

- `src/lib/areas/outlines.ts`: `withOutlines` back to its one join (the fix branch's `joinM` removed); a pure helper
  listing the labels whose border tile to read (`labelsToRead`).
- `src/lib/atlas/readShell.ts`: the second border read and join; candidates carry `outline_id` and `point_from` into
  `newRows`; your town kept past the reach.
- `src/lib/atlas/atlas.ts`: `AtlasArea`'s two fields; `newRows`, `nearList`, `townOf`; `townJoinM`
  removed; the carry's comment put right (F6).
- `src/lib/db/migrations.ts`: migration 31.
- `src/lib/db/sqliteStore.ts`: `putAtlasAreas` and `listAtlasAreas` write and read the two columns.
- `scripts/features.js`: `IN_PROGRESS`, and `town-identity` in the explore feature's specs.

Six source files. No screen file: the row draws what `nearList` gives it.

## Data

- **Cache, not truth.** `atlas_area` is in `DERIVED_STORES`; `purgeDerived` clears the new fields with the rows.
- **SQLite migration 31:** `ALTER TABLE atlas_area ADD COLUMN outline_id TEXT; ALTER TABLE atlas_area ADD COLUMN
  point_from TEXT;` A row from before reads back with both null.
- **IndexedDB:** no version bump. `atlas_area` keeps each row whole (`keyPath: 'key'`, no index on the fields), as
  `outline_tile` keeps `hoods` (HB, migration 26 with no IndexedDB step).
- **Contract:** FC7's atlas case gains a round trip of both fields and of a row without them, over the fake,
  IndexedDB and SQLite (`node:sqlite`).

## Tests per criterion (`src/lib/__tests__/explore/townIdentity.test.ts` unless named)

| Id | Test |
|---|---|
| TI1 | `TI1: Philadelphia from every spot of the grid is one card` over a fixture of Overture's real tiles (`philadelphiaOutlines.json`, `scripts/fixture-outlines.mjs`, names "Philadelphia" only, the z12 tiles of the grid and of City Hall), the read over `fakePorts()`, then `nearList` |
| TI2 | `TI2: a label 9 km from the piece read, inside its border, is joined; one outside it is not` (shell, the read) |
| TI3 | `TI3: two same-named cities, you in A's border and B's label nearer: two cards, A here` |
| TI4 | `TI4: your town's label past the 12 km read: it is listed, first and here` (read and `nearList`) |
| TI5 | `TI5: a border-only row and a label row of one border are one card, at the label` (two reads at two spots, then `nearList`) |
| TI6 | `TI6: a town-class label 5 km from the piece, inside its border: one card` |
| TI7 | `TI7: a15 town rows are read again, a15 neighborhood rows stand, and the carry is the code just before ATLAS_OWN` |
| TI8 | `TI8: placing joins as before, AREA_RULES is unchanged, and familiarity counts the same walks` (`places/`) |
| TI9 | `TI9: the second read asks only for same-named labels' tiles, at most 12, and none when every label's tile was read` (shell, the fake outlines' calls) |
| TI10 | `FC7 putAtlasAreas, listAtlasAreas: a town row's border identity round-trips; a row without one reads back with none` (`dbContract.ts`) and `TI10: purgeDerived clears the rows` |

The fix branch's `cityTwice.test.ts` (`fix duplicate-city` 1-4) is folded into these: its distance cases no longer
hold, and TI2-TI6 replace them. The six tests whose code literal moved to a16 stay as the fix branch left them.

## Testing's size

**Flow** (`docs/TESTING.md`, decision 0223): what the screen stores and reads back. Journeys: `carousel` (the row of
towns) and `atlas` (the tab), once each at the end, about 2-3 minutes each (not in the measured table; estimated).
The e2e world has no town borders, so they prove the row is unchanged where there is nothing to merge; the merging is
the unit tests'. No new journey: no screen changes.

## Deferred

- **Which walks a town's card counts** (the review's F7, the steward's S1-S3): `familiarity` still matches the home's
  town areas by name within 3 km of the card's point, and placing still puts a town area's point where the walk's town
  was decided (the label, or the middle of a border piece), so a walk far from City Hall can leave Philadelphia's card
  "New to you". Widening the distance would count Kansas City, Kansas's walks on Missouri's card (S1); the true rule is
  the card's border (the area's point inside it), with placing keeping the identity on `Area`, which changes the
  placing rules (`AREA_RULES`) and places every walk again. A slice of its own if you want it (`docs/DEFERRED.md`).
- **A border-only town's point** (a town with no label, Whitehall): still the middle of the piece read when Overture's
  own point is in a tile not read; its distance on the card is to that point, as today.

## Native, never run on a device

Migration 31 on SQLite and the two columns' write and read (`sqliteStore.ts`). `node:sqlite` runs them under
`npm test`; a phone has not. An item in `docs/NATIVE_UNVERIFIED.md`: Do: open Explore after the update, near a city
read before; Expect: the row lists it once, and a reload keeps it once.

## Cost

- **Reads:** the town read, on arrival and after moving 1 km, adds at most 12 z12 border tiles, typically 0-2 (the
  labels sharing a name with a border read), each read once ever and kept (`outline_tile`). Every town row is listed
  and its ring read again once, as on any tile build or code change (a16).
- **Per render:** `nearList` and `townOf` over at most 12 rows and a few borders: unchanged order; the identity is a
  string compare. Nothing per frame or per fix.
- **Harness:** `scripts/perf-explore.js` reads a dense city with no borders in its world; no number moves. Device only
  for the border reads' time on a phone.

## Screens

No action is added, moved or reworded: the row draws fewer cards where it drew a duplicate, and the card for your town
leads it as TO10 says. No goal-to-control line; nothing for you to look for.

## Against precedent

None: Nominatim and Overture both hold a town and its label as one by identity, which is this.

## The steward's review (Nov 20)

- **S1 accepted** (TI8 by name within a city's 10 km would credit Kansas City, Kansas's walks to Missouri's card): TI8 is
  out of the slice; the card counts the same walks as before (the new TI8), deferred with placing by identity.
- **S2 accepted** (TI8's "wherever in it" untestable as planned): gone with TI8.
- **S3 accepted** (the Vision block missed TI8's word count): gone with TI8; the block's "Open" says what was left out.
- **Silent 1, for you:** a town card's "Walked 23 times" is a digit that climbs; 0052 allows a number in a clause, the
  Never row's nearest fit is "you walked there often". Not this slice's line; worth a call of its own.
- **Silent 2, for you:** your town's card when its label is past 12 km says "You're here" and a long walk to the
  label, as a card for your town does today. Kept as it is unless you say otherwise.

## Risks

- Two sessions are in flight on Explore (`claude/determined-wright-yg1fq9`: town fixtures, shop facets, the drive;
  `claude/trusting-cannon-f5wdhg`: smooth switches). This clone shares no history with them, so their diffs to
  `atlas.ts`, `readShell.ts` and `migrations.ts` could not be read; a migration of theirs would take number 31 first,
  and a later merge renumbers ours (never edits theirs).
