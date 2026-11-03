<!-- Mirror of the Claude Docs tab "Clearing walks and moments (in progress)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Clearing walks and moments

Nov 1, 2026 · @Miguel Guerrero

A walk, a walk's media, or a single moment can be deleted to free storage. Media is the bulk: photos, videos and memos, against a few hundred KB of trace. Nothing could be deleted before this.

## The owner's decisions (Nov 1)

- **Three ways to clear:** delete a whole walk, remove a walk's photos, videos and memos while keeping the walk, or delete a single moment.
- **In context:** a walk's actions sit on its row in the home sheet and on its replay card. A moment's delete sits in the capture viewer. No Storage screen.
- **Confirm, then Undo for 5 s,** like discarding a voice memo.
- **As if it never happened:** a deleted walk takes its finds, reminders, streets walked and star with it, and later walks are counted again without it.
- **Media only:** the photo, video and memo moments go, with no placeholder. Places they found stay found, because you were there.
- **A single moment** takes its find with it. The place goes back to unfound and can be found again.

## Criteria

What can be cleared

1. **D1 · Delete a walk.** A finished walk's row in the home sheet and its replay card each have a More button (⋯) with "Delete walk". It removes the walk, its trace, pauses, every moment and its file, its summary, its place rows, the streets it walked, its finds, reminders and marks. The open walk has no such action.
2. **D2 · Remove photos, videos and memos.** The same menu offers it when the walk has any. Its photo, video and memo moments and their files go. The trace, notes, star, streets and distance stay, and places those moments found stay found.
3. **D3 · Delete a moment.** The capture viewer's More menu (⋯, beside Save) has Delete wherever the viewer opens: the walk screen (the open walk too), the replay, memories, what happened here, a reminder, and moments outside walks (home pins, a day's timeline and replay). The moment, its file and thumbnail, its reminder and its find go; the place can be found again.

Confirm and Undo

4. **D4 · It asks first, and says what goes.** For example: "Delete this walk? Its trace, 12 moments and 9 streets walked go. Frees about 34 MB." Cancel and a red Delete button; Back or Escape cancels.
5. **D5 · Undo for 5 s.** Once confirmed, it disappears at once and a pill says "Walk deleted" (or "Moment deleted", or "Photos, videos and memos removed") with Undo for 5 s. Undo brings it back as it was. Storage is changed only after the 5 s, or sooner when the app goes to the background or another delete is confirmed. A delete still waiting when the app is killed doesn't happen.
6. **D6 · A failure says so.** If the delete fails, what was hidden comes back with "Couldn't delete. Try again."

As if it never happened

7. **D7 · Later walks recount.** Each later walk's "new streets" is counted again without the deleted walk: a street first walked on it becomes new on the next walk that walked it.
8. **D8 · The map forgets it.** The home's stars, walk count and place counts drop the walk, and a place only it walked goes. Streets only it walked turn back to fog.
9. **D9 · Counts follow.** Removing moments updates the walk's counts on its row and its card ("3 photos" becomes "2 photos").
10. **D10 · Nothing else moves.** Places offered stay offered (the owner's rule), and checklists and remembered busy areas stay.
11. **D11 · Size.** "Frees about N MB" counts the files that go. It shows only from 0.1 MB.

## Data

No migration: two new `Db` methods, each one transaction. The truth tables stop being strictly append-only: a delete is the one way rows leave them.

| What goes | Delete walk | Remove media | Delete moment |
| --- | --- | --- | --- |
| `walk`, `trace_point`, `pause` | yes | no | no |
| `capture` rows | all | photo, video, memo | that one |
| Media files | the walk's whole folder (thumbnails too) | those files and thumbnails | that file and thumbnail |
| `walk_summary` | yes | counts set to 0 | its kind's count less 1 |
| `visited_segment`, `walk_area` (+ areas no walk uses) | yes | no | no |
| Later walks' `new_streets` | recounted | no | no |
| `find` | the walk's | no | that moment's |
| `recall` | its moments' | those moments' | that moment's |
| `mark` | the walk's | no | no |
| meta `explored:<walk>` | yes | no | no |

- **Web:** rows go in one transaction that aborts on any error, then the `media` store's keys. A whole walk drops every key under `walks/<id>/`, so files no row points to go too.
- **Native:** rows go first, then files (`walks/<id>/` for a whole walk). A file that fails to delete is left behind, never a row without its file.
- **Undo** holds the delete in memory, not in storage: screens hide the ids while it waits, so nothing has to be put back.

## Tests

- **Unit (`npm test`):** the pending delete (hide at once, Undo, commit at 5 s, commit early on a second delete or the background, a failure unhides: D5, D6); the recount of later walks' new streets (D7); summary counts after removing moments (D9); the confirm wording and size (D4, D11).
- **e2e (`scripts/e2e-web.js`):** a walk with a photo, a memo and a note: delete a moment from the replay viewer, Undo, delete it again, and check the count and the media key (D3, D5, D9); remove media from the walk's row (D2); delete a walk and check its star, row and media keys are gone, and a later walk's new streets went up (D1, D7, D8).

## Deferred and open points

- **Leftover files on a phone:** a file that failed to delete stays until a later sweep, not built yet.
- **A notification already shown** for a deleted moment opens nothing. A day replay's Watch again still stops at a moment deleted during it, and the replay card keeps a deleted moment's find in its line, until each is opened again.
- **Moments and days:** A moment outside any walk has no walk to delete, so D3 is its only delete. Its files sit under walks/moments/.
- **Native, unverified on a device:** the SQLite deletes, file and folder removal, and the sizes.

## Audited (Nov 1)

One report-only pass found 13 problems; 8 are fixed, the rest deferred.

- **Fixed, with a unit test:** the recount counted unnamed paths as new streets (now named streets only, as a snap counts); counts are taken from the capture rows, so a delete that overlaps a street read can't leave one off; an earlier delete's failure shows beside a newer Undo.
- **Fixed, covered by the e2e and typecheck:** a street read finishing after its walk was deleted writes nothing; a moment deleted before its location arrives finds no place; Explore and memory cards drop deleted moments; Save and Delete share the viewer's More menu, so its row fits a 320 px phone; the pill names the kind and is announced on iPhone; Escape closes the walk's actions on the web.
- **Deferred:** a late thumbnail's file; a reminder check racing a delete; a day replay's Watch again; counts that lag until read again; legacy absolute file paths on a phone; switching browser tabs ends the Undo window early.
