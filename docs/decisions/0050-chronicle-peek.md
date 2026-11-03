# 0050. Chronicle's peek: an empty line and Navigate before any walk, else a Walks | Days switch

Date: 2026-11-02 · Status: accepted · Area: tabs, chronicle

## Context
The second batch of the tabs audit (U5-U15, audit 6; the owner's calls, Nov 2).

## Decision
Chronicle's peek: with no walk finished (a walk minimized or not), the empty line, Days and a Navigate button (U7); otherwise a Walks | Days switch in the header at every height (U8). No "N walks · M places" (U13, 0052).

## Consequences
- `HomeSheet` peeks with the switch and no counts (0019, 0035).
