<!-- Repo first: written from the owner's request in a session (Nov 12), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Voice trim: cut the dead air off a voice memo

Nov 12, 2026 · @Miguel Guerrero

A voice memo often ends in a tail of noise and silence: the walker is thinking what to say next, then stops abruptly. This slice lets a memo be trimmed with the same start and end handles a video has, so it plays only the part worth keeping. First iteration: a slider, nothing automatic.

## Vision

Idea: "A basic trimming feature for voice memos, a slider you move to crop out a part of the audio clip."
Verb: honour (the moment arrives as the walker meant it, tidied, never rewritten).
Touches: Never "Editing out the lows" (The lows stay in, 0001): that is about a walk's hard parts, not a recording's dead air; video trim (ME14, 0090) already set the precedent, and a trim here is data, so the whole recording is always one Revert away. Never "Writing the owner's words for them": nothing is cut or suggested by the app. Decision 0090 (edits are data on the untouched original).
Verdict: aligned
Shape: as asked, a trim stored as data on the untouched file.
Criteria: VT5 (the file is never changed, Revert restores the whole memo), VT2 (the editor opens with all of the memo kept; the app proposes no cut).
Open: none

## Decisions (the owner's calls, Nov 12)

- Trim is **data** on the untouched recording (decision 0090), not a re-encode: it plays the same on iPhone, Android and the web, and Revert restores everything.
- Offered from the **viewer's Edit** only (no Edit pill right after recording).
- **Two handles** on the trim bar, the same bar a video uses, with a Play button for the kept part.
- No automatic silence detection in this iteration (deferred).

## Criteria

The editor

1. **VT1** A voice memo shows an Edit button in the viewer's toolbar (`testID` `viewer-edit`, label "Edit"), wherever the viewer already offers Edit on a photo or video. It opens the one editor inside the viewer (never a second Modal) with Trim as its only tool and no picture; Done, Close and Revert are as for photos and videos.
2. **VT2** The editor opens with the whole memo kept, however long. Trim shows a bar the length of the memo with a start and an end handle, and the kept times ("0:02 – 0:41"). At least one second is kept; a memo under a second keeps all of it. Handles can be moved by a screen reader, half a second a step. At the one-second minimum the handle simply stops: no message, toast or colour change.
3. **VT3** A Play button in the editor plays only the kept part: it starts at the start handle and stops at the end handle; dragging a handle moves the playing position to it. Pressing it again plays from the start.
4. **VT4** Nothing is saved until Done. Close with changes asks "Discard these edits?" (Keep editing, Discard); Close with none, or Done with none, writes nothing. Revert clears the trim.
5. **VT5** The recording file is never changed. The trim is kept as `edit.trim` on the memo's piece, survives a reload, and a trim that keeps the whole memo is stored as none. Reverting and pressing Done brings the whole memo back.

Playing a trimmed memo

6. **VT6** In the viewer a trimmed memo plays only the kept part: it starts at the start, stops at the end and counts as finished there. Its clock reads against the kept length ("0:00 / 0:39"), and its progress bar fills across the kept part. Playing it again after the end starts over at the start.
7. **VT7** The replay's and the day replay's stops play only the kept part and move on at the trim's end, as they do at a memo's end today.
8. **VT8** `voiceSpan`, `voiceClock` and `voiceState` in `lib/voiceTrim.ts` are pure and unit-tested: the kept span of a memo (the whole memo with no trim, a trim clamped to the memo's length), the clock inside it, and whether a player position is before the start (seek to it), inside, or at the end (finished).
9. **VT9** A voice memo's Edit never touches a photo's or a video's editor: their tools, order and saves are as before (ME1-ME23).

Found by the steward (Nov 12), accepted

10. **VT10** Wherever a memo's length is said (the moment card, a response entry, a mention's words, the replay's bubble), it is the kept length when a trim is set, from `voiceSpan`. A test seeds a trimmed memo and asserts the words.
11. **VT11** A trimmed memo's viewer says so in words with both times ("Trimmed · 0:39 of 0:58", in the info line, not a badge). The editor shows the whole length beside the kept span. Revert then Done restores the whole memo in the viewer and the replay.
12. **VT12** Every surface that plays a memo (the viewer's `VoicePlayer`, the replay's `MemoBubble`) reads the trim through `lib/voiceTrim`; a test fails when a file calling `useAudioPlayer` for a capture does not import it.

## Decisions on the steward's findings

- Rejected as criteria, recorded in `docs/DEFERRED.md` instead: a transcript is to be made from the kept span, never the whole file (no transcript exists yet); a backup bundle or share, if it ever carries a memo, carries `edit.trim` with it (no memo leaves the device today).
- Reading of "The lows stay in" for audio, put to the owner to confirm as a precedent: it is about a walk's hard parts, not a recording's dead air; a trim is reversible, so nothing is deleted.
- Deleting a memo removes the file and its edit together (as any capture today).

## Record (Nov 13)

- **Passed:** VT1-VT6, VT8-VT12 by unit tests and the `voicetrim` journey; VT9 holds (the `edit` journey and its photo and video checks pass). **Device-only:** VT7 (`UNTESTED`, `NATIVE_UNVERIFIED`).
- **UI review** (the `ux-reviewer`, three pictures at 390 x 844, decision 0145): U1 accepted and fixed (the trim bar was about 50 px wide; it fills the row, 306 px, also for a video's trim; test `voice-trim ui 1`), U3 accepted (the "Trimmed" phrase no longer splits across lines; `voice-trim ui 3`), U4 accepted (Revert says it is disabled; `voice-trim ui 4`, already true, kept as a guard), U6 accepted as a unit guard (`voice-trim ui 6`). U2 deferred (the handles' hit areas overlap on a short span; the same bar serves videos; `docs/DEFERRED.md`). U5 rejected (the one-tab row matches the photo and video editors).
- **Steward** (Nov 12): S1-S3 accepted (VT10-VT12), S6 accepted, S4 and S5 recorded in `docs/DEFERRED.md`.
- **Not audited** (decision 0074). Native code has not run on a device.
