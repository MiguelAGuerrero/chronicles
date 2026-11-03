# 0071. "Tracing paused while this page was hidden" only when it was

Date: 2026-11-03 · Status: accepted · Area: recording, walk screen · Follows [0070](0070-app-opens-on-explore.md)

## Context
On a walk past Scott Park (Nov 3), the owner's phone showed "Tracing paused for 1 min while this page was hidden" again and again with the page open on screen. The notice fired for every gap of over a minute between kept fixes (`newestGap` in `useLiveTrace`), whatever caused it: the browser sending nothing, or fixes too poor to keep (accuracy over 50 m, speed gates). It never checked whether the page had been hidden.

## Decision
The owner's call: the notice shows only for a gap the page spent out of front. A gap with the page on screen raises no notice; the status chip's "Weak GPS" already says it, quietly, and the gap stays on the map as the dotted line.

## Consequences
- `lib/hiddenLog.ts` (pure) keeps the page's recent hidden spells, fed from AppState in `useLiveTrace`. A gap that began before the page loaded counts as hidden (the tab was closed, discarded or reloaded).
- A short hide inside a longer GPS outage still reports the whole gap's length.
- Native is unaffected: it records in the background and never shows the notice.
- Why the fixes went missing on that walk is not known yet: the walk's GPS log (options, Share GPS log) would tell whether the browser stopped sending or the gates dropped them.
