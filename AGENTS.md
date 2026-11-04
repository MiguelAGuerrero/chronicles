This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing any code that touches an Expo, EAS, or React Native API: read the `expo` major in `package.json`, then read the API from `node_modules/<module>/build/*.d.ts` (the docs hosts `docs.expo.dev` and `api.expo.dev` are blocked from cloud sessions; where reachable, `https://docs.expo.dev/versions/v<major>.0.0/` and `https://docs.expo.dev/llms.txt`). Never answer from memory.

## Commands

```bash
EXPO_OFFLINE=1 npx expo install <package>   # never npm/yarn add; offline resolves from the installed expo
npm run check:affected                      # the inner loop: layers, the tests that import what changed, typecheck, lint; names the e2e scenarios
npm run typecheck                           # tsc --noEmit, incremental: ~22 s cold, ~5 s after
npm run lint                                # expo lint, ~40 s; includes the import boundaries below
npm test                                    # every unit test, ~13 s; npm run test:affected for those a change reaches
npm run test:feature <feature>              # one feature's folder (src/lib/__tests__/<feature>/); scripts/features.js is the map; test:coverage adds coverage
npm run export:web && E2E_ONLY=<journey> npm run e2e:web   # one e2e journey; the full flow (no E2E_ONLY) only when the owner asks
npm run check:docs                          # this file's budget, rule globs, paths the docs name; CI runs it too
npx expo-doctor                             # dependency and config issues; npx expo install --fix for versions
```

While working, run `npm run check:affected`; before declaring a task done, typecheck, lint, `npm test` and the e2e journeys `check:affected` names (decision 0074). A Stop hook (`.claude/hooks/check-done.sh`) refuses to end a turn that changed the repo while `npm run check:docs` fails or, with TypeScript changed, while the typecheck, the layer check or the affected unit tests fail; CI blocks the deploy on the docs check, the typecheck, `npm test` or lint.

Routing is Expo Router: routes live in `src/app/`, `_layout.tsx` files are navigators, non-route code stays outside `src/app/`. Import `Link`, `router` and `useLocalSearchParams` from `expo-router`; open the walk screen with `showWalk()` (`lib/walkNav`), never `router.push('/walk')`. `ios/` and `android/` are generated (never edit them; a hook blocks it); native behaviour is configured in `app.json` and config plugins. Native code needs a development build (`npx expo run:ios`, or `npx eas-cli@latest build --profile development`), never Expo Go. EAS builds, submits and ships over-the-air updates in the cloud (`npx eas-cli@latest build | submit | update`); there is no `eas.json` yet, so it is not set up for this app. Prefer the recommended Expo modules over third-party libraries, and check the available skills before adding a dependency.

---

# Chronicles: notes for agents

The app is a companion for wandering towns on foot: Explore before (busy areas, places to find), Navigate during (the way, quick capture, the walk), Chronicle after (moments, walks, replays). Everything stays on the device. The replay is the make-or-break: five beats in a fixed order, restraint, the lows stay in. `docs/PRODUCT.md` has the synopsis.

## Where things are

| Need | Read |
|---|---|
| What the app is and every feature | `docs/PRODUCT.md` |
| Where the code for X lives, invariants, the web exceptions to native-first, the data model | `docs/ARCHITECTURE.md` |
| What state the work is in: slices, branches, what waits on the owner | `docs/STATUS.md` |
| How to run and write tests, the e2e's flags and traps | `docs/TESTING.md` |
| The spec (acceptance criteria per slice) | `specs/<slug>/spec.md`, a mirror of the owner's Claude Docs doc; the doc wins |
| Why a rule exists | `docs/decisions/` (one record per owner's call) |
| What is deferred; what has never run on a phone | `docs/DEFERRED.md`, `docs/NATIVE_UNVERIFIED.md` |
| Which feature owns a file, its tests, journeys and specs | `scripts/features.js`; tests in `src/lib/__tests__/<feature>/` |
| Rules and traps of one area | `.claude/rules/<area>.md`: they load by themselves when you read or edit that area's files. Read one directly when planning work in an area you haven't opened yet |

Rule areas: captures-and-media, deletion, explore-and-discovery, functional-core, gaps, landing, map, memories, moments-and-days, motion-polish, navigation, notifications, places-and-areas, react-native-web, recording-and-traces, replay, rides, storage, streets-fog-snapping, tabs-and-home, walk-screen.

Procedures are skills: `/slice` (spec-first, test-first), `/audit` (the adversarial pass, with the `auditor` subagent, when the owner asks), `/e2e`, `/deploy`, `/docs-gc` (end-of-slice drift check), `/fix` (one issue end to end in a worktree; deploys by default, `--deploy=branch` stops at a pushed branch; decision 0081).

## Rules that hold everywhere

- **Local-only.** No accounts, no backend, nothing leaves the device. Don't add a server without asking.
- **No simulation.** Web traces the real browser location. Mock GPS only in test harnesses.
- **Native first; web is a fallback.** Build on the Expo modules the phone uses. Web-only code is allowed only where no Expo module covers the feature on web, and each exception is listed in `docs/ARCHITECTURE.md` with its reason. Check `node_modules/<module>/build/*.web.*` before adding one. A mobile feature with no web workaround stays off on web.
- **Native has never run on a device.** Say so in any report that touches native code, and add what you wrote to `docs/NATIVE_UNVERIFIED.md`.
- **Nothing is a score.** No completion, streaks, coverage or leaderboards; counts are said in words (`lib/quietLines`); no counts on the Explore tab; a find is a memory.
- **Truth vs cache.** Walk, TracePoint and Capture are append-only truth (deletes aside). Streets, visited rows, summaries and areas are cache tagged with the tile build; recompute from the trace, never patch derived data. Changing a derivation rule bumps `SNAP_RULES`, `STREET_CODE` or `LANDING_CODE` (`lib/tiles.ts`).
- **Raw fixes are stored unfiltered** and gated at read time by `readTrace` (`lib/rides.ts`). Always pass the walk's `started_at`, pauses, stills and gap fills; a pause is a break in the trace however short.
- **No dataset is hard-coded.** Map data reaches the app through adapters (`areas/types.ts`, `discovery/tilePois.ts`, `landing/read.ts`); tests run against in-memory sources.
- **Storage.** Schema changes are new entries in `MIGRATIONS` (SQLite, `PRAGMA user_version`) and a `VERSION` bump with an `oldVersion < N` step (IndexedDB). Never edit an existing migration. All native writes go through the single queue in `db/index.native.ts`.
- **Functional core, imperative shell.** Every `src/lib` module starts with `// @layer core|shell|adapter|view`. Decisions go in core (no clock, randomness, timers or module state; imports only core) with a test first; effects go in a shell (a factory taking `ports`, and the app instance views call); views never import `ports`, the `db`, `recorder` or `notifier`. `npm test` and lint check it, with baselines that only shrink. Read `.claude/rules/functional-core.md` before adding a module.
- **Pure logic is importable by `npm test`:** nothing a test imports may import React Native (that is why `tileMath.ts` is split from `tiles.ts`).
- **Import boundaries** are lint errors with the fix in the message: `Modal` only from `components/Modal`, no Reanimated, `setAudioMode` from `lib/audioMode`, haptics only through `feedback()` in `lib/motion`. Timings come from `lib/motionTokens`; never hard-code a duration.
- **The background location task is registered in `index.js`** before the router loads. Never move it into a route.

## Working with the owner

- **Ask before architectural decisions:** libraries, data model, platform strategy, navigation flow. Use AskUserQuestion with a recommended option. Local fixes don't need asking.
- **Spec first, test first.** A slice starts from numbered, testable criteria in its spec, then a plan the owner can read, then one failing test per criterion before its code (`/slice`). It is done when those pass with typecheck, lint, `npm test` and the e2e journeys covering its files; a slice that changes a screen adds a journey for it. The full e2e runs only when the owner asks.
- **Audit when the owner asks** (`/audit`, decision 0074): a report-only pass that tries to break the slice, triage (accept, defer, reject, with reasons; architectural findings go to the owner), a regression test named `<slice> audit N` before each fix.
- **Deferred is a decision, not a gap.** Record it in `docs/DEFERRED.md`; if the owner chose it, in `docs/decisions/` too.

## Gotchas that cost real time

The area rule files hold the rest; these recur across areas.

- `docs.expo.dev`, `api.expo.dev` and `tiles.openfreemap.org` are blocked from cloud sessions. Real tiles for tests: tileserver-gl's `test_data.zip` (Zurich) on GitHub; Natural Earth from `nvkelso/natural-earth-vector` raw.
- expo-location's enum is `Location.ActivityType`; `npx expo lint` (`import/namespace`) catches the wrong name where TypeScript doesn't. Run lint.
- React Compiler lint: call `setState` from callbacks, not effect bodies; lazy initializers for `Date.now()`; never read `ref.current` in render; callbacks passed into hooks go in a ref updated in an effect; `forwardRef` instead of a ref inside a props object.
- react-native-web: `AccessibilityInfo.isScreenReaderEnabled()` is always true; `headerBackVisible: false` needs `headerLeft: () => null`; a one-line `Text` is capped at its parent's width unless given `maxWidth`; a reused View never reports `onLayout` (key it); `findNodeHandle` doesn't exist (use `lib/focus`).
- Foreground location permission is enough for a walk started in front; treat "Always" as best effort.
- iOS container paths change: store media relative to `Paths.document`, resolve with `resolveMedia()`.
- iOS can't present a Modal over a Modal; overlays go inside the open one.
- Browsers refuse sound without a tap, iOS every time; see `.claude/rules/captures-and-media.md` before touching playback.
- Keep anything over features O(n log n): index with `EdgeGrid`.

## Keeping these notes honest

- New knowledge goes where it loads on demand: an area's rule or trap in `.claude/rules/<area>.md`; an owner's call in `docs/decisions/`; something left undone in `docs/DEFERRED.md`; untested native code in `docs/NATIVE_UNVERIFIED.md`; a shipped or started slice in `docs/STATUS.md` and `docs/PRODUCT.md`. This file has a budget of 200 lines and 12 KB (`scripts/check-docs.js`): it holds only what every session needs and what the code can't say.
- Commit messages name the criteria they satisfy (`QL1-QL8`, `rides audit 3`), as the log already does.
- Run `/docs-gc` at the end of a slice.
- The 1,600-line AGENTS.md this index replaced is in git at `553d10b` (`git show 553d10b:AGENTS.md`); everything in it moved to the files above.
