<!-- Mirror of the Claude Docs tab "Filling gaps (spec draft)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Filling gaps

When the GPS drops out or the app is closed mid-walk, the trace breaks. This fills the break with the streets you most likely walked, judged from the time between the last fix and the next, and the street map. The owner's calls (Nov 3): it is opt-in unless the answer is obvious; an uncertain stretch is drawn faint and you keep it or dismiss it from a small card; once kept, or filled by itself, it is walked trace in every way; a kept line is stored with the walk as truth; it shows on the walk screen and on the replay. The phone's sensors (dead reckoning for weak GPS with the app open) are a later slice.

How it decides: the likely way is the shortest walk over the streets between the two fixes. A piece of that way is certain when every other way that fits the budget also uses it, as on a long street with no parallel street close enough to detour by. Confidence is the share of the way that is certain. This is map matching across a gap, with the time as the limit (a space-time prism).

## Criteria

1. **G1 · What is a gap.** Two walked fixes more than 60 s apart, with no pause or ride between them, and at most 30 min apart, however close (the owner's rule, Nov 3: every break is made continuous; decision 0071). Ends within 10 m are joined straight and filled by itself. Settling GPS wander never makes a break of its own.
2. **G2 · The likely way.** The shortest walk over the walkable streets (the ones fog and navigation use), each end joining any street within 40 m of its fix. No street within 40 m of an end, or no way between them: nothing is filled.
3. **G3 · A walking pace.** If that way needs more than 2.5 m/s, it wasn't walked (a ride, or a taxi with the app closed): nothing is filled.
4. **G4 · Confidence.** A piece is certain when every way between the ends within the budget uses it; confidence is the certain share of the way's street length. Two budgets: walking fairly directly (1.25 × the way), and the time allowed (the gap's time at 1.8 m/s, a brisk walker's pace, when that is longer). Only the stretch of a piece the way uses is left out when testing it, so a way out of the same piece the other way round counts. At least half the way must be street, not the joins to it.
5. **G5 · Filled by itself.** With 90% or more certain under the time budget, the stretch is drawn and counted as walked trace with no question asked.
6. **G6 · Offered.** Otherwise it is drawn faint (the trace's green, see-through) and counts for nothing until kept, however uncertain (the owner's call, Nov 3: decision 0068).
7. **G7 · Nothing to offer.** A gap stays a break only when there is no way to offer: no street near an end, no way between, too fast (G3), mostly joins to a street, or its streets unread (G8).
8. **G8 · Read whole.** The streets read for a gap cover every way within its time budget (z14 tiles around it, read in code). If they can't be read, nothing fills by itself; kept stretches still show, and the walk is snapped again later.
9. **G9 · The card.** Tapping a faint or filled stretch opens a small card: "Probably along Elm Street" (offered) or "Filled in along Elm Street" (by itself), with its length and how long nothing was recorded. A tap within 30 m of either end is the recorded trace there. Offered: Keep, or Not this way. Filled or kept: Not this way. A map tap, ✕, Back or Escape closes it.
10. **G10 · Your call stands.** Keep stores the stretch's line with the walk (kept data, never cleared by a map update) and draws it solid. Not this way is stored too, and the gap goes back to a break. Later inference never overrides either.
11. **G11 · Walked trace.** A filled or kept stretch joins the trace with no break: the solid line, walked distance, streets and fog, places, captures placed on it, and the replay's path. Times along it are spread evenly over the gap.
12. **G12 · Where.** On the walk screen once a new fix closes a gap (back in the app, or GPS back), and on the replay. Deciding on the replay snaps the walk again, so its card and streets follow.
13. **G13 · Every walk.** The rule change marks every walk to snap again when its replay next opens, so old walks with gaps get their stretches then.
14. **G14 · Deleting.** Deleting a walk deletes its kept and dismissed stretches.
15. **G15 · Settled at walk's end.** On the first replay after a walk (never a re-watch), when gaps are offered, the card beat asks once, in words: "Keep the likely way?" with Keep them and Leave them. Keep them stores every offer as a kept decision (G10), then the walk is snapped once, so distance, streets and the replay stop changing on later opens. Leave them stores nothing: each gap stays offered and is still decided from its card. It never asks with nothing offered, never while a gap's card, a drawing or a viewer is open, and never counts in numbers (the owner's call, Nov 16).

## Vision

Gate (`/vision`, decision 0094), after the fact: **aligned if reshaped**. It serves Return (a walk that reads the same every time it is opened). It stays opt-in (0060): the question is asked, never answered for the walker; it says "a likely way", in words with no count; Leave them keeps the gap as it was. Decision 0182 is the record.

## Tests

- Unit tests: gaps found and skipped (G1), the way and its joins (G2), too fast (G3), a long street filled by itself, a grid diagonal offered, a street with a parallel one offered when slow, a park path with a drive beside it offered (G4-G7), coverage not read (G8), decisions overriding inference (G10), the trace, distance, snapping and places with a stretch filled (G11), the snap rules bump (G13).
- E2E: a walk with the GPS out along a straight street draws one solid line; a slower gap draws a faint stretch; its card keeps it, and the distance grows (G5, G6, G9, G10, G12).
- Native (migration 14, the card over the native map) has not run on a device.

## Open

- The paces (1.8 m/s for the time allowed, 2.5 m/s at most) and the 90% and 50% lines are first guesses, to tune on real walks.
- Walk me back still follows only the GPS trace and the streets; it ignores filled stretches.
- The backup bundle leaves the decisions out.

## Audited (Nov 3)

One report-only pass found 17 issues. 12 were fixed, each with a regression test (`gaps audit N`), and the criteria above were updated to match.

- **Fixed (Nov 3):**
  - A stretch with both ends on one block filled by itself even after 30 minutes. The end pieces were counted as certain without checking the way round.
  - The time allowed used an average pace, which ruled out a brisk walker's detour.
  - One old decision could be drawn on two gaps.
  - Replays in a later session lost their filled and offered stretches.
  - A snap read in code could fetch every tile in a long ride's box.
  - The card hid behind, and came back after, other cards on the walk screen.
  - Taps near a stretch's ends took over "what happened here".
  - A live gap whose end moved kept an out-of-date line, and the live reads had small races.
  - A plaza crossing that was mostly joins to a street filled in.
  - The replay gave no feedback while saving a decision.
  - The card's words claimed GPS loss when the app may have been closed.
- **Deferred:**
  - Storing inferences on the device, so replays and days don't read the network again in a new session.
  - Capping a long filled stretch's share of the replay, as rides are.
  - A way to reach stretches without tapping the map (screen readers).
  - Undo for Not this way.
- **Kept as decided:** filled stretches look exactly like the recorded trace.
- Native (migration 14, the faint layer, the card, reads on a phone) has not run on a device.

## Audited G15 (Nov 16)

15 findings from the auditor, the steward and the UX reviewer: 8 fixed, 2 deferred, 5 rejected. Tests are `filling-gaps audit N` in `gaps.test.ts` (1, 2, 6) and the gaps journey (1, 5, 6); 3, 4, 7 and 8 are covered by the e2e flow, typecheck and the records check only.

1. Asked once was only component state, so a reload, Back or a stale link asked again (auditor F1, F4; steward S3): accept. Stored per walk when shown (`gaps_asked:<walk>`).
2. A failed write in `keepAll` left some kept and the walk not snapped (auditor F2; F9's coverage): accept. Each write is tried, failures counted, the walk always re-snapped.
3. The prompt could appear after the card beat's first paint, before the gaps were read (auditor F3): accept. Shown only once the second load is done.
4. `gapError` was shared with the gap's card (auditor F5): accept. The prompt has its own error.
5. Two same-weight primaries, Keep them and Name it (steward S4, ux-reviewer U1): accept, the owner's call: both answers secondary.
6. "One gap" with "Keep them", and no outcome said (ux-reviewer U3): accept. The words agree, and the line says what each answer does.
7. The prompt wasn't announced (auditor F8, ux-reviewer U6): accept. A polite live region; not run with a screen reader.
8. No Vision section or decision record (steward S1): accept. Both added (0182).
9. `setData` after Keep can drop an edit made meanwhile (auditor F6): defer, same pattern as Keep on a card.
10. A bulk keep keeps low-certainty offers (auditor F7, steward S2): reject. The owner chose a prompt with Keep for all; each stays reversible from its card.
11. "Not now" is grey and ambiguous (ux-reviewer U4, U5): defer, an existing control outside this slice.
12. The card floats over the map above the sheet (ux-reviewer U2): reject, the owner chose the quiet pair over folding it into the sheet.
13. "Likely" and "Leave" nudge toward Keep (steward S5): reject. "Likely way" is the product's word since 0060; the buttons are the same weight.
14. Contrast of the muted line and the faint stretch (ux-reviewer U7): reject. Theme tokens, unchanged here; not measured.
15. Only the pure helpers were unit-tested (auditor F9): accept, folded into 2.

Journeys run: `gaps` (three runs while building). Native (the card over the native map, `BackHandler`, TalkBack and VoiceOver on the card) has not run on a device.
