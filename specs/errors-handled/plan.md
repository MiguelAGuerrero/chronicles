# Errors handled by kind: the plan

## The shape

One module carries every caught error to its handling and to the log; a codemod moves the mechanical sites over; the
saves and refusals are moved by hand, each with its words; the gate then holds the count at zero.

| Kind | Today | Handled by | Moved |
|---|---|---|---|
| A save of something the walker made or chose (part of the walk, a destination, a setting) | 49 sites | `diagnostics.failedSave(where, what, retry)`: recorded, and one line "Your destination wasn't saved. Retry" | by hand, each with its words |
| A platform refusal (audio mode, keep-awake, a notification, a sound refused) | 27 sites | `diagnostics.refused(where)`, plus the screen's own state where it changes what a person can do (EH8) | by hand |
| Cache and background work (tile reads, backfills, derived rows, hint flags) | about 230 sites | `diagnostics.caught('cache', where)`: recorded only | the codemod |
| A fallback (`.catch(() => [])`) | 132 sites | `diagnostics.fallback(where, value, 'what it stands in for')`: recorded, the value returned | the codemod, the words by hand where the codemod can't name them |
| A floating promise | 26 sites | `void` + a handler, or `await` | by hand |

The codemod (`scripts/quality/codemod-errors.js`) is a script, so the move is deterministic and reviewable:
it reads the gate's own findings (`patterns.silentCatch`), rewrites `.catch(() => {})` and empty `catch` blocks to the
handler with `where` filled from the file and the enclosing function, and leaves every site it classes as a save or a
refusal (by the call: `db.put…`, `save…`, `setMeta`, `setAudioMode`, `KeepAwake`, `notifier.…`) for the hand pass,
listed. Its output is one commit per feature (`errors <feature> N`), each run through `check:affected`.

## Files

| File | What |
|---|---|
| `src/lib/diagnostics/core.ts` (new, core) | the entry, its kinds and their words; `scrub` (EH3a); the text for sharing (EH3); the retention rule (EH6); the failed-saves list as a reducer (add, retried, done) and its one line in a clause (EH7) |
| `src/lib/diagnostics/shell.ts` (new) | `createDiagnostics(p: Pick<Ports, 'db' \| 'clock' \| 'newId'>)`: `caught`, `fallback`, `failedSave`, `refused`, `record`, `text()`; an in-memory ring when the store can't take an entry (EH5); a `Store` of the failed saves |
| `src/lib/diagnostics/index.ts` (new, instance) | `export const diagnostics = createDiagnostics(ports)` |
| `src/lib/db/types.ts`, `migrations.ts`, `sqliteStore.ts`, `index.web.ts`, `__tests__/fakes/memoryDb.ts`, `__tests__/dbContract.ts` | `addDiagnostic`, `getDiagnostics`, `pruneDiagnostics`: contract cases first (FC7) |
| `src/lib/shareLog/share.ts` | `shareLogText(text, title)` takes the title, so one share path serves both logs |
| `src/components/StartSettings.tsx` | the "Share diagnostics" row after Distances (EH1); its text read when the settings open, as Share GPS log does |
| `src/components/SaveFailedLine.tsx` (new), placed beside `SpaceLine` in `MomentBar`, `OpenLine` and `walk.tsx` | the failed-save line, in the flow of the screen (EH7, EH13, EH14); the replay shows it after its card |
| about 100 files under `src/` | the moved sites |
| `scripts/quality/patterns.js`, `limits.js` | a fallback without the handler counts as swallowed (EH12) |
| `scripts/quality/codemod-errors.js` (new) | the codemod |
| `scripts/features.js` | a `diagnostics` feature: its sources, its journey, this spec |
| `.claude/rules/diagnostics.md` (new) | the kinds, which one a new catch takes, the traps |

## Data

New truth: the diagnostics log. **SQLite migration 30** (`diagnostic`: `id TEXT PRIMARY KEY, t INTEGER, kind TEXT,
place TEXT, message TEXT`, an index on `t`); **IndexedDB version 23** with an `oldVersion < 23` step adding the store.
It is not in the backup bundle and not in `KEPT_STORES` (the walker's data is; this is the app's).

## Tests per criterion

| Criterion | Where | Test |
|---|---|---|
| EH1 | e2e journey `diagnostics` (new) | `EH1 Share diagnostics copies the log on a desktop browser and the note says Copied` |
| EH2 | the cold find (step 9) | the `ux-reviewer`, given only "send the app's diagnostics" and the pictures |
| EH3 | `diagnostics/text.test.ts` | `EH3 the shared text: header, newest first, one line each, the kinds in words; empty says so` |
| EH3a | `diagnostics/scrub.test.ts` | `EH3a a message with a position, a tile, a URL, a path, an id and a place name is shared with none of them` |
| EH4 | the journey's "nothing is sent" check | `EH4 sharing diagnostics contacts no host` |
| EH5 | `diagnostics/shell.test.ts` (fakePorts) | `EH5 every handler records; a store that fails keeps the entry in memory and shares it` |
| EH6 | `diagnostics/core.test.ts` | `EH6 the newest 500, none older than 30 days` |
| EH7 | shell test + journey | `EH7 a failed save is one line with Try again; Try again saves and the line goes` |
| EH8 | shell test | `EH8 a refusal is recorded and shows no message` |
| EH9, EH10 | shell test | `EH9 cache work is recorded only`, `EH10 a fallback returns its value and says what it stood in for` |
| EH11, EH12 | `arch/qualityFacts.test.ts`, `quality.test.ts` | `EH11 the baseline holds no floating entry`, `EH12 a fallback without the handler is swallowed; the baseline holds none` |
| EH13, EH14 | journey | `EH13 no count or badge for errors anywhere`, `EH14 the line never covers the capture stack` |
| storage | `dbContract.ts` | `EH5 addDiagnostic, getDiagnostics, pruneDiagnostics on every store` |

## Screens: goal, control, where the owner looks first

- **Send the app's diagnostics** (rare: a bug report). A list row in the walk settings, "Share diagnostics", with a
  one-line note, after Distances: matrix row 3 (a rare secondary action) in a settings list, the way Distances sits
  there. **Where the owner looks first:** the walk settings, since the app has no Settings screen (PRODUCT.md) and
  Distances, the one app-wide choice, is there. Precedent: Share GPS log's row in a walk's More menu.
- **Know a save failed, and retry** (rare: on error). One line in words with Retry, matrix row 21 (a failure the
  person should know about: inline, near its cause, why in words), staying until the save succeeds (row 10's rule for
  an action that stays). **Where the owner looks first:** beside the capture buttons, where the storage line already
  speaks (0107), in the screen's flow, never over the way, Undo or the replay.
- **Defaults that make a control quieter**, for the owner to overrule: the row is plain (no icon, no accent); the
  failed-save line is plain ink, not red, and has no dismiss timer; the row says nothing about how much is in the log.
  Material's row 21 offers a dialog for a failed save on Android; the line is chosen instead for restraint and
  capture first (EH14).

## Deferred

- A failed save's line names what failed; it does not show the saved value.
- The log is not shown in the app, only shared: reading it is for a bug report.

## Native

Not run on a device: migration 30, the share sheet with a long text on iOS and Android, the failed-save line over
the native map, keep-awake and audio-mode refusals. Each becomes an item in `docs/NATIVE_UNVERIFIED.md`.

## For the owner

1. **The codemod** for about 360 mechanical sites, the hand pass for the 76 saves and refusals: one slice, or the
   infrastructure and the hand pass now and the codemod as the next slice?
2. **Retention:** 500 entries and 30 days.
3. **Places:** the row after Distances; the failed-save line beside the capture buttons, where the storage line is.

## The steward's read (2026-11-14), triaged

No pictures (nothing built). No breaches; six drifts, all accepted into the spec: S1 the text's contents (EH3a), S2 the
line's place in the flow (EH7, EH14), S3 one line in a clause (EH7), S4 why in words and no words held only by the line
(EH7), S5 one verb and no jargon (EH7), S6 the quiet defaults as criteria (EH13). Its three questions: the walk
settings as 0179's "settings dialog" (for the owner); entries of a deleted walk (moot under EH3a); the device's model
(EH3a: the platform and its version only).
