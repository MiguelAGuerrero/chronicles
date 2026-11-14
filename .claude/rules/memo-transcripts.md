---
paths:
  - "src/lib/transcript/**"
  - "src/lib/useTranscript.ts"
  - "src/components/MemoTranscript.tsx"
  - "modules/**"
  - "src/lib/__tests__/transcript/**"
---
# Captures: memo transcripts

## Memo transcripts (TX1-TX18, decision 0169)

- **The words are a cache beside the memo** (`transcript` table, SQLite migration 28, IndexedDB 21; `capture_id`, `text`, `lang`, `from_ms`, `to_ms`, `made_at`), never in the memo's `body`, `caption` or `edit`. `''` means the engine heard none, so the memo is not read again. A row read from another span than `spanOf(memo)` is stale (`isStale`): not served, and read again.
- **Read in the background, one at a time** (`transcript/shell.ts`): after a memo is kept (`useCaptures.saveMemo`) and for older ones at launch (`backfillTranscripts`, `_layout`). It waits while a walk or a memo records or plays (`busy`), asks for the speech permission only for a memo kept this session on a quiet moment, never at launch, and remembers a refusal (meta `transcript_off`). Nothing is said when it cannot read.
- **On the device only**: every request is `onDevice: true` (the type allows nothing else) and `supportsOnDevice(lang)` is asked before each read. The engine adapter and the cutter are `.native.ts`; the web has none (`engine.ts`).
- **A trimmed memo is read from a cut copy** of its kept span (`exportTrimmedAudio` in the local module `chronicles-video-edit`), written to the cache and removed after the read.
- **Shown as a caption** (`MemoTranscript`, `testID` `memo-transcript`, label "Read by your phone: ..."): nothing while pending or empty, no count, no confidence. A hit in search shows the moment's normal card, never a snippet. No edit or hide: a wrong word is part of the memo.
- **Chronicle reads it through `resurface`'s `transcript` option** (`wordsOf`); `THREAD_RULES` is `resurface-2`.
- **Audit (Nov 13):** a delete of one piece clears its row (`deletePieces`); a read checks `kept` before it writes; an engine `end` with no result is null, never "no speech"; a recording beginning aborts the read (`interrupt`) and the memo waits; Memories refreshes once when the queue is quiet (`onSettled`); `onDeviceReady` (core) gates on API 33 and an installed pack on Android and on the device locale's on-device flag on iOS, never on iOS's supported-locale list; the web engine's permission is `'unavailable'`, so it stores nothing. The caption says "Read by your phone" in view (`memo-transcript-label`) and sets its words in italics.
