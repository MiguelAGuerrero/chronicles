# The walk screen in parts: plan

For the owner's review before any code (`/slice` step 3). The spec is `spec.md` beside this file. The owner already made three calls on Nov 10: a new folder for the parts, every journey that checks a part lists it, and the effects go behind a shell.

## The shape

`src/app/walk.tsx` keeps `WalkRoute` and `WalkScreen`, and `WalkScreen` becomes a composition. It calls each part's hook, passes the results to the part's view, and lays the views out in the same order as today. The map stays at one place in the tree in both states, so Start never remounts it.

Each part is a view hook (`use*.ts`, its state and effects), a view (`*.tsx`, what it draws), or both. All of them live in `src/components/walking/`. Hooks that take a callback keep it in a ref updated in an effect. No hook calls `setState` in an effect body. Each part keeps its code exactly as it is in `walk.tsx` today, moved but not rewritten. Views take props only: their state and subscriptions are in the hooks `WalkScreen` calls, so `render:walk` still counts every render a fix causes (WS8).

Cross-part state stays in the composition's hooks, never in a module:

- the walk shown (`useShownWalk`);
- the map handle, bearing and following (`useWalkMap`);
- which card is open (`useCards`).

`useCards` gathers the "one card at a time" rules that are scattered through `walk.tsx` today: spot, mark, memory, gap and the options drawer, and Back or Escape closes them. It keeps today's rules exactly, including where they differ from one card to the next (for example, the gap card hides under the drawer but doesn't close it). The rules move; they don't change. Turning them into a core reducer is out of scope (Deferred).

## Parts

Journeys in **bold** check the part through an id or a behaviour today. The others reach it through the part they wire into. WS3's test holds this table as data: `e2eFor([file])` must name exactly these journeys.

| File (`src/components/walking/`) | What it holds (from `walk.tsx`) | Journeys |
|---|---|---|
| `WalkLoading.tsx` | storage not read yet: the chevron back (audit 8) | **ready**, **reload** |
| `useShownWalk.ts` | holding, ended, the walk kept by id; the notice following the walk's arrival | **ready**, **reload**, **tabs** |
| `useResumed.ts` | counts returns to the front | **qol** (QL20) |
| `useWalkMap.ts` | the map handle, bearing, following | **ready**, **walk**, **qol** (Recenter) |
| `useWalkNotice.ts`, `NoticeBanner.tsx` | the notice and its timer; start and arrival notices; the hidden-page gap (`onWalkGap`); the pause reminder; the "press and hold" hint; Open Settings and Open in Maps | **hidden**, **drive**, **tabs**, **ready**, **qol** |
| `useRecorderStatus.ts`, `StatusChip.tsx` | the recorder's status; its error said once; Not recording, Why? (QL19); the retry on return (QL20); weak GPS; the chip | **qol** |
| `WalkTop.tsx` | the top column: Minimize and its row, the notice cell, the chip cell, the toast | **ready**, **reload**, **edit**, **tabs**, **launch** |
| `useWalkNavigation.ts` | `useNavigation`, `goTo`, `handOff`, the preview's Back and Escape, the route ahead, the alternates, the preview's fit, "You're here" | **drive**, **headsup**, **memories**, **scenic**, **walk** |
| `NavBar.tsx` | the navigation bar (time left, Open in Maps, End), Finding a route and Cancel, Off your route | **drive**, **headsup**, **memories**, **scenic**, **walk**, **launch** |
| `useWalkLayers.ts` | Layers, walkability, busy streets, town borders (both states), what the map draws in a preview, the heads-up line | **layers**, **walkability**, **headsup** |
| `HeadsUpLine.tsx` | the walk-ahead line in the pills | **headsup** |
| `WalkLayersControl.tsx` | the Layers button and panel in the corner | **layers**, **walkability** |
| `useWalkStreets.ts` | the tile build; the streets around the walker every 100 m; fog, walked, the unwalked count | **ready**, **walk** |
| `UnwalkedButton.tsx` | Show unwalked streets, and its count | **ready**, **walk** |
| `EdgeButtons.tsx` | Recenter and the compass in the column | **ready**, **walk**, **qol** |
| `useWayBack.ts`, `WalkBackButton.tsx` | the spot chosen, and where Walk me back leads (DW6-DW8) | **drive**, **ready**, **walk** |
| `useWalkCaptures.ts` | `useCaptures`, photo, voice, note, the edit offer, the Add to this moment pill and the viewer's ask, Back and the page warning while a memo records, the toasts | **ready**, **edit**, **space**, **walk** |
| `CapturePills.tsx` | Add to this moment, the edit offer, the memo's Undo and Retry, held captures, the space line | **ready**, **edit**, **space** |
| `WalkCaptureStack.tsx` | the capture stack on the walk (`cap-*`, Save and Discard) | **ready**, **edit**, **space**, **walk**, **gaps**, **drive** |
| `NoteSheet.tsx` | the note's sheet | **ready**, **walk**, **qol** |
| `useWalkLifecycle.ts` | Stop (with the unsaved-memo and held-capture guards), Pause and Resume, Minimize | **ready**, **reload**, **tabs**, **edit**, **gaps**, **marks**, **space**, **launch** |
| `WalkStrip.tsx` | the walk's ReadyBar, its stats, Pause or Resume, Hold to stop | **ready**, **reload**, **tabs**, **edit**, **gaps**, **marks**, **launch**, **memories** |
| `WalkOptions.tsx` | the drawer: Explore, the range, kinds, the layers key, pocket alert, route leanings, notifications, motion, Share GPS log | **marks**, **ready**, **layers**, **walkability**, **tabs**, **walk**, **nudge**, **launch** |
| `useWalkExplore.ts` | the walk's Explore switch, its settings, `useExplore`, the open mark and its reach, the range ring, the relabel | **marks**, **ready**, **walk**, **nudge** |
| `MarkCard.tsx` | a place's card | **marks**, **walk** |
| `useShareLog.ts` | Share GPS log: the log read as the drawer opens, shared from the tap | **walk** |
| `useHotspots.ts`, `HotspotLines.tsx` | the remembered areas; On a strip; the dead-zone nudge | none (WS4: listed in DEFERRED) |
| `useWalkMemories.ts`, `MemoryCard.tsx` | memories on revisit: the pool, the pins, the preview, Memories here | **memories** |
| `useRecall.ts` | the reminder card, and a tapped reminder opening its captures | **memories**, **walk** |
| `useCards.ts` | one card at a time; Back and Escape | **drive**, **headsup**, **walk**, **marks**, **memories**, **gaps**, **scenic** |
| `SpotCard.tsx` | This spot: Go here, Walk back here, Open in Maps, What happened here | **drive**, **headsup**, **walk**, **scenic** |
| `useWalkGaps.ts`, `WalkGapCard.tsx` | the gap open, keep or not, Draw my way, the drawing bar | **gaps** |
| `WalkingMap.tsx` | the walking map's props, and what a tap means (drawing, a preview's route, a gap, closing the cards) | **gaps**, **scenic**, **marks**, **memories**, **walk**, **ready**, **layers**, **walkability** |
| `WalkViewers.tsx` | the capture viewer, Memories here, What happened here, the media editor | **edit**, **tabs**, **walk**, **qol** |

`src/app/walk.tsx` itself: **ready**, **reload**, **tabs** (WS2).

`src/lib/walkScreen/` (shell, WS5 and WS6):

| File | What | Tested by |
|---|---|---|
| `shell.ts` | `createWalkScreen(p: Pick<Ports, 'db' \| 'recorder'>)`: `streetsAround(at, build, collect)`, `landings()`, `momentsNear(box)`, `exploring(walkId)`, `setExploring(walkId, on, now)`, `nudgeSpent(walkId)` and `spendNudge(walkId)`, `hintDue()`, `subscribeStatus(cb)`, `backgroundCapable()` | `walk-screen/walkScreenShell.test.ts` over `fakePorts()` |
| `index.ts` | `// @instance`: `walkScreen = createWalkScreen(ports)` | the shell's tests reach it (SH6) |

`hint_go` is declared in `META` if it isn't already. `deadzone_walk` and `explore_walk` already are.

## How the journeys change

Only `covers` changes, plus the WS8 name on `walk`'s budget check.

- **The 12:**
  - `ready`, `reload` and `tabs` keep `src/app/walk.tsx` and add their parts.
  - `drive`, `edit`, `gaps`, `headsup`, `hidden`, `layers`, `marks`, `space` and `walkability` swap `src/app/walk.tsx` for their parts.
- **The 6 added (the owner's call):** `walk`, `qol`, `memories`, `scenic`, `nudge` and `launch` add their parts.
- `stacks` came off the table (checked during extraction): its pill checks are on the ready screen, and on the walk it only holds Stop to reach the replay grid. `memories` joined the navigation rows: it checks the navigation bar's text after Walk here.

## Tests (one per criterion, written as todos first)

| Id | File | Name |
|---|---|---|
| WS1 | `src/lib/__tests__/walk-screen/walkScreenSplit.test.ts` | `WS1: walk.tsx is a composition: under 300 lines, no state or effects, routing imports only` |
| WS2 | same | `WS2: only ready, reload and tabs cover walk.tsx; no journey covers walking/** whole` |
| WS3 | same | `WS3: each part names exactly its journeys` (the table above, as data) |
| WS4 | same | `WS4: every part is named by a journey, or listed with its reason` |
| WS5 | same | `WS5: the walk screen's views import no db, recorder, notifier or ports; walk.tsx's suppressions are gone` (and the ceiling in `functional-core/functionalCoreAudit.test.ts` drops by 2) |
| WS6 | `src/lib/__tests__/walk-screen/walkScreenShell.test.ts` | `WS6: streets around: writes streets and places, then reads the fog`, `WS6: landings of the current rules only`, `WS6: explored marked the first time only`, `WS6: the dead-zone nudge once a walk`, `WS6: the hint once`, `WS6: the recorder's status passes through`, `WS6: moments near a spot` |
| WS7 | `walkScreenSplit.test.ts` | `WS7: every testID walk.tsx rendered is still rendered` (the ids at the base commit, as data) |
| WS8 | `walkScreenSplit.test.ts`; journey `walk` | `WS8: the parts' views hold no state or subscriptions`; the budget check in `walk` named `WS8: walking stays within its render budget` |

No new feature folder: the tests go in `walk-screen`. No new journey: the slice changes no screen.

## Order of extraction

Each step goes through `npm run check:affected`, then a commit naming its criteria. The journeys run once, at the end.

1. **Tests first:** WS1-WS8 as todos, committed alone (`check:test-first`).
2. **The shell:** `lib/walkScreen/` test-first over `fakePorts()` (WS6). `walk.tsx` calls the shell, and its `db` and `recorder` imports go (WS5).
3. **Leaves with no shared state:** `WalkLoading`, `NoteSheet`, `WalkViewers`, `HeadsUpLine`, `NavBar`, `StatusChip` with `useRecorderStatus`, `WalkStrip`.
4. **Hooks that own their state:** `useResumed`, `useShownWalk`, `useWalkMap`, `useWalkNotice`, `useWalkStreets`, `useWalkLayers`, `useWalkMemories`, `useRecall`, `useHotspots`, `useWayBack`, `useWalkNavigation`, `useWalkExplore`, `useWalkGaps`, `useWalkCaptures`, `useWalkLifecycle`.
5. **The cards:** `useCards`, then `SpotCard`, `MarkCard`, `MemoryCard`, `WalkGapCard` and the route preview.
6. **The rest of the layout:** `WalkingMap`, `WalkOptions`, `EdgeButtons`, `UnwalkedButton`, `WalkBackButton`, `CapturePills`, `WalkCaptureStack`, `WalkTop`, `WalkLayersControl`. `walk.tsx` is then a composition (WS1, WS7).
7. **The journeys:** each journey's `covers` (WS2-WS4); the budget check in `walk` named WS8.
8. **Before done:** typecheck, lint and `npm test`; `check:e2e`; `check:test-first walk-screen-split`; one export; then each of the 18 journeys once: the 12, plus `walk`, `qol`, `memories`, `scenic`, `nudge` and `launch`.

## Docs

- `.claude/rules/walk-screen.md`:
  - `paths` gain `src/components/walking/**` and `src/lib/walkScreen/**`;
  - a short "where each part lives" pointer to this plan's table;
  - the trap: a new walk-screen feature is a part with its journeys, never more lines in `walk.tsx`.
- `docs/ARCHITECTURE.md`: the walk screen's codemap.
- `docs/TESTING.md`: `walk.tsx` is covered by the composition's journeys only.
- `docs/DEFERRED.md`:
  - the hotspots' wiring, which no journey checks (WS4);
  - the cards as a core reducer.
- `docs/STATUS.md`: the row in flight.

## Deferred

- **The cards as a core reducer** (`step(state, event)`). The rules move as they are. Rewriting them would change behaviour in a refactor that promises none.
- **A journey for On a strip and the dead-zone nudge.** Nothing checks them today. Writing one would add a screen check, which is a slice of its own.
- **Pure decisions out of the hooks** (the status chip's `problem`, Stop's guard order), into core with unit tests. They move with their hook, as they are.

## Native

No native path moves: the same components and the same Expo calls, in other files. The recorder's status and `capabilities.background` are reached through the shell instead of the import. Nothing goes in `docs/NATIVE_UNVERIFIED.md` beyond what is already there for the walk screen. The walk screen has never run on a device.

## Risks

- **Several sessions edit `walk.tsx`.** Every in-flight branch that touches it will conflict with this one. The STATUS row says so. Merging main in often, and landing this branch early, keeps that small.
- **Render counts.** A view with its own state would re-render apart from `WalkScreen`, and the budget wouldn't see it. WS8 keeps all state in the hooks `WalkScreen` calls.
