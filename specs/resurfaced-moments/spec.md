<!-- Repo first: written from the owner's request in a session (Nov 5), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The mock UI is the artifact https://claude.ai/artifact/HqApXsfK4HsvKdvnEXn9gR. -->

# Resurfaced moments: Chronicle opens on what you kept

Nov 5, 2026 · @Miguel Guerrero

Chronicle is for remembering. Today it opens on a map and a sheet of walks, and the owner only goes back to it to pick a walk and replay it. The replay is a ceremony, and a ceremony is good once. This slice makes the tab give something back each time it opens: one resurfaced moment, the things you keep coming back to as threads, and your latest moments, in your own words. Walks, Days and the map stay, as their own sections.

## Vision

Idea: Chronicle opens on what you kept, brought back: one resurfaced moment, the threads you keep coming back to, and your latest moments, with walks, days and the map as sections.
Verb: return (it gives moments back, truthfully, at the right time: a moment from a year ago, the words you keep using, the newest things you kept).
Touches: "Every moment captured is worth remembering"; "the walks are one way into it; the map is one view of it, not its home" (What it is); "Return: Chronicle, replay, revisit, recall: ceremonies, revisits, threads, search". Never lines it comes near: "A feed, followers, likes, public profiles" (Lately is a personal list of the user's own moments, newest first, with no one else's activity, no likes and nothing shared); "Scores, streaks, completion, coverage" and "Tallies" (threads are ordered inside by how they recur and nothing ranked or counted is shown: RM22); "Editing out the lows" (Not this one only keeps a moment from being brought back; it stays kept, in Lately and in its walk: RM20); "Nagging: ... re-engagement pushes" (no notification is added; a "year ago today" nudge is deferred and would be opt-in); "Writing the owner's words for them" (a thread is named by the user's own word, a card shows their own words; the app writes only the label that says why a moment is here, RM6); "Data leaving the device" (all derived on the phone, RM23).
Verdict: aligned
Shape: as asked.
Criteria: RM20, RM22, RM23 carry the Never lines above (a hidden moment stays kept; no score or count is shown; nothing leaves the device).
Open: none.

## Decisions (the owner's calls, Nov 5)

- Chronicle's job is to remember, to review and to recall. The map is a tool for that, not the front door.
- The front door is the feed. It leads with what the user circles around (threads), not with walks. A walk is a tool that makes moments; it stays a section, like Days and the map.
- Threads come from the user's own words first (notes, photo captions). Memos show in the feed now and join threads once they have a transcript; transcription is its own later slice. The thread code is extensible: a new source of signals plugs in without changing the feed.
- The tab is one screen with a control at the top: **Memories | Walks | Days | Map**. Memories opens first (RM1).
- Choices (Less like this, Not this one, a renamed or removed thread) are kept in the meta store: no migration.
- Nothing is a score. Counts are said in words. A thread is ranked by how it recurs over time, and no rank, weight or count is ever shown.
- Local only: everything is derived on the phone from captures.
- After the audit (Nov 5): the Map section remembers its camera while the app is open (so Map, Walks and Days come back where they were); and what was kept in the last day heads Lately, newest first (RM17), so a walk just finished is at the top (RM3).
- Search and the map lens are the next slice. Threads, search and the map lens share the signals this slice defines.

## Criteria

### The front door

1. **RM1** Chronicle opens on **Memories**, not on the map: at launch, after another tab or the walk, and after a walk's first replay (RM3). A replay or a day opened from Walks, Days or Map keeps that section, so Back returns to the list it came from. A control at the top has four choices: Memories, Walks, Days, Map. It is a tab list for a screen reader, with the chosen one marked.
2. **RM2** **Walks**, **Days** and **Map** show what Chronicle showed before this slice: the walks list under a month header per month, the days list with Replay this day, and the map with its stars and moment pins. Their behaviour is unchanged, including rename, delete, undo and the capture viewer.
3. **RM3** Every way out of a walk's first replay ends on Chronicle's **Memories**, and that walk's moments are the newest in Lately.
4. **RM4** With no moments at all, Memories shows one quiet line and a Navigate button (what the empty Chronicle showed), and no rail, no resurfaced card and no Lately.

### The resurfaced moment

5. **RM5** The top of Memories shows one resurfaced moment, as a card that leads with the moment's own words (a note's text, a photo's caption), its picture or a memo's play button, its place and when it was, in words. It never shows words the app wrote about the moment beyond its label.
6. **RM6** The label above it is in words and says why it is here: "A year ago today" (a moment from the same day, a year or more back), "Last October" (the same month last year), "You keep going back to the water" (a moment from a thread, the thread's own word), or a plain "A while ago". Never a number of moments, never a score.
7. **RM7** `pickResurfaced(moments, prefs, seed, now)` is pure. The same inputs give the same moment. It excludes: a moment made in the last day (it is in Lately), a moment in Not this one, a moment of a deleted walk, a moment still without its media. It prefers an anniversary, then a moment in a live thread, then any older moment.
8. **RM8** **Another** shows a different moment, stepping through the eligible ones in a seeded order, and never shows the same one twice in a row unless it is the only one. The first moment shown differs from the last one shown on the previous open whenever more than one is eligible.
9. **RM9** **Relive it** opens the replay of the moment's walk, or the replay of its day for a moment made outside a walk.
10. **RM10** With no eligible moment yet (all are from the last day), the resurfaced card is absent, not empty, and Memories begins with the rail or Lately.

### Threads

11. **RM11** `deriveThreads` is pure. A term becomes a thread when it appears in at least three distinct moments on at least two distinct days. How often it comes back over time decides its order, not how many times it appears in one sitting. A term used on one walk, however often, is not a thread.
12. **RM12** Terms are the user's own words, folded: case and accents ignored, plurals folded, common words dropped, a short table of aliases (fall and autumn). The thread's name is the user's own word, shown as they most often wrote it. A one-off ("a man at the bus stop said …") never makes a thread.
13. **RM13** The signal API is extensible. A `SignalExtractor` turns one moment into signals (a term, a weight, where it came from); `deriveThreads` only reads signals. This slice ships the note extractor and the caption extractor. Memos give no signal until a transcript source supplies text. A test adds a fake extractor and a fake transcript and sees a thread appear with no change to `deriveThreads`.
14. **RM14** The threads rail shows one tile per thread, with its name and one line in words that never holds a number: "Just beginning", "Now and then", "Often, lately", "Comes back every October". The rail is absent, not empty, when there are no threads, and a quiet line says threads appear once you keep coming back to something.
15. **RM15** Tapping a thread opens its screen: its name, "In your words" (up to two of the user's own sentences from it), and every moment in it, newest first. Back returns to Memories where it was.
16. **RM16** **Rename** changes a thread's displayed name only, and keeps it across reloads. **Not a thread** removes it from the rail for good: the term is not offered again. Neither touches a moment.

### Lately

17. **RM17** Lately lists moments, walk or no walk, photos, videos, notes and memos together. What was kept in the last day leads, newest first. After that, newest first by week, and within a week the moments that belong to a thread come before the rest. *Superseded Nov 5 by `specs/memories-context` MC13 (the owner's call): Lately is strictly newest first, with no thread priority and no last-day rule.* It shows twenty at first and the next twenty as the end is reached.
18. **RM18** A moment's card shows its picture or thumbnail (its edits as everywhere else), its words, a memo's play button, "place · when" in words, and a small "From <the walk's name or a day-part, like a Sunday walk>" line. Tapping the card opens the capture viewer; tapping the "From" line opens that walk's replay.
19. **RM19** A deleted moment, and a moment of a deleted walk, leave Memories at once, with Undo while it waits, and a thread that falls below three moments leaves the rail.

### Less of this

20. **RM20** The **…** menu on a resurfaced moment or a card offers **Show less like this**, **Not this one**, **Open the moment** and Cancel. Show less like this makes the moment's threads and terms come up less often (never removes them). Not this one never resurfaces that moment. Both leave the moment in Lately and in the walk. A toast says what happened and offers **Undo**.
21. **RM21** Those choices live in the meta store under one key, survive a reload, and are read before the first resurfaced moment is picked.

### Quiet, local and fast

22. **RM22** Nothing on Memories is a score. Every date, count and label is a sentence; the whole of Memories is checked for digits other than dates and times.
23. **RM23** Nothing is stored for threads: they are derived from captures each time Memories opens (a cache is added only if a test needs it). The only write is the meta key in RM21. No network call, no new host, no new dependency.
24. **RM24** Deriving the threads and the feed for 5,000 moments takes under a second in a unit test (O(n log n); an index on terms, not a pass per moment).
25. **RM25** With a screen reader, the resurfaced card reads as one item (its label, its words, its place), **Another**, **Relive it** and **…** are buttons with names, and the rail is a list. Motion follows the reduce-motion setting.

## Routes and data

- The Chronicle route (`src/app/(tabs)/chronicle.tsx`) keeps its path. It holds the control and renders the section; the current map-and-sheet screen becomes the **Map**, **Walks** and **Days** sections of the same component (Walks and Days open the sheet on that mode, raised).
- New truth: none. New cache: none. New meta key: `resurface_prefs` (JSON: hidden moment ids, down-weighted terms, thread renames, removed terms, the last moment shown).
- No new route. A thread screen is a section of the same screen, so Back and the control keep working.

## Tests

- Unit (`src/lib/__tests__/resurface/`): `terms.test.ts` (RM12), `threads.test.ts` (RM11, RM13), `pick.test.ts` (RM6, RM7, RM8, RM10), `feed.test.ts` (RM17), `lines.test.ts` (RM6, RM14, RM22), `prefs.test.ts` (RM20, RM21), `shell.test.ts` over `fakePorts()` (RM16, RM19, RM21, RM23), `perf.test.ts` (RM24).
- E2E journey `resurface` (new, decision 0074): the memory feed on seeded moments (RM1-RM5, RM9, RM14, RM15, RM17, RM18, RM20, RM25); `chronicle`, `days` and `tabs` re-run for RM2 and RM3.

## Deferred

- **Search** and the map as a lens on results: the next slice, on the same signals.
- **Memo transcripts**: the seam is built (RM13), the transcriber is not. Needs a native speech module and a development build.
- **Photo and audio features** (what is in a picture): an extractor can be added later with no feed change.
- **Replay this thread**: the thread played as one ceremony. The replay today is a view of one walk's story (decision 0086); a thread spans days and places. Its own slice.
- **Finds and the lows** ("Passed … without stopping") in the feed: they are derived rows, not captures. The mock showed both.
- A thread that comes from more than one word (a phrase, a meaning).
- A nudge ("a year ago today") as a local notification.

## Native (unverified on a device)

Views are React Native components only; no new native module. All of it runs on the web build and has never run on a phone.

## Record (Nov 5)

Built on `claude/resurfaced-moments-spec`; not audited (decision 0074). Unit tests (`src/lib/__tests__/resurface/`), typecheck, lint, `npm test` and the e2e journey `resurface` pass; the older Chronicle journeys were re-run (see `docs/STATUS.md`).

- **Built as written:** RM1, RM2, RM4-RM21, RM23, RM24, RM25 (the roles and names; reduce motion is the app's, no new animation).
- **RM1 reworded** (above) so that Back from a replay returns to the section it came from; the section resets on any other route (`sectionOnRoute`).
- **RM3** is done by the first replay, which sets Memories as it mounts; the walk's moments appear in Lately once the walk is stopped (a moment of a walk still open is left out until then).
- **RM22** is checked on the e2e's seeded text (no digit) and on every line `lines.ts` writes. Dates and a memo's length are digits by design; the e2e's seeds hold none.
- **RM25** screen-reader roles are asserted by the e2e only for the tab list; the rest is by the names the controls carry.
- **Not built, as the spec says:** search, the map as a lens, memo transcripts, photo features, Replay this thread, finds and lows, a nudge (`docs/DEFERRED.md`).
- **Native:** nothing new; every view is unverified on a device (`docs/NATIVE_UNVERIFIED.md`).

## Audit (Nov 5)

16 findings: 12 fixed (one in part), 3 deferred, 1 rejected. Regression tests are `src/lib/__tests__/resurface/audit.test.ts` (`resurfaced-moments audit 1` to `11`); audit 8, 12 and 13 are checks in the `resurface` and `chronicle` journeys.

1. Contractions became threads ("Don", "Didn", "Couldn"): accept, `termsOf` keeps an apostrophe inside a word and drops contractions (`audit 1`).
2. Undo restored a whole snapshot and erased later choices: accept, a choice returns its own change and Undo takes back only that (`audit 2`).
3. Overlapping loads let stale prefs or moments win: accept, choices are written in a chain, a read waits for them, and the newest read wins (`audit 3`).
4. Every load reshuffled the top card, after a delete and after a replay: accept, `refresh` keeps the open's seed, order and place; only a new open (the app was elsewhere) loads afresh (`audit 4`, `visit` in the section store).
5. "In November" for a moment 350 days old: accept (`audit 5`).
6. Plurals of -ie words split ("cookie" and "cookies"): accept in part (`audit 6`). Other languages, "buses" and "bus", and the `fall` alias stay English-only: defer.
7. RM3 and RM17 disagreed: accept, the owner's call: the last day leads (`audit 7`).
8. The Map lost its camera across tabs: accept, the owner's call: it is kept while the app is open (the `chronicle` journey's NV3 position check is back, on the Map section).
9. The section resets on any route that is not a replay, a day or Chronicle: reject, this is RM1 (`audit 9` pins the set of routes).
10. A toast promised a write that failed: accept, a choice says whether it was kept and the toast says when it was not (`audit 10`).
11. A 29 Feb moment never resurfaced in a common year, and "A while ago" for a day-old moment: accept (`audit 11`).
12. A very long note pushed the buttons off screen: accept, eight lines on the top card and ten on a card (journey check).
13. The rail was not a list, the section tabs were 40 px, Undo was under 44 px, the toast ignored nothing but carried dead code: accept (journey checks).
14. Android's Back on a thread leaves Chronicle: defer, native, unverified.
15. A term in 5 of 9 moments is a thread and stops being one when a tenth arrives: defer, a limit of the share rule (`THREAD_MAX_SHARE`).
16. This branch lacks main's tab `ErrorBoundary` export for Chronicle: defer to the merge; check that the new default export sits inside it.
