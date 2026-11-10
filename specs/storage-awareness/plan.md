# Storage awareness: plan

The owner said to proceed with the recommended defaults (Nov 9), so this plan is the record, not a gate.

## Files

| File | Layer | What |
|---|---|---|
| `src/lib/space/core.ts` | core | `SPACE` (500 MB, 100 MB), `spaceLevel(free)`, `spaceLine(level)`, `persistLine(homeScreen)`, `shouldSay(said, level)`, `isOutOfSpace(error)`, `saveFailLine(kind, outOfSpace)`, `heldLabel(kinds)` |
| `src/lib/space/shell.ts` | shell | `createSpace(p: Pick<Ports, 'db' \| 'clock'>, probe: SpaceProbe)`: a `Store` of the line shown; `check({ recording })`, `afterKept({ recording })`, `dismiss()` |
| `src/lib/space/index.ts` | shell (`@instance`) | `space = createSpace(ports, probe)` |
| `src/lib/space/probe.ts`, `probe.native.ts`, `probe.web.ts` | adapter | `free()`: `Paths.availableDiskSpace` / `navigator.storage.estimate()`; `persist()`: null on a phone / `navigator.storage.persist()`; `homeScreen()`: false / an iPhone or iPad browser outside the Home Screen app |
| `src/lib/meta.ts` | shell | `space_said`, `space_persist` |
| `src/components/SpaceLine.tsx` | view | the pill: the line and a dismiss button (`space-line`, `space-dismiss`) |
| `src/lib/useCaptures.ts` | view | every failed photo or video held (`held`, `retryHeld`); SA9 words for every failure; `space.afterKept` after each kept capture |
| `src/app/walk.tsx` | view | `space.check({ recording: true })` when a walk shows; the SpaceLine and the held pill; Stop warns with one held |
| `src/components/MomentBar.tsx` | view | `space.check({ recording: false })` when focused (asks persistence when due); the SpaceLine and the held pill |
| `src/components/RecordingBar.tsx` | view | nothing: the hook's words reach its `said` line |

## Data

Meta only (`space_said` one of two levels, `space_persist` `due` or `asked`). No migration, no IndexedDB version.

## Tests

| Id | Where | Name |
|---|---|---|
| SA1 | `storage/spaceShell.test.ts` | `SA1: a probe that can't read says nothing` |
| SA2 | `storage/space.test.ts` | `SA2: low under 500 MB, very low under 100 MB` |
| SA3 | `storage/spaceShell.test.ts`; journey `space` | `SA3: a low walk shows the line`; e2e on the walk screen and Navigate, ready |
| SA4 | `storage/space.test.ts`, `storage/spaceShell.test.ts`; journey `space` | the once-per-level rule; kept across a reload; recovery resets it |
| SA5 | `storage/spaceShell.test.ts` | `SA5: a kept capture reads the room again` |
| SA6 | journey `space` | the capture buttons enabled with the line shown; the dismiss hides it |
| SA7 | `storage/space.test.ts`; journey `space` | no digit, `%` or size in any line |
| SA8 | `storage/space.test.ts`; journey `space` | the held labels; two refused photos both held, Retry keeps both |
| SA9 | `storage/space.test.ts`; journey `space` | the out-of-space words, and the other failure's |
| SA10 | `storage/spaceShell.test.ts`; journey `space` | asked once after the first kept capture; a refusal said once; never on a phone |

Feature: `storage` (its source gains `src/lib/space/**`, `src/components/SpaceLine.tsx`; its specs `storage-awareness`; its journey `space`).

## Deferred

See the spec: the important-usage capacity, cache caps, Retry on the recording bar, a check before a recording starts.

## Native paths not run on a device

`probe.native.ts` (`Paths.availableDiskSpace` on iOS and Android), a full-disk photo save on a phone and the error text it gives (`isOutOfSpace` matches `ENOSPC`, "No space left", `SQLITE_FULL`, "disk is full", NSCocoa 640).

## Steward (Nov 9)

One breach, four drifts, two tone; all accepted into the criteria:

| Finding | Triage |
|---|---|
| S1 a second failed save wipes the first | accept: SA8 holds every failed capture; Stop warns with one held |
| S2 once per walk is a warning at every start | accept: SA4 once for each level on the device |
| S3 the persistence prompt mid-capture | accept: SA10 never while a walk records; the refusal on Navigate, ready |
| S4 "Added to the Home Screen" overpromises | accept: the Home Screen named only on an iPhone or iPad browser, as "less likely" |
| S5 "this device" states a guess as fact | accept: SA3 speaks of room for photos and videos |
| S6 "free some" points at deleting the corpus | accept: SA7 no line asks to free, delete or clear |
| S7 nothing keeps the line from being an alarm | accept: SA7 the same pill at both levels, no feedback |

Silent points, for the owner: the "limitations" asked for are only the cache caps (deferred); once-per-level replaces the first draft's once-per-walk under the owner's "reasonable defaults".
