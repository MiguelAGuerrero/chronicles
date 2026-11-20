# Plan: a place offered after the moment

## Files to touch (about 8; a slice, not a fix)

- `src/lib/explore/explore.ts` (core): `EXPLORE_RULES.offerM = 30`; `Offer` (`{ captureId, walkId, at, keys, made }`);
  `offerFor(moment, items, o: { found, hidden, armed, places })` (the unfound places of shown kinds within 30 m of the
  moment's fix, nearest first, or null: PO1, PO3, PO5); `offerStill(offer, here, walkId, o: { places, found, armed,
  captureIds })` (PO6: 60 m from the moment's fix, another walk, Places off, armed, the moment gone, every key found);
  `offerLine(kind, names)` (PO1, PO3, PO8, PO11: the moment's kind, up to three names, "or another place nearby"
past them, never a number); `offerTake(offer, key)` (the
  find a Yes or a tap on a choice makes, or null for a key not offered).
- `src/lib/explore/useExplore.ts` (view): `offer` state beside `armed`; `offerAfter(momentId)` called by the walk screen
  for a new moment it kept; `take(key)` records the find through the existing `record` (PO9), `leave()`; pins carry
  `choice: true` for offered keys. The armed path runs first: a capture the armed place finds is never offered (PO5).
- `src/app/walk.tsx`: `useCaptures`' `onKept` (new moment, not a piece) also calls `explore.offerAfter(id)`, so only
  moments kept on this screen are offered (PO5: the recording bar, Chronicle's toolbar, the ready screen and a reply
  keep through their own `useCaptures` and never reach it; a reload never offers an old moment, PO4). The note page's
  own `onKept` (line ~2111) gets the same call (PO10). The offer line (`place-offer`, `place-offer-yes`,
  `place-offer-leave`) in the top column, in the armed line's slot and style (`findChoice`); `onDiscoveryPress` takes a
  choice's tap to `explore.take(id)` instead of opening the card (PO3). "Capture here" clears the offer (PO6).
- `src/components/MarkPinView.tsx`: `MarkPin.choice`; a 2 px white ring with an ink edge around the head (not colour
  alone), and `markLabel` "<name>, <kind>. Tie this moment to it" (PO3).
- `src/components/map/WalkMap.web.tsx` / `WalkMap.native.tsx`: only if `choice` needs passing through to the marker's
  key (the web moves a marker in place when only its spread changes; a change of `choice` must redraw it).
- `src/lib/db/types.ts`, `db/sqliteStore.ts`, `db/index.web.ts`, the fake db and `dbContract.ts`: one new method,
  `removeFind(captureId)`, for PO12's Undo (a contract case first, FC7). The Undo is the walk's existing `arrived`
  line given an Undo button, kept until used or dismissed (0113), not the deletions' `UndoToast`.
- Docs: `.claude/rules/explore-marks.md` ("Finding": the offer), `docs/PRODUCT.md`, a decision (number booked at the
  time), `docs/STATUS.md`, `docs/NATIVE_UNVERIFIED.md`, `docs/DEFERRED.md`, `docs/research/adjacent-apps.md` ("Used by").

## Data

No new truth or cache, no migration. A Yes writes the same `find` row "Capture here" writes (`db.addFind`,
`capture_id` the moment's id); Undo removes it (`removeFind`, the one new `Db` method; finds are a kept store, so
removing one is what deleting its moment already does, `deleteMoments`). The places left with Leave it on this walk
(PO4) are a meta family `offer_left:<walk>` (declared in `META_FAMILIES`), so a reload still never asks again. The offer is a React state on the walk screen, like the armed place: a
reload drops it unanswered, which leaves the moment independent (the safe side; deferred, below). `SNAP_RULES` is not
touched.

## Tests per criterion (existing feature `explore`)

- `src/lib/__tests__/explore/placeOffer.test.ts` (core, no fakes):
  `PO1: one unfound shown place within 30 m is offered by name`, `PO3: several within 30 m are all offered, nearest
  first`, `PO5: nothing is offered with Places off, a place armed, no fix, only a place at 31 m, a found place or a
  hidden kind`, `PO6: the offer holds within 60 m and clears past it, on another walk, with Places off, armed, the
  moment gone or every place found`, `PO8: the line names, never counts`, `PO9: a take records the place's find for
  the moment; a key not offered takes nothing`, `PO11: the line's words are plain` (no "!", no "Don't"), `PO4: a place left on this walk is not offered again`,
  `PO7: the offer never calls feedback()` (a source scan of `offerAfter`, shown to fail on a mutation).
- `src/lib/__tests__/explore/placeOfferShell.test.ts` (`fakePorts()`): `PO12: Undo removes the find and keeps the
  moment`, `PO4: the left places survive a reload` (meta). `dbContract.ts`: `removeFind` (FC7).
- `scripts/e2e/journeys/placeoffer.js` (new journey, the walk screen; joins `explore`'s journeys in
  `scripts/features.js`): PO1 (a photo 15 m from the Hessian Memorial: the line, Yes, "Found: Hessian Memorial"),
  PO2 (the line's box at the top, its buttons ≥ 44 pt, `aria-live`), PO3 (a second place the journey seeds within
  30 m: both pins wear the ring and the choice's name; a tap ties; an unlit pin opens its card), PO4 (Leave it, then a
  reload: no line), PO5 (Places off: no line; armed: the armed find and no line), PO6 (walk 70 m off: the line goes;
  a second photo replaces it), PO7 (the stack's boxes unchanged with the line up; a photo in one tap; Add to this
  moment keeps the line), PO10 (a note kept near a place brings the line), PO12 (Undo after a tie: the pin back to a choice-less mark, the
  moment kept).
- The ids go in `explore`'s `specs` in `scripts/features.js`; the spec joins `IN_PROGRESS` while built.

## The testing's size

**flow** (a screen's new control, plus what it stores: a find). Journeys: the new `placeoffer` (about 3 min alone);
`walk` (it holds TC1-TC4 on the same slot and the `find-choice`-style slab; about 8 min) and `marks` (the pin's look and
label; about 3 min), each once at the end. `grep` finds no removed test id or words: nothing is removed. About 15
minutes.

## Cost

Per new moment kept on the walk screen: one pass over the walk's checklist items (hundreds) for those within 30 m;
per fix while an offer is up: one distance (`offerStill`); per render: the pins map gains one boolean. No new read or
write but the one `addFind` on Yes. No harness needed; nothing per frame.

## Deferred, and why

- **Tying a moment to a place later**, from the moment's viewer: offered to the owner (the fourth question), not
  chosen; a moment left independent stays so.
- **A reload while the line is up** drops it unanswered (as the armed line, 0224 audit 10).
- **A moment kept from the recording bar or Chronicle during a walk** is never offered, even on return to the walk
  screen (PO5): those screens show no places.

## Native

The line and the pin's ring are React Native views on both maps; the native map's marker redraw for `choice` has never
run on a device. A `NATIVE_UNVERIFIED.md` item: **Do:** on a walk with Places on, take a photo beside a named place
without tapping it. **Expect:** "Was this moment about …?" at the top; Yes shows "Found: …" and the pin turns found.
(PO1, PO3)

## Screens: goal to control

- **Tie the moment just taken to the place it was about.** Now and then, right after a capture, often a glance later
  on the move. Control: an inline line with two labelled buttons, Yes and Leave it (matrix 6, "clarify an action the
  person started: two choices, a basic dialog"; we use an inline, non-modal line instead of a dialog so the capture
  stack stays one tap, matrix 22). Adjacent apps: Day One and Journal offer the place inside the entry's editor.
- **Choose which of several places.** Rare. Control: the places' own pins on the map, drawn as choices (the owner's
  call, Nov 20). Matrix 15 ("pick one from a short list: a menu") is the usual control; departing on the owner's
  call, because the choice is spatial and the pins already carry the names. Swarm uses a list.
- **Leave the moment independent.** Often. Leave it, or doing nothing.

### Against precedent

All three adjacent apps ask while the entry is being written; we ask after the capture, because a capture is one tap
(VISION.md) and the walker was not looking. For several places we use the map, not a list (the owner's call).

### Where the owner will look first, and the defaults that make it quieter

- The owner will look at the top of the map, where "The next moment is about …" sits today: the line is there.
- **Defaults, each overrulable:**
  - The words: "Was this photo about <name>?", **Yes**, **Leave it** ("about", the owner's call, Nov 20).
  - No buzz or sound when the line appears (Never "Nagging"; you are often not looking, so it waits instead).
  - The choices' pins wear a white ring, no accent colour.
  - Only places shown on the map are offered (a kind switched off in What I'm into is never offered).
  - With one place, its pin is a choice too, so a tap on the place itself works as Yes.

## Steward (triaged)

- S1 a wrong tie can't be undone: accepted, PO12 (Undo; needs `removeFind`, the one data change).
- S2 the same place asked again and again: accepted in part, PO4. An explicit Leave it is not asked again for that
  place this walk; silence is not a no, or three quick photos taken without looking would lose the fallback.
- S3 choices off screen, "shown" undefined: accepted, PO3 (shown = Places and the kind on; names in words; pins in view).
- S4 the line doesn't say which moment: accepted, PO1 ("Was this photo about …?").
- S5 the line can stay up indefinitely: accepted, PO6 (pause clears; no fix holds until a fix returns).
- S6 vague labels, untestable silence: accepted, PO2 (spoken labels, equal size), PO7 (unit test).
- Silent questions: the replay's "Passed …" is unchanged (8 m pass-by, not 30 m); the decision records "Places on
  only" and adds a VISION.md Precedents row.
