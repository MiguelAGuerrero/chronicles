# 0053. The first replay's card has a quiet "Not now", and every way out ends on Chronicle

Date: 2026-11-02 · Status: accepted · Area: replay, tabs

## Context
The second batch of the tabs audit (U5-U15, audit 6; the owner's calls, Nov 2).

## Decision
The first replay's card has a quiet "Not now" (U14): unnamed, to Chronicle. Re-watches keep Done. Every way out of the first replay ends on Chronicle (audit 6).

## Consequences
- Android back is a `BackHandler`. The browser's back can't be stopped cheaply: it restores the stack saved with the earlier history entry (expo-router 58's `restoreNavigationFromBrowser`), so the replay, on unmount, moves to Chronicle unless its own buttons (`toChronicle`) already did.
- `usePreventRemove` would block it, but it also adds a `beforeunload` prompt on web, so a reload mid-replay would ask "Leave site?".
- Re-watches advance by themselves (0004).
- Native unverified: the replay's `BackHandler`.
