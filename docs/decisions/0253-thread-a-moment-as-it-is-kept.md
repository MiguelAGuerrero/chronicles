# 0253. Thread a moment as it is kept: Thread on the after-capture pill, the last thread first

Date: 2026-11-21 · Status: accepted, built in threading-at-capture (TK1-TK11, 2026-11-21) · Area: captures, threads · Amends: 0123 (the pill's offer; MS2, MS21) · From: `/investigate threading-at-capture`

## Context
The owner photographs murals and graffiti on walks and wants to group them. Threading one after the fact means
opening it again (the viewer's More, Add to a thread, or the Thread slot under a journal entry) and finding the other
moment by scrolling back through a timeline. They asked for "a little search bar, an annotation chip or something" at
the point of capture. The brief is `docs/research/threading-at-capture.md`.

Today the Add to this moment pill (0123, MS2) offers "camera, mic and note, one tap each, with nothing else to choose
first", and with Group captures on it gives way to "Adding to this moment" and New moment (MS21). Add to a thread
(OT5) cannot see the walk still open, and lists a photo as the word "Photo".

## Decision
The owner's answers in person, Nov 21, each the recommended option unless said:
- **Thread goes on the after-capture pill**, a fifth one-tap button beside camera, mic, note and ×, on the walk screen
  and Navigate's ready screen, for every kind of moment. With Group captures on, the "Adding to this moment" line
  carries it beside New moment. It acts on the whole moment, its pieces with it. Not in the photo editor (0240).
- **The card opens on the thread last added to**, first and one tap, then a search field over threads (by name or
  first words) and moments (words, place or date). "Last added to" is read from the newest `thread_member.added_at`;
  nothing new is stored.
- **One tap per capture.** Nothing stays switched on and nothing is captured "inside" a thread (0104 holds). The owner
  added: a mode to toggle on or off for capturing a sequence "could be worth investigating if other products have
  something similar". The brief records what was found; it is a later question, not this build's.
- **A thread still needs two moments** (0104, OT6). For the first of a series, A new thread lists this walk's moments
  too, newest first, a photo or video with its small picture beside its place and time; once two are connected, an
  optional name field lets the owner name the thread (empty is fine), so search finds it next time.

## Consequences
- MS2's "nothing else to choose first" and MS21's line gain Thread; MS6's restraint holds (ink, no count, the pill's
  words unchanged). `specs/moment-stacks/spec.md` is amended when the slice is built.
- Add to a thread reads the walk still open (`poolWithOpenWalks`, as the responses sheet does), so the viewer's entry
  gains it too; the DEFERRED line "A moment of a walk still open is not offered by the picker" is answered by the build.
- Vision: aligned (the brief's block). Precedent: Pinterest asks for a board at Save, Day One tags from its editor,
  Lightroom Classic adds to a target collection with one key (all unverified; `docs/research/adjacent-apps.md`,
  "File a moment into a group as it is kept").
