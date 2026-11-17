# 0188. Earth and ink: the map's palette; the walked colour apart from the accent; the magenta's rule narrowed to lines, fills and labels

Date: 2026-11-17 · Status: accepted · Area: map, replay, vision · Answers: T22 (0153, 0165, 0186) · Amends: 0028 and 0034 ("hotspots are magenta, the one hue no other layer uses") · Spec: `specs/map-palette/spec.md` (MP1-MP14)

## Context
Decision 0153 said the replay never lights anything in the accent, and that the walked colour is to be its own; beat
one lit the walked streets in `COLORS.walked`, `#c2410c`, the accent's hex. T22 asked for a walked hue. The owner asked
for swatches (0165), saw three (olive, plum, umber), picked umber and then answered "Let's re-imagine the palette"
(0186), so no hue was built. These are the owner's own answers in person on Nov 17, not a proxy's (0157).

## Decision
The owner's answers, Nov 17, verbatim:
- **Scope: "The map's colours".** The walked streets, the trace, the start and end markers, and the moment kinds' pin
  colours. The accent `#c2410c` and the UI's ink `#1d2430` and muted `#596273` stay.
- **Process: "Candidate palettes to compare".** Three palettes were rendered beside today's on beat one, the walk's
  card and Explore, in normal vision and with deuteranopia and protanopia, every ratio measured.
- **The pick: "Earth and ink"** (the others were Cool water and Seasonal muted).
- **On the spec's four questions:**
  1. The video's madder beside the hotspot magenta: **"Keep it, narrow the rule"**.
  2. The town borders on the replay and a day (`BORDER.color`, the accent's hex): **"Their own entry"**: a new inbox
     entry with its own swatches to come, not built here.
  3. The replay's stage: **"Follow the palette"**: a memo's play disc and waveform, a note bubble's edge and the pile's
     video tile take the kinds' colours.
  4. The spec: **"Build it, with that wording"**: MP1-MP14 stand; QL2's wording is proposed as "a bullseye in the walked
     colour".

Earth and ink, by role (`COLORS` in `src/components/map/types.ts`):

| Role | Colour | Was |
|---|---|---|
| The walked streets, the end marker's centre and ring | `#5b5d9f` ink | `#c2410c` |
| The trace, its rides, faint stretches and drawn way; the start's ring | `#15803d` green, unchanged | `#15803d` |
| A photo's pin, a stacked moment | `#286766` verdigris | `#0f766e` |
| A video's pin | `#87244e` madder | `#b42318` |
| A voice memo's pin | `#544516` raw umber | `#7b2cbf` |
| A note's pin | `#7b7469` stone | `#a16207` |
| A pin of several's head (`COLORS.several`) | `#31352f` charcoal | `#3f3f46` |

The figures (WCAG on Positron's land `#f2f3f0`; CIEDE2000; Machado 2009 at full severity): every line and marker 3:1
or more (walked 5.37, trace 4.50); beat one's lit street `#658694`, 3.50:1; every pin's white glyph 4.5:1 or more (the
note's 4.62 the lowest); the worst colour-blind pair 9.6 (a voice memo and the accent, protanopia; it was 1.1, the
walked streets and a note, deuteranopia); every map colour 20 or more from the accent (the note's 26.2 the nearest).

**The magenta's rule, narrowed** (amending 0028 and 0034). The hotspot magenta stays the one hue of any line, fill or
label on the map; every other map colour stays 15 or more from it (CIEDE2000; the video's madder is 17.5). It was "20°
of hue (HSV) from every other layer". The madder is 9.3° from it by that measure, but it is a dark disc with a white
glyph and a stem, never a line, fill or label, and every hue that clears 20° breaks the colour-blind floor (a video and
a pin of several fall to 6.1 apart with protanopia at 10° further round, 3.2 at 15°). The trace keeps its 25° of hue
from every other layer. `colors.test.ts` (MP8) holds it.

## Consequences
- T22 is answered and leaves the inbox; the walked colour is apart from the accent everywhere it is drawn (the replay's
  streets and both replays' end marker). Explore draws none of these colours; its "Walked once" and footsteps are the
  trace's green, unchanged.
- `map/palette.test.ts` holds the palette by role, the contrasts, the colour-blind floor (9.5 with deuteranopia and
  protanopia, 15 in normal vision), the accent's distance and the hosts; the `palette` journey reads the colours on
  the screen, and the `qol` journey reads its colours from the source.
- The town borders on the replay and a day stay the accent's hex until their own entry is answered.
- Known and kept: the stone note is the palette's weakest colour (it can read close to a disabled grey); a memory pin's
  faded glyph stays under 4.5:1, as before (MR3); the end on beat one stays faint (an opacity, not a hue).
- Native has not run on a phone: an item in `docs/NATIVE_UNVERIFIED.md` (MP13).
