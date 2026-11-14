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
