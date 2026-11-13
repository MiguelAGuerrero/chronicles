# 0156. Trimming a voice memo's dead air is not editing out the lows

Date: 2026-11-13 · Status: accepted · Area: captures, vision

## Context
The voice-trim slice (`specs/voice-trim/spec.md`) lets a memo be trimmed with start and end handles, as a video can be (decision 0090). The vision gate read "Editing out the lows" (VISION.md, Never; decision 0001) as being about a walk's hard parts, not a recording's dead air, and put that reading to the owner, since 0090 settled it for video only. The steward asked again at the audit.

## Decision
The owner's call, Nov 13: yes. A memo's tail of noise and silence is an accident and unnecessary, so trimming it is not editing out the lows. The trim stays data on the untouched recording, so Revert always brings the whole memo back, and the viewer says "Trimmed · 0:39 of 0:58" in words.

## Consequences
- The app proposes no cut (no silence detection); the walker drags the handles.
- The reading covers a recording's accidental dead air. It does not extend to hiding a walk's hard moments, which the gate still refuses.
- Still the owner's to decide: whether the trim bar is neutral until a handle moves, and whether a future transcript reads the kept part only (`docs/DEFERRED.md`).
- VISION.md's Precedents table wants a row for this record, but the page is at its 12,000-byte budget, so none was added; the owner may trim the page or raise the budget, and add the row then.
