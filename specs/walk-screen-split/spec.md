<!-- Repo first: written from the owner's request in a session (Nov 10, 2026): "split the walk screen so testing is optimized". Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# The walk screen in parts (WS)

Nov 10, 2026 · @Miguel Guerrero

`src/app/walk.tsx` is one file of about 1,990 lines. It wires nearly every walk-screen feature: the gap card and Draw my way, the Layers control and key, the held-captures line, the edit offer and the media editor, the hidden-page notice, the way back and the heads-up line, the marks, the ready screen, Minimize and Stop, the capture viewer. E2e journeys are chosen by file (`covers` in `scripts/e2e/journeys/*.js`, read by `e2eFor` in `scripts/affected.js`), so any edit to `walk.tsx` names 12 journeys: drive, edit, gaps, headsup, hidden, layers, marks, ready, reload, space, tabs and walkability. Each one really checks something `walk.tsx` wires (checked Nov 10), so trimming `covers` won't fix this. Splitting the file will.

This slice splits `walk.tsx` into a thin composition of parts, each in a file of its own. Each journey's `covers` then names the parts it checks, so an edit to one part names only that part's journeys. It is a refactor that keeps behaviour: nothing a person sees or does changes.

## Vision

```
Idea: split the walk screen so testing is optimized (the owner, Nov 10)
Verb: none (engineering: the same screen in smaller files, and the journeys that test it; nothing a walker sees changes)
Touches: none
Verdict: no surface
Shape: as asked
Criteria: none
```

## Decisions

- **Split the file, don't trim the journeys** (the owner, Nov 10). Every one of the 12 journeys checks something `walk.tsx` wires.
- **The parts live in a new folder, `src/components/walking/`** (the owner, Nov 10). The `ready` and `walk` journeys cover `src/components/walk/**` as a whole, so a part placed there would name both journeys on every edit. `src/lib/walk/**` is walkability's folder.
- **Every journey that checks a part lists that part** (the owner, Nov 10). That includes the journeys that check what `walk.tsx` wires without covering it today: `qol` (the status chip, Recenter), `memories` (the memory preview, the reminder card), `scenic` (the route preview), `nudge` (the pocket alert), `walk` (the spot card, Share GPS log, Open in Maps, Unwalked, the render budget) and `launch` (the navigation bar sits level with Minimize). This closes a gap that exists today, and those journeys run once at the end of this slice.
- **The screen's database and recorder effects move behind a shell** (the rules, not a new call). A view may not import the `db` or the `recorder` (FC5). `walk.tsx` holds two suppressed FC5 imports, and the suppression baseline only shrinks, so the moved code can't take them into new files. They become a shell, `lib/walkScreen/`, tested over `fakePorts()`.

## Criteria

1. **WS1 · `walk.tsx` is a composition.** `src/app/walk.tsx` is at most 300 lines. It declares no state, effect, ref or memo of its own (no `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, `useRef` or `useMemo`). From `src/lib` it imports only what routes the screen: `walkNav`, `readyNav`, `momentPill`, `perfCount` and `useUnits`. Every feature it wired before is a part in `src/components/walking/`, or a shell in `src/lib/walkScreen/`.
2. **WS2 · Only the composition's journeys cover `walk.tsx`.** The only journeys whose `covers` name `src/app/walk.tsx` are the ones that check the composition itself: `ready` (one map across Start, the ready and walking states), `reload` (the loading state and the walk reopened after a reload) and `tabs` (Navigate opens the open walk). No journey covers `src/components/walking/**` as a whole.
3. **WS3 · Each part names its journeys, and only those.** For every file in `src/components/walking/`, `e2eFor([file])` names exactly the journeys in the plan's table for it (`specs/walk-screen-split/plan.md`, "Parts").
4. **WS4 · No part is covered by nothing.** A journey names every file in `src/components/walking/`, unless the file is listed, with its reason, in `docs/DEFERRED.md` and in the WS4 test.
5. **WS5 · The views reach no db, recorder, notifier or ports.** Neither `walk.tsx` nor any file in `src/components/walking/` imports them. The two FC5 suppressions `walk.tsx` holds today are gone, no file gains a new one, and the ceiling in `functionalCoreAudit.test.ts` drops by two.
6. **WS6 · The screen's effects run in a shell, tested over `fakePorts()`.** `lib/walkScreen/` does what `walk.tsx` did, in the same order, with the same guards:
   - reading the streets around the walker writes the streets and places from the map, then reads the fog: within 1,000 m, never credited, not along the live trace;
   - it reads the current rules' hotspot areas;
   - it reads the moments around a spot for memories;
   - it reads and writes this walk's Explore switch, and marks the walk explored the first time only;
   - it spends the dead-zone nudge once a walk;
   - it shows the "press and hold" hint once ever;
   - it passes on the recorder's status and whether it records in the background.
7. **WS7 · The same ids.** Every `testID` that `walk.tsx` rendered at the commit the slice started from is rendered by `walk.tsx` or a part, and no part adds a new one.
8. **WS8 · The render budget holds, and counts every part.** Every view in `src/components/walking/` is drawn from its props: it calls no `useState`, `useReducer`, `useEffect` or `useStore`, and doesn't subscribe to the open walk itself. Its state and subscriptions live in hooks the composition calls, so `render:walk` counts every render a fix causes. In the `walk` journey, walking stays within the budget (decision FC10): `render:walk` at or under 2.5 a second.

## Constraint: nothing a person sees changes

Behaviour stays the same. This slice edits each journey's `covers`, and names the `walk` journey's render-budget check WS8. It edits no journey's other checks. The proof is the journeys' own checks. Every journey this slice edits runs once at the end: the 12 above, plus `walk`, `qol`, `memories`, `scenic`, `nudge` and `launch`. The record below lists each run.

## Routes and data

- No new route, truth or cache, no migration, no meta key and no dependency.
- New files: `src/components/walking/*` (views and their view hooks) and `src/lib/walkScreen/{shell,index}.ts` (the shell and the app's instance).

## Record

(Filled in as the slice is built.)
