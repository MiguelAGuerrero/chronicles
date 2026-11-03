# 0052. Counts are words

Date: 2026-11-02 · Status: accepted · Area: replay, tabs

## Context
The second batch of the tabs audit (U5-U15, audit 6; the owner's calls, Nov 2). Nothing is a score (0020), but the card, the fog beat and the lists still showed numbers.

## Decision
Counts are words (U13, `lib/quietLines`): the card's new streets are a clause in its line ("your first time down Elm Street", "3 streets new to you"), from `ReplayData.newStreets` (visited named keys not walked before); the fog beat says the same, or "Familiar ground". The low names one or two places, else "a few places" (`passedPlaces`, `passedLine`). The walks list row is date, distance, time and captures (`walkRowMeta`). No accent colour or large number on the card.

## Consequences
- The e2e scans the card for an accent colour and a large number.
- No "N walks · M places" on Chronicle's peek (0050).
- Still open in the doc: whether the replay keeps its "Passed …" low (0020).
