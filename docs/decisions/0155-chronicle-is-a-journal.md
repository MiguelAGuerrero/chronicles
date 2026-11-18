# 0155. Chronicle is a journal: the page you read is the page you write on

Date: 2026-11-12 · Status: accepted · Area: chronicle, capture, vision · Amends: 0098, 0112 (Memories' layout)

## Context
The owner, Nov 12: a feed with three capture buttons at its foot "didn't feel right", because a feed does not say
that it is where you capture. "When I think of a Chronicles, I think of an ever-growing journal": organized in the
order moments were captured, where writing in it is the act of capturing, and the app keeps the context. The gate
(`/vision`, decision 0094) found it aligned if reshaped: it serves Honour and Return on one surface; reshaped so the
camera and mic stay one tap, the book is structure and never texture, and the journal is the quiet way to be out
while Navigate stays the walk (0076).

## Decision
The owner's calls, Nov 12:
- **The journal is the whole Chronicle tab**, built in cuts: (1) Memories becomes the page, with an open line in
  place of the band; (2) Days and Walks fold in, walks as chapters with their trace drawn, and the section bar goes;
  (3) Media, Threads, Hidden, the bookmark and jump to a date; (4) the walk screen's Quiet naming.
- **Typographic.** White ground and the app's ink; no paper, binding or page turns. The owner's words in the
  phone's own serif (no font is bundled); everything the app says in its sans.
- **Book order, opening at today.** Oldest above, newest below. This reverses "Lately is newest first" (MC13).
- **Quiet mode is the journal.** Writing in it starts no walk and records no trace; an entry reads one fix when it
  begins (0036). A walk is started from Navigate.
- **Pieces made right after each other are one moment** (0123's closing rules), in the journal without the setting.
- **The past is fixed.** New entries land at the end; a past entry can be corrected or responded to (0131).
- **What is written during a walk shows on the page at once** (amends RM17).
- **Threads, Your threads, Hidden and the resurfacing options go behind a contents button.**
- **The open line accepts @ references** (0125).
- **The drawing is approved** (https://claude.ai/artifact/GvCtF3iCjh1CksvojJcvoF): no hint text on the open line;
  the fix at the entry's start; "Kept as you write".

A direction, not yet a decision to build: **a moment need not belong to a walk.** The owner: "any moment taken
during a walk is just a moment, and they're just linked appropriately during a recall or a retrace", by time and
place. Today `Capture.walk_id` is a stored link that the replay, the walk screen and deletion read. Changing it is a
data-model change and goes through `/vision` and a spec of its own; cut 1 only makes the page treat every moment
alike.

## Consequences
- The spec for cut 1 is `specs/chronicle-journal/spec.md` (JN1-JN24) and its plan `specs/chronicle-journal/plan.md`.
- Amends HC6-HC13 and HC15 (`specs/capture-from-chronicle`), the top card, Lately and RM17
  (`specs/resurfaced-moments`), MC13 (`specs/memories-context`), MS18-MS19 in the journal (`specs/moment-stacks`) and
  RF1 (`specs/moment-references`).
- A quiet outing has no replay: the replay needs a trace.
- VISION.md's Precedents gains this row. No rule on the page changes.

## Added Nov 12: the line and the page
Note pages (0151) shipped while cut 1 was built. The owner's call when the two were joined: **the line is for a thought, the page is for an entry, and one stored note is under both.** The line's status row offers Open as a page, which carries what was typed onto the note's page for the same entry; an entry the page wrote is drawn on the sheet in its shape, natively; a photo is a piece of the entry in the line and its own mentioned moment on the page (two rules, kept). JN25-JN27.

