<!-- Test gaps, round 1. Written in the repo first (2026-11-04) from the owner's ask in session ("work on the deferred testing
     works"): the items in docs/DEFERRED.md's "Test organization" section that need no architectural call. An engineering
     slice; follows the saved-settings shells (specs/shells-saved-settings). -->

# Test gaps: the deferred testing items, round 1 (TD)

The test organization left a list of testing work in `docs/DEFERRED.md`. This round takes the items that need no call from the owner: a false alarm in the spec report, a way to measure coverage per feature, and four more shells moved over to factories tested with fakes (the replay's "what happened here", the GPS log, a walk's backup bundle and the replay's tile reads). The walk lifecycle, the explore reads, reminders and the criteria no test names wait on the owner.

## Criteria

1. **TD1 · Retired ids.** The spec report calls a retired id still tested only when a test's name, or an e2e check's or step's message, names it. A comment, or an assertion's message, that mentions the id does not count.
2. **TD2 · Coverage per feature.** `npm run test:coverage <feature> [<feature> ...]` runs those features' tests and reports line, branch and function coverage of the features' own source files, and no other file. With no name it runs every test and reports every file under `src/lib`. An unknown name fails and lists the features. It is a report, never a gate: it sets no threshold and fails on none.
3. **TD3 · What happened here.** Every capture within reach of a spot, across walks and oldest first, including the open walk's captures not yet stored there, each with its walk's title and how far into the walk it was taken, paused time left out. A moment made outside any walk says "Not on a walk"; a capture whose walk is gone is left out.
4. **TD4 · The GPS log.** A walk's log holds every raw reading and its placed captures, and names the device it was given.
5. **TD5 · A walk's bundle.** A walk exports as a zip with `walk.json` (the walk, its raw trace, captures, pauses and summary, and when it was exported) and each capture's media file. A missing file is counted and marked; a photo's small copy is never named. A walk that isn't kept fails with a message.
6. **TD6 · The replay's tile reads.** The streets along a walk are read from the tiles it crossed, each z14 tile once, at most as many as the map's own read takes. Without a known tile address the read fails; a failed read of place points gives none, not an error.
7. **TD7 · Shells take their effects.** The four shells load in a Node test without the app's database, recorder, notifier, `ports` or React Native; every screen and module that used them imports the same names from the same paths.
8. **TD8 · Nothing changes for the walker.** The journeys the coverage report names for the touched files pass, with the unit suite, the typecheck and lint.

## Out of scope

The walk lifecycle (`session`), the explore reads (`explore/exploreRun`, `landing/read`, `atlas/read`, `activity/overture`), reminders (`discovery/recallCheck`), deletion's instance, `backlog` and `walkNav`: offered to the owner as their own clusters. The live criteria no test names: triaged in `triage.md` for the owner's calls (built, retired or owed).

## Decisions

- 2026-11-04: the owner asked to work on the deferred testing items after merging main.

## Built (Nov 4)

TD1-TD8 pass. Unit: `arch/features.test.ts` (TD1, TD2), `captures/here.test.ts` (TD3), `recording/walkLog.test.ts` (TD4), `captures/bundle.test.ts` (TD5), `gaps/tileCollector.test.ts` (TD6), `arch/shells.test.ts` (TD7, TD8). The GPS log's share sheet moved to `shareLog/share.ts` (an adapter over React Native's `Share`), covered by the `walk` and `deletion` journeys, which now name `lib/shareLog`. The bundle's `exported_at` comes from the clock it is given. Shells no unit test reaches: 13 before, 9 after. Also: tests for M15 (`moments/dayNotice.test.ts`), AC11 and NT12 (`arch`); R10, N14 and L18 named in the nothing-leaves check every journey ends with; the v1 retired list corrected to the spec's own line (S7, S8, S13, S16 and S17 are live; S22 and S23 retired). Live ids no test names: 33 before, 24 after, triaged in `triage.md`. No audit (decision 0074). Native: the instances run through `ports` on SQLite and the native share sheet; never run on a device.
