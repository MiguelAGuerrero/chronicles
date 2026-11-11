# Place form: plan (for the owner's review before any code)

Spec: `specs/place-form/spec.md` (PF1-PF20). Gate: aligned if reshaped, 2026-11-11 (the spec's Vision section). The probe this plan stands on is in the
session record (six places on Overture release 2026-10-21.0: Allentown downtown, Hamburg, Jonestown, Fredericksburg, Bethel's interchange,
Friedensburg).

## What the probe found (800 m around each place's point)

| Place | Cells (foot / neither / car) | Junctions per km² | Arterial share (motorway, trunk, primary, secondary) | Counted places | Stretch (streets, unweighted: see the correction below) |
|---|---|---|---|---|---|
| Allentown downtown | all foot | 58 | 0.39 | 756 | 1.15 |
| Hamburg | 4 / 17 / 11 | 46 | 0.32 (motorway and trunk 0.14) | 175 | 1.56 |
| Jonestown | 0 / 11 / 22 | 39 | 0.28 | 47 | 1.13 |
| Fredericksburg | 0 / 0 / 31 | 17 | 0.47 | 44 | 1.65 |
| Bethel (interchange) | 0 / 0 / 32 | 13 | 0.77 (motorway and trunk alone 0.66) | 30 | 1.43 |
| Friedensburg | 0 / 0 / 33 | 17 | 0.23 | 18 | 2.10 |

The cell rule (`walk/form.ts`) calls all four small places "car": it cannot tell a village with a main street from a highway exit. Places per
km² separates the six by an order of magnitude; the stretch finds Friedensburg and Fredericksburg; the highway share finds Bethel. These are
starting signals, not rules: six places cannot set a threshold, which is why the calibration set below exists.

**Correction (2026-11-11, after the adversarial review, rechecked on the same tiles).** The first table's "highway share" was the whole arterial share, and
its stretch left the motorway out of its classes. Recomputed with local streets and arterials, and weighting each street by its length, the stretch is Bethel 1.27,
Friedensburg **1.19**, Fredericksburg **1.05**, Hamburg 1.45 and Allentown 1.08 (unweighted: 1.43, 2.10, 1.65, 1.56, 1.15). So "stretched along one road" is
**not** shown by the streets: it came from counting short segments. The village word needs a different measure, or a pinned definition that survives
weighting (PF4), or it leaves the first set.

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

- `src/lib/walk/buildings.ts` (a shell, like `activity/overture.ts`): Overture's `building` layer read by z14 tile through `OvertureReader`, centroids only, never stored; a
  failed or timed-out read is `null`. `walkApp.ts` gets `walkBuildings(tiles, shouldStop)` beside `walkPlaces`. `lib/net/policy.ts`'s host name says buildings too.
- `src/lib/walk/placeSignals.ts`: `measureRing(tiles, junctions, places, buildings, centre, radiusM)` returns the measures: street metres, junctions per km²,
  places per km², the places' chain (largest run within 80 m, as a share and a length), buildings per km², highway share (motorway and trunk; Overture's links arrive as class `motorway` with subtype `link`, so `walk/cells.ts`'s arterial set already
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
| PF6 | `placeFormAccuracy.test.ts`: `PF6: held-out accuracy meets the floor` (per word and overall printed in the message), `PF6: the held-out fixture postdates the pinned thresholds` (`check:test-first`'s commit order: the held-out fixture is its own file, cut after the thresholds are pinned) |
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
| PF22 | `placeFormAccuracy.test.ts`: `PF22: moving the centre 300 m never makes a plainly wrong word` (the fixtures hold 1,100 m of data) |
| PF21 | `placeFormAccuracy.test.ts`: `PF21: the village word separates the villages from the main-street towns on the calibration set` |
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

## The second review (2026-11-11): an adversarial reviewer and a literature survey

A fresh agent re-measured the proposal on real places the plan does not hold and surveyed established taxonomies. What I verified myself, and what stands:

| Finding | Triage |
|---|---|
| The places carry no category (the steward's S2 premise, my answer to the owner's Question 1) is **false** | **Verified and mine to correct.** `OverturePlace` carries `hierarchy` (the taxonomy) and `confidence`; only `PlacePoint` (`{at, weight}`) drops them. Category counts need no new request, only carrying `hierarchy` through `walkPlaces`. A buildings or footprint read would still be new. The owner's answer to Question 1 rested on my wrong premise, so it goes back to them. |
| "Highway share" 0.76 was the arterial share; motorway and trunk is 0.66 | **Verified, corrected above.** |
| Stretch is not robust | **Verified.** Weighted by length it is 1.05-1.45 for every town; the village word loses its measure (above). |
| The mall and the suburb can be told from a main-street town without categories (places run together, places per km², junctions) | **Reviewer measured, not yet verified by me.** Largest chain of places within 80 m, as a share of places: Allentown .86, Hamburg .67, Jonestown .30, Lower Paxton .28, Upper Macungie .24, Bethel .40, Friedensburg .17 (separates suburbs from towns; fails on malls, which cluster). To be reproduced in the fixtures before a rule uses it. |
| Lower Paxton would be called a main-street town; Park City (Lancaster) a village; Fogelsville and Morgantown fall between exit and town | **Reviewer measured.** Add them to the fixtures. PF7 forbids every word for a mall or a suburb, not two of the four. |
| Building count per km² separates "a settlement" from "a stop on a road" (Bethel 167, Fredericksburg 275, Jonestown 497, Hamburg 582, Allentown 1,696) | **Reviewer measured.** The strongest single signal for the Bethel case, and a new read (Overture's buildings archive, same host): the owner's decision. |
| Overture's `motorway_junction` exit nodes (Fogelsville 10 within 800 m, Bethel 2, Hamburg 1, Allentown 0) and industrial `land_use` (Fogelsville 16 of 17 polygons) | **Reviewer measured.** Both are in Overture's `base` layer: a new read and the owner's decision. |
| Posted speed on the main road (the walkability read already holds it) | **Plausible, thin coverage** (7-11 segments in a town). Said only where read. |
| Dead-end share gives no signal on this data | **Reviewer measured; the survey says the opposite from memory.** The measured result stands; no cul-de-sac measure is built on connector counts. |
| The accuracy gate can be passed by silence; 13 places allow 2 misses; "?" counts either way | **Accepted**: report recall per word, floor the share of real towns that get any word, count a "?" place correct only for its stated pair, more held-out places (the owner sets the size). |
| Fixtures use hand-picked centres; the card gets Overture's locality point (a township centroid in places) | **Accepted**: fixtures use the exact point the atlas passes the card; add a ±300 m jitter test that must not flip a word between kinds (the kinds PF7 names). |
| Release drift; no mechanism for "United States only" | **Accepted**: a test that a newer release of the same tiles keeps each word; the country is on the Overture division's `country` property (verified on the tile). |
| The card already says "Streets far apart and busy" for all four small places; a word does not reach Explore's list; `thinPlaces: 3` is unrealistically low | **Fair, and the owner's call**: the owner chose "say it, show everything". Thinning Explore's kinds where places do not run together is the option they declined; it stays declined unless they reopen it. |
| The survey's classes (campus, industrial, pedestrian centre, compact old town, waterfront) | **Candidates for later words**, each its own gate. The survey read only search summaries for three sources and the rest is from memory; I trust none of it as a source until opened. |

## Answered (the owner, 2026-11-11)

Question 1: **four words now**, no new read (answered on a wrong premise, see above; reopened). Question 3: **United States only**. Question 5: **80% and within 10 points**. Question 6: **"Around its middle: …"**.
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
