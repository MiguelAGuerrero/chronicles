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

## The third review (2026-11-11, after folding and retuning): the criteria, attacked

A fresh reviewer, told not to read the rule, attacked PF1-PF22 and proposed 24 held-out places blind (`scripts/fixtures/placeFormHeldOutProposal.json`, committed before the
rule ever sees them; the owner still confirms the words). My experiments on the 35-place calibration set, run in this session, are beside each finding.

| Finding | Triage |
|---|---|
| PF6's two floors contradict: with calibration fitted to 1.00 the "within 10 points" clause makes the floor 0.90 | **Verified in the test code. The owner's floor, so the owner's call**: keep it (0.90 effective) or a Wilson lower bound of 0.70 with a point estimate of 0.80 (24 places: 22 right). Spec PF6 now says so and prints the interval. |
| Recall counts "any word", silence is rewarded on no-word places and penalised on "?" ones, "?" is unbounded (8 of 35 places carry an accept) | **Accepted as reporting**: the report prints strict and lenient accuracy, per-word recall and a voiced-wrong rate. Gates on them and a cap on "?" are the owner's call. |
| Leakage and the tuning loophole: the held-out may share a municipality or tiles with calibration; a rerun after a retune is forking paths | **Accepted**: PF23 (5 km from every calibration point, one look per rule, the Record logs each). The 24 proposed places are all 5.4 km or more from calibration. |
| Overfitting: about 17 thresholds for 35 places | **Verified, and worse than I thought**: a decision tree fitted on 34 and tested on the 35th (leave-one-out) scores 0.49-0.69; the retuned hand rule is 35 of 35 in sample. I will not spend the fresh set on a rule I expect to fail. |
| Uneven coverage is untested | **Accepted as PF24; the rule fails it**: with half the buildings and places, 14 of 35 words change and a mall becomes an exit. |
| PF7 and PF22 do not cover the embarrassing cases (a no-word place gaining a word) | **Accepted as PF22's second test; the rule fails it**: moving the centre 300 m in eight directions changes 15% of readings, but a no-word place gains a word 8 times of 280 (Park City, Upper Macungie, Penn State). |
| PF21 tested 2 villages against 3 towns | **Fixed**: all 4 unambiguous villages against all 7 main-street towns. |
| PF10's far tile proves only the radius; a way on a tile edge is untested | **Fixed**: every way on two tiles gives the same measures. |
| PF11: the report holds "accuracy" and "recall" while the spec says never in `src` | **Fixed in the spec and a layer test**: the report is dev tooling and no app code imports it. |
| PF4's text still said "stretch" | **Fixed**. |
| The e2e check `count() >= 0` is vacuous | **Mine, fixed**: removed; PF13's comparison is the card render test (PF20). |
| PF9 cannot fail (footways are not streets by construction) | **True, kept as a guard against a later change**, with the reason in the test. |
| PF18's "United States only" has no test and the evidence is Pennsylvania only | **The owner's call, and a question**: US-only has no mechanism yet (does the app know the country?); "the northeastern US" is what the fixtures can support. |
| Vision is asserted, not enforced: two lines may read as a verdict; PF26 render with each walkability band | **Accepted for the card step**: render the word with each band and review one screenshot per word. |
| Labels are anchored to my probe; use blind words and two raters | **Accepted for the new set**: blind labels from an agent that did not see the rule; the owner confirms or corrects them before the look. |
| Missing: release drift, a time budget for the buildings read, a place-type list | **Noted**: the release-drift check and a read budget join the card step (the read times out to no word); the place-type list is in the proposal (a campus, an outlet mall, an industrial park, an attractions resort). |

### What this means for the next step

The rule as retuned is fitted, not shown. The next step is **not** the held-out look. It is a rule that passes PF22 and PF24 on the calibration set (few thresholds, anchored on
the best-mapped signals), measured by leave-one-out before the look is spent. If no simple rule passes them, the honest answer is a smaller set of words (the owner's third option).

## Proposal: only positive classifications, ambiguity is silence (the owner's policy, 2026-11-11, after the second held-out look)

The owner's call: give a word only when the case is obvious; where a place is ambiguous or falls between the heuristics, say nothing; limit false positives above all. The
rule that follows replaces the street-first rule (which stays as the thing it is compared with).

**The rule.** A place has a word only when all of these hold; otherwise it has none:

1. **Evidence:** the ring is measured (tiles read, 300 m of street, places and buildings read) as before.
2. **Territory:** its measures (junctions, places, buildings per km², motorway share) lie inside exactly one word's territory. A territory is a box around the confirmed places of that word,
   widened by a margin of 0.3 in log space (a factor of about 1.35 on a count), then cut back so that **no confirmed place of any other word, and no place the owner gave no word, lies inside it**.
   A place inside two territories has no word.
3. **Stability:** the same word is read from the centre and from the four rings shifted 150 m north, east, south and west. Any disagreement is silence. (An edge place flips; an obvious
   one does not.)

The territories are numbers in one table in `placeForm.ts`, produced by a script (`scripts/learn-place-form.mjs`) from the fixtures, so they are reproducible and not tuned by hand:
the procedure and its two settings (the margin, the stability) are the whole of what is tuned, and no reference place is carried into the app.

**Measured, leave-one-out on all 58 measured places (each place judged by territories learned without it).** These are development data: the second held-out set was looked at, so this is
not a held-out result, and the two settings were chosen among eight looked at.

| Margin | Stability | Words spoken | Right | False positives on no-word places | Wrong word | Recall |
|---|---|---|---|---|---|---|
| 0.1 | none | 20 | 20 | 0 | 0 | 0.45 |
| 0.2 | none | 23 | 22 | 1 (Park City) | 0 | 0.50 |
| 0.3 | none | 29 | 26 | 3 | 0 | 0.60 |
| **0.3** | **all five** | **22** | **22** | **0** | **0** | **0.50** |
| 0.45 | all five | 19 | 18 | 0 | 1 (Jonestown read as a village) | 0.40 |
| 0.6 | all five | 25 | 24 | 0 | 1 | 0.55 |

The chosen setting: 22 of 22 words right, none given to a no-word place, and a word for about half the places that deserve one. By word: grid 9 of 9, main street 6 of 6, village 5 of 5, exit 2 of 2.
**The honest weakness:** the exit word rarely fires in leave-one-out (6 confirmed exits is too few to learn a territory without one of them: Bethel, Breezewood and Lickdale stay silent when left out). On all
places the territory covers them. The exit word's evidence is the thinnest in the set.

**What it stays silent on, leaving one out:** Lancaster, Hamburg, Jonestown, Bethel, Breezewood, Steelton, Emmaus, Strausstown, Shartlesville, Morgantown, Lebanon, Lewisburg, Manheim, Bloomsburg, Bowmansville, Churchtown, Intercourse, Lickdale.

**Territories on all 58 (counts per km², motorway share):** exit: junctions 5 to 16, places 11 to 43, buildings 42 to 215, motorway 0.32 to 0.55. Grid: 35 to 143, 130 to 729, 318 to 2196, 0 to 0.34.
Main street: 22 to 86, 17 to 175, 303 to 1389, 0 to 0.19. Village: 4 to 27, 5 to 31, 72 to 452, 0 to 0.21.

**What changes in the spec if the owner agrees:** a decision (positive classifications only; ambiguity is silence); PF5 (each calibration place is right or silent, never a wrong word; recall is reported); PF6 (precision of the spoken words and the
rate of words given to no-word places are the floors, with recall reported: proposed at least 0.90 right of at least 12 spoken words, and none of the owner's no-word places given a word beyond 5%); PF7 (zero tolerance, as now); PF22 and PF24 (the stability gate is the
mechanism; a moved or thinned place may go silent, never gain a word); a third held-out set of at least 30 places with at least 10 no-word places (to measure false positives) cut blind after the territories are pinned.

### The concern: many obvious places stay silent (the owner, 2026-11-11), diagnosed

I asked why each deserving place went silent in leave-one-out (58 measured places, development data). Thirteen of the eighteen fell just outside a territory built as a box around the known
positives (Lancaster is a bigger grid than any other grid held; Emmaus and Manheim more built up than the other main-street towns); four missed the stability gate by one centre (Hamburg, Strausstown, Lebanon, Lewisburg); one was
claimed by two territories (Bloomsburg). So part of it was my procedure, and part is how little evidence each word has.

**Fix 1, open-ended territories.** A side stays open where more or less does not change the word (a grid is "at least" so many junctions, places and buildings; a village has "at most"), and only a
confirmed counter-example closes it. A village still needs some buildings (without that floor a warehouse park and an empty interchange read as villages). Leave-one-out, margin 0.3, all five rings agreeing:

| Territories | Spoken | Right | Wrong | Recall |
|---|---|---|---|---|
| Closed boxes | 22 | 22 | 0 | 0.51 |
| **Open-ended** | **23** | **23** | **0** | **0.54** |
| Open-ended, four of five rings agreeing | 28 | 26 | 2 (Park City read village, Upper Macungie read main street) | 0.62 |

So looser stability buys 8 points of recall for two false positives on edge places, which is the trade the owner's policy refuses; it stays at all five.

**The rest is data, and it is measured.** Strictly confirmed places per word: grid 11, main street 9, village 7, exit **3** (14 no-word places). Each leave-one-out takes a word's evidence down by one. Learning from random subsets of the 58 and
judging the rest (40 splits each):

| Learns from | Precision | Wrong words per run | Recall |
|---|---|---|---|
| 15 places | 0.85 | 1.3 | 0.25 |
| 25 places | 0.97 | 0.3 | 0.36 |
| 35 places | 0.99 | 0.1 | 0.44 |
| 45 places | 1.00 | 0.0 | 0.57 |

Recall climbs steeply with the number of confirmed places while precision stays at 0.97 and above. The lever for naming more obvious places without more false positives is more confirmed places, above all exits and villages;
the procedure then widens each territory only as far as the evidence reaches. (The curve is extrapolation beyond 45 places and the owner's 58 are one region; treat 100 places as a hope, not a promise.)

### Storefronts and busy streets as features (the owner's question, 2026-11-11), measured

The app already has the concept: a **busy street** is a named street with a run of places along it (`landing/analyze.ts`: `Strip`, `Pocket`; the atlas records them per area), and a place counts toward its street
when it stands within 40 m of it (a storefront). I ran the app's own `analyzeArea` over the 59 places (named streets from Overture, whose decoder already reads names; the places already in the fixtures) and measured:

- **Total busy-street length inside the ring** separates grid from main street: 11 of 12 grids have 1.1 km or more (Steelton, 208 m, the exception); 11 of 12 main-street towns have under 0.9 km (Bloomsburg, the owner's grid-or-main place, 1.2 km). Eight of nine villages and eight of nine exits have **no busy street at all**.
- **Frontage**, the share of places within 60 m of a named street, flags places set back from the street: Park City 0.10, Limerick outlets 0.08, Knoebels 0.06, Hampden 0.13, against 0.41 or more for every town, village and exit (a mall ring road, 0.59, is the exception). This is the "shops set back behind car parks" signal the plan had dropped for want of a measure, and the DEFERRED entry about strip malls.
- Campuses still look like a downtown (Penn State: seven busy streets, 2.1 km): no help there.

Leave-one-out on 58 places, the open-ended territories, margin 0.3 (development data; six feature sets looked at, so optimistic):

| Features | Stability | Spoken | Right | False positives | Recall |
|---|---|---|---|---|---|
| Junctions, places, buildings, motorway (the base) | all five | 23 | 23 | 0 | 0.54 |
| Base | four of five | 28 | 26 | 2 | 0.62 |
| Base + busy-street length | all five | 27 | 27 | 0 | 0.65 |
| Base + busy-street length + frontage | all five | 25 | 25 | 0 | 0.62 |
| **Base + busy-street length + frontage** | **four of five** | **27** | **27** | **0** | **0.68** |

At zero false positives, recall rises from 0.54 to 0.68 and the two edge-place errors at four-of-five stability (Park City, Upper Macungie) disappear: frontage removes them. Dropping buildings (streets, busy streets and frontage only) cost one wrong word (Grantville read as a village), so buildings stay.

**Cost:** no new network read (the walk ways already carry names; the ring's places are already read). The analysis is a pure function over them, run for the centre and four shifted rings. Overture's street names are 61% to 98% of segments named (rural
and interchange rings lowest); the app's atlas reads OpenStreetMap's names, so the fixtures' frontage (60 m here, 40 m in the app) must be recomputed from the same source the card will use. The busy-street length also leans on the places feed, so it inherits its uneven coverage (PF24).

**A fifth word it suggests:** "Places set back from the street" (a mall, an outlet centre, an attractions park) from low frontage with a few dozen places. Three places in the data: too few to certify, and it needs its own `/vision` look; listed, not built.

### The rule as built, pinned before the third held-out look (2026-11-11)

Territories learned from **88 confirmed places** (the 59 of before and 29 blind-labelled additions, mostly villages and exits), the six measures, margin 0.3, a cut buffer of 0.15 from every counter-example,
open sides as above, and the four-of-five ring gate. Leave-one-out (each place judged by territories learned without it; development data): **50 spoken, 49 right, one false positive (Humboldt, an industrial park read as a village), recall 0.73**
(0.59 at 59 places: the learning curve held). The cut buffers tried: 0 gave recall 0.69, 0.15 gave 0.73, 0.30 gave 0.61, 0.45 gave 0.52 with a second false positive; none removed the Humboldt false positive.

Known limitation, measured on four seeds of halving the places and buildings: about a fifth of the words go silent, four move to a neighbouring word, and Limerick Outlets (an outlet centre at an interchange) reads as an exit. Overture under-records malls and outlets.

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
