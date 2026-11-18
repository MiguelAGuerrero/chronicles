# The map's palette: the plan

For the owner to review before any code. Criteria are in `spec.md` (MP1-MP14). The open questions are at the foot,
each with a recommended answer.

## What exists

- The map's colours are one object, `COLORS` in `src/components/map/types.ts` (`walked`, `trace`, `photo`, `video`,
  `voice`, `text`, beside the fog, route, walker and veil). Both maps (`WalkMap.web.tsx`, `WalkMap.native.tsx`) and the
  end marker's paints (`ENDS_RING_PAINT`, `ENDS_PAINT`) read it.
- The pin of several's head is a constant inside the pin's view, `MIXED = '#3f3f46'` in
  `src/components/CapturePinView.tsx`, which a unit test cannot import (the file imports React Native).
- The replay's stage reads the kinds from `COLORS` already: `components/ceremony/Bubbles.tsx` (a memo's play disc and
  waveform bars, a note's bubble edge) and `Pile.tsx` (the video tile). `replay-rhythm audit 19` keeps every hex out of
  the stage.
- The replay's beat one draws the trace at 0.3 (`traceOpacity` in `src/app/replay/[id].tsx`), its white edge at 0.9 of
  that (literals in both maps).
- Tests: `src/lib/__tests__/streets/colors.test.ts` holds the trace's green, the hotspot's magenta and the hue rules
  (it is the only test that fails with the new colours: a scratch run of `npm test` with them, 2,735 of 2,736 passing,
  the one failure "hotspots are magenta, and no other layer shares their hue or the trace's"); `map/endsPaint.test.ts`
  holds the markers' paints by reference to `COLORS`; the complexes' tests (CX9, audit 24) hold their outline far from
  every `COLORS` value (the new ones pass: the nearest is 63 apart in RGB, the floor 55).
- The `qol` journey copies two hexes: the end's walked `[0xc2, 0x41, 0x0c]` and the pin of several's `rgb(63, 63, 70)`.

## Design

1. **`src/components/map/types.ts`.** `COLORS` takes the seven values of MP2, and gains `several: '#31352f'` (the pin
   of several's head, beside the kinds). Two opacities become named exports used by the maps and the replay, so the
   beat-one test reads what is drawn: `TRACE_EDGE_OPACITY = 0.9` and `QUIET_TRACE_OPACITY = 0.3`. The comments that
   say "T22 is open" are brought up to date.
2. **`src/components/CapturePinView.tsx`.** `MIXED` reads `COLORS.several`; nothing else changes.
3. **`WalkMap.web.tsx`, `WalkMap.native.tsx`, `src/app/replay/[id].tsx`.** The literal 0.9 of the trace's edges and the
   replay's 0.3 read the two constants. Same values, so nothing drawn moves.
4. **Not touched:** `ui.tsx`'s theme (accent, ink, muted, danger), `BORDER`, `HOTSPOT`, `HOTSPOT_INK`, the route, the
   walker, the fog, the place kinds, Explore, every word. No data, storage or derivation change: no migration, no
   `SNAP_RULES`, `STREET_CODE` or `LANDING_CODE` bump (colours are not derived data).

## Data

None. No truth, no cache, no schema, no IndexedDB version.

## Tests per criterion (written first, as todos, committed alone)

A new feature-folder test, `src/lib/__tests__/map/palette.test.ts`, with a test-only helper beside it,
`src/lib/__tests__/map/colourSight.ts` (WCAG contrast, the blend over a ground, CIELAB and CIEDE2000, and the Machado
2009 matrices for deuteranopia and protanopia at full severity; the same maths as the comparison's `colour.py`, checked
against its figures: 3.50 for the blend, 9.6 for the worst pair). The spec joins the `map` feature in
`scripts/features.js` (`specs: [..., 'map-palette']`, `journeys: [..., 'palette']`), with an `IN_PROGRESS` entry while
it is built and MP13 in `UNTESTED` as `device:`.

In order; "fails today" is what each shows before the code, "guard" one that holds before and after and is there to
keep the new palette's weakest values from slipping:

| Id | Test | Before the code |
|---|---|---|
| MP2 | unit "MP2: each map colour by its role" (`COLORS` equals the table; the pin's head reads `COLORS.several`) | fails today |
| MP6 | unit "MP6: every pair of the map's colours, beat one's lit street and the accent is 9.5 apart with deuteranopia and protanopia, 15 in normal vision" | fails today (1.1) |
| MP7 | unit "MP7: every map colour is 20 from the accent and outside its family" | fails today (walked is the accent) |
| MP9 | unit "MP9: no file keeps a kind's old map hex; the stage and the pin read `COLORS`" (a source scan of `src/`, `#b42318` allowed only in `ui.tsx`'s danger) | fails today |
| MP4 | unit "MP4: lines and markers 3:1 on the land; beat one's lit street, blended with the drawn opacities, 3:1" | fails today (the constants do not exist yet), then a guard |
| MP5 | unit "MP5: every pin's disc 3:1 on the land and its white glyph 4.5:1" | guard (the note's 4.62 is the low) |
| MP3 | unit "MP3: the accent, ink, muted, route, walker, fog, hotspot, its ink, the borders and the danger red are unchanged" | guard |
| MP10 | unit "MP10: only the replay and a day draw walked streets or an end; every other map passes none" (a source scan of the `WalkMap` hosts' `walked` and `ended`) | guard |
| MP8 | `colors.test.ts` "MP8: every map colour is 15 from the hotspot magenta (CIEDE2000), hues compared round the circle; the trace keeps its 25°" replaces the 20° test | the new test passes today; the old one is removed in the same commit as the colours |
| MP11 | `qol` journey: its T16, T25 and audit 25 reads, and `pinsOfSeveral`'s head check, take the walked and several colours from `map/types.ts` (read from the source as text) and label them "MP11"; `endsPaint.test.ts` unchanged | `check.todo` |
| MP14 | new journey `scripts/e2e/journeys/palette.js` (from the comparison's throwaway, cleaned): one pin of each kind, a pin of several on the end; "MP14: each pin's head is its colour", "MP14: the end's centre and ring are the walked ink", "MP14: beat one's lit street is the blend, not the accent" (MP7's screen half), pictures `palette-beat-one`, `palette-card` at 390 and 320 px | `check.todo` |
| MP1 | no test of its own: MP2 holds the change, and the journeys' existing checks of words, shapes and layers hold "nothing else moves"; recorded as such in the spec's record | - |
| MP12 | the records (below) and decision 0188; `check:docs` holds the record | - |
| MP13 | `UNTESTED`, `device:` the native layers and pin views; the `docs/NATIVE_UNVERIFIED.md` item names MP13 | - |

Then the code, criterion by criterion, each todo made real in the commit that makes it pass, `npm run check:affected`
between them.

## The journeys

- **Add one: yes, `palette`.** No journey today puts a pin of each single kind on one map: `qol`'s `pinsOfSeveral`
  walks pins of several, `stacks` a stacked moment. The comparison's throwaway did exactly this walk, green under
  `E2E_SOFT=1`; it becomes the `map` feature's second journey, covering `src/components/map/types.ts` and
  `src/components/CapturePinView.tsx` (as `qol` does). About a walk and a replay, one or two minutes.
- **Run at the end:** `palette` (new), `qol` (changed checks), `replay` (the stage's colours and its accent scan) and
  `launch` as the smoke; each once, after the code, on one export.
- **The UI review** (decision 0145): `palette`'s and `qol`'s pictures with `E2E_SHOTS`, at 390 and 320 px, to the
  `ux-reviewer` with the spec; the cold read asks one thing, in the owner's words: "which of these pins can you open,
  and what is each?", to test the stone note against "reads like a disabled pin". No control moves, so no cold find of
  a control.

## Per-action lines (UI)

No action is added or changed: no control, no word, no place on the screen. The screens that change colour are the walk
screen (pins), the replay and a day's replay (walked streets, end, pins, the stage's memo and note bubbles and video
tile) and Chronicle's map (pins). Where the owner will look: the replay's first beat and its card, where the walked
streets and the end are. Defaults that make anything quieter: the note's stone is the one quieter colour, the owner's
pick, and the review above checks it.

## Cost

None measurable: seven constant values and two named opacities. No new read, write, layer, per-frame or per-fix work;
no harness.

## Docs and records (at the build, not at this pause)

- **Decision 0188** (0187 when the plan was written, at `d7608dd2`; main took 0187 for the empty walk before the build, so it is 0188, checked on `99875324`; claimed only
  at the build, after the last fetch, and checked with `npm run book:next-decision -- --check 0188
  docs/decisions/0188-earth-and-ink.md` before publishing): "Earth and ink: the map's palette". The owner's answers of
  Nov 17 to T22 (scope, process, the pick), every hex by role, the figures, and the magenta's rule narrowed from "the
  one hue no other layer uses" (0028, 0034) to "no other line, fill or label; every map colour 15 or more from it", with
  the reason (MP8) and the owner's answer to Open 1. A row in `docs/decisions/README.md`; a row in VISION.md's
  Precedents (the table of calls, not its rules).
- **Rule lines:**
  - `.claude/rules/map.md`, "Icons and pins": the pin of several's head is `COLORS.several` (was `MIXED`'s own hex);
    every kind's colour is in `COLORS`, held by `map/palette.test.ts` (MP2-MP10), and a new hex for a map role needs
    the colour-blind floor and the accent's distance there.
  - `.claude/rules/map-staples.md`: the end's ring and centre "in the walked ink (`COLORS.walked`, decision 0188)"; the
    line "T22, a walked colour apart from the accent, is open" retired with a note.
  - `.claude/rules/replay.md`: beat one lights the walked streets in the walked ink, never the accent (0153, 0188).
  - `.claude/rules/streets-fog-snapping.md`: `colors.test.ts` holds the magenta by distance, not by hue alone (MP8).
- **`docs/PRODUCT.md`**: "a solid orange disc with a white ring" becomes "a blue-violet bullseye".
- **Records**, only through `npm run records`: `inflight add` at the start of the build; at the end `inbox remove T22
  --reason "built as map-palette (MP1-MP14), decision 0188"`, `native item add` for MP13, `slice row add`, `inflight
  remove`; a "From /slice" item proposing QL2's wording ("in the walked colour"); and, on a yes to Open 2, an `inbox
  add` for the borders. Nothing is filed at this pause.

## Deferred

- The end marker's faintness on beat one (an opacity, not a hue; every palette shared it).
- A memory pin's faded glyph under 4.5:1 (MR3's fade, as today).

## Native

Never run on a phone. The same constants paint `WalkMap.native.tsx`'s layers and the pin views; MP13's device check goes
to `docs/NATIVE_UNVERIFIED.md`.

## The steward's lens (done in this run, per the skill; no subagent)

- **S1 [drift] The madder video inside the magenta's hue.** As the walker meets it: on the walk screen a video pin sits
  beside magenta busy streets, a found place's magenta dot and storefront names in `#86145a`, 5.3 apart from the pin.
  Breaks: 0028 and 0034, "hotspots are magenta, the one hue no other layer uses". Triage: accepted into MP8 and put to
  the owner (Open 1), with the measure that moving the video breaks MP6.
- **S2 [drift] An accent left on the replay.** The replay and a day draw the walk's towns in `BORDER.color`, the
  accent's hex (a 12% tint and a firm edge), against 0153, "The replay never lights anything in the accent". Out of
  this slice by the owner's scope. Triage: Open 2, recommended filed as its own inbox entry.
- **S3 [tone] The stone note may read as disabled.** Always, "Restraint ... the content is the novelty", against
  `.claude/rules/ui-patterns.md`, "Found before quiet": a pin that looks switched off is not restraint. Triage: kept
  (the owner's pick, the weak spot named in the comparison), checked cold in the UI review (above); a finding there
  comes back to the owner with a measured alternative, never changed by the run.
- **S4 [drift] Colours reaching past the map.** The replay's stage takes the kinds' colours too (a memo's play disc and
  waveform, a note's bubble edge, a video tile): beyond "the map's colours" as asked. Triage: Open 3, recommended
  "follow", so a memo is one colour on its pin and in its bubble.
- No breach: nothing scores, counts, celebrates, nags or leaves the device; no word changes.

## Open questions for the owner (recommended answer first)

1. **The video's madder beside the hotspot magenta** (decisions 0028, 0034: "the one hue no other layer uses").
   `#87244e` is 8.6° from the magenta's hue (CIELAB), 17.5 apart from it (CIEDE2000), and 5.3 from the storefront names'
   ink `#86145a`, drawn on the walk screen beside pins.
   - **Keep `#87244e`, narrow the rule** (recommended): the magenta stays the one hue of any line, fill or label, and
     every map colour stays 15 or more from it. A pin is a dark disc with a white glyph and a stem, never a line or a
     label, so it reads as a pin first. Moving the video off the magenta breaks the colour-blind floor: at 10° further
     round a video and a pin of several fall to 6.1 apart with protanopia, at 15° to 3.2 (MP6 needs 9.5).
   - Move the video toward red, and accept a weaker colour-blind floor (about 6 to 9), measured and shown again before
     it is built.
2. **The town borders on the replay and a day** are the accent's hex (`BORDER.color`), outside this slice's scope.
   - **File them as their own inbox entry** (recommended), so the replay's "never anything in the accent" (0153) is
     settled for the borders too, with their own swatches.
   - Leave them: a town's tint is a map's key, like the area card's coloured lines (0186's second exception).
3. **The replay's stage** (a memo's play disc and waveform, a note's bubble edge, the pile's video tile) draws the
   kinds' colours from the same constants.
   - **Let it follow** (recommended): one colour per kind everywhere, so a memo's bubble matches its pin. The umber
     disc keeps its glyph at 9.38:1; the note's stone edge is 4.62:1 on the bubble's white.
   - Keep today's colours on the stage: two sets of kind colours, which the stage's audit (`replay-rhythm audit 19`)
     was written to prevent.
4. **QL2's words.** QL2 (`specs/quality-of-life/spec.md`, the owner's doc) says "a thick ring in the walked orange".
   - **"A bullseye in the walked colour"** (recommended; with T25's shape, as the inbox proposed): the colour's name
     leaves the spec, so a later palette needs no edit. The doc is the owner's to amend.
