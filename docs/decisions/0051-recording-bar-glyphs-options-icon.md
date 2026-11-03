# 0051. The recording bar shows pause and a forward chevron; walk options is always `options-outline`

Date: 2026-11-02 · Status: accepted · Area: tabs, walk screen

## Context
The second batch of the tabs audit (U5-U15, audit 6; the owner's calls, Nov 2). The options button's compass read as the Explore tab.

## Decision
The recording bar shows a pause glyph when paused and a forward chevron, not chevron-up, as its way back (U10). The walk options button is always `options-outline` (U11).

## Consequences
- Ionicons draw a private-use glyph, so the e2e compares glyphs from the font's glyph map (`glyph('pause')`, `iconOf` for messages).
- Walk options stay in the bottom strip (0023).
