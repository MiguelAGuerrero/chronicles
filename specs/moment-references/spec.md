<!-- Repo first: written from the owner's request in a session (Nov 10). Builds on decisions 0104 (owner threads), 0123 (a moment holds several media) and 0125. -->

# Moment references: a note mentions other moments with @

Nov 10, 2026 · @Miguel Guerrero

Threads connect moments by an idea; a reference connects one moment to another directly. A note's text can
embed other moments with @, each drawn as a card of its kind, so a response reads as one document of words,
photos and memos.

## Vision

Idea: from the Chronicle, connect a moment to others as a response: type @ in a note to embed a moment, drawn as a card of its kind.
Verb: return (coming back to a moment and tying it to the one it echoes; the recall of 0104).
Touches: Always "A moment carries its context" (a card shows its kind, date and place); Always "Restraint … the content is the novelty, not the chrome" (no new menu item, no count); Always "Counts are words" (what mentions a moment is said in words); precedents 0104 (moments stay whole; connections are the owner's), 0114 (actions on a moment live in its toolbar or menu), 0123 (a moment holds several media), 0125.
Verdict: aligned
Shape: reshaped by the owner from a menu item to an @ reference in a note's text (0125).
Criteria: RF1-RF8.
Open: none.

Steward (Nov 10, the spec and plan): 4 drift and tone findings (S1-S4), all accepted into RF3, RF4, RF6 and RF7. Silent: a reference to a later moment is allowed (0125).

## Decisions (the owner's calls, Nov 10)

- The reference lives in the note's text; nothing else is stored; no migration (0125).
- Notes only; a caption stays plain text.
- A reference touches no thread and no link.
- No "Answers another moment…" item.

## Criteria

1. **RF1** In a note's editor (a new note, Respond → Note, Edit on a note), typing **@** opens the moment picker (the one Add to a thread uses: place and date, walk, first words; never the note itself). Picking a moment puts a reference at that point; dismissing the picker leaves the @ as typed.
2. **RF2** A reference is stored in the note's body as a token naming the moment's id, and nothing else is written: no table, no link, no membership, and the referenced moment's row is identical before and after.
3. **RF3** In the editor a reference reads as `@` and the same words as RF6 (one form, defined once) and is removed whole by one delete; saving keeps every reference the text still holds, and editing the words around it never breaks it.
4. **RF4** The viewer draws a note's text with each reference as a card of the referenced moment: its first piece (a photo or video's small picture, a memo's length, a note's first words), its kind, date and place, and its walk ("40 minutes in"), or that it was not on a walk; never a bare thumbnail (steward S1). A tap opens that moment in the viewer; Back returns to the note.
5. **RF5** A reference to a moment that is deleted or waiting in Undo reads "A moment no longer kept", opens nothing, and the note's text around it is unchanged; Undo brings the card back.
6. **RF6** Wherever a note's text is shown as plain text (its row, Lately, a day, the resurfaced card, a notification, the replay), a reference reads as words ("the pier, Sep 11"; a moment with no place, its date and walk only; a deleted one, "a moment no longer kept"), never as a raw token (steward S2, S3). The replay shows words, never a card.
7. **RF7** A referenced moment's viewer says "Mentioned in a note" in its info line, read from notes when shown; More's **Open the note** opens it (with several, a list of them by their first words and date, ordered by date, never by how often a moment is mentioned). Nothing is counted in digits (steward S4).
8. **RF8** Deleting a note removes its references with it; deleting a referenced moment never edits the note.
