# Navigate, ready: plan

For the owner's review before any code. The spec is `specs/navigate-ready/spec.md`.

## Shape

One screen, `src/app/walk.tsx`, has two states: **ready** (no open walk) and
**walking**. Today the walk screen sends you home when no walk is open (`router.replace('/')`).
With this slice it shows the ready state instead. The Navigate tab button no longer
shows a tab. It calls `showWalk()`, which already opens the walk screen over the
tabs and hides the tab bar (NV6). Start calls the same `startWalk` it does today,
but from inside the walk screen, which picks up the new walk in place. No route
change, so nothing animates.

## Files

| File | Change |
|---|---|
| `src/lib/readyNav.ts` (new, pure) | Which state the screen is in. Where the chevron and Back go: the last tab you were on, Explore after a launch. What a Navigate tab press does: open the walk, ready or open. The launch route. |
| `src/app/(tabs)/_layout.tsx` | A `tabPress` listener on Navigate: `preventDefault` and `showWalk()`. It also remembers the last tab focused, for the chevron. |
| `src/app/(tabs)/index.tsx` | Shrinks to an entry route. Focused (launch, `/`, a deep link), it moves the tabs to Explore and opens the ready screen. `LiveWalk`, the drawer, `StartDialog` and the moment row leave it. |
| `src/app/_layout.tsx` | At launch with no open walk: the ready screen over Explore (NR3). |
| `src/app/walk.tsx` | The ready state: the one-fix map, moment pins, the destination long-press, the ready bar, `LocateButton`. The walk's own layers wait for a walk. Start in place. The chevron per `readyNav`. The capture row becomes the stack. The edge buttons join the stack's column. |
| `src/components/walk/CaptureStack.tsx` (new) | The vertical stack: camera, mic and note, plus the memo states (NR10). It takes either `MomentBar`'s moment logic (ready) or `useCaptures` (walking), so both states draw one component. |
| `src/components/walk/ReadyBar.tsx` (new) | The bar at rest (0:00, 0.00, Start, the destination line) and pulled up (the settings). Built on `SheetFrame` (`HomeSheet.tsx`), with Start pinned to its foot. |
| `src/components/StartSettings.tsx` | `StartDialog`'s body, kept as a plain view inside the bar. The dialog wrapper is deleted. |
| `src/components/MomentBar.tsx` | Its logic stays, and it loses the horizontal layout. `CaptureRow` becomes the stack's walking half. |
| `src/lib/useStartWalk.ts` | `start()` returns the new walk and its plan params rather than always calling `showWalk`. Walk here on Explore and Chronicle still opens the walk screen as today (NV12). |

## Data

None. No new truth or cache, no SQLite migration, no IndexedDB version. The meta
keys the walk reads (`start_mode`, pending destination, settings, units) are
unchanged.

## Tests per criterion

Pure logic, in `src/lib/__tests__/navigateReady.test.ts` (`npm test`):

- `NR2: a Navigate press with a walk open opens that walk`
- `NR3: launch with no open walk opens the ready screen over Explore`
- `NR4: the chevron and Back return to the last tab, Explore after a launch`

The screens are tested in `scripts/e2e-web.js`, as a new scenario `E2E_ONLY=ready`:

- `NR1`: a tap on `tab-navigate` from Explore and from Chronicle shows `walk-ready`. No `tab-navigate` is visible, there's one canvas, the dot shows, a moment pin shows, and `walk-stats` reads 0:00 and stays 0:00 after 3 s.
- `NR2`: start, minimize, tap Navigate, and `stop` shows with the time still ticking.
- `NR3`: a reload of `/` and of `/walk` shows `walk-ready`. The chevron lands on Explore.
- `NR4`: chevron from Chronicle returns to Chronicle. The browser's back does the same. With a walk on, the chevron minimizes it and the recording bar shows.
- `NR5`: the bar reads 0:00 and 0.00, in mi with `E2E_MILES=1`. Start's box sits where `stop`'s box sits after starting, within 2 px.
- `NR6`: after Start, the URL is unchanged, and the boxes of the stack, Locate/Recenter and the chevron are unchanged. "Walk started · recording" shows and the time ticks.
- `NR7`: drag `ready-grip` up and the settings show while Start's box is unchanged. A mode switch persists over a reload. The ring shows in Explore. Escape lowers the bar. `StartDialog` is gone (no `start-dialog`).
- `NR8`: a long press shows `ready-dest` with "To Your spot". Clear removes it.
- `NR9`: `cap-photo`, `cap-voice` and `cap-note` share one x and stack in y, at the right edge, with the same boxes before and after Start. A note before Start shows on Chronicle as a moment. One after Start is the walk's.
- `NR10`: a memo puts `voice-save` in the mic's box and `voice-discard` in the camera's, with the timer beside them. Start is disabled. The chevron mid-memo saves it.
- `NR11`: at 375×667 with `unwalked`, `walk-back` and `recenter` up, all boxes are on screen, at least 44 px, and pairwise disjoint.
- `NR12`: one canvas on the ready screen, and during the walk.
- `NR13`: the web note shows on the first ready screen. A denied location shows its chip and banner.

About 70 existing e2e references go through the drawer, Start and the Navigate tab
(`drawerTo`, `start`, `navigate-drawer`, `tab-navigate`). They move to the new
helpers. `drawerTo(pg, 'half' | 'full')` becomes a pull on `ready-grip`.

## Docs

- Decisions: a new record **0069** (Navigate opens the walk screen, ready). It marks
  0046, 0047, 0056 and 0062 superseded.
- `.claude/rules/tabs-and-home.md` loses the drawer, `LiveWalk` and the dialog
  sections. `.claude/rules/walk-screen.md` gets the stack and the ready state, and
  loses the centered row.
- `specs/navigation-and-tabs/spec.md` marks NV10, NV19-NV21, U1 and U2 retired, with
  a pointer here. `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` and `docs/STATUS.md` get
  updated.

## Deferred (proposed)

- **The walking strip stays as it is.** Time, distance, options, Pause and Stop
  stay. Its options keep the options card. Only the ready bar pulls up.
- **Native tabs for iOS** stay later (NV1). The `tabPress` interception lives in the
  one layout file, as NV1 asks.

## Native, unverified on a device

- `tabPress` `preventDefault` on the JS tabs on iOS and Android.
- `SheetFrame` pulled up inside the walk screen, over MapLibre RN.
- The vertical stack against the home indicator's safe area.
- Starting in place: the background location task taking over a screen that is
  already mounted, and the pocket alert from there.
- Moment pins and the one-fix dot on the walk screen's MapLibre RN map.
