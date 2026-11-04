<!-- Saved-settings shells. Written in the repo first (2026-11-04) from the owner's call in session; an engineering
     slice (functional core: shells as factories over ports, decision 0073), the first cluster after the test
     organization (decision 0091) named 22 shells no unit test reaches. -->

# Saved settings: the first shells over fakePorts (SH)

The test organization's coverage report names 22 shells no unit test reaches. None of them takes its effects as an argument, so none can be tested against `fakePorts()`. This slice moves the smallest cluster over, the modules that keep a saved setting or a find: the units, the navigation destination, the notification switches and a moment's find. Each becomes a factory a test builds with fakes, and an app instance built from the real ports beside it. It also stops the report from calling a file a hole when it only builds a tested shell, and tests two small shells that need no refactor.

## Criteria

1. **SH1 · Units.** At launch the saved setting applies; with none saved, or a read that fails, the device region's default applies. Saving changes the shown units at once, before the write finishes, and keeps them; a failed write still leaves them changed on screen.
2. **SH2 · The navigation destination.** A walk's destination reads back for that walk only; another walk's, an empty value or an unreadable one reads as none. Clearing it reads as none. The drawer's destination before a walk reads back, a cleared one reads as none, and a failed read reads as none.
3. **SH3 · Notification switches.** The kinds switched off read back as saved; with none saved, every kind is on.
4. **SH4 · A moment's find.** A moment with a position finds the nearest unfound checklist place within reach and records the find with its walk, its capture and the time it was found. It finds nothing, and records nothing, when it has no position, when it waits in Undo or was deleted (before the read or during it), when it already found a place, or when no unfound place is in reach.
5. **SH5 · Shells take their effects.** Each of the four shells is a module a Node test loads without the app's database, recorder or notifier: it imports none of them, nor `ports`. Every screen and module that used them imports the same names from the same paths as before.
6. **SH6 · Instances are not holes.** A file whose job is to build a shell's app instance says so on its first line after the layer tag (`// @instance: <what it builds>`). The coverage report does not name it as covered by nothing when a test reaches the module it builds from; it does when none does. The composition root, the ready screen's instance, the tabs-hidden store and the four new instances are marked.
7. **SH7 · The map read lock.** One read at a time: a second read asked for while one runs returns nothing at once and runs nothing; the lock is free again after a read that fails.
8. **SH8 · The perf counter.** Counts a name only when the page asked for counters; without them it does nothing.
9. **SH9 · Nothing changes for the walker.** The journeys the coverage report names for the touched files pass, with the unit suite, the typecheck and lint.

## Out of scope

The other 13 shells no unit test reaches (the walk lifecycle, the explore reads, reminders, deletion, the replay helpers; `docs/DEFERRED.md`), each its own cluster; the fog refresh, on its own branch.

## Decisions

- 2026-11-04: the owner chose this cluster first, of four offered (saved settings, walk lifecycle, explore reads, reminders), and to build it on the test-organization branch.
- Carried from the fog refresh's conventions (branch `claude/fog-refresh-shell`, unmerged): a shell's factory lives in `<module>/shell.ts`, its app instance in `<module>/index.ts` beside it, so a module's import path is unchanged.

## Built (Nov 4)

SH1-SH9 pass. Unit: `map/unitsStore.test.ts` (SH1), `navigation/navStore.test.ts` (SH2), `notify/noticePrefs.test.ts` (SH3), `moments/momentFind.test.ts` (SH4), `arch/shells.test.ts` (SH5), `arch/features.test.ts` (SH6), `map/mapReads.test.ts` (SH7), `map/perfCount.test.ts` (SH8): 16 tests, the suite 811. SH9: the `qol`, `days`, `marks`, `launch`, `ready`, `notifications` and `walk` journeys pass on the web build. SH7 and SH8 passed on first run: those two modules needed no change, only tests. Shells no unit test reaches: 22 before, 13 after. No audit (decision 0074). Native: the instances run through `ports` on SQLite, never run on a device.
