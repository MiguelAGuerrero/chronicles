---
paths:
  - "src/lib/transcribe/**"
  - "modules/chronicles-audio-decode/**"
  - "src/lib/__tests__/transcripts/**"
  - "scripts/e2e/journeys/transcripts.js"
---
# Memo transcripts

A voice memo's words, read on the device with an offline model that is fetched on a tap and loaded only for a run. The spec is `specs/memo-transcripts/spec.md` (MX1-MX32) and its plan; the owner's calls are listed in the spec's Decisions. The codemap is in `docs/ARCHITECTURE.md`.

- **The app depends on the `Engine` contract, never on a library** (MX28-MX32). `whisper.rn`, `@huggingface/transformers` and the decode module are imported only under `src/lib/transcribe/engines/**`; lint says so with the fix. A new engine is a file there and one line in the registry (`engines/index.<platform>.ts`). Name no engine or library in copy, meta keys or columns.
- **The model is never in the bundle and never held** (MX13, MX16, MX22): fetched only by the Download tap, kept in the cache directory (a phone) or Cache Storage (web), resolved at use, loaded for a run and released when the queue is empty, on background and on a memory warning. A launch, a run or a retry never fetches.
- **A transcript is a cache** (`transcript` table, by piece id, with the engine's tag): recomputed when the tag changes, deleted with its moment in the same transaction, never edited by the app and never shown without its moment's place and time (MX3, MX9, MX21). It is shown with the label "Heard by this phone" wherever it appears (MX1, MX8), only in the viewer, the resurfaced card and the thread rows (MX24).
- **Nothing is a score** (MX23): the size and the room are said in words, no progress, no count.
- **Tests load the module inside the body** (`mod('core')` in `__tests__/transcripts/fixtures.ts`), not `load('...')`: the package-import audit reads that as a dependency.
- **The web Worker is a public file**, `public/transcribe-worker.mjs` (plain module JavaScript, like the map's worker), not a bundled one: Metro has no dependable Worker bundling and this keeps the engine out of the bundle (MX22). Its code and WebAssembly are copied into `public/engine/` (git-ignored) by `scripts/copy-engine-assets.js`, which `export:web` and the Pages workflow run first. The page side is `transcribe/engines/worker.web.ts`; the message protocol is in the Worker's header comment.
- **File names are platform variants.** `decoder.ts` (the phone's) and `decoder.web.ts` (the browser's) look like one module to Metro, which would pick `decoder.web.ts` for `./decoder` on the web. Only the registries (the `index.native.ts` and `index.web.ts` in `src/lib/transcribe/engines/`) import them, each by its own name; nothing else imports `./decoder`.
- **The two model files are pinned by constants** (`SHA256` in `whisperRn.native.ts` and `transformersJs.web.ts`), set after the owner publishes the files (`specs/memo-transcripts/handoff.md`). A tag follows the hash, so a new file re-reads every transcript. Until set, no download verifies.
- **The e2e injects a stub engine** with `window.__transcribeStub` before the app loads (`src/lib/transcribe/engines/index.web.ts` reads it): a test harness, never set by the app. The journey serves a tiny zip pack and checks the real download, hash, unzip, Cache Storage and browser decode.
- **A run is one try for each memo** (`spent` in `run.ts`); a failed read with no words writes a row with `text: null` and `tries`, a memo with an older model's words keeps them.
- **The viewer, the card and the thread rows show words through `HeardWords`** (components/chronicle), the one place the label is drawn.
