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
- **The kinds:** a save of something the walker made or chose (`failedSave`, said on screen with Retry); a platform's
  refusal (`caught('refused', …)`, the screen's state, never a message); cache and background work (`caught('cache',
  …)`); a fallback (`fallback(place, value, what it stands in for)`); anything else is `report('unexpected', …)`.
- **An entry never holds** a position, a tile, a URL's path, a file path, an id or the walker's words (`scrub`, EH3a).
- **A save of the walker's** (`failedSave(place, what, retry)`, or `saved(…)` when the caller needs to know): `what`
  as the walker knows it ("your destination", "part of this walk"), the retry the same call. The line is
  `SpaceLine`'s slot (`components/SpaceLine.tsx`), so every screen with the storage line has it.
- **Core never catches to drop**: it returns the failure as a value (`lib/parse`: `tryJson`, `tryUrl`), or a port it
  calls records its own failure (`createNotifier`'s `report`, `runLook`'s `tileBuild`).
- **The gate holds it** (`check:quality`): an empty handler, a value handed back without a word (`.catch(() => [])`)
  or an empty `catch` is swallowed; a promise nothing awaits, returns, voids or catches is floating (`--types`). The
  baseline holds none of either. `scripts/quality/codemod-errors.js` moved the first 285; `--hand <table>` takes a
  reviewed table of decisions (file, a piece of the code, the kind, the words).
- **Traps.** A hand-table match on a chain's text also matches calls inside it: the outer `.catch` of a read that
  ends a still spell inside was taken for a save once. A test that loads a module's source with its imports
  stripped (`tileRules.test.ts`) must be handed `caught`.
