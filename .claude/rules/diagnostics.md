---
paths:
  - "src/lib/diagnostics/**"
  - "src/lib/__tests__/diagnostics/**"
  - "src/components/ShareDiagnostics.tsx"
---
# Diagnostics: every caught error, handled by its kind

Decision 0179, `specs/errors-handled/spec.md` (EH1-EH14). No swallowed errors: a caught error is handled by its kind
and written to a log on the device, which the walker shares as text from the walk settings.

- **Report through the sink** (`lib/diagnostics/sink`), which anything may import, the db adapters included: it holds
  reports until the log's shell attaches at startup.
- **The kinds:** a save of something the walker made or chose (`saved`, said on screen with Retry); a platform's
  refusal (`caught('refused', …)`, the screen's state, never a message); cache and background work (`caught('cache',
  …)`); a fallback (`fallback(place, value, what it stands in for)`); anything else is `report('unexpected', …)`.
- **An entry never holds** a position, a tile, a URL's path, a file path, an id, the walker's words or a time finer
  than the day (EH3a; the owner, Nov 16). A message from outside the app is its error type, a code and the reason in
  words (`messageOf`): a platform's message can name a place nobody quoted. Throw `AppError` for words of the app's
  own that should be kept; they are still scrubbed.
- **A save of the walker's** is `saved(place, what, () => save, { screen, key? })`: the whole call, never a `.catch`,
  so a later success clears an older failure and Retry never writes an old value back (audit 2). `what` as the walker
  knows it ("your destination", "part of this walk"); `key` when the words don't tell two things apart (a moment's
  reaction: `reaction:<id>`); `screen` where it happened. Each screen draws its own (`SaveFailedLine host=…`,
  `shownOn`): the walk and ready screens show the settings too; Explore and the gallery have the line since audit 7.
  On the walk, Hide sets it aside until something new fails or the walk ends (`hideFailed`, `walkEnded`).
- **A retry saves the thing as it stands then**, never the first call again where that is stale: a still spell is
  `putStill(stillRetry(...))`, open or ended (audit 3).
- **The log never feeds itself:** the SQLite queue hands a failed write to its caller and reports nothing (it once
  reported its own failure into itself forever, audit 1); a store that refused an entry is not written again that
  session; a repeat of the same kind, place and message within a minute is written once (audit 9).
- **Core never catches to drop**: it returns the failure as a value (`lib/parse`: `tryJson`, `tryUrl`), or a port it
  calls records its own failure (`createNotifier`'s `report`, `runLook`'s `tileBuild`).
- **The gate holds it** (`check:quality`): an empty handler, a value handed back without a word (`.catch(() => [])`)
  or an empty `catch` is swallowed; a promise nothing awaits, returns, voids or catches is floating (`--types`). The
  baseline holds none of either. `scripts/quality/codemod-errors.js` moved the first 285; `--hand <table>` takes a
  reviewed table of decisions (file, a piece of the code, the kind, the words).
- **Traps.** `failedSave` is gone: the codemod writes `saved` now. A hand-table match on a chain's text also matches calls inside it: the outer `.catch` of a read that
  ends a still spell inside was taken for a save once. A test that loads a module's source with its imports
  stripped (`tileRules.test.ts`) must be handed `caught`.
