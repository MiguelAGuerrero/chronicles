# 0035. A capture is a moment that may belong to no walk; days are never stored

Date: 2026-11-01 · Status: accepted · Area: moments and days

## Context
The owner's call, Nov 1: "jot it down" in a store, not only on walks. The concept doc's "Moments and days" tab, M1-M17.

## Decision
A capture is a moment that may belong to no walk. `Capture.walk_id` and `Find.walk_id` are nullable. Capture from the home (`MomentBar`): a moment is stored at once and placed when its one fix arrives (`placeMoment`), so a save never waits on GPS.

Days are never stored (`lib/days.ts`, pure): local midnight to midnight, a walk in the day it started with all its captures, in the phone's current time zone. The day's replay (`app/day/[key].tsx`, `dayPlan`) flies to each loose group's pin, plays a walk's own path, and ends on a quiet card. The first watch waits for Continue; meta `day_watched:<key>` makes later watches advance by themselves (as 0004). No notification ever suggests watching.

## Consequences
- SQLite migration 11 rebuilds the capture and find tables (SQLite can't drop NOT NULL in place) and adds `capture_t`; IndexedDB v10 adds the capture `t` index; `db.capturesBetween(from, to)`.
- The home reads every capture row (never media) for the days list, which widens 0019. The sheet has Days beside Walks.
- Media of loose moments go under `walks/moments/`. A loose moment finds a place like a walk's capture (`explore/momentFind.ts`). Placed loose moments are pins from z11 (`MOMENT_PIN_ZOOM`).
- `useCaptures(null, …, { loose: true })`; `MomentState` reports 'kept', then 'placed' or why not; `groupCaptures`; `looseRestMs` (2 h).
- One fix per moment, no all-day tracking (0036). Deferred and native items: `docs/DEFERRED.md`, `docs/NATIVE_UNVERIFIED.md`.
