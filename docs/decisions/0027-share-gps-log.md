# 0027. Share GPS log from the walk's options

Date: 2026-11-01 · Status: accepted · Area: walk screen, diagnostics

## Context
The owner's go-ahead, Nov 1, after the trace and dot sat far from where they stood indoors.

## Decision
The walk's options hand the walk's raw readings (seconds, position, accuracy, speed, course) and placed captures to the share sheet, or the clipboard on a desktop. Nothing is sent anywhere by the app.

## Consequences
- `gpsLog`; React Native's `Share` (so `navigator.share` on web).
- The text is read when the card opens: a browser opens the share sheet only straight from a tap.
