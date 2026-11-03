# 0048. The recording bar has its own Stop

Date: 2026-11-02 · Status: accepted · Area: tabs, recording bar

## Context
Nov 2: minimized on the owner's iPhone, the bar's › did nothing, even after closing and reopening, while the tabs worked. Never reproduced (desktop, phone emulation, `/chronicles`, reloads, browser Back: `E2E_ONLY=reload`, `E2E_MOBILE=1`).

## Decision
The owner's quick fix, Nov 2: the bar has its own Stop (`bar-stop`, held as on the walk screen; a tap says to hold), beside its camera: a way out even when the walk screen can't be reached.

## Consequences
- It refuses under a memo (`memoGate`), waits at most 5 s for the bar's photo (`settleWithin`), then `stopWalk` and the replay.
- The walk gate holds only while the walk screen is in front (`useFocusEffect`), never merely mounted; these are the only two ways the › can do nothing.
- The hold follows the walk screen's Stop (0008).
