# The replay as a film: editing, camera and motion principles

Research for the replay ceremony's rework (the owner, Nov 18: "choppy, too fast, no rhythm"; photos flash for
1-2 s and leave nothing behind; the cut's dim is jarring; the map is too close). Gathered Nov 18, 2026, report only.
Each principle names its source and whether it was **verified** (the page read), **verified via search** (seen in
several secondary sources, not the primary) or **from memory**. Hosts unreachable from cloud sessions that day:
m2.material.io, maplibre.org, docs.mapbox.com, d3js.org, arxiv.org; m3.material.io and developer.apple.com rendered
empty. The numbers are starting points for a prototype the owner tunes, not decisions.

Restraint verdicts are against `docs/VISION.md` ("Restraint in motion, colour and copy"; Never: celebration).

## Editing and rhythm

| Principle | Source | Applied to the replay | Verdict |
|---|---|---|---|
| **Rule of six**: a cut weighs emotion 51%, story 23%, rhythm 10%, eye-trace 7%, 2D plane 5%, 3D space 4%; give up from the bottom | Walter Murch, *In the Blink of an Eye* (1995/2001); verified via search | Protect the moment's dwell; compress empty path, never a memo or a photo, to meet a cap. Today's cut keeps time accounting and gives up emotion and space | fits |
| **Cut on the blink**: move when a thought completes | Murch, same; verified via search | 0.8-1.2 s of stillness after a memo's last word before moving (today `mediaTail` 400 ms); ~300 ms beat after a photo leaves before the walker restarts | fits |
| **Timing, pacing, trajectory phrasing**: rhythm shapes cycles of tension and release | Karen Pearlman, *Cutting Rhythms* (2009; 3rd ed. 2025); verified via search | Vary holds: a cluster tightens (montage), a lone photo after an empty stretch holds longest; a zip is tension, the next stop its release; a rest before the end is never compressed | fits |
| **Kuleshov effect**: meaning comes from what is placed next to what | Lev Kuleshov; verified (Wikipedia) | Order is meaning: keep chronology and the lows. After a memo, at least ~2 s at walking zoom before a zip may start | fits |
| **Shot length sets energy** | James Cutting et al., *Psychological Science* 2010 (~4 s average shot); from memory | 6-10 path events a minute; photo holds of 4-5 s are documentary pace, today's ~1.5 s is music-video pace | fits |

## Camera and framing

| Principle | Source | Applied to the replay | Verdict |
|---|---|---|---|
| **Smooth and efficient zooming and panning**: between far views, zoom out, pan, zoom in along one curve, duration proportional to its length, ρ trading zoom for pan | J.J. van Wijk and W.A.A. Nuij, IEEE InfoVis 2003 / TVCG 10(4) 2004; verified via search. D3 `interpolateZoom` ρ = √2; Polymaps 1.42 ("from user testing"); MapLibre flyTo `speed` 1.2 | The dive, the close and every break: ρ ≈ 1.4, duration clamped 1.8-3.5 s per hop. A zip rises in altitude as ground speed rises so the walker's screen speed stays ~0.25-0.4 widths/s | fits |
| **Lazy follow and lead room**: the camera moves only with a reason, leaving space ahead of the subject | Documentary practice; from memory | The camera holds while the walker is inside the middle ~60% of the screen; reframes in 1.0-1.5 s eased, 15-20% ahead of the heading. Walking zoom ~15 (today 16), or fit to the next leg, clamped 14.5-15.5 | fits |
| **Screen direction (180° rule)**: keep the axes, or spatial memory suffers | Verified (Wikipedia) | North-up throughout; no rotating bearing or chase-cam pitch, so the town keeps its shape from opening to close | fits; a chase cam is to avoid |
| **Establishing shot, coverage** (wide, medium, close) | Verified (Wikipedia) | Wide = the whole trace; medium = walking zoom; close = a card or bubble. Wide → medium → close → medium, never wide straight to close | fits |

## Transitions across time

| Principle | Source | Applied to the replay | Verdict |
|---|---|---|---|
| **Dissolve vs fade to black**: a dissolve says time passed; black says an ending | Verified (Wikipedia, "Dissolve (filmmaking)") | Today's dim to 85% black reads as an ending. A break becomes the van Wijk hop, a cross-dissolve of the clock, and "40 min later" at the hop's apex for ~1.5 s | fits |
| **Match on position**: two shots joined by a shared element | Verified (Wikipedia, "Match cut") | The walker is the matched element: unchanged size and look through the hop, the trace before the break left drawn | fits |
| **Text bridge** (intertitle) | Common practice; from memory | In 300 ms, held 1.5 s, out by `lineAfter`; words, never a ticking clock or odometer | fits if tempered |

## Animation principles

Frank Thomas and Ollie Johnston, *The Illusion of Life* (1981), pp. 47-69; verified (Wikipedia, "Twelve basic
principles of animation"). Material curves from `material-components-android` `docs/theming/Motion.md`, verified.

| Principle | Applied to the replay | Verdict |
|---|---|---|
| **Slow in, slow out** | Ease only where the walker really stopped (a moment, a break, the end); constant speed through a leg with nothing on it, or the walker brakes at every corner like a car. Camera at rest at both ends: cubic-bezier(0.45, 0, 0.55, 1). Entering: emphasized-decelerate (0.05, 0.7, 0.1, 1). Leaving: emphasized-accelerate (0.3, 0, 0.8, 0.15) | fits |
| **Anticipation** | The walker slows into a pin over ~500 ms; the pin brightens ~150 ms before its card grows; a hop's dotted line draws before the walker takes it. No wind-up squash | fits if tempered |
| **Staging**: one idea at a time | While a photo or memo is up the walker stands, whispers and new bubbles wait, the map takes a 25-35% scrim (not 85%); never two entrances at once | fits |
| **Follow-through, overlapping action** | Stagger related motion 60-120 ms: the card shrinks to its pin, ~100 ms later its copy lands on the edge stack, the stack's older pieces shift 2-4 px | fits if tempered |
| **Arcs** | The camera's path is already an arc in zoom-pan space. The walker's hop stays straight and dotted: the way between is unknown, and a curve reads as flight | camera fits; a curved hop is to avoid |
| **Secondary action, the moving hold** (Richard Williams, *The Animator's Survival Kit*; from memory) | A photo's hold drifts 1.00 → 1.03 so it never goes dead (see Ken Burns) | fits if tempered |
| **Springs and bounce** | Overshoot ≈ e^(−ζπ/√(1−ζ²)). `MOTION.spring` (damping 28, stiffness 240) is ζ ≈ 0.90, ~0.15%: effectively critical, the default. A thumbnail settling on the stack at ζ ≈ 0.8 (damping ≈ 25) overshoots ~1.5%: felt as landing, not seen as a bounce. Below ζ ≈ 0.7 (> ~4.5%) or any second oscillation reads as celebration. Never on a card's entrance, the end card, text or the camera. SwiftUI's default bounce is 0 (WWDC23 "Animate with springs"; from memory) | the stack's settle fits if tempered; exaggeration and squash, avoid |

## Media dwell and pacing

| Principle | Source | Applied to the replay | Verdict |
|---|---|---|---|
| **Ken Burns effect**: a slow pan and zoom over a still | Verified (Wikipedia); no speed given | At most 3% over the hold, centred, no pan that crops a face; off with reduce motion; dropped if it reads as chrome | fits if tempered |
| **Hold, beat, breath** | Editing practice, Pearlman; from memory | ~200 ms before a moment opens, ~300 ms after it closes, 0.8-1.2 s after a memo or video, 1 s at the end before the pull-back | fits |
| **Dwell for mixed media** | Subtitle reading speed ~160-180 wpm (BBC guidelines; from memory). Apple Photos Memories users complain each photo shows "only a few seconds" with no way to lengthen it (Apple Community; verified via search) | Photo: 4.5 s alone, 5-5.5 s for the first and one after a long stretch; a cluster 4.5, 3.5, 3, last 4 s, card to card by a 300 ms cross-dissolve. Note: 1.5 s + 0.3 s a word, at most 6 s (today 0.8 s, at most 3 s). Memo and video: in full, as now. A card grows 550 ms (today 380) and shrinks 450 ms. NN/g's 100-500 ms and Material's container transform are for taps, too clipped for a watched memory; repeated motion stays under ~600 ms | fits |
| **Residue** | (the owner's ask) | A photo's thumbnail stays on its pin for the rest of the replay; a memo leaves a small memo mark on its pin | fits |

## Openings and endings

| Principle | Source | Applied to the replay | Verdict |
|---|---|---|---|
| **Establishing open, resolving close, held last frame** | Verified (Wikipedia, "Establishing shot"); bookend and held frame from memory | Open on the whole trace ghosted at ~20%, no moments: the promise. Close on the same framing, trace at full strength, studded with thumbnails: the payoff (the edge stack returns to its places). The close is slower than the open (dive ~2.2 s, pull-back ~3 s); the last frame holds ≥ 4 s before the card. No count-up, no big number; any line from `quietLines` | fits |

## Sound

| Principle | Source | Applied to the replay | Verdict |
|---|---|---|---|
| **J-cut, L-cut**: the next sound starts before its picture; the last carries over the next | Verified via search | A memo's sound starts as its bubble starts its 280-400 ms entrance (never more than 300-400 ms ahead, or it reads as a glitch; `.claude/rules/captures-and-media.md` first). A video that ends naturally fades its last ~500 ms over the next glide; never one skipped | fits |
| **Silence** | Editing practice; from memory | No music bed (Apple Memories adds one): it tells the viewer what to feel and fights the voices. The path is silent, so the voices land | fits; music is to avoid |
| **Reduce motion** | Apple HIG Motion and Accessibility; from memory (page did not render) | Camera moves become 200-300 ms crossfades between still framings; cards fade in place; no drift, no spring. **Holds are not motion**: keep every dwell (`durationFor` returns 0 when reduced; never route a hold through it) | fits |

## A shot list for one walk

A 50-minute, 3 km walk: six photos (three at one place), a 25 s memo, a note, a 40-minute break.

| # | Beat | Camera | Walker and trace | Media and words | Time |
|---|---|---|---|---|---|
| 0 | Open | The whole trace, 12% padding, north-up, still | Trace ghosted ~20%, the start a small dot, no pins | Date and place, in over 400 ms | 2.5 s |
| 1 | Dive | van Wijk to the start at ~15, settling | The walker fades in over the last 300 ms | The line fades over the first 500 ms | 2.2 s + 400 ms beat |
| 2 | Glides | Lazy follow; reframe 1.2 s with lead room | Constant screen speed ~0.3 widths/s; eases only into stops | — | 1.5-3 s a leg |
| 3 | A photo | Holds; 30% scrim over 300 ms | Slows into the pin 500 ms; 200 ms beat | Grows 550 ms; holds 4.5 s drifting ≤ 3%; shrinks 450 ms to a thumbnail on its pin; +100 ms its copy settles on the edge stack (ζ ≈ 0.8) | ~6 s + 300 ms |
| 3b | Three at one place | Holds | Stands | Card to card in 300 ms dissolves; 4.5, 3.5, 4 s | ~13 s |
| 4 | A long empty stretch | Rises 1-1.3 zoom levels over 800 ms, cruises, settles 800 ms; never rotates | Faster on the ground, same on screen | — (≥ 2 s at walking zoom first after a memo) | 3-4 s |
| 5 | A 40-minute break | Pulls back until both ends fit (~1.2 s), eases in (1.2 s) | Stands; a hollow ring marks the pause; the dotted hop draws (700 ms), the walker slides it (900 ms), unchanged | "40 min later" at the apex for 1.5 s; the clock dissolves; no black | ~4-4.5 s |
| 6 | A memo | Holds, no drift | Slows into the pin; 200 ms beat | The voice starts with the bubble's 350 ms entrance; plays in full; 1 s of silence; the bubble leaves a mark on its pin | ~27 s |
| 6b | A note | Holds | Stands | Grows 550 ms; 1.5 s + 0.3 s a word (≤ 6 s) | 4-6 s |
| 7 | The last leg | Lazy follow | Never below 2.5 s; eases into the end; stands 1 s | — | ~3.5 s |
| 8 | Close | Back to the opening framing, ~3 s | Trace at full strength | Thumbnails on their pins; the edge stack fades as they return; last frame still ≥ 4 s, then the card in 400 ms | ~7.5 s |

About 2 minutes: ~40 s of path, the rest the moments' own time (the owner's "cap grows with moments", Nov 18).

## What to avoid

1. A fade or dim to black at a break: it says "the end" (dissolve grammar).
2. A rotating bearing or 3D chase-cam flyover (Relive, Strava Flyby): breaks screen direction, and is chrome; Flyby's
   comparison with other athletes is a leaderboard (VISION.md, Never).
3. Visible bounce: ζ below ~0.7, a second oscillation, a pop-in on cards, text or the end card.
4. Count-ups, odometers, a ticking clock, big numbers on the close (Never: scores, celebration).
5. Equal holds and easing on every leg: monotony, and a walker that drives.
6. Recentring on every leg, or zooming too close: the jumping.
7. Several entrances at once (bubble, whisper and stack together).
8. Squeezing moments or the lows to meet a cap: compress empty path, never dwell.
9. Moving on the instant a memo ends, or ending the instant the walker stops: no blink, no held frame.
10. A music bed.
11. A drift past ~3-5%, or a pan that crops a face.
12. Collapsing holds to zero with reduce motion: collapse motion, keep dwell.
13. Taking UI durations (100-500 ms) as limits for a watched sequence.

## Sources

Read: Wikipedia ("Twelve basic principles of animation", "Ken Burns effect", "Kuleshov effect", "Establishing shot",
"Match cut", "180-degree rule", "Dissolve (filmmaking)"); `material-components-android` `docs/theming/Motion.md`;
nngroup.com/articles/animation-duration. Checked through search: Murch's rule of six and the blink; Pearlman's
*Cutting Rhythms*; J and L cuts; van Wijk and Nuij with D3's and Polymaps' ρ; MapLibre flyTo `speed`; Apple Community
on Memories' photo timing. From memory: Apple HIG Motion and Reduce Motion; SwiftUI springs; Cutting 2010; BBC
subtitle speed; Williams' moving hold; Mapbox's `curve` 1.42; how Relive behaves.
