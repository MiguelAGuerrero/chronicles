# 0004. Re-watches move on by themselves; only the first replay waits for taps

Date: 2026-10 (v0) · Status: accepted · Area: replay

## Context
0002 makes the replay wait at every capture. The owner's call on what a second viewing does.

## Decision
"Watch again", and replays opened from the log, advance after 4 s for a photo or note, and when a memo or video ends. Only the first replay after a walk waits for taps.

## Consequences
- On web, a refused memo (its play button still showing) moves on after 4 s in a replay that advances by itself; a video that hasn't started 800 ms after `play()` plays muted with "Tap for sound".
- The day's replay follows the same rule: the first watch waits for Continue; meta `day_watched:<key>` makes later watches advance by themselves (0035).
- The first replay's card has "Not now"; re-watches keep Done (0053).
