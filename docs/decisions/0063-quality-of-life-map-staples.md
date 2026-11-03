# 0063. Quality of life: this round takes the map staples only; the rest waits in the owner's order

Date: 2026-11-03 · Status: accepted · Area: quality of life, map

## Context
The owner's calls, Nov 3; the concept doc's "Quality of life" tab, QL1-QL12.

## Decision
From the quality-of-life list, this round took the map staples only: start and end markers, a scale bar, and Locate. Deferred, in the owner's order: a km or miles setting, time left beside distance left, a Settings link when location is denied, renaming a walk later, editing a note's text, photo thumbnails on pins, month headers in the walks list, keep awake on a phone (adds expo-keep-awake), GPX export, the current street as a chip, dark mode.

## Consequences
- Start and end markers: `lib/traceEnds.ts`, one `ends` circle layer with the trace's opacity (hidden while navigating, 0045); the end only once the walk has ended (`ended` prop).
- Scale bar: `lib/scaleBar.ts`, `components/map/ScaleBar.tsx`, `scaleInset` per screen.
- Locate: `lib/useLocate.ts`, `components/LocateButton.tsx`, one fresh fix (`locateOnce(..., { fresh: true })`); nothing tracks after (0036).
- `E2E_ONLY=qol`. Native unverified: the `ends` layer's `match` stroke colour, the scale bar, `locateOnce` fresh, the edge button over the native sheet.
