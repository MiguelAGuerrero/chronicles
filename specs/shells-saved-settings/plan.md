# Plan: saved-settings shells (SH1-SH9)

## Files

| Now | After | Factory | Takes |
|---|---|---|---|
| `src/lib/unitsStore.ts` | `src/lib/unitsStore/shell.ts`, `index.ts` | `createUnitsStore(p, locale = deviceLocale)` | `Pick<Ports, 'db'>`, the locale as a function so a test needs no machine locale |
| `src/lib/nav/store.ts` | `src/lib/nav/store/shell.ts`, `index.ts` | `createNavStore(p)` | `Pick<Ports, 'db'>` |
| `src/lib/notify/index.ts` (prefs part) | `src/lib/notify/prefs.ts`; `notify/index.ts` builds them | `createNoticePrefs(p)` | `Pick<Ports, 'db'>`. `notify/index.ts` builds it from `db`, not `ports`: `ports` imports the notifier, so the other way is a cycle. `notify/index.ts` is marked `@instance` as the notifier's own composition root |
| `src/lib/explore/momentFind.ts` | `src/lib/explore/momentFind/shell.ts`, `index.ts` | `createMomentFind(p)` | `Pick<Ports, 'db' \| 'clock'>` and `hidden: () => ReadonlySet<string>` (the Undo window's ids). The instance passes `deletions.hidden`; the shell never imports `deletion/index`, which loads React Native |

Every `index.ts` re-exports the same names the old module exported (`loadUnits`, `saveUnits`, `UNITS_KEY`, `saveNav`, `loadNav`, `clearNav`, `loadPendingDest`, `savePendingDest`, `findForMoment`, `loadNoticePrefs`, `saveNoticePrefs`, `NOTIFY_OFF_KEY`), so no importer changes: `app/_layout.tsx`, `components/StartSettings.tsx`, `components/walk/useReady.tsx`, `components/NotificationSettings.tsx`, `lib/session.ts`.

- `scripts/affected.js`: `coverage()` reads the `// @instance:` marker; such a file is a hole only when none of the modules it imports is reached by a test.
- Marked `@instance`: `lib/ports/index.ts`, `lib/ready/index.ts`, `lib/tabsHidden.ts`, `lib/notify/index.ts`, and the three new `index.ts` files.
- `scripts/features.js`, the `qol` journey's `covers`, and the `map`, `navigation`, `tabs-and-home` rules: globs that name `unitsStore.ts` or `momentFind.ts` as files become folders.
- Docs: `.claude/rules/functional-core.md` (the marker, the folder layout for a flat module), `docs/TESTING.md` (section 0's "Covered by nothing"), `docs/DEFERRED.md` (four shells and three non-shells off the list), `docs/STATUS.md`.

## Data

None. The meta keys (`units`, `nav`, `notify_off`) and the finds table are read and written as before.

## Tests

| Id | File | Tests |
|---|---|---|
| SH1 | `map/unitsStore.test.ts` | `SH1 a saved setting applies at launch`, `SH1 none saved, or a failed read: the region's default`, `SH1 a save shows at once, and a failed write still shows` |
| SH2 | `navigation/navStore.test.ts` | `SH2 a walk's destination reads back for that walk only`, `SH2 cleared, empty or unreadable reads as none`, `SH2 the drawer's destination before a walk` |
| SH3 | `notify/noticePrefs.test.ts` | `SH3 the switches read back; none saved is every kind on` |
| SH4 | `moments/momentFind.test.ts` | `SH4 the nearest unfound place in reach is found and recorded`, `SH4 nothing found or recorded: no position, in Undo, deleted during the read, already found, nothing in reach` |
| SH5 | `arch/shells.test.ts` | `SH5 the four shells import no singletons and no ports`, `SH5 each instance exports the names its module did` |
| SH6 | `arch/features.test.ts` | `SH6 an instance of a tested shell is not a hole; one of an untested shell is` |
| SH7 | `map/mapReads.test.ts` | `SH7 one read at a time; free again after a failure` |
| SH8 | `map/perfCount.test.ts` | `SH8 counts only when the page asked` |
| SH9 | the journeys `check:affected` names | expected: `qol`, `ready`, `walk`, `launch`, `notifications` |

Each test is written and seen failing before its module moves.

## Deferred

The other 14 shells, one cluster per slice. `walkNav` (it imports `expo-router`) stays glue covered by its journeys.

## Native

The instances run on the phone through `ports` (SQLite). Nothing new is native; the native app has never run on a device.
