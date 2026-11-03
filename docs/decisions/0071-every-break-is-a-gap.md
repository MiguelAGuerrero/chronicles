# 0071. Every break in the trace is a gap, and settling never breaks it

Date: 2026-11-03 · Status: accepted · Area: trace, gaps · Supersedes part of [0060](0060-filling-gaps.md)

## Context
On a walk down South 3rd Street, Easton (Nov 3), the line broke across Ferry Street and near the river, and nothing was offered. The GPS log showed a fix every second through both. Settling GPS wander (`settleJitter`) had drawn slow stretches as spots of 75-148 s with two points each, and the 60 s break rule cut between them. The breaks were also 30-35 m, under the 40 m a gap needed.

## Decision
The owner's rule: if the last point and the current one leave a break, it is a gap; fill it so the line is continuous.
- Settling keeps a point at least every 30 s inside a spot, so it never makes a break.
- Every break of more than 60 s and at most 30 min is a gap, however short. Ends within 10 m are joined straight and filled by itself; longer ones are filled, offered or dotted as before.

## Consequences
- `SNAP_RULES` 8: every walk is read again when its replay next opens.
- A drifting standstill draws a little more settled line (46 m to 62 m in the 90 s jitter test), the part the old break hid.
- A join from a fix to a street costs twice its length in the search, so a short gap runs along its street.
