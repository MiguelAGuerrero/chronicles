# 0127. Memo transcripts: read on the device by an offline model that is fetched on a tap, and an engine the app can swap

Date: 2026-11-11 · Status: accepted · Area: resurface, storage, architecture · Answers open question 2 of VISION.md · Builds on [0098](0098-chronicle-opens-on-memories.md), [0104](0104-threads-the-owner-makes.md), [0107](0107-storage-awareness.md)

## Context
A voice memo is a moment you can play but not search, and it joined no thread: Memories reads a note's text and a
photo's caption, and a memo had no words (0098). The seam was built (`ResurfaceOptions.transcript`,
`transcriptExtractor`); the transcriber was not. VISION.md's open question 2 asked whether on-device transcription,
a phone-only feature, was acceptable.

## Decision
The owner's calls, Nov 11 (`/vision` and `/slice`, the options recommended unless noted):
- **An offline model**, never an OS recognizer, so nothing can fall back to a cloud. English only, the `.en` models.
- **The model is never in the app**: fetched once, on a tap, from the chronicles-data Pages site (already an allowed
  host, so no new host; 0103), checked against a pinned SHA-256 and moved into place whole, kept in the cache directory
  (a phone) or Cache Storage (the web), loaded only for a run and released when the queue is empty, on the
  background and on a memory warning. Quantized `base.en` on phones; the web starts at `tiny.en`, to be timed in a
  real browser (the owner chose "measure first").
- **It works on the web too** (the owner's words: "ensure that this works for web too"): transformers.js with an
  ONNX Whisper model, one thread, in a Web Worker that is terminated after each run, from the app's own origin. A web
  exception (`docs/ARCHITECTURE.md`): no Expo module transcribes on web, `whisper.rn` has no web build, and
  whisper.cpp's WebAssembly needs the cross-origin isolation headers GitHub Pages cannot send.
- **No library is coded to** (the owner's call): the app depends on one `Engine` contract; `whisper.rn` and
  transformers.js are adapters under `src/lib/transcribe/engines/` behind one registry line per platform; lint, a
  syntax-tree test and a contract suite hold it. A swapped engine reads as a new tag: transcripts stay shown and are
  re-read once the owner taps Download for the new model (the owner took the recommendation; it is never fetched
  on its own).
- **A memo's AAC stays as it is**: a small local native module decodes it to 16 kHz PCM for a run (the phone), the
  browser decodes it in memory (the web). Stored files and recording do not change, and old memos are read too.
- **Transcripts are a cache**, a `transcript` table by piece id (SQLite migration 23, IndexedDB 19) with the engine's
  tag, recomputed when the tag changes, deleted with its moment, piece or walk in the same transaction. Never
  edited, never a title or a summary, never shown without its moment's place and time, and only in the viewer, the
  resurfaced card and the thread rows. The label is "Heard by this phone" (the owner's wording), one string on both
  platforms.
- **Quietly after a memo is kept**, with no progress, only while the app is open and never while a walk records. The
  switch is a row in the walk settings, off by default; Remove the model is offered only on the owner's own turn-off.

## Vision
Idea: a voice memo's words, read on the device, join threads and resurfacing.
Verb: return. Touches: Open question 2; Never "Data leaving the device without a tap" (the one fetch is the owner's
tap), "Writing the owner's words for them" (a transcript is derived, labelled, never edited); Always "A moment
carries its context", "Counts are words" (the size is said in words). Verdict: aligned if reshaped (the steward's six
should-fix findings are in the spec's plan).

## Proposed edit to VISION.md (the owner makes it; agents do not edit the page's lists)
- Open question 2: answered Nov 11, "acceptable, and on the web too, with an offline model fetched on a tap".
- Precedents: `| 0127 | Memo transcripts: read on the device by an offline model fetched on a tap and loaded only for a run, an engine the app can swap, shown only with its moment, labelled, never edited (reshaped at the gate, Nov 11) |`

## Consequences
- `specs/memo-transcripts/` (MX1-MX32), `.claude/rules/transcripts.md`, the feature `transcripts`.
- The two model files are **not published yet**: `specs/memo-transcripts/handoff.md` says what to put on the Pages site
  and which two constants to set. Until then no download can verify, so none installs: do not deploy this slice live
  before they exist.
- Native (`whisper.rn`, the decode module, the download) and the real web engine have never run: each has an item in
  `docs/NATIVE_UNVERIFIED.md`.
- Deferred, in `docs/DEFERRED.md`: search over memo words, WebGPU, other languages, a resumable download, a cellular
  warning, background transcription.
