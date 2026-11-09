# 0104. Storage awareness: the room left is said in words before it loses a moment; Expo first

Date: 2026-11-09 · Status: accepted · Area: storage, captures

## Context
The owner asked for a way for the app to alert you about memory consumption, and to act before it uses too much (Nov 9). "Memory" meant moments' storage: the phone's, or the browser's for the web app. The app never read the room left; a photo or video whose save failed was lost with the platform's raw error; on the web the app's data was "best effort", so the browser could clear it under storage pressure. The vision gate judged the idea **aligned if reshaped**: protect the moment, never a usage gauge, never a limit on capturing (`specs/storage-awareness/spec.md`, Vision).

## Decision
The owner's calls, Nov 9 ("be framework first and use Expo; proceed with your reasonable defaults"):
- **Expo first.** A phone reads its free space with expo-file-system's `Paths.availableDiskSpace`. No native module of our own. Apple's "available for important usage" capacity, which counts what iOS can purge, is deferred; the Expo figure reads low, never high, so the app may speak early, never late.
- **The web reads the browser's storage API** (`navigator.storage.estimate()`, `navigator.storage.persist()`): expo-file-system's web build returns 0. A listed web exception (`docs/ARCHITECTURE.md`).
- **Two levels:** low under 500 MB, very low under 100 MB. One line in words beside the capture buttons, once for each level on the device, again only when it gets worse or after the room recovered and ran low again. Never a notification, never a number, no alarm styling, never a nudge to free or delete.
- **Never a limit on capturing.** The app never refuses, shrinks or deletes a capture to save room. Every capture whose save fails is held for Retry, with why in words.
- **On the web, persistence is asked once**, never while a walk records; a refusal is said once on Navigate, ready.
- These are the agent's defaults, which the owner authorized ("proceed with your reasonable defaults"), as amended by the steward's read the same day (the spec's Decisions).
- **0041 stands:** no Storage screen.

## Consequences
- `lib/space` (core, shell, instance, platform probes), `components/SpaceLine`; meta `space_said` and `space_persist`.
- `useCaptures` keeps a failed photo or video for Retry (the memo's pattern) and words every failure.
- Deferred: the important-usage capacity, caps on rebuildable caches, Retry on the recording bar's camera.
- Native unverified: `docs/NATIVE_UNVERIFIED.md`.
