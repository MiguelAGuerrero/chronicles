# Chronicles: testing

How to check a change, from the seconds-long loop to the headless walk. Times
were measured in a cloud container on Nov 3, 2026. The e2e skill
(`.claude/skills/e2e/SKILL.md`) is the short how-to; this is the reference.

## 1. The fast loop: unit tests

```bash
npm test                                                      # every unit test
npx tsx --test src/lib/__tests__/rides.test.ts                # one file
npx tsx --test --test-name-pattern "rides audit" src/lib/__tests__/rides.test.ts   # tests by name
```

- `npm test` is `tsx --test src/lib/__tests__/*.test.ts` (Node's test runner,
  TAP output, summary at the end): 43 files, 457 tests, about 5 s.
- One file: `rides.test.ts` is 34 tests in about 1 s. `--test-name-pattern`
  is a regex over test names: the line above runs that file's 9
  `rides audit N` tests only.
- **Tests import only pure modules.** Node can't load React Native (Flow
  source, native modules), so nothing a test imports, even indirectly, may
  import `react-native`, Expo modules or the db. That is why `tileMath.ts`
  (pure) is split from `tiles.ts` (imports `db`): move logic to test into a
  pure file beside its screen or hook.
- **Fixtures** live in `src/lib/__tests__/`:
  - `mvtFixture.ts`: a test-only vector-tile encoder, since the tile host is
    blocked from cloud sessions. No test imports it now (its user went with
    the ambient hints); use it when a test needs decoded tiles.
  - `outAndBack.json`: the tabs e2e walk of Nov 2, 200 m out and straight
    back with a pause, as recorded (`still.test.ts`, `SNAP_RULES` 6).
  - Keep made-up traces well inside one z14 tile unless the test is about
    tile edges: at lon -71.4, lat 41.82 a tile edge is 50 m away, so the
    tests sit at lat 41.812.
  - Real OpenMapTiles data: tileserver-gl's `test_data.zip` GitHub release
    (a Zurich mbtiles) is reachable from cloud sessions.
- **Naming.** A test names what it proves, starting with the criterion it
  covers (`G4 the duration follows the fix interval, clamped`, or the id in
  parentheses: `... (R10)`). An audit finding's regression test is
  `<slice> audit N: ...` (`rides audit 3`, `tabs audit 1`, `gaps audit 2`),
  so `--test-name-pattern "<slice> audit"` runs one audit's regressions.

## 2. Typecheck and lint

```bash
npm run typecheck   # tsc --noEmit: about 37 s cold, 25 s warm
npm run lint        # expo lint (ESLint, eslint-config-expo): about 6 s
```

- Lint catches what TypeScript accepts (`import/namespace`: a wrong
  expo-location enum name once passed tsc) and the React Compiler rules.
- Lint also holds the import boundaries (`no-restricted-imports` in
  `eslint.config.js`, over `src/**` and `index.js`). Each message names the fix:
  - `Modal` from `react-native`: use `components/Modal` (react-native-web's
    leaks a portal per render under a hidden screen).
  - anything from `react-native-reanimated`: use React Native's `Animated`
    with `lib/motionTokens` and `lib/motion`.
  - `setAudioModeAsync` from `expo-audio`: use `setAudioMode` from
    `lib/audioMode`.
  - anything from `expo-haptics`: use `feedback(kind)` from `lib/motion`.
  The wrappers themselves (`components/Modal.tsx`, `lib/audioMode.native.ts`,
  `lib/haptics.ts`) are exempt.

## 3. The e2e: a headless walk of the web build

```bash
npm run export:web && npm run e2e:web
```

- `npm run export:web` builds `dist/`: about 34 s cold, 8 s with Metro's cache
  warm. The e2e serves `dist/` as it is, so **re-export after every change**.
- `scripts/e2e-web.js` serves `dist/` locally (unknown paths get `index.html`,
  like Pages' `404.html`) and drives Playwright's full Chromium headless
  (`channel: 'chromium'`: the old headless shell denies notifications).
  Playwright is not in `package.json`; it comes from the environment.
- What it fakes, in the harness only (the app has no simulation):
  - **GPS**: Playwright's `setGeolocation`, moved at 5 m/s with one fix a
    second; faster is dropped as a GPS jump.
  - **Tiles**: a fake z14 street grid near Fox Point, Providence, routed in
    place of `tiles.openfreemap.org`. The base map gets it as a GeoJSON style;
    the app's own tile reads (explore, landing) get it as real vector tiles
    through `scripts/mvt-encode.mjs`, decoded by the app's own decoder.
  - **Microphone**: Chromium's fake device. **Sound**: iOS's rule (none before
    a tap) is copied into a fresh page whose `HTMLMediaElement.prototype.play`
    refuses until a `pointerdown`.
- It also checks that nothing is requested beyond `localhost` and the tile host.

### Scenarios and switches

| `E2E_ONLY` | runs |
|---|---|
| (unset) | the full flow: the tabs, notifications, a walk with notes, photo, memo, hold-to-stop, replay, Chronicle, memories, rides, motion, deletes, the perf window, plus the `tabs`, `gaps` and `hidden` scenarios |
| `tabs` | the Navigation & tabs audit's regression checks (`tabs audit N`, U1-U15) |
| `gaps` | a walk with two GPS gaps written into storage, then a reload: one gap fills by itself, one is offered faint (G5, G6, G9, G10, G12; `window.__project`, `data-runs`, `data-faint`) |
| `hidden` | the hidden-page notice: a 70 s gap with the page on screen raises none, one spent hidden does (decision 0072; fixes and `Date.now` jump by `__shift`, visibility faked by `__vis`) |
| `marks` | an exploring walk through an area read before draws the marks it passes (Nov 2 repro) |
| `reload` | a reload with a walk minimized keeps it reachable: the bar's ›, its Stop, the tabs |
| `qol` | quality of life QL1-QL28: Locate, the scale bar, the trace's end markers, the units segment, time left while navigating, the denied-location chip (a second context without the permission), a photo's pin thumbnail, editing a note from the replay, month headers, rename from a Chronicle row (29 checks, about a minute) |

`marks`, `reload` and `qol` run **only** through `E2E_ONLY`: run the ones your
change touches as well as the full flow. Each ends with a no-console-errors check.

| variable | effect |
|---|---|
| `E2E_ONLY=<scenario>` | run one scenario alone, in a fresh browser context |
| `E2E_MILES=1` | keep the browser's en-US region, so distances default to miles; by default every context reports en-CA to the units default (QL13) |
| `E2E_SOFT=1` | a failed check prints `not ok - ...` and the run goes on; a throwing `step()` too. For seeing every failure on code from before a fix |
| `E2E_MOBILE=1` | fresh contexts get a touch screen (`isMobile`, `hasTouch`, 3x), so taps come as touches |
| `E2E_SHOTS=<dir>` | a screenshot of each screen along the way (`shot(pg, name)`) |
| `E2E_FAIL_SHOT=<file>` | the page at the failure, plus every other open page as `<file>-N.png` |
| `E2E_BASE=/chronicles` | serve and load the build under that sub-path (see below) |

Measured: `E2E_ONLY=qol npm run e2e:web` passed 19 checks in 32 s (the full
flow, several minutes, was not timed).

### How a run reads

- `check(ok, 'QL3: what it proves (values)')` prints `ok - ...` or throws
  `FAILED: ...`, ending the run with exit code 1. Id first, measured values
  in parentheses, so a failure says what it saw.
- `step(name, fn)` wraps checks that may throw; under `E2E_SOFT` it prints
  `not ok - <name>: <error's first line>` and goes on.
- A flow of its own uses `freshPage(label)` (own GPS, tile route, error
  capture); close it with `c.close()`.

### The sub-path build (GitHub Pages)

```bash
CHRONICLES_BASE_URL=/chronicles npm run export:web
E2E_BASE=/chronicles npm run e2e:web
```

`app.config.js` turns `CHRONICLES_BASE_URL` into `experiments.baseUrl`; the
harness 404s paths outside `E2E_BASE`, so an asset loaded from the root fails.
Re-export without the variable afterwards for the plain e2e.

### Traps

- A pin's tap area is 48 px: a "what happened here" press goes 30 px beside
  it. A pin on a map with no `onPinPress` is labelled without ". Open".
- Web long presses wait 300 ms so a double-tap zoom isn't also a press. A
  click within 1 s of a long press is ignored as its end: wait 1.1 s
  (`waitForTimeout(1100)`) before tapping the map after one.
- Ionicons draw private-use glyphs that print as nothing. Compare through the
  font's glyph map: `glyph('pause')`, and `iconOf(text)` in messages.
- `shownCount(pg, sel)` skips elements under `[aria-hidden=true]` (the tabs
  behind the one in front). The walker puck is `aria-hidden` itself: count it
  directly. The scale bar is `aria-hidden` too.
- Reduced motion: `emulateMedia({ reducedMotion: 'reduce' })`. A mouse drag
  on a moving element reads as a tap: drag a moving sheet with CDP touch
  events (`Input.dispatchTouchEvent`). A mouse drag doesn't pan the home map.
- `window.__perf = {}` (in `addInitScript`) turns on `perfCount`: renders,
  `setData`, camera moves, `fit`, and the puck's `data-at`. The busy window
  fails above 2.5 walk-screen renders a second. `window.__enters` and
  `window.__lifts` record motion entrances.
- Map facts are data attributes written straight to the DOM, never renders:
  `data-zoom`, `data-rides`, `data-ends`, `data-center`, `data-walker`,
  `data-runs`, `data-faint`; `data-ids` on memory pins.
- There is one `canvas.maplibregl-canvas` during a walk and after it (the home
  map is taken down while it isn't focused). A leak check counts `<body>`'s
  children and CDP listeners across the walk; a `Modal` from `react-native` is
  the usual cause.
- A Playwright double click on the recording bar never reaches it twice (the
  bar is gone after the first push), so that regression is a unit test.
- Each capture adds a replay stop: loop on Continue. Captions are checked
  through their aria-label after the photo's size loaded.

## 4. The long walk: `scripts/perf-walk.js`

```bash
npm run export:web && PERF_MIN=3 node scripts/perf-walk.js
```

A memory and CPU harness, not a pass/fail test. It walks a dense fake downtown
(streets every 80 m, 600 places) at 2.5 m/s with a photo every two minutes,
and prints a JSON line every 30 s: heap, nodes, listeners, markers, CPU,
layout and style time, `perfCount` rates. Look for a column that only grows.

- `PERF_MIN`: minutes walked (default 10).
- `PERF_SEED=<n>`: n fixes of history first, for a long walk.
- `PERF_PROFILE=<file>`: a CPU profile of the walking part, with the top
  functions printed (export with `--no-minify` for readable names).
- It serves `dist/` from the root only (no `CHRONICLES_BASE_URL` build). Its
  scan step clicks `[data-testid=scan]`, retired with scan, and is skipped.

## 5. CI

`.github/workflows/pages.yml` runs on pushes to `main`: `npm ci`, typecheck,
`npm test`, the `/chronicles` export and the deploy. **Lint and the e2e are
not in CI**: they are the agent's job before merging.

## 6. Before calling work done

```bash
npm run typecheck && npm run lint && npm test
npm run export:web && npm run e2e:web    # plus E2E_ONLY=<scenario> for marks, reload, qol when touched
```

The Stop hook (`.claude/hooks/check-done.sh`) runs only the typecheck, and
only when `.ts`/`.tsx` files changed since `HEAD`: it blocks the end of a turn
on a type error. Lint, the unit tests and the e2e stay the agent's job.

## 7. What this proves, and what it doesn't

Native has never run on a device. The unit tests prove pure logic and the e2e
the web build in Chromium; neither runs `*.native.ts(x)`, SQLite migrations,
the background task or MapLibre RN. Say so in any report touching native code.

## Spec traceability

`npm run check:specs` (`scripts/check-specs.js`) lists the criterion ids in
`specs/*/spec.md` that no unit test or e2e step names. It is a report, not a
gate (it always exits 0): retired ids and unbuilt rounds show up too. Run it
at the end of a slice; a criterion of the slice that shows up is missing its
test.

## The docs check

`npm run check:docs` (`scripts/check-docs.js`, about 0.1 s) fails when:

- `AGENTS.md` passes 200 lines or 12,000 bytes. It loads into every session;
  bytes are the real cost, since long lines dodge a line count.
- A rule file passes 40,000 characters (Claude sees only its start), or a
  skill passes 500 lines.
- A `paths:` glob in `.claude/rules/*.md` matches no file, so that rule never
  loads.
- A path named in backticks in `AGENTS.md`, `README.md`, the rule files,
  skills, agents, or `docs/` (except `STATUS.md`, `decisions/` and research
  notes) doesn't exist. Short module names count: `lib/quietLines` resolves
  against `src/`, `src/lib/`, `src/components/` and `src/app/`.

It runs in CI before the export, so a failure blocks the Pages deploy, and in
the Stop hook, so an agent fixes it in the same turn. Each failure says what
to do.
