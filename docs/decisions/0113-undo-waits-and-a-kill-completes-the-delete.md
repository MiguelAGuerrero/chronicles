# 0113. Undo waits for the owner, and a killed app completes the delete

Date: 2026-11-10 · Status: accepted · Area: deletion, ui, storage

## Context
D4 and D5 (`specs/clearing-walks-and-moments`) asked before every delete, then offered Undo for 5 s, storing the delete after the window, at once when the app went to the background, and dropping it if the app was killed. The sourced patterns (`docs/research/ui-references.md`: A3, F3; Material's snackbar; NN/g) say a common delete that can be undone is not confirmed, and an Undo with an action does not end on a timer. The steward (`specs/ui-conformance`, S1) found that an Undo stored when the app goes to the background ends as the phone locks, which leaves a delete with no confirm and almost no Undo.

## Decision
The owner's calls, Nov 10:
- **No confirm before a moment or thread delete or a removal from a thread**; a whole walk and a walk's photos, videos and memos still ask, saying what goes.
- **Undo waits** until the owner taps Undo or ✕ or starts another delete. It survives the phone locking and the app going to the background.
- **A killed app completes the delete**: the waiting delete is kept in meta (`pending_delete`), and on the next launch it is stored and what went stays gone. The owner's act always happens; Undo is offered only while the pill is up. (Before: a kill dropped it, and the thing came back.)

## Consequences
- D4 and D5 are amended by UC1-UC6 and UC13 of `specs/ui-conformance/spec.md`.
- `lib/deletion` keeps its waiting delete as data, not a closure, so it can be saved and run at launch.
- A recoverable trash (Recently deleted, as Photos and Google Photos have) stays possible as its own slice; it would change the data model.
