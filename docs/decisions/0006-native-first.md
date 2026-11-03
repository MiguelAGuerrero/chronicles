# 0006. Native first: web gets its own code only where no Expo module covers the feature

Date: 2026-10 (v0) · Status: accepted · Area: platform

## Context
Web is a fallback. A mobile feature with no web workaround stays off on web (background recording, for example). A limited version is fine where one works (photos open a file picker on desktop). The owner's rule.

## Decision
Every feature is built on the Expo modules and components the phone app uses. Web gets its own code only where no Expo module covers the feature on web, and each such exception is listed in AGENTS.md with its reason.

## Consequences
- The exceptions so far: map (maplibre-gl), storage (`db/index.web.ts`, `media/index.web.ts`), location (`recorder/index.web.ts`), caption baking (`Baker.web.tsx`), notifications (`public/sw.js`, `notify/transport.web.ts`), audio mode (`lib/audioMode.web.ts`), motion samples (`motionSource/index.web.ts`), browser fixes (`webStyles.web.ts`).
- Before adding web-only code, check `node_modules/<module>/build/*.web.*` for a web implementation.
- Platform splits: `x.native.ts` / `x.web.ts` beside a plain `x.ts` that re-exports the native one; the shared interface in a `types.ts`.
- Native has never run on a device: `docs/NATIVE_UNVERIFIED.md`.
