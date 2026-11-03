# 0007. Backing up a walk is deferred until the export system has a proper place

Date: 2026-10 (v0) · Status: accepted · Area: export

## Context
Round 3 built a streamed backup zip. The owner's call on when it ships.

## Decision
Backing up a walk is deferred until the export system has a proper place in the app. It is tested on a phone first. The code (`lib/export`, `writeWalkBundle`) stays, but nothing in the UI reaches it. Saving a single keeper from the viewer stays.

## Consequences
- `writeWalkBundle` streams (fflate `Zip` + `ZipPassThrough`, 1 MB chunks; a file handle on native, Blob parts on web); missing media is counted, marked in walk.json and reported.
- There is no import yet; the bundle leaves still spells and `thumb_path` out (`docs/DEFERRED.md`).
- Saving keepers uses expo-media-library's `Asset.create` with `requestPermissionsAsync(true)`.
