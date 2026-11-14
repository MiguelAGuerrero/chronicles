# 0177. An entry is written in a composer sheet, not on the page

Date: 2026-11-14 · Status: accepted · Area: memories · Amends: 0176 (the pen goes); retires writing on the page (JN28-JN30, JN32, JN33)

## Context
With the toolbar of 0176, "What’s on your mind?" put the caret on the journal page, among the day's entries. The
owner: "the what's on your mind entry should also pop out to expand out to be a note entry so that there's room to
type and not necessarily be bogged by a page full of context."

## Decision
The owner, Nov 14, from a mock-up of the real app: a tap on "What’s on your mind?" (or on the empty page) opens a
lighter composer sheet, not the note page: plain text in the owner's serif, "New entry" and Done at its top, the
camera, the mic and Open as a page at its foot, filling the room above the keyboard. Words are kept as they are
typed, as before; Done, a tap outside or Back keeps and closes. There is one way to write: the page is for reading.
The toolbar's pen is dropped (the field is the way in), which leaves the field room at 320 px.

## Consequences
- JN47-JN51 in `specs/chronicle-journal/spec.md`; JN41, JN44, JN45 amended; JN28-JN30, JN32, JN33 and JN42 retired.
- The pen reducer, the one entry, the one fix and the dateline are unchanged: only where the field is drawn moves.
- In a thread, the threads and Hidden the field is still in the bar (as JN28 had it there).
- Native is unverified on a device: the sheet over the keyboard, Back closing it.
