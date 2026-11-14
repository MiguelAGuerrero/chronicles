# Chronicle journal, cut 1: plan

For the owner's review before any code (`/slice` step 3). Spec: `specs/chronicle-journal/spec.md` (JN1-JN24); the owner's calls: decision 0155; the approved drawing: https://claude.ai/artifact/GvCtF3iCjh1CksvojJcvoF.

## Defaults for your review

My calls where your answers left room. Each can flip without touching the rest.

1. **The open line is pinned at the foot, at every scroll position** (JN9). The drawing shows it at the end of today's page; pinned, it is also there when you have scrolled back a month, so capture stays one tap everywhere on Memories, as the band was (HC7). A tap in it brings today's page up. The drawing's "Today" link on old pages is therefore not built.
2. **An entry is stored from its first character and saved as you type** (JN12, JN13), through the same path that edits a note today. A crash mid-sentence loses at most the last half second. An entry emptied of all its words is removed, so no blank moment is ever kept.
3. **The "kept here" and "saved to your walk" toasts go** (JN8, amending HC9, HC10 and HC15). The entry appearing on the page is the confirmation; "No location" is said in the dateline.
4. **A walk's entries on the page, the storage unchanged.** You said a moment need not belong to a walk. In this cut the page treats it that way: a moment made during a walk is on the page like any other (JN8). Underneath, it is still stored with its walk, because the replay, the walk screen and deletion all read that link. Making the link an inference from time and place is a change to the data model across those features; I have recorded it as your direction in decision 0155 and left it for its own gate and spec.
5. **The slip keeps one visible action, and stays put** (JN20): a tap opens the moment. Relive it and Another move into its More with Fewer like this and Hide. **Changed after the steward (7):** I had told you the slip goes away once you write. A card that sits over an empty line and vanishes at the first character behaves like a prompt, so it now keeps its place for that open of the app.
6. **Changed after the steward (1): the open line stays in a thread, your thread and Hidden**, as the band does today (HC7). Only the contents list itself, a short menu, has none.
7. **The dateline's tap goes to Chronicle's Map** (JN6): the section bar moves to Map, framed on that moment's pin, and Back returns to the page where it was.
8. **A new `journal` feature** in `scripts/features.js` (source `src/lib/journal/**`, `src/components/journal/**`; journey `journal`; a rule file `.claude/rules/journal.md`), so its tests have a folder.

## Files

### The page (JN1-JN8, JN22-JN24)

- `src/lib/journal/page.ts` (core, new): `journalPage(moments, now, limit)` returns the sheet's rows in book order: day headings (`dayKey` from `lib/days`), entries, today's heading even when empty, and whether older entries remain. Replaces `lately` for Memories; `lately` stays for its other callers until cut 2.
- `src/lib/journal/lines.ts` (core, new): the date heading in full, the dateline (time alone, then the arrival line from `resurface/context`, "No location"), the spoken line. Digits only in dates, times and a memo's length; a test scans for others, as `resurface/lines` does.
- `src/lib/resurface/feed.ts`, `views.ts`, `shell.ts`: the composed feed keeps an open walk's moments for the journal (JN8); the top card, threads and Hidden still leave them out, as now.
- `src/components/journal/JournalPage.tsx` (view, new): the list. Built on `FlatList` in normal order with `maintainVisibleContentPosition` and a first scroll to the end, not `inverted`: an inverted list on react-native-web flips with a transform and reverses the wheel. Older pages are prepended on reaching the top. If the web cannot hold position on prepend, the fallback is to load by explicit pages ("Earlier" at the top); I will say so before taking it.
- `src/components/journal/Entry.tsx` (view, new): the dateline and the pieces, no card. Reuses `MomentPicture`, `NoteText` (references as cards) and the memo's play line. Every piece of a moment is drawn (`lib/moment`), so `StackMark` is not used here.
- `src/components/journal/type.ts` (view, new): the two voices: `Platform.select` of the serif family (`ui-serif`/`Georgia` on web and iOS, `serif` on Android) and the app's sans.
- `src/components/chronicle/MemoriesScreen.tsx`: its list becomes `JournalPage`; the header's card, rail, "Lately" heading and options button go; the thread, own-thread and Hidden bodies stay, opened from the contents.
- `src/components/chronicle/SectionBar.tsx`, `lib/resurface/section.ts`: a way for the dateline to ask for Map on a moment (JN6), through the existing `ChronicleMap` handle.

### The pen (JN9-JN19)

- `src/lib/journal/pen.ts` (core, new): the open line's decisions as a reducer: begin an entry on the first character, when the open entry closes (two minutes, leaving, 100 m on a walk: `momentPill`'s rules from moment stacks, without the setting), whether a keystroke saves or removes, what the line shows while a memo records.
- `src/lib/journal/shell.ts` (shell, new, over `ports`): begin (store the note at once, ask the one fix through `lib/locate`), save as typed (debounced, through the single write queue), remove an emptied entry, flush on blur, on leaving and on the page being hidden. Tested over `fakePorts()`.
- `src/components/journal/OpenLine.tsx` (view, new): the text field, camera and mic; the bar above the keyboard ("Kept as you write", camera, mic, Done). It replaces `MemoriesBand`; the camera and mic still run through `MomentBar`'s capture code (`useCaptures`), with `layout="line"`. The field is 16 px or more on the web (the project's iOS zoom trap).
- `src/lib/refs.ts`, `src/components/threads/MomentPicker.tsx`: the open line uses `typedAt`, `insertRef` and `editRefs` as `NoteEditor` does (JN16). No change to the token.
- `src/lib/captureBand.ts`: `barCamera` stays; `bandLayout`, `bandLabels` and `momentToast` are removed with the band, and `captureTarget` moves to `journal/pen.ts`.
- `src/components/chronicle/MemoriesBand.tsx`: deleted.
- The keyboard (JN19): `KeyboardAvoidingView` on native; on the web the page's foot follows `visualViewport` (a web-only shim beside `SafeInsets.web.tsx`, listed in `docs/ARCHITECTURE.md`'s web exceptions, since no Expo module reports the browser keyboard).

### The slip and the contents (JN20, JN21)

- `src/components/journal/Slip.tsx` (view, new), replacing `Resurfaced` on Memories; `resurface/shell` gains nothing, the slip calls what the card calls.
- `src/components/journal/Contents.tsx` (view, new): one list in the app's `Modal`, replacing `MemoriesMenu` and holding the rows that open `ThreadsRail`'s threads, `MyThreads` and `HiddenScreen`.

## Data

No new truth, no cache, no migration: an entry is a moment, stored as today. SQLite `MIGRATIONS` and IndexedDB `VERSION` are untouched. The one new write pattern is a note patched as it is typed; it goes through the single queue in `db/sqliteStore.ts`.

## Tests per criterion

Unit tests in `src/lib/__tests__/journal/`; screen checks in a new journey `scripts/e2e/journeys/journal.js` (`E2E_ONLY=journal`).

| Id | Test |
|---|---|
| JN1 | `page.test.ts` "JN1: book order, ties by id, the latest page"; journey: opens at the foot, the latest entry and the line in view, older entries load and nothing on screen moves |
| JN2 | `page.test.ts` "JN2: a heading per day with entries, none for an empty day, today always"; journey: the empty journal is a date and the line |
| JN3 | journey: an entry has no border or background; a three-piece moment is one entry with three pieces |
| JN4 | journey: computed font family of a note against a dateline; `lines.test.ts` "JN4: no generated sentence reaches the owner's voice" |
| JN5 | `lines.test.ts` "JN5: time alone, then the arrival line, No location" |
| JN6 | journey: a dateline's tap shows Map with that pin framed; an unplaced entry's dateline is not a button |
| JN7 | journey: "From …" opens the replay |
| JN8 | `page.test.ts` "JN8: an open walk's moment is on the page"; journey: written with a walk minimized, on the page, on the walk screen and in the replay |
| JN9 | journey: the line's box is the same at the foot and scrolled to the top; one tap each from a fresh launch; it works on the failed state |
| JN10 | journey: no placeholder, no accent colour, no digit in the line; targets 44 pt; no focused input at launch |
| JN11 | journey: no geolocation call at launch (the harness counts them); a tap in the line scrolls to the foot |
| JN12 | `pen.test.ts` "JN12: the first character begins an entry"; `shell.test.ts` "JN12: one fix, asked once, at the first character"; journey: no walk opens |
| JN13 | `shell.test.ts` "JN13: saved as typed, flushed on leaving, an emptied entry removed"; journey: type, reload, the words are there |
| JN14 | journey: a photo and a memo land on the page; a memo saved by opening an entry; "Too short, not kept" |
| JN15 | `pen.test.ts` "JN15: one entry until two minutes, leaving or 100 m; the setting ignored"; journey: a photo then a line is one entry |
| JN16 | journey: @ opens the picker, the reference is a card, one delete removes it; `pen.test.ts` "JN16: a reference survives typing around it" |
| JN17 | journey: no insert control on a past page; a response lands at the end with its "answering" line |
| JN18 | journey: a denied microphone says so above the line with the line's box unchanged; Undo above the line |
| JN19 | device: only a phone raises a real keyboard. `UNTESTED` as `device:`, with an item in `docs/NATIVE_UNVERIFIED.md`; the web shim's arithmetic has a unit test (`keyboard.test.ts`) |
| JN20 | journey: the slip under today's date, absent when off, gone once an entry begins; its More holds the four |
| JN21 | journey: the contents opens Threads, Your threads and Hidden and returns; no digit in it |
| JN22 | journey: no background image, no accent colour, digits only in dates, times and a memo's length |
| JN23 | journey: the accessibility order; `lines.test.ts` "JN23: an entry spoken as kind, words, dateline" |
| JN24 | the existing `chronicle`, `days`, `gallery` and `tabs` journeys, unchanged, and `capturehome`'s bar-camera check |

`capturehome` and `resurface` are rewritten where they drive the band, the top card and Lately; `threads`, `responses` and `stacks` change where they start from Memories.

## Deferred (to `docs/DEFERRED.md`)

- Walks as chapters with a drawn trace, day pages replacing the Days section, and the section bar going: cut 2.
- Media as plates, the scrubber by month, jump to a date, search: cut 3.
- The walk screen's Quiet | Explore naming: cut 4.
- A moment's link to its walk as an inference: its own gate (decision 0155).
- Reading only a page of rows from the store: the page draws one page, but Memories still reads every capture row (never media) at open, as it does today.

## Native paths that will not run on a device

The open line's keyboard bar and `KeyboardAvoidingView`; the serif family on iOS and Android; `maintainVisibleContentPosition` on prepend; the first scroll to the end. Each gets a Do/Expect item in `docs/NATIVE_UNVERIFIED.md`. Native has never run on a device.

## Goal to control

| Goal | How often, where | Control | Matrix row |
|---|---|---|---|
| Write a thought | Very often, on foot, one hand | The open line, pinned at the foot; the one prominent control | 22. Departs from 18 (long text in a sheet with Cancel and Done): the page is the editor, as in Notes, Day One and Apple's Journal, and nothing can be lost since it is kept as typed (so 9 does not arise) |
| Add a photo or a voice note | Often, on foot | Two icon buttons in the line, each with a spoken name | 22 and 5. Row 5 warns against a row of create buttons; here the pen is primary and the two are secondary within one control. Weighed as the band was under 0112 |
| Finish writing | Each entry | Done in the bar above the keyboard | 23 |
| Reference a moment | Occasional | @ opens the picker in the app's `Modal` | 24 (precedent: `NoteEditor`, 0125) |
| Open an entry | Browsing | A tap on the entry | 11 |
| See an entry on the map | Occasional | A tap on its dateline, spoken "Show on the map" | 11 |
| Replay an entry's walk | Occasional | "From …" under the entry | 11 |
| Act on the resurfaced moment | Rare | More on the slip | 3 |
| Threads, Hidden, resurfacing options | Rare | The contents button, top right | 3, 24 |
| Undo a delete or hide | After acting | A pill above the line that stays until used or closed | 7, 10 |
| A capture failed | On error | A message above the line, Retry where it can work | 21 |

The tab bar and the line show together, which the references' section 3 notes as a gap ("a bottom toolbar and the tab bar should not show at once"). The band already did this under 0112, and the UX review of Nov 11 let that stand; the line is one row lower in weight than the band was.

## The steward's findings (Nov 12)

Report-only, on the spec and this plan: 3 blocking, 7 should-fix, 1 note. 10 accepted, 1 accepted in part.

1. No open line in a thread or Hidden puts capture two taps away (blocking): **accept**, JN9 carries the line into them.
2. A recording memo replaced the whole line, hiding typed words and the camera (blocking): **accept**, only the mic's slot changes (JN14).
3. One-entry grouping had no way to end an entry and could swallow a response or roll across town (blocking): **accept**, Done ends it, a response is always its own entry, the two minutes run from the last keystroke (JN15).
4. A fix read for an entry that is never kept, and a second fix on a walk: **accept**, one fix per kept entry, cancelled if emptied, none on a walk (JN12).
5. An open walk's entry did not say it is the walk's: **accept in part**. The dateline says it ("40 minutes in", JN5). The spoken names stay "Write an entry" and are not switched to "Add to your walk", after your remark that a moment made on a walk is just a moment.
6. A capture made while scrolled back, or on the failed page, landed unseen: **accept**, a capture brings today's foot into view and is drawn on those states (JN9).
7. The slip vanishing at the first character reads as a prompt: **accept**, it stays for the open and always carries its date and place (JN20).
8. JN16 dropped the reference card's walk line: **accept**, it cites RF4 whole.
9. A reference's words, composed by the app, could be set in the serif: **accept**, they are in the sans; the field itself is serif (JN4).
10. "Kept as you write" shown while a save fails: **accept**, the row says the failure and holds the words for Retry (JN13).
11. Testability: **accept**. The line's mark is still, not a focused caret; "this morning" is for today only; the digit scan leaves out your own words (JN5, JN9, JN22). JN10's "nothing invites" is tested as: no placeholder, no label ending in a question mark, no notification scheduled by the journal.

Left open by the steward and not settled here: VISION.md's open question 5 (how much recall the app may volunteer) still sits under the slip, as it does under today's top card.

## After the build (Nov 12)

Built and audited: what changed from this plan, the tests and the audit's triage are in `specs/chronicle-journal/spec.md`, "Record" and "Audit". Defaults 1-5, 7 and 8 were built as written; default 6 as changed after the steward.


## The ways to make an entry sit with the line (JN34-JN40, Nov 14, decision 0172)

For the owner's review before any code. Spec: JN34-JN40 in `specs/chronicle-journal/spec.md`. Branch `claude/chronicles-action-button-layout-x4cg4k`; pushed there, not deployed.

### What you will see

- **At rest:** the day's date, the last entry, then on the empty page "What’s on your mind?" with the camera and the mic directly under it, left-aligned with the placeholder. Nothing above the tab bar.
- **Typing:** the row leaves the page and the bar sits on the keyboard as today (status, Open as a page, camera, mic, Done).
- **Scrolled back:** the bar comes back above the tab bar with the pen, the camera and the mic, as today.
- **A thread, the threads, Hidden:** unchanged.

### Defaults for your review

1. **The row is drawn quiet but findable:** the same two glyphs as the bar (`camera-outline`, `mic-outline`) in ink, 22 pt glyphs in 44 pt targets, no labels, no container. Restraint (VISION.md) without hiding them ("Found before quiet"). Words beside the glyphs ("Photo", "Voice") would be louder and more findable; not taken by default.
2. **Recording stays in the row** (JN38): Stop takes the mic's place, the camera keeps its own, the timer and Discard follow, so the finger that started it finds Stop under it. The alternative, moving the recording to the bar, puts Stop a screen away from where you tapped. Stop keeps the recording purple: the row is the line's, and that colour is the line's own.
3. **Done for an open entry is in the row** (JN39), after a photo or a voice note with no keyboard up; otherwise Done is only in the keyboard bar. Done's kept place at rest (audit 51) goes: with no bar at rest there is nothing to keep it in.
4. **No bar at rest, rather than an empty one** (JN35): the empty page runs down to the tab bar. This also settles ux 3 of Nov 13 (a toolbar above the tab bar at rest, T8).
5. **The row sits in the empty page's top, under the field**, so a tap anywhere else on the empty page still writes (JN32); the row takes its own taps.

### Files

- `src/components/journal/OpenLine.tsx`: the field element gains the row (camera, mic, Done, the recording's timer, Discard, Stop) when on the page and not typing; the bar renders only while typing, recording from the bar, failed, `penInBar`, or `inBar`; `onHeight` reports 0 when no bar is drawn.
- `src/lib/journal/bar.ts` (new, `@layer core`): `controlsAt({ inBar, opened, rowInView, typing, failed })` returns `bar` or `row`, never both (JN35), with its unit tests. `rowInView` comes from `JournalPage`'s scroll (today's `onAway`, made exact: the row wholly in view).
- `src/components/journal/JournalPage.tsx`: room for the row under the field in the empty page (`lib/journal/rest.ts` if `BLANK_MIN` must grow by the row's 44).
- `scripts/e2e/journeys/journal.js`: checks JN34-JN40, shots at rest, typing, scrolled back, recording, 320 px.
- Docs: decision 0172, `.claude/rules/journal.md` (JN29/audit 51 lines), `.claude/rules/ui-patterns.md` (the exception to T7), `docs/PRODUCT.md`, `NATIVE_UNVERIFIED.md` (the row on a phone with the keyboard down and up).

### Data

None. No truth, no cache, no migration.

### Tests per criterion

| Id | Test |
|---|---|
| JN34 | `journal` journey: at rest `band-photo` and `band-voice` (the same ids as the bar's: only one of the two is ever drawn, JN35) are visible, their left edge within 4 px of the field's, their top under the placeholder, each ≥ 44 px, ink, named, and next after the field in DOM order; shot. Cold find by the `ux-reviewer` |
| JN35 | `bar.test.ts` (`src/lib/__tests__/journal/`): `controlsAt` over every input, one answer each; journey: no `open-line` at rest, the bar's camera with reads broken (`__breakReads`) |
| JN36 | `bar.test.ts`: typing → bar, no row; journey: focus the field, the row is gone and `open-line` holds the writing row; blur, the row is back and the placeholder's and last entry's tops are unchanged |
| JN37 | `bar.test.ts`: row out of view → bar; journey: scroll back, `bar-write`, `band-photo`, `band-voice` visible; and mid-recording, Stop in the bar |
| JN38 | journey: tap `band-voice` in the row, the timer and Stop are in the row, Stop's box where the mic's was, the camera where it was and enabled |
| JN39 | journey: words typed then blur, `line-done` in the row; Done ends the entry and the row returns to two; `bar.test.ts`: a failed save → bar (the journey has no write-failure hook) |
| JN40 | journey: an Undo pill at rest does not overlap the row's box; a thread shows the bar as before; at 320 px no control in the row wraps (every state) |

### Goal to control

| Goal | How often, where | Control | Where you'll look first | Matrix |
|---|---|---|---|---|
| Add a photo or a voice note | Often, on foot | Two icon buttons under the placeholder | Where you'd write, under the question: that is the point of the change | 22 and 5 (as before); composer precedent (Facebook, Threads, X). Departs from T7 (no loose buttons on content): the row belongs to the line, the owner's call (0172) |
| Write | Very often | The placeholder line, the empty page | Unchanged | 22 |
| Stop a recording | Each voice note | Stop where the mic was | Under the finger that began it | 23 |
| Finish an entry | Each entry | Done in the keyboard bar, or in the row after a photo | Trailing end of whichever row is up | 23 |

### Weighed against what was settled

- **audit 51 / ux 5** (the camera and the mic never move): reversed by the owner's call; they move from under the line to the keyboard bar when typing, as in Notes and Day One.
- **T7** (controls in bars, not on content): an exception, recorded in 0172 and `ui-patterns.md`.
- **0112** ("fixed low, never a hero block"): kept in spirit by JN37 (the bar brings them back when the row is out of view) and by default 1 (no block, no colour).

### The steward's findings (Nov 14)

1. Capture hidden while the sheet loads (breach): accept, JN35 (the bar until the sheet opens, and after a failed read).
2. The camera gone mid-recording (breach): accept, JN38.
3. Messages with no bar to sit on: accept, JN40.
4. T7's exception asks for a container and 3:1: accept into 0172, which waives the container: the row is on the page's own ground, ink on it is well over 3:1, and a container would make it the block 0112 forbids.
5. The walk's recording bar at rest: accept, JN35.
6. The edges between row and bar: accept, JN35's rule (one or the other, never both, never neither), JN37 (a recording when pulled back), JN38 (the keyboard mid-note), JN39 (words left, a failed save).
7. The recording purple on the page: reject; the row is the line's, and the purple is the line's own recording colour (the bar's Stop today).
8. "Someone finds them" is a judgement: accept; JN34 now names what is checked (glyph, ink, 44 pt, spoken name), and the cold find runs in the UX review.
9. Screen-reader order: accept, JN34 amends JN23 (the row right after the field).
- Question it raised: with icons under it, does the placeholder read more like a prompt than 0171 allowed? The owner (Nov 14): "it's not requesting you to do anything. It's more of a suggestion"; and a Notion-style "+" in ink before it, chosen from a mock-up.

### Deferred

- Nothing planned. If the steward or the UX review asks for words on the glyphs, it goes to you.

### Native paths that will not run on a device

- The row under a native `TextInput`'s placeholder, the bar appearing when pulled back, and recording from the row: web only until a phone runs it.
