# 0263. The Nov 24 batch's held shot and the band's pill: four answers

Date: 2026-11-24 · Status: accepted · Area: captures, tabs · Relates to: 0113, 0157, 0233, 0240, 0261, 0262

## Context
On Nov 24 a second batch was built on one branch: T61 (the recording bar's and the journal band's discarded memo stays,
with Undo and Close) and T62, the owner's own report that a photo or video "will jump straight back to the map for a
little bit and then open up the editor". The owner declined to pick T62's shape and said "proceed"; its shape, "Photo
first, editor over it" (the shot held full screen from the camera's return, the editor's controls coming over it once
kept), is the proxy's under the owner's delegation (decision 0157), and the held shot's ✕ (`tend captures audit 7`) the
proxy's ruling. The batch's review (the `auditor`, the `ux-reviewer`, the `steward`) left four questions only the owner
could settle, which the owner answered in person:

1. The camera's own closing may still uncover the map before the held shot can be drawn (on an iPhone the picker is
   dismissed after it answers; on the web the page shows until the picker has read the file). Only a dark cover raised
   at the shutter would remove it, at the cost of a dark flash when the camera is cancelled (steward Silent 1, U1).
2. While the shot is held its ✕ was named only "Close". Should it say the shot stays (S3, Silent 2)?
3. A shot closed before it is kept is still kept, and no editor opens for it. Is that 0240's "Close with no change keeps
   it as taken" (Silent 3)?
4. The band's discarded-memo pill on Memories now stays, over the owner's moments rather than a map, and goes when its
   walk ends from another screen. Does 0233's "stays" extend there (Silent 4, 5; S8, U6, F7)?

## Decision
The owner's answers, in person, Nov 24.

1. **"Ship, I'll look".** Ship as built, with no dark cover at the shutter. The owner looks on their iPhone at the
   camera's closing. If the glimpse of the map still reads as the jump, the dark cover raised as the camera opens
   (dropped on cancel) becomes the next entry.
2. **"Say it stays".** The held ✕ is spoken "Close, the photo stays as it is" or "Close, the video stays as it is"
   (`keptWords(kind).close`) from the start of the hold, as once kept; on screen the ✕ alone, as built.
3. **"Yes, kept, no editor".** 0240's "Close with no change keeps it as taken" extends to the held shot: closed while
   held, it is kept and no editor opens for it.
4. **"Stays; list scrolls clear".** The band's pill stays until Undo, Close, the next capture or the walk's end (also
   from another screen), and Memories' list scrolls so the pill covers no button.

## Consequences
- `tend captures audit 11` names the held ✕ by `keptWords(kind).close`; `tend tabs audit 72` keeps Memories' page at its
  end as its foot grows (`footKeepsEnd`), so the band's pill covers no button.
- `docs/NATIVE_UNVERIFIED.md` holds the owner's look on their iPhone at the camera's closing; the dark cover at the
  camera's opening is the next entry if the glimpse remains (filed then, not now).
- T62's shape stays the proxy's under 0157; these four answers are the owner's.
