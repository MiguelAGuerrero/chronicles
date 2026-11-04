# Chronicles: testing

How to check a change, from the seconds-long loop to the headless walk. Times
were measured in a cloud container on Nov 3, 2026. The e2e skill
(`.claude/skills/e2e/SKILL.md`) is the short how-to; this is the reference.

## 0. The inner loop: what a change can break

```bash
npm run check:affected   # layers, affected unit tests, typecheck, affected lint; then the e2e journeys to run
npm run test:affected    # only the unit tests that import a changed file, directly or not
npm run test:feature <name> [<name> ...]   # one feature's tests, whole (src/lib/__tests__/<name>/)
npm run test:coverage [<name> ...]         # those tests, with line, branch and function coverage of the features' own sources
npm run lint:affected    # only the changed files that npm run lint covers (src, index.js)
```

- **Features.** `scripts/features.js` is the one map from a feature to what it
  owns: source globs, e2e journeys, specs, its rule file (decision 0091,
  `specs/test-organization/spec.md`). A feature's unit tests are the folder of
  the same name under `src/lib/__tests__/`; `arch/` holds the tree-wide checks
  and `storage/` the Db contract. `arch/features.test.ts` holds the map to the
  tree: every source file in a feature, every test folder a feature, every
  journey and spec claimed, each rule loading for its folder. A new feature is
  a folder and a row; a file in no feature fails that test and is named by
  `check:affected`.

- **Changed** is everything that differs from the merge base with
  `origin/main` (or `main`): the branch's commits, edits, new files, renames
  and deletes (`scripts/affected.js`). With no main to compare with,
  everything runs.
- **Which tests:** each test file that imports a changed file through any
  import (type-only, `import()`, a platform split, JSON included), shortest
  chain printed, listed under its feature. Type-only edges are followed on
  purpose (AC2; the owner, Nov 4): a renamed field fails a named test, not
  only `tsc`. The cost is selection breadth (`types.ts` reaches most files;
  `days.test.ts` reaches storage through `import type`), small while the
  whole suite runs in about 13 s.
- **Coverage** (`test:coverage`, TD2): Node's built-in coverage under tsx,
  limited to the named features' source globs from `scripts/features.js`
  (every file under `src/lib` with no name). A report, never a gate: no
  threshold is set, and CI and the hook don't run it. Node lists only files
  a test loads, so a module no test reaches is absent rather than at 0%.
- **Covered by nothing:** a changed source file that no unit test reaches and
  no journey row covers is named, with its layer and features, in words apart
  from "nothing to run". A shell gets a test over `fakePorts()`, a core module
  a unit test, a screen a check in its feature's journey. A file that only
  builds a shell's app instance says `// @instance: <what>` on its second line
  and counts as covered when the shell it builds from is tested. A test that reads the whole tree instead of importing it
  (the layer check, the meta-key scan) starts with `// @tree-wide: <what it
  reads>` and runs on any change under `src/` or `scripts/`. Mark a new one
  so, or it will be skipped.
- **Everything runs** when the harness changes: `package.json`, the lockfile,
  `tsconfig.json`, `eslint.config.js`, `eslint-suppressions.json`,
  `scripts/layers.js`, `fakes/`, or any non-test file at the root of
  `src/lib/__tests__/` (the contract suite, `foxPoint.ts`, `metaKeys.ts`). A
  fixture inside a feature folder selects only the tests that import it.
- **E2E:** each journey is a file under `scripts/e2e/journeys/` that exports
  its name, the files it covers and its run; `scripts/e2e-scenarios.js` reads
  the folder. `check:affected` names the journeys to run, with the feature
  that owns each, and the changed screens no journey covers (add a check to
  the feature's journey if the slice changes what they show). The full flow
  (`journeys/full.js`) runs only when the owner asks and has no row.
- The end of a slice adds the whole unit suite, lint and the typecheck
  (section 6); CI runs them on every push to `main`.

## 1. The fast loop: unit tests

```bash
npm test                                                      # every unit test
npm run test:feature rides                                    # one feature's folder
npx tsx --test src/lib/__tests__/rides/rides.test.ts          # one file
npx tsx --test --test-name-pattern "rides audit" src/lib/__tests__/rides/rides.test.ts   # tests by name
```

- `npm test` is `tsx --test 'src/lib/__tests__/**/*.test.ts'` (Node's test
  runner, TAP output, summary at the end): 21 folders, 74 files, about 790
  tests, about 13 s.
- **Layout:** one folder per feature of `scripts/features.js` (`recording`,
  `rides`, `streets`, `gaps`, `navigation`, `replay`, `moments`,
  `walk-screen`, `tabs`, `explore`, `landing`, `places`, `map`, `captures`,
  `chronicle`, `motion`, `notify`, `deletion`, `memories`), plus `arch/` (the
  layers, the meta keys, the functional-core audit, the affected checks, the
  feature map, the fakes' and the store's own tests) and `storage/` (the Db
  contract). Shared helpers stay at the root: `fakes/`, `dbContract.ts`,
  `metaKeys.ts`, `mvtFixture.ts`, `foxPoint.ts` (a street grid and
  `walkAlong`, used by four features), `layers.baseline.json`. A test goes in
  the folder of the feature it proves; a file that proves two belongs to the
  one whose module it imports most, and names both specs' ids.
- One file: `rides/rides.test.ts` is 34 tests in about 1 s. `--test-name-pattern`
  is a regex over test names: the line above runs that file's 9
  `rides audit N` tests only.
- **Tests import only core modules, fakes and types.** Node can't load React
  Native (Flow source, native modules), so nothing a test imports, even
  indirectly, may import `react-native`, Expo modules or the db. That is why
  `tileMath.ts` (core) is split from `tiles.ts` (a shell; imports `db`): move
  logic to test into a core module beside its screen or hook.
- **Layers** (`layers.test.ts`, `.claude/rules/functional-core.md`): every
  `src/lib` module starts with `// @layer core|shell|adapter|view`, and a core
  module imports only core. A failure names the file, the import, what it
  reaches and the fix. Known violations are in `layers.baseline.json`, which
  only shrinks: fixing one fails the test until its line is deleted.
- **Shell tests** run a shell against `fakePorts()` (`__tests__/fakes`):
  `memoryDb()`, a fake recorder and notifier, a clock that moves only when
  told (`clock.advance(ms)`) and counting ids, sharing one call log.
  `failNext(method, error)` fails the next call to one method. Assert the end
  state (what `memoryDb` and the store hold); `log.effects()` lists the calls
  that changed something, in order, for when order is the requirement.
  Files in `__tests__/fakes/` are helpers, not tests.
- **The Db contract** (`dbContract.ts`, run by `db.contract.test.ts`) holds
  `memoryDb()` and the IndexedDB store (`db/index.web.ts` over
  fake-indexeddb, a fresh module per case, since it caches its connection)
  to the same cases. Every `Db` method needs a case (`FC7 every Db method has
  a contract case`). The SQLite adapter can't run in Node.
- **Fixtures** live in `src/lib/__tests__/`:
  - `mvtFixture.ts`: a test-only vector-tile encoder, since the tile host is
    blocked from cloud sessions. No test imports it now (its user went with
    the ambient hints); use it when a test needs decoded tiles.
  - `recording/outAndBack.json`: the tabs e2e walk of Nov 2, 200 m out and
    straight back with a pause, as recorded (`still.test.ts`, `SNAP_RULES` 6);
    `recording/eastonSlow.json` and `landing/phillipsburg.json` are real
    traces and places beside the tests that read them.
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
- Lint holds the layers too: in core modules, the clock, randomness, timers
  and module-level `let`/`var`; in views (`src/app`, `src/components`, view
  hooks), imports of the `db`, `recorder`, `notifier` or `ports` (under
  `no-restricted-syntax`, its own rule). Known violations are
  counted per file and rule in `eslint-suppressions.json` (ESLint's bulk
  suppressions). After fixing some, `npx eslint src index.js
  --prune-suppressions`; a stale count fails lint. Never `--suppress-all`.

## 3. The e2e: a headless walk of the web build

```bash
npm run export:web && npm run e2e:web
```

- `npm run export:web` builds `dist/`: about 34 s cold, 8 s with Metro's cache
  warm. The e2e serves `dist/` as it is, so **re-export after every change**.
- `scripts/e2e-web.js` is the entry: it builds the harness and runs one
  journey (`E2E_ONLY=<name>`, the file `scripts/e2e/journeys/<name>.js`) or
  the full flow (`scripts/e2e/journeys/full.js`). The harness
  (`scripts/e2e/harness.js`) serves `dist/` locally (unknown paths get
  `index.html`, like Pages' `404.html`), drives Playwright's full Chromium
  headless (`channel: 'chromium'`: the old headless shell denies
  notifications) and holds the helpers every journey shares (`freshPage`,
  `check`, `drawerTo`, `tabTo`, the GPS start, the tile routes); a journey
  destructures what it uses from the one object `run(h)` receives. Playwright
  is not in `package.json`; it comes from the environment.
- A journey file exports `{ name, covers, run }`: `name` equals its file name,
  `covers` the source globs it checks (what `check:affected` reads), `run(h)`
  the checks. The file is its registration: `scripts/e2e-scenarios.js` reads
  the folder. `full.js` exports `full: true` and no `covers`.
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
| (unset) | the full flow (`scripts/e2e/journeys/full.js`): every journey's `checks` once, in the order of the one story: `launch`, `walk`, `chronicle`, `notifications`, `atlas`, `memories`, `days`, `sensors`, the fresh-browser flows, then `tabs`, `gaps`, `ready`, `hidden`, `nudge`, then `deletion`; about 15 minutes |
| `launch` | the launch (NV1-NV6, NV11, NV16, NT1, NT2): the old `/explore` path, stale replay and day links, each tab at its path with one live map, the manifest and the service worker; then in fresh browsers Walk here from Explore (NV12, NV15), a reload with a walk minimized (NV8) and Start with Explore and a destination (NV25) |
| `walk` | the first walk: the ready bar's settings (NR7, NV20-NV24, NT4, NV23), the hint and M7 banners, 300 m at 5 m/s with a note, a reminder, a captioned photo, a voice memo, a video, arrival, hold-to-stop, the leak and render budgets, and the replay with its stops and captions. Ends on the walk's card; the next four start there |
| `chronicle` | after the walk (runs `walk` first when alone): placing and places of interest (D1), the card's finds and low (E11, U13), naming, Chronicle's star and sheet (H1, H5, H6, H7, NV27), the map view across a replay and the tabs (NV3, NV4), the walks list (M6), muted playback, reduce motion (M2), the ready bar's spring (NR7, NR9) |
| `notifications` | after the walk: a reminder tapped with Chronicle in front, and from another tab (NV13); bulk placement behind a cover (H8) |
| `atlas` | after the walk: the place view's checklist (E10), the atlas grid and tiles (AT1-AT14), the area card drawer, a town page, landing's busy streets (AD) |
| `memories` | after the walk: Walk here from a star (N11), the walk back along the first route, the reminder firing once (R6, R9), memory pins and previews (MR3, MR4), a cold-open notice, a bus ride (R6). Ends on the ride walk's card |
| `deletion` | after `walk` and `memories`: clearing walks and moments (D1-D11), the GPS log from More, undo, what is left, later walks' new streets (D7) |
| `days` | Moments and days (M1-M17) in a browser of its own, nothing kept yet |
| `sensors` | motion from the phone's sensors (MO1, MO5, MO8) in a browser of its own |
| `tabs` | the Navigation & tabs audit's regression checks (`tabs audit N`, U1-U15) |
| `gaps` | a walk with two GPS gaps written into storage, then a reload: one gap fills by itself, one is offered faint (G5, G6, G9, G10, G12; `window.__project`, `data-runs`, `data-faint`) |
| `hidden` | the hidden-page notice: a 70 s gap with the page on screen raises none, one spent hidden does (decision 0072; fixes and `Date.now` jump by `__shift`, visibility faked by `__vis`) |
| `ready` | Navigate, ready (NR1-NR13): the ready walk screen at launch, the chevron back to the tab beneath, the bar pulled up, a destination line, a memo in the stack, Start in place (boxes unchanged), a moment before and a capture after, NR11's overlaps at 375×667 with every edge button up, the web note and a denied location (29 checks, about three minutes) |
| `nudge` | the pocket alert (PA2, PA3, PA5, PA6), in a touch context (`freshPage(..., { touch: true })`, so the switch is offered): `navigator.vibrate` recorded by an init script; an exploring walk gives one double-tap as the first "?" comes into range, Start gives none, a quiet walk none. The exploring walk goes first: a walk that starts where the last ended, by the memorial, finds it already named |
| `marks` | an exploring walk through an area read before draws the marks it passes (Nov 2 repro) |
| `outlines` | town outlines and borders (TO3, TO10, TO12, TB1, TB2): a fake divisions archive (z12 and z10) with Pawtucket's outline around the start and Central Falls beside it; the Explore title names Pawtucket, and Providence (the nearest point) when no outline holds you; the map's `data-borders` says Pawtucket tinted and Central Falls lined, on Explore and the town page. Elsewhere the archive holds no towns, so a 404 never counts as a console error |
| `grading` | atlas grading (AG3): a thin ring 6 km west (Quiet Hollow, one café) shows no kinds and no character line on its tile, and no kind rows on its card |
| `replay` | replay rhythm (RR6-RR16, RR19): a seeded walk with a captioned photo, a note, a memo, a 20-minute gap and a long stretch, watched with no taps but the ones it checks; then its day. Video sound is refused as iOS does, so the journey drops that one expected console error |
| `edit` | media editing (ME1-ME23): the Edit offer on all three capture places, every tool on a photo and a video, what is stored, what the viewer shows, and what Download saves |
| `reload` | a reload with a walk minimized keeps it reachable: the bar's ›, its Stop, the tabs |
| `qol` | quality of life QL1-QL28: Locate, the scale bar, the trace's end markers, the units segment, time left while navigating, the denied-location chip (a second context without the permission), a photo's pin thumbnail, editing a note from the replay, month headers, rename from a Chronicle row (29 checks, about a minute) |

`marks`, `outlines`, `grading`, `replay`, `edit`, `reload` and `qol` are not
part of the full flow: they run only by name.

Every journey has a `covers` list, so `check:affected` names the ones a change
touches. A journey that continues the story (`chronicle`, `notifications`,
`atlas`, `memories`, `deletion`) exports `checks(h)`, the block as the full
flow runs it, and `run(h)`, which runs its prerequisites first (`walk`, and
for `deletion` the `memories` checks) and, where the walk's card is not where
it begins, a short `arrive` to Chronicle that does nothing in the full flow.
The entry ends each named journey with the nothing-leaves-the-device and
no-console-errors checks (`h.nothingLeaves()`, `h.noConsoleErrors()`).

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

- Run journeys one at a time. Two at once on one machine failed timing checks
  that pass alone (the first walk's video pin label, a walk started from the
  home saying it is recording; Nov 4 deploy).
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
- The area card's grip: a short mouse pull springs back fine, but a second
  mouse pull on it never returns (`page.mouse.move` waits forever on its
  first step; the page stops answering, Nov 4). The `atlas` journey pulls it
  the length of the screen with CDP touch events instead.
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

- `data-center` is the canvas's middle, not the middle of what you see: a
  screen that fits with uneven padding (Explore: 84 px under its title, 24 px
  at the bottom) frames the fix (top - bottom) / 2 px below it. Measure a
  framing in pixels against the padding (`qol QL10`), not in metres from
  `data-center`.
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

`.github/workflows/pages.yml` runs on pushes to `main`: `npm ci`,
`check:docs`, typecheck, `npm test`, lint, the `/chronicles` export and the
deploy. **The e2e is not in CI** (it needs a browser and takes about 15
minutes): it is the agent's job before merging.

## 6. Before calling work done

```bash
npm run typecheck && npm run lint && npm test
npm run check:affected                                  # names the e2e journeys for what changed, and what nothing covers
npm run test:feature <feature>                          # the slice's feature, whole
npm run export:web && E2E_ONLY=<journey> npm run e2e:web   # each journey it names
```

A slice that changes a screen adds or extends its own journey (`/e2e`); one
that changes no screen runs no e2e. The full flow (no `E2E_ONLY`, about 15
minutes) and `/audit` run only when the owner asks (decision 0074).

The Stop hook (`.claude/hooks/check-done.sh`) runs `check:docs` on any
change; with `.ts`/`.tsx` changed, the typecheck; and with TypeScript or a
script under `scripts/` changed, the layer check and the affected unit tests,
the tree-wide ones included (`node scripts/affected.js hook`, TG13): it blocks
the end of a turn on any of them. `check:docs` also fails when a new spec
shares a criterion prefix with another, or two decision records share a
number (`scripts/collisions.js`, TG14, TG15).

**A test from an old branch** (made before the feature folders) lands at the
root of `src/lib/__tests__/`, and `arch/features.test.ts` names it. Move it
with `npm run move-test <file> <feature>`: each relative path is resolved from
the old folder and written again from the new one (TG16).

## 7. What this proves, and what it doesn't

Native has never run on a device. The unit tests prove pure logic and the e2e
the web build in Chromium; neither runs `*.native.ts(x)`, SQLite migrations,
the background task or MapLibre RN. Say so in any report touching native code.

## Spec traceability

`npm run check:specs` (`scripts/check-specs.js`) lists the criterion ids in
`specs/*/spec.md` that no unit test or e2e file names. A prefix two specs
share (M, R, D) is looked for only in the folders of the features that list
each spec (`scripts/features.js`), so `R1` in `src/lib/__tests__/explore/recall.test.ts` counts
for v1-discovery and not for rides. Ids the app retired are declared in
`RETIRED` there, with who retired them, and listed apart from live ids. It is
a report by default (exit 0); `--feature <name>` reports one feature's specs,
`--strict` exits 1 on a live id with no test. A retired id counts as still
tested only where a test's name or an e2e check or step names it (TD1), never
a comment or an assertion message (not in CI or the hook: the
owner's call when the live list is empty). Run it at the end of a slice; a
criterion of the slice that shows up is missing its test.

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
