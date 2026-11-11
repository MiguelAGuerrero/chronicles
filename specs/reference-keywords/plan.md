# Plan: reference keywords (RK1-RK20)

For the owner's review before any code. Built on moment references (`specs/moment-references`, decision 0125): the token, `lib/refs.ts`, `NoteEditor`, `NoteText`, `plainNote`.

## 0. Calls made (the owner, Nov 11)

Answered: the fix (1) and the token (2) as recommended; over there is a resolution picker (RK18); time words are basic prose anchors (RK16); the plain form is word plus value in parentheses by default, with a setting (RK9, RK19); references survive removal from a walk and go with their moment, and a pointer to a deleted moment goes alone (RK20). What follows is the plan as first written, with these applied in section 8.

Originally:

1. **Which fix does a keyword resolve from while a note is being written?** This is the one architectural question.
   - A note's moment often has no fix when the editor opens: a loose moment is placed when its fix arrives (M2), and a walk's moments are placed by the trace at stop. `Capture` has no coordinates; `Moment.lat/lon` does, and `useCaptures` stamps `pos.current.here` (the last known position) when a capture begins.
   - **Recommended:** the editor takes a `fix` prop: for a new note (Respond → Note) the stamp's position taken when the editor opens (the same fix the reply will be stamped with, `useCaptures.stampNow`, so a keyword and its moment agree); for Edit on a saved note the moment's own `lat/lon`. No fix, no entry (RK6). Time words need only `t`, so they always resolve.
   - Alternative: resolve after the moment is placed and fill the reference in later. Rejected here: it edits a note's text after it was saved, and the owner's words are only changed by the owner.
2. **The data model** (the token). **Recommended:** extend 0125's token, `@[id|words]`, with a second form for a keyword: `@{kind|label|payload}` with `kind` one of `here`, `near`, `there`, `now`, `time`, `label` the words shown ("the science center") and `payload` the coordinates and place key, or the timestamp. Parsed by the same `parseRefs`, so every reader that reads 0125's tokens gets the new ones. No table, no migration, no IndexedDB `VERSION` bump. The cost: a note's text carries more than words, and a note with many keywords is longer than it shows (the 500 characters count what is shown, as for 0125).
3. The four calls in the spec's "Open" (over there by map point; moment-only time words; this amends 0125; "here (the science center)" in plain text), each with my recommendation there.

## 1. Files

- `src/lib/refs.ts` (core): extend `RefPart` with `{ key: Keyword, label, value }`; `parseRefs`, `refIds`, `plainRefs`, `toEditor`, `fromEditor`, `editRefs`, `insertRef` handle both kinds. A moment token still parses exactly as before (RK3).
- `src/lib/refs/keywords.ts` (core, new): `KEYWORDS` (the reserved set, the palette's order), `resolveKeywords({ fix, t, near, now })` returning the entries that can resolve (RK6), `REF_RULES` (the ranges, named in one object like `RECALL_RULES`), `nearbyByDistance` (RK7, RK10). No clock, no module state.
- `src/lib/refs/near.ts` (shell, new): a factory taking `ports { placesNear(at, radiusM): Promise<Place[]> }`, and the app instance. `placesNear` reads the local adapters only: `discovery/tilePois.ts` and the archive, never a host (RK11, decision 0016). Confirm in step 1 of implementation whether an existing reader already returns the named places within a radius of a point (`landing/read.ts` and `atlas/read.ts` read areas, not points); if not, a new small reader over the same tile read.
- `src/components/threads/RefPalette.tsx` (new, a view): the `@` palette: keywords first, then the moment picker's rows (`MomentPicker` stays, reused inside it). Drawn inside the editor's Modal, never a second one.
- `src/components/NoteEditor.tsx`: opens the palette instead of the picker; takes `fix`; a keyword insert is `insertRef`'s second form.
- `src/components/CaptureView.tsx`, `src/components/threads/ReplyDock.tsx`: pass `fix`.
- `src/components/threads/NoteText.tsx`: draws a keyword reference as its label with the value in place (RK9); a tap opens the correction (RK10).
- Plain-text readers (rows, Lately, a day, the resurfaced card, notifier, replay): already call `plainNote` / `plainRefs`; no change beyond the core function (RK9). `check:affected` names them.
- `scripts/features.js`: add `src/lib/refs/**` to the `threads` feature, `reference-keywords` to its specs; `IN_PROGRESS` entry.
- `docs/decisions/0141-…`: this slice's calls and "amends 0125".

## 2. Data

Truth only: a note's body. No new cache, no migration (SQLite `MIGRATIONS` and IndexedDB `VERSION` untouched). A reference's value is truth written by the owner's pick; a tile rebuild recomputes nothing in it (RK5).

## 3. Tests

Unit, `src/lib/__tests__/threads/` (the `threads` feature):
- `keywords.test.ts`: RK3 (token round trip; a note without a keyword is byte for byte as before), RK4 (resolve from the given fix and `t`), RK6 (no fix, no place, nothing), RK7 (distance or time order, no digits), RK10 (the nearby list), RK12 (no weather key in `KEYWORDS`).
- `refs.test.ts` (existing) gains RK2 (other characters untouched), RK5 (a value survives a rebuild: the token carries it), RK9 (`plainRefs` says "here (the science center)").
- `keywordsShell.test.ts` over `fakePorts()`: RK4 (an edit later reads the moment's fix, not the present one), RK11 (the fake `fetch` is never called; only `placesNear` is).
- Journey `threads` (extends it): RK1 (`@` opens the palette, dismissing leaves the `@`), RK2, RK8 (a recalled moment is a card with place and date, no link written), RK9 (the viewer), RK10 (a tap opens the correction), with shots.
- Device: none new beyond `docs/NATIVE_UNVERIFIED.md` items for the palette on a phone's keyboard (the `@` key and the map pick of "over there").

## 4. Goal to control (ui-patterns)

| Action | Intent | Control | Matrix |
|---|---|---|---|
| Put where I am into a note | A place the note's words point at | `@`, then "here" or "next to me" in the palette | 15, a pick from a list |
| Point at a spot | "Over there" | `@`, "over there", then one tap on a map | 15 then a map pick |
| Say when | Time of the moment | `@`, "now" or a time word | 15 |
| Recall a moment | A note that embeds another | `@`, a moment row (0125) | 15 |
| Correct what "here" meant | The place was something else | A tap on the reference, a short list of places near the fix | content as a link, then 15 |

No new control sits over a capture, and the capture button is unchanged.

## 5. Deferred

Weather and temperature (needs a network call: a decision on what the network is for); relative time words (yesterday, last week); `@` in the capture stack's quick note (still deferred from 0125); keywords in captions; search by a reference's value (the value is in the text, so a note search finds it, but a search by place is not specified here).

## 6. Native

Never run on a device: the phone keyboard's `@`, the map pick, tile reads from a note's editor. Items go to `docs/NATIVE_UNVERIFIED.md`.

## 7. Steward (Nov 11): no breach, six drifts, two tone findings; all accepted

- **S1** (a nearest-place guess stored as fact) into RK13: a place is named only when exactly one lies in range, else the street or nothing; the value is the pick the owner saw; the moment's saved fix wins over the editor's. Test: the stamp and the saved fix compared.
- **S2** (a wait on a fix in the editor) into RK14. The plan's `fix` prop is read, never awaited.
- **S3** (a read at editor open) into RK15, and the plan's wording corrected: "taken when the editor opens" means reading `pos.current.here`, the last known position the stamp already holds, never a new location call. A shell test spies on `lib/locate`.
- **S4** (a ranking look) into RK7: no numbers or "closest"; distance in words; the adapters' gate only.
- **S5** (time words) into RK16: an allow-list, "now" as the moment's clock time, "N minutes in" only on a walk.
- **S6** (the app speaking in the owner's sentence) into RK9: plain text is the stored label and nothing more. The label's form is defined once in `refs.ts` (Open 4 stays the owner's).
- **S7** (a token that is more than words) into RK17: shares render words; the token and coordinates stay in the stored note.
- **S8** (a bare moment row) into RK8: every moment row carries place and date.
- The steward's silent questions are Open 6 and 7 in the spec, and "over there" being a stored coordinate is Open 1's map pick, which I read as the owner's own choice, not tracking.

## 8. After the owner's calls (Nov 11)

- **Token:** `@{kind|word|value|payload}` is the markdown-like pair, a displayed word and its actual value (`kind`: `here`, `near`, `there`, `time`). The moment token keeps its form; a moment's `label` is its word and value.
- **Resolution picker (RK18):** one component, `RefPicker`, for "over there" and for correcting a reference: places from `placesNear` in distance order (the adapters' gate, no number or "closest"), and "Choose on the map", a one-tap point pick that opens at the moment's fix, never a fresh read (RK15).
- **Setting (RK19):** `showRefValues`, default true, in the typed meta beside the other saved settings (`shells-saved-settings` pattern: a factory over `ports`, an `@instance`), a switch in the settings dialog. `plainRefs` takes it as an argument, so core stays pure; every plain-text reader gets it through one hook. No migration.
- **Time words (RK16):** `KEYWORDS.time` is the allow-list; `resolveTime(word, t)` is pure and returns the absolute value; a test checks no entry names quality or mood.
- **Deletion (RK20):** `deleteMoments` already cascades notes by hand; a note's references go with its own moment. For a pointer to a deleted moment, `plainRefs` and `NoteText` read the carried word and value instead of `GONE` (so RF5 and RF6's "a moment no longer kept" is amended); nothing rewrites a note. `deleteWalk`/removal from a walk is checked to leave a moment's note untouched. The two existing `refs.test.ts` cases for RF5 and RF6 change in the tests-first commit.
- **Extra tests:** RK18 (the picker lists by distance and has the map entry; no location call), RK19 (the setting's shell; both forms on every surface), RK20 (unit over `refs.ts`, shell over the deletion fake).
