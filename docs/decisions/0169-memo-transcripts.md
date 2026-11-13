# 0169. Memo transcripts: read on the phone, in the background, as a caption; a wrong word is part of the memo

Date: 2026-11-13 · Status: accepted · Area: captures, memories · Answers: VISION.md open question 2; voice trim question (c) (decision 0159)

## Context
A voice memo has no words, so it cannot join a thread or be found. The seam for words is built (`ResurfaceOptions.transcript`, decision 0098). The owner answered in a session on Nov 13.

## Decision
- **On-device only**, through `expo-speech-recognition` (Expo's own SDK has no speech-to-text). Phone only; the web shows none. VISION.md's open question 2 is answered yes; the owner makes the edit to the page.
- **In the background**: a memo is kept first; its words arrive when ready and show as a caption under the voice note, with nothing shown while they are pending.
- **A trimmed memo is read from an in-memory copy of its kept part**: a copy of the kept span is cut for the recognizer, never kept beside the memo, deleted once read. So a word spoken in the cut part is never in the caption, a thread or a search (0159, question (c): the transcript reads the kept part only).
- **A wrong word is part of the memo.** The caption is not edited or hidden in this slice; the only remedy is deleting the memo. It is labelled as the phone's reading ("Read by your phone"), the provenance the owner agreed.

## Consequences
The transcript is a cache in its own table (the audio is truth); a trim change makes it stale and it is read again. A native method that cuts audio is added to the local module and is unverified on a device. Editing a transcript, the replay's bubble and other languages are deferred (`docs/DEFERRED.md`).

Numbering: written as 0165, renumbered 0166 when `main` took 0165 for the owner's answers to T19-T22. `docs/STATUS.md`, `docs/DEFERRED.md` and `docs/NATIVE_UNVERIFIED.md` entries of the memo transcripts slice still say "decision 0165" (the record documents change only by operations, decision 0156); they mean this record.
