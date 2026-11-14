# 0179. A caught error is handled by its kind, and recorded in a diagnostics log you can share

Date: 2026-11-14 · Status: accepted · Area: storage, process

## Context
The code-quality report (decision 0178) found 248 errors swallowed without a word (`.catch(() => {})`, an
empty `catch`) and 26 floating promises, in four kinds: failed saves of the walker's data, best-effort
platform calls (keep-awake, audio mode, notifications, a sound the browser refused), background and cache
work, and read fallbacks that substitute a default without saying so. Nothing leaves the device (0005), so a
handled error can only reach the screen or stay on the phone.

## Decision
The owner, Nov 14: "There should be no swallowed errors. Any error caught should be appropriately handled."
- **By kind:** a failed save is shown with Try again; a platform refusal becomes state the screen shows (a
  tap-to-play, say); cache work is marked for recompute; a read fallback stays, and is recorded.
- **A local diagnostics log:** every caught error is written to it, on the device.
- **Exported as text:** "Share diagnostics" in the app's settings dialog hands the log to the share sheet as
  plain text (the clipboard on a desktop browser), as Share GPS log does. Nothing is sent by the app.

## Consequences
- Its own slice, next after code quality: new truth (a SQLite migration and an IndexedDB version), a screen
  change, and the 248 swallows and 26 floating promises moved over by catalog move R10.
- Until then the code-quality gate fails any new swallowed error or floating promise.
