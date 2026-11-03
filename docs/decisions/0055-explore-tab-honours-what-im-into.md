# 0055. The Explore tab honours "What I'm into"

Date: 2026-11-02 · Status: accepted · Area: explore tab

## Context
Nov 2, after the Explore tab's "?" never showed on an exploring walk with kinds switched off. Numbered after the tabs audit's records (0046-0054) so the earlier records' links held.

## Decision
`tabMarks` and `areaInView` take the hidden kinds, so a "?" on the tab is one a walk can show. A find shows whatever its kind.

## Consequences
- What I'm into is meta `explore_hidden`, set in Explore's settings (0031), now in Navigate's dialog (0056).
- No counts on the Explore tab (NV14, 0020).
