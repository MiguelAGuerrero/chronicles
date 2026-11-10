---
name: e2e
description: Run the headless web end-to-end (export, then scripts/e2e-web.js with mocked GPS and a fake street grid), pick a scenario with E2E_ONLY, and add steps and checks the repo's way. Use when running, debugging or extending the e2e, or when a screen needs a test.
when_to_use: Running the e2e, a failing e2e check, adding an e2e step for a criterion, checking a screen change, a sub-path (GitHub Pages) build.
argument-hint: [scenario]
---

# e2e: $ARGUMENTS

**Run less, not more.** A journey that already passed on exactly these inputs prints "already green"
and exits (`E2E_FORCE=1` runs it anyway); `npm run check:e2e` lists what a change needs; a failure
that may be a flake gets one `npm run e2e:baseline -- <journey>` on `main`, not reruns on the branch
(docs/TESTING.md, "The e2e's economy").

The web build is exported, served from `dist/` by the script, and driven by
Playwright's full Chromium (`channel: 'chromium'`; the old headless shell
denies notifications). GPS is mocked, the tile host is replaced by a fake
z14 street grid near Fox Point, Providence, and a fake microphone records
memos. The app itself has no simulation. The rest is in `docs/TESTING.md`.

## Run

```bash
npm run export:web && E2E_ONLY=<journey> npm run e2e:web   # one journey, fresh browser: the normal run
npm run export:web && npm run e2e:web                 # the whole flow, about 15 minutes: only when the owner asks (decision 0074)
CHRONICLES_BASE_URL=/chronicles npm run export:web && E2E_BASE=/chronicles npm run e2e:web   # the Pages sub-path build
```

Re-export after every code change; the script reads `dist/` as it is.
A run exits non-zero on the first failed check and prints `ok - ...` lines.

### Scenarios (`E2E_ONLY`)

| value | runs |
|---|---|
| (unset) | the full flow: Navigate, a walk with notes, photo, memo, hold-to-stop, replay, Chronicle, memories, rides, motion, deletes, notifications, the perf window, plus the `tabs` and `gaps` scenarios (`marks`, `reload` and `qol` run only by name) |
| `tabs` | the Navigation & tabs audit's regression checks (`tabs audit N`, U1-U15) |
| `marks` | an exploring walk through an area read before draws the marks it passes (Nov 2 repro) |
| `reload` | a reload with a walk minimized keeps the walk reachable: the bar's ›, its Stop, the tabs |
| `qol` | map staples QL1-QL12: Locate, the scale bar, the trace's end markers |
| `gaps` | a walk with two GPS gaps written into storage, then a reload: one gap fills by itself, one is offered faint (G5, G6, G9, G10, G12; `window.__project`, `data-runs`, `data-faint`) |
| `launch` | the launch: `/explore` and stale links, the tabs at their paths (NV1-NV6, NV11, NV16), manifest and service worker (NT1, NT2); then Walk here, a reload minimized, Start with Explore in fresh browsers (NV8, NV12, NV15, NV25) |
| `walk` | the first walk: the ready bar's settings, 300 m with a note, reminder, photo, memo and video, hold-to-stop, the budgets, the replay. Ends on its card |
| `chronicle` | after `walk`: placing, the card, naming, Chronicle's star, sheet and map view, the walks list, playback, reduce motion, the bar's spring |
| `notifications` | after `walk`: a reminder tapped on Chronicle and from another tab (NV13), bulk placement (H8) |
| `atlas` | after `walk`: the place view (E10), the atlas grid, tiles and card drawer (AT1-AT14), a town page, busy streets |
| `memories` | after `walk`: Walk here from a star, the reminder firing, memory pins and previews (MR3, MR4), a bus ride. Ends on the ride walk's card |
| `deletion` | after `walk` and `memories`: clearing walks and moments (D1-D11) |
| `days` | Moments and days (M1-M17), a browser of its own |
| `sensors` | motion from the sensors (MO1, MO5, MO8), a browser of its own |
| `outlines`, `grading`, `replay`, `edit` | town outlines and borders (TO3, TO10, TO12, TB1, TB2, TB11), atlas grading (AG3), replay rhythm (RR6-RR16, RR19, RR24), media editing (ME1-ME23); by name only, not in the full flow |

Add a scenario as one file, `scripts/e2e/journeys/<name>.js`, exporting
`{ name, covers, run }`: `name` equal to the file name, `covers` the source
globs it checks (what `check:affected` reads; `affected.test.ts` fails without
it), and `async run(h)` with `const { check, freshPage, ... } = h;` at the top,
taking what it needs from the harness (`scripts/e2e/harness.js`: the GPS
`start`, `at`, `navUrl`, `drawerTo`, `tabTo`, `metaOf`, `openWalk`, the tile
switches `tiles.delayMs` and `tiles.stall`). Require at the file's top any Node
module the journey uses itself (`fs`, `path`): the harness passes only its own
helpers, and a missing one fails only in the step that reaches it. The file is the registration;
the entry ends it with the nothing-leaves check (nothing sent beyond localhost,
the tile host and Overture) and the no-console-errors check itself. Add a row here too. A
slice that changes a screen adds or extends a journey this way for its own
change: keep it to what the screen shows; write order, retries and guards
belong in shell tests. The full flow is `scripts/e2e/journeys/full.js`.

### Switches

- `E2E_SOFT=1`: a failed check or a throwing step is reported (`not ok - ...`)
  and the run goes on, to see every failure on code from before a fix.
- `E2E_MOBILE=1`: a touch screen (`isMobile`, `hasTouch`, 3x) in fresh-browser
  scenarios, so taps come as touches.
- `E2E_SHOTS=<dir>`: a screenshot of each screen along the way (`shot(pg, name)`).
- `E2E_FAIL_SHOT=<file>`: the page at the failure, plus the other open pages
  as `<file>-N.png`.

## Add a step and a check

- `check(ok, 'QL3: what it proves (values)')`: one line per criterion, the id
  first, the measured values in parentheses so a failure says what it saw.
- `step('rides audit 4 ...', async () => { ... })`: groups checks that may
  throw (an element missing on old code) so `E2E_SOFT` reports and goes on.
- A flow of its own gets `freshPage('<label>')`: a new context with its own
  GPS, tile route and console-error capture; close it with `c.close()`.
- Move the walker with the script's GPS helpers at 5 m/s, one fix a second:
  faster is dropped as a GPS jump.
- Find elements by `[data-testid=<kebab-name>]`. Add a `testID` to the
  component, never a text match for a button. Map facts come through data
  attributes written straight to the DOM: `data-zoom`, `data-rides`, `data-at`
  on the walker puck (only with `window.__perf` set), `data-ids` on memory pins.
- A `SwitchRow`'s state is `[data-testid=x] input` (`isChecked()`); tap the row.
- Read storage straight from IndexedDB (`openWalk`, `rows`, `setMeta` in the
  script) rather than through the UI.

## Traps

- A pin's tap area is 48 px: a "what happened here" press goes 30 px beside it.
- A click within 1 s of a long press is ignored as its end: wait 1.1 s
  (`waitForTimeout(1100)`) before tapping the map after one. Web long presses
  also wait 300 ms for a double-tap.
- Ionicons draw private-use glyphs that print as nothing: compare with
  `glyph('pause')` from the font's glyph map, `iconOf(text)` in messages.
- Motion: `emulateMedia({ reducedMotion: 'reduce' })`. A mouse drag on a moving
  element is cancelled and reads as a tap: drag a moving sheet with CDP touch
  events (`newCDPSession` + `Input.dispatchTouchEvent`), as on a phone.
- `window.__perf` (set in `addInitScript`) turns on `perfCount`: renders,
  map `setData`, camera moves, `fit`. The busy window fails above 2.5 renders
  a second; `window.__enters` records each motion entrance.
- One `canvas.maplibregl-canvas` during a walk and after it: the home map is
  taken down while the home isn't focused.
- The walker puck is `aria-hidden`: count it directly, not with `shownCount`.
- A pin on a map with no `onPinPress` is labelled without ". Open".
- A Playwright double click on the recording bar never reaches it twice (the
  bar is gone after the first push); that regression lives in a unit test.
- Captions are checked through their aria-label after the photo's size loaded.
- Each capture adds a replay stop: loop on Continue.
- Sound: the run copies iOS's rule (no sound before a tap) by overriding
  `HTMLMediaElement.prototype.play`; a refused memo moves on after 4 s.
- A leak check counts `<body>` children and CDP listeners across the walk:
  a Modal from react-native is the usual cause (use `components/Modal`).

## Debug

1. `E2E_SOFT=1 E2E_FAIL_SHOT=/tmp/e2e.png E2E_ONLY=<scenario> npm run e2e:web`.
2. Read the failed check's values, then the screenshot.
3. `page.evaluate` against the DOM or IndexedDB for the state; don't add
   waits longer than the app's own timings without a comment saying which.
