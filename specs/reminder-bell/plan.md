# Reminder bell: plan

For the owner to review before any code.

## Files

- `src/lib/pins.ts`: `pinReminded(pin, ids: ReadonlySet<string>)`, true when any capture in the pin is in `ids` (RB2).
- `src/lib/discovery/recall.ts`: `remindedIds(recalls, now)`, the set of capture ids whose reminder is still live, dropping those past their until-date (RB3).
- `src/lib/discovery/recallCheck.ts`: every write already goes through `saveRecall`, `stopRecall` and `forgetRecalls`. Each of them also tells listeners (`onRecallsChanged(fn)`), so a map hears about a reminder set in the viewer, fired, or deleted with its capture (RB5).
- `src/lib/useReminded.ts` (new): a hook that reads `db.listRecalls()` once on mount, re-reads on `onRecallsChanged`, and returns `remindedIds(...)`.
- `src/components/CapturePinView.tsx`: a `reminded` prop draws the bell disc, top-right, or top-left when `faint`, outside the fade like the clock (RB1, RB4). `pinLabel` takes `reminded` and adds ", reminder set" (RB7).
- `src/components/map/WalkMap.web.tsx` and `WalkMap.native.tsx`: call `useReminded()` once per map, pass `reminded` to every pin. The reminded flag goes in the web marker key and the native Marker key, so a change redraws that pin only (RB5, RB6). Because every screen uses `WalkMap`, every map gets the bell with no screen changes (RB6).

## Look

A 16 px disc in `theme.accent` (`#c2410c`), with a white `notifications` icon at 10 px and a 1.5 px white edge, over the head's corner. It is the same size and placement as the memory clock, which is ink-coloured, so the two read as different things. The pin's 48 px tap target is unchanged.

## Data

No migration and no IndexedDB version bump. The bell is drawn from the live `recall` rows and never stored.

## Tests per criterion

| Id | Test |
|---|---|
| RB1 | e2e: after Remind me here → Save on the walk's note, its pin has `[data-testid=pin-reminder]` |
| RB2 | `reminderBell.test.ts`: `RB2: a merged pin is reminded when any capture is` |
| RB3 | `reminderBell.test.ts`: `RB3: a reminder past its until-date is not counted` |
| RB4 | e2e: the note flagged again on the later walk, shown as a memory pin: the bell is left of the clock and solid |
| RB5 | e2e: the pin loses the bell once the "once" reminder fires and clears, and regains it after Flag again → every visit |
| RB6 | Covered by construction (one map component); the e2e checks the walk screen |
| RB7 | e2e: the belled pin's `aria-label` says "reminder set", on the walk's pin and the memory pin (`pinLabel` lives with the React Native view, so no unit) |

## Deferred

Nothing.

## Native (never run on a device)

The badge inside a MapLibre RN `Marker`, and the re-keyed Marker when a reminder changes. Both go in `docs/NATIVE_UNVERIFIED.md`.
