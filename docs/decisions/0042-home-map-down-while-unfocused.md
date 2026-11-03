# 0042. The home map is taken down while the home isn't focused

Date: 2026-11-01 · Status: accepted · Area: home, map

## Context
Phone browsers held two live maps during a walk: the home's, rendered but hidden under the walk screen, and the walk's. The owner's go-ahead, Nov 1, after the research (`docs/research-reactivity.md`) ranked it third.

## Decision
The home map is taken down while the home isn't focused (a walk, a replay: `useIsFocused`), so a phone's browser holds one live map, not two. It comes back where it was.

## Consequences
- `onCameraChange` saves the canvas's own middle, never `getCenter()`, which is the padded centre a fit leaves behind.
- A map applies a fit only when `fitKey` changes after it mounted, so a map brought back doesn't refit; the map refits only when the places walked change.
- The e2e checks there is one canvas during a walk.
- With the tabs, only `LiveWalk` reads `useOpenWalk()`, and only while Navigate is focused (0047).
