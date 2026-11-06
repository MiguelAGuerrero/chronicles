<!-- Repo first: written from the owner's request in a session (Nov 5-6), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The owner's calls are decision 0102. -->

# Owner threads: respond to a moment, connect moments across walks

Nov 6, 2026 · @Miguel Guerrero

Back in an area where moments were kept, the owner wants to answer one, and to connect moments across days, walks and places so that recall has something to follow (the example: every time someone compliments their physique). A moment stays whole; a connection is a separate record the owner makes. The Chronicle's own derived threads (decision 0098) are a different, computed thing and stay independent of these.

## Vision

Idea: Respond to a moment, and connect moments across walks into threads the owner makes, kept separate from the moments and from the Chronicle's own suggestions.
Verb: return (it gives moments back as a thread across days and places), honour (a reply is a new moment, kept where and when it happened, in context).
Touches: Never "Celebration" and "Nagging" (no new-reply cue, no unread mark, no pill beyond the neutral Undo); Always "Moments and the trace are truth"; Always "A moment carries its context"; Always "Counts are words"; Never "Tallies such as '12 of 87'"; Never "Scores, streaks, completion, coverage"; Never "A capture behind a menu, a drawer or an extra tap"; Never "Writing the owner's words for them"; Never "Data leaving the device without a tap"; precedents 0098 (derived threads), 0037 (memories on revisit), 0102 (this slice's decision).
Verdict: aligned if reshaped
Shape: A moment is unchanged. `thread`, `thread_member` and a directed `moment_link` are separate stored records. A thread arises only from connecting existing moments and dissolves below two. A reply is a new moment that joins the thread. The Chronicle's suggestions stay computed and independent.
Criteria: OT1 (capture stays one tap), OT4 and OT9 (context on every moment), OT6 (no thread without two kept moments), OT10 (size in words), OT13 (the name is the owner's), OT14-OT17 (deletes), OT18 (truth), OT19 (the two kinds stay independent), OT20 (nothing leaves the device).
Open: whether a thread can be kept quiet from the resurfaced card (OT23); where a reply made away from the place is read (OT24). The reasons rest on decision 0102, not on VISION.md's **[proposed]** line, which the owner has yet to edit.

## Decisions (the owner's calls, Nov 5-6, decision 0102)

- A moment is a node and gets no new field. Linking or unlinking never edits it.
- Three stored records: `thread (id, name nullable, created_at)`, `thread_member (thread_id, moment_id, added_at)`, `moment_link (from_id, to_id, created_at)`. A moment may be in several threads.
- A thread is never created empty and never before a moment exists: there is no top-down thread. A place-rooted journal is a separate feature (`docs/DEFERRED.md`).
- A reply is a new moment with its own place and time, a directed link to the moment it answers, and it joins that moment's thread; if there is none, an unnamed thread of the two is made.
- A thread with fewer than two moments dissolves, name and all; the delete that causes it is undoable.
- Deleting a thread deletes its memberships only. Deleting a moment deletes its memberships and links only.
- The Chronicle's suggested threads are computed, never stored, and neither reads the other kind. A suggestion becomes the owner's only by a tap, as a copy.

## Criteria

### Responding

1. **OT1** A moment's viewer shows **Respond** on its face, not in the More menu, as the capture row's own kinds (photo, voice, note). Each kind is one tap from the viewer, with no menu opened first. The new moment is saved by the capture's own path with its own time and place (the fix, or placed later, as a moment outside a walk is). Capture from the edge stack takes the same one tap as before, with no thread step in front of it. (Steward S1.)
2. **OT2** Saving a reply writes a directed link from the new moment to the one it answers, and adds the new moment to the answered moment's thread. If the answered moment is in no thread, an unnamed thread of the two is made. If it is in several, the reply joins the one the Respond started from (OT3).
3. **OT3** Respond is offered from a moment seen in a thread (it answers that moment and joins that thread), from the viewer opened on a faint pin ("Memories here", whose preview also shows the kinds, one tap each), and from the viewer anywhere else (it answers that moment).
4. **OT4** A reply is a moment like any other: it appears in Lately, its walk, its day and the map. It never appears as a bare note: its row names the moment it answers and when ("answering Oct 20, just after the bakery"). A reply whose answered moment is gone shows no "answering" line, only its own place and time (OT16). (Steward S4.)

### Connecting

5. **OT5** A moment's More menu has **Add to a thread**. It lists the owner's threads by name or by their first words, and **A new thread**, which asks for a second existing moment to join it with (a picker of moments by time, each row with its place and date and its walk line when it has one, searchable by the words in them). Nothing makes a thread without two existing moments.
6. **OT6** There is no way to make an empty thread, to start a thread before its first moment is kept, or to add something that is not a kept moment (a place, a walk, a street, a note typed into the thread).
7. **OT7** A moment can be in several threads. Adding it to a thread it is already in changes nothing.
8. **OT8** **Remove from this thread** takes one moment out of one thread, keeping the moment, its other threads and its links.

### Reading a thread

9. **OT9** A thread opens as a plain typographic timeline of its moments, oldest first, read like a conversation with yourself. Every moment shows its place and its time, and what came just before it (its walk's context line) when it has a walk; a moment with no walk shows place and date. Never a bare thumbnail, filename or count; the same holds for every row of the moment picker. (Steward S4.) A reply is set under the moment it answers.
10. **OT10** A thread's size is one of a short fixed set of words ("a couple of moments", "a few", "several", "many"), never a number word above "three", a digit, rank, total, streak or percentage; its span is "since March". No unread, new-reply or progress mark ever appears on a thread. Dates and times are fine. (Steward S3.)
11. **OT11** Where a moment is in a thread, its viewer says "in a thread" without the name, and opening it opens the thread. The viewer shows the thread's name only when it was opened from that thread. (Steward S2.)
12. **OT12** The owner's threads are listed on Memories, apart from the Chronicle's own threads (the 0098 rail): their own heading, ordered by the latest moment in them, with no rank, count or progress shown. The Chronicle's threads are unchanged by this slice.
13. **OT13** A thread has a name only the owner gives it: **Name this thread** in its menu, optional, editable, never overwritten. A thread with no name is headed by its oldest moment's place and date, with the first words of that moment as a second line; no heading is a clipped fragment on its own. (Steward S5.)

### Ending a thread

14. **OT14** **Delete this thread** removes the thread and its memberships and no moment, link or file. It asks once, in words, and offers Undo for 5 s, as a moment delete does.
15. **OT15** When a delete or Remove leaves a thread with fewer than two moments, the thread dissolves, name and all, at once; Undo of that delete brings back the moment and the thread with its name and members.
16. **OT16** Deleting a moment deletes its memberships and links and nothing else. A reply whose answered moment is deleted stays, as its own moment, in its thread if the thread still has two moments.
17. **OT17** Deleting a walk deletes the memberships and links of its moments in the same transaction, and dissolves the threads that leave.

### Truth and independence

18. **OT18** Threads, memberships and links are truth: stored, never derived, kept across any recompute of streets, areas, summaries, tile builds and `THREAD_RULES` bumps. A moment's own row is identical before and after linking.
19. **OT19** The Chronicle's derived threads (0098) are unchanged and never stored; they do not read the owner's threads or links, and the owner's threads do not read them. A Chronicle thread offers **Keep as my thread** (a tap), which copies its moments into a new owner's thread; the Chronicle thread itself is untouched.
20. **OT20** Nothing about a thread, a membership or a link leaves the device. No export, share or notification is added by this slice. A thread's name, or a title made from a thread, never appears on the resurfaced card, in Lately, in a notification, or in a share or reel. A reply sets no reminder: "Remind me here" stays opt-in per capture (0032). (Steward S2, Silent 3, 4.)
21. **OT21** The owner's threads survive a restart, a reload (web) and an app update: a migration adds the stores and never edits an existing one (SQLite and IndexedDB).
22. **OT22** The viewer's other behaviour is unchanged: Save, Open in Maps, edit, delete (with Undo), and every list's filter on moments waiting in Undo (`useHidden`).

### Kept quiet, and replying away

23. **OT23** (the owner's call, pending) Whether the resurfaced card may bring back a moment that is in an owner thread, and whether a thread can be kept quiet from it. Until decided, a moment in an owner thread is eligible like any moment and shows no thread name.
24. **OT24** (the owner's call, pending) A reply made away from the answered moment's place is placed where its author is, at the time they write it; its row says "answering" and the answered moment's place, so the two places are both in the words.
