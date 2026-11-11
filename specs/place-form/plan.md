# Place form: plan (for the owner's review before any code)

Spec: `specs/place-form/spec.md` (PF1-PF20). Gate: aligned if reshaped, 2026-11-11 (the spec's Vision section). The probe this plan stands on is in the
session record (six places on Overture release 2026-10-21.0: Allentown downtown, Hamburg, Jonestown, Fredericksburg, Bethel's interchange,
Friedensburg).

## What the probe found (800 m around each place's point)

| Place | Cells (foot / neither / car) | Junctions per km² | Highway share | Counted places | Stretch (streets) |
|---|---|---|---|---|---|
| Allentown downtown | all foot | 58 | 0 | 756 | 1.15 |
| Hamburg | 4 / 17 / 11 | 46 | 0.12 | 175 | 1.55 |
| Jonestown | 0 / 11 / 22 | 39 | 0 | 47 | 1.13 |
| Fredericksburg | 0 / 0 / 31 | 17 | 0 | 44 | 1.65 |
| Bethel (interchange) | 0 / 0 / 32 | 13 | 0.76 (motorway and trunk) | 30 | 1.93 |
| Friedensburg | 0 / 0 / 33 | 17 | 0 | 18 | 2.10 |

The cell rule (`walk/form.ts`) calls all four small places "car": it cannot tell a village with a main street from a highway exit. Places per
km² separates the six by an order of magnitude; the stretch finds Friedensburg and Fredericksburg; the highway share finds Bethel. These are
starting signals, not rules: six places cannot set a threshold, which is why the calibration set below exists.

## Ground truth: who says what a place is

The owner's judgment is the truth. I propose a word for each place below from the probe and my reading of the map; **the owner confirms or
changes each word, or accepts two** for a place that is between (a "?" below), before any fixture is cut. The report (PF16) prints each place's
street raster so a label can be checked without knowing the place. A place the owner cannot label is dropped, never guessed.

Points are Overture's locality points (from the divisions layer) unless noted. Exits and malls are to be found by a query, then confirmed.

### Calibration set (the rule is tuned on these)

| Place | Point | Proposed word |
|---|---|---|
| Allentown downtown (Hamilton St at 7th) | -75.4714, 40.6023 | A street grid |
| Allentown, 19th and Liberty | -75.5, 40.6 | A street grid |
| Reading (city) | -75.9280, 40.3354 | A street grid |
| Lancaster (city) | -76.3056, 40.0380 | A street grid |
| Hamburg | -75.9824, 40.5553 | A town along a main street |
| Jonestown (village) | -76.4783, 40.4138 | A town along a main street |
| Kutztown | -75.7774, 40.5173 | A town along a main street |
| Friedensburg | -76.2407, 40.6026 | A village along one road |
| Fredericksburg | -76.4313, 40.4449 | A village along one road |
| Bethel, at the I-78 interchange | -76.2918, 40.4744 | Services at a highway exit |
| Lehigh Valley Mall | -75.4925, 40.6455 | *(no word yet)*: held so it is never called a grid or a main-street town (PF7) |
| Upper Macungie suburb | -75.575, 40.555 | *(no word yet)*: the same |
| Farmland between towns (a point to be chosen, no tile with 300 m of street) | to locate | *(no word)* |
| A large park (a point to be chosen) | to locate | *(no word)* |

### Held-out set (cut and labelled before the thresholds are pinned; never tuned on)

| Place | Point | Proposed word |
|---|---|---|
| Easton | -75.2100, 40.6916 | A street grid |
| Bethlehem (city) | -75.3787, 40.6179 | A street grid |
| Lititz | -76.3072, 40.1572 | A town along a main street |
| Boyertown | -75.6373, 40.3337 | A town along a main street |
| Womelsdorf | -76.1877, 40.3642 | A town along a main street ? (a village by Overture) |
| Emmaus | -75.4919, 40.5350 | A town along a main street ? (it has a grid) |
| Rehrersburg | -76.2444, 40.4576 | A village along one road |
| Strausstown | -76.1843, 40.4919 | A village along one road |
| Shartlesville | -76.1048, 40.5130 | A village along one road ? (it has an exit's services) |
| Grantville (I-81) | -76.6464, 40.3779 | Services at a highway exit ? (to confirm on the raster) |
| A second exit (to be found by query: fuel and food within 400 m of a motorway link, no town) | to locate | Services at a highway exit |
| A second mall or big-box strip (to be found) | to locate | *(no word yet)* |
| A second cul-de-sac suburb (to be found) | to locate | *(no word yet)* |

An honest limit: this is eastern Pennsylvania. The words are not shown to be right in a western desert town, a Canadian one or a European one
(Zurich is in the walkability fixtures but not here). The accuracy the test reports is for places like these, and the spec's Record says so.

## Files

Core (pure, `// @layer core`, no clock, no module state):

- `src/lib/walk/placeSignals.ts`: `measureRing(tiles, junctions, places, centre, radiusM)` returns the measures: street metres, junctions per km²,
  places per km², highway share (motorway and trunk; Overture's links arrive as class `motorway` with subtype `link`, so `walk/cells.ts`'s arterial set already
  holds them: seen in the probe), stretch (the principal axis of street lengths, its own function). A ring with a tile unread, under 300 m of
  street, or with its places not read (`places` null) returns `null` (PF8, PF17). It uses `walk/cells.ts`'s own street classes so a street means one thing.
  The places carry a position and a weight only (`PlacePoint`), so no measure uses a category, a footprint or a parking.
- `src/lib/walk/placeForm.ts`: the word table (PF1, PF2: sorted by id, each word's inputs beside it), the one table of thresholds, and
  `placeForm(measures): FormWord | null` (PF5-PF9, PF17). Pinned by the fixtures, changed only with them, as `form.ts` is.

Shell and view:

- `src/lib/walk/useAreaWords.ts`: also returns `form` (the word, or null), from the same read (no extra request), beside `words`.
- `src/components/atlas/PlaceFormLine.tsx` (new): the one component that shows the word; `AtlasCard.tsx` renders it and passes it nothing else (PF13, PF20).
  Its copy is worded as the ring's (PF18). Above the walkability line, only when set (PF12).

Evidence (not shipped in the app):

- `scripts/fixture-place-form.mjs` (a copy of `fixture-walkability.mjs`'s way, with `places` and the ground-truth labels and sets, release pinned): writes
  `src/lib/__tests__/walkability/placeFormCalibration.json` and `placeFormHeldOut.json` (two files, so the held-out one lands in its own later commit).
- `scripts/place-form-report.ts`, `npm run report:place-form` (PF16).
- `scripts/features.js`: `place-form` in the `walkability` feature's `specs`, and in `IN_PROGRESS` while it is built.

No new dependency, no network call in the app, no new host (Overture's tiles are already read), no buildings layer (the stretch comes from the streets,
which the probe showed is enough to find the one-road villages; if the fixtures say otherwise, buildings would be a new read and a separate decision).

## Data

None stored. The word is derived on read from the cached tile facts, so no migration, no IndexedDB version, and `WALK_CODE`, `SNAP_RULES`,
`STREET_CODE` and `LANDING_CODE` do not change (PF3). The places the walkability read already fetches (`walkPlaces`) are the same.

## Tests, by criterion (all in `src/lib/__tests__/walkability/`, the walkability feature)

| Id | Test file and name |
|---|---|
| PF1, PF2 | `placeFormWords.test.ts`: `PF1: the words name a layout` (a banned-words list, no digit, no comparison); `PF2: the table has no order and no default` (no `rank`, no `default` field; the table's order is not read by the rule) |
| PF3 | `placeFormWords.test.ts`: `PF3: no request, host or stored row` (the module imports only core and the layer test holds it); `PF3: the same tiles, the same word` |
| PF4 | `placeSignals.test.ts`: `PF4: places per km²`, `junctions per km²`, `highway share`, `stretch` (a straight street 2.1, a square grid 1.0), `roadside share`, each on a small made-up ground |
| PF5 | `placeFormAccuracy.test.ts`: `PF5: every calibration place gets its confirmed word` (one assertion per place, so a miss names it and its measures) |
| PF6 | `placeFormAccuracy.test.ts`: `PF6: held-out accuracy meets the floor` (per word and overall printed in the message), `PF6: the held-out fixture postdates the pinned thresholds` (`check:test-first`'s history, and a thresholds hash recorded beside the fixture) |
| PF7 | `placeFormAccuracy.test.ts`: `PF7: no cross-kind mistakes` over both sets |
| PF8 | `placeFormAccuracy.test.ts`: `PF8: farmland, a park and an unread ring have no word`; `placeSignals.test.ts`: `PF8: under 300 m of street, or a tile unread, is null` |
| PF9 | `placeFormAccuracy.test.ts`: `PF9: removing every sidewalk and crossing changes no word`, and adding them to a place with none changes none |
| PF10 | `placeFormAccuracy.test.ts`: `PF10: the same word with further tiles in, and in any order` |
| PF11 | `placeFormWords.test.ts`: `PF11: no number or comparison reaches a string`; `check:vision` runs over the copy and the accuracy figures are kept out of `src` (a grep test) |
| PF17 | `placeFormAccuracy.test.ts`: `PF17: no places read, no word` (a null places read and an Overpass-only ring give null for every fixture) and `PF17: emptying a ring's places only ever makes its word no word` |
| PF18, PF19 | `placeFormWords.test.ts`: `PF18: the line is worded as the ring's`; `PF19: no advice in any copy, tooltip or label of the card's line` (a banned-verbs list: "avoid", "try", "best", "should", "expect", "watch") |
| PF20 | `placeFormLayers.test.ts`: `PF20: the card's other parts take no place-form prop` (one render per word, including none, compared); the card passes the word only to `PlaceFormLine` |
| PF12 | `scripts/e2e/journeys/walkability.js`: checks `PF12: the area card says the word, and says nothing without one`; `PF12: nothing shows while the read goes on` |
| PF13 | `placeFormLayers.test.ts`: `PF13: explore, discovery, atlas and activity import no place-form module`; e2e `PF13: the same places with and without a word` |
| PF14 | `placeFormLayers.test.ts`: `PF14: no layer, pin, icon, colour or setting is added` (the Layers panel's rows and `MAP_LAYERS` are unchanged) |
| PF15 | `placeFormAccuracy.test.ts`: `PF15: every fixture has a confirmed word, a date and a set` |
| PF16 | `placeFormReport.test.ts`: `PF16: the report names every place, its two words and its measures` |

First commit: each of these as a `todo` test, failing for the right reason, alone (`Place form: tests first (PF1-PF16, failing)`). The held-out
fixture lands after the thresholds, in its own commit (PF6).

## Screens (the goal-to-control matrix)

One line is added to the area card, and it is read-only: there is no action. Goal: know before going what kind of place this is. Seen once,
when the card opens, as the "On foot" line is. No control, so no matrix row and nothing to avoid. Precedent: the card's walkability line (UF13).

## Deferred, and why

- **Other kinds of description** (era, use, economy): each its own `/vision` gate (the owner, 2026-11-11).
- **"Shops set back behind car parks" and "Houses on looping streets"** (the owner's words): they name what stands on the ground, which the app's places
  and streets cannot show (the steward, accepted). A mall or a cul-de-sac suburb gets no word. A measure that could carry them is a new read (a place's
  category and footprint, or the buildings) and its own decision; the fixtures already hold a mall and a suburb, labelled "no word yet", for when it comes.
- **A buildings read** for a truer stretch: a new tile read; only if the fixtures show the streets are not enough.
- **Places outside the eastern United States**: the calibration is Pennsylvania; add places from elsewhere before the words are claimed there.
- **A word for a whole town versus a neighbourhood**: this slice reads the card's 800 m ring around the area's point, as the walkability line does; a town's
  word across its whole outline is a later slice.
- **Words on a route or in the walk**: the card only; nothing on the walk screen.

## Native

The word is text on a card read from a hook shared with the web; no new native path. Nothing is added to `docs/NATIVE_UNVERIFIED.md` beyond a line that
the card's extra line has not been seen on a phone.

## The steward's findings, triaged (2026-11-11)

The steward (`.claude/agents/steward.md`) ran on this spec and plan. Three breaches, three drifts, one tone note.

| Finding | Triage |
|---|---|
| S1 A thin or unread places read becomes a word | **Accepted**: PF17, and `placeSignals` returns null without a places read. |
| S2 The plan promised measures the data cannot give (roadside share, car parks, "houses") | **Accepted, and checked**: `PlacePoint` is `{at, weight}`. The mall and suburb words leave the first set (the owner's two words, deferred above); the roadside measure is gone; the links doubt is answered (class `motorway`, subtype `link`, already an arterial). PF1 lists each word's inputs. **The owner decides this one** (Questions 1). |
| S3 PF7 and the table's order read as a ladder | **Accepted**: the table is sorted by id and a test checks it (PF2); PF7 is a list of named wrong pairs, with no grouping by size. |
| S4 One 800 m disc at 80% reads as a fact about the whole area | **Accepted in part**: the line is worded as the ring's (PF18); the region question is the owner's (Questions 3). The 80% floor stays a dev measure and never appears in copy. |
| S5 "How to go about it" is advice | **Accepted in part**: the spec keeps the owner's purpose (that a person understands the shape of the place) but the words never advise (PF19), and I will check the two card lines side by side on a real screenshot before the owner signs off. If together they read as a verdict, the card shows one. The owner's purpose stands; this is where I disagreed with the steward's reading of it, and the owner can overrule. |
| S6 PF13 guarded imports, not the card's rows | **Accepted**: PF13 covers every component but the one line; PF20 renders the card's other parts per word. |
| S7 The Vision section's criteria list was short; PF1 overstated `check:vision` | **Accepted**: the list adds PF3, PF7, PF13, PF14, PF17-PF20; PF1 and PF11 say what carries the words. |

Steward's silent items: the card holds one description line at most while the family is one word (a cap, Questions 4); a place that is both "services at a highway exit" and
a listed site says both, since Explore is unchanged; "no word" reads as nothing, which is the point of PF8.

## Answered (the owner, 2026-11-11)

Question 1: **four words now**, no new read. Question 3: **United States only**. Question 5: **80% and within 10 points**. Question 6: **"Around its middle: …"**.
Still open: 2 (the labels), 4 (one line at most) and 7 (the decision record, which I write with the slice).

## Questions for the owner

1. **The two words I took out.** "Shops set back behind car parks" and "Houses on looping streets" cannot be derived from streets and places: the app does not know
   what stands on the ground. My recommendation is the four words in the table now; the mall and the suburb get no word until there is a measure. Or add a read
   of each place's category (and so lift PF3's "nothing new is read") as its own decision.
2. **The labels**, confirmed place by place (the tables above), or the places you want swapped. The report prints each ring's street picture to judge by.
3. **Outside the places the fixtures cover**: show the line everywhere (the rule is unmeasured elsewhere), or only where the fixtures give evidence? I recommend only
   the United States until fixtures from elsewhere exist (PF18).
4. **One line at most** for descriptions on the card, so a later kind of word replaces rather than stacks? I recommend yes.
5. **The accuracy floor** (PF6): 80% of held-out places and within 10 points of the calibration set is my recommendation.
6. **The copy**: "Around its middle: services at a highway exit", or a plainer "Services at a highway exit"?
7. **A decision record** (0139) for the rule for such words (PF1, PF2, PF19): descriptive, unordered, no default, never advice. I will write it with the slice.

Then: record in `docs/STATUS.md`, the fixture script and the calibration fixture, tests first, the rule, the held-out fixture, the card line.
