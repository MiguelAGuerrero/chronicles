# 0047. Navigate with a walk minimized is a live view of it

Date: 2026-11-02 · Status: superseded by 0076 (Navigate opens the open walk) · Area: tabs, navigate

## Context
Navigation & tabs, after the audit (the owner's calls, Nov 2). U2: with a walk minimized, Navigate showed the start state, as if no walk were on.

## Decision
Navigate with a walk minimized is a live view of it (`LiveWalk` in `(tabs)/index.tsx`): trace, dot (`walkerSource={live.dot}`), captures, destination, and the capture row (`CaptureRow`, split from `MomentBar`) keeping captures for the walk. No Start or Return button (the recording bar is the way back), no `locateOnce`.

## Consequences
- Only `LiveWalk` reads `useOpenWalk()`, and only while Navigate is focused; screens that only need to know whether a walk is open use `useOpenWalkInfo()`, which never changes per fix. The e2e bounds `render:navigate-walk`.
- Going to the walk screen is `showWalk()` (`lib/walkNav`, `lib/walkGate`), never `router.push('/walk')` (tabs audit 1).
- No drawer at all with a walk minimized came on Nov 3 (0062).
- Native unverified: `LiveWalk`'s Markers and dot, `dangerouslySingular` on the native stack.
