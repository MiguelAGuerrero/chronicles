<!-- Repo first: written from the owner's request in a session (Nov 5), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The mock UI is the artifact https://claude.ai/artifact/HqApXsfK4HsvKdvnEXn9gR. -->

# Resurfaced moments: Chronicle opens on what you kept

Nov 5, 2026 · @Miguel Guerrero

Chronicle is for remembering. Today it opens on a map and a sheet of walks, and the owner only goes back to it to pick a walk and replay it. The replay is a ceremony, and a ceremony is good once. This slice makes the tab give something back each time it opens: one resurfaced moment, the things you keep coming back to as threads, and your latest moments, in your own words. Walks, Days and the map stay, as their own sections.

## Decisions (the owner's calls, Nov 5)

- Chronicle's job is to remember, to review and to recall. The map is a tool for that, not the front door.
- The front door is the feed. It leads with what the user circles around (threads), not with walks. A walk is a tool that makes moments; it stays a section, like Days and the map.
- Threads come from the user's own words first (notes, photo captions). Memos show in the feed now and join threads once they have a transcript; transcription is its own later slice. The thread code is extensible: a new source of signals plugs in without changing the feed.
- The tab is one screen with a control at the top: **Memories | Walks | Days | Map**. Memories opens every time.
- Choices (Less like this, Not this one, a renamed or removed thread) are kept in the meta store: no migration.
- Nothing is a score. Counts are said in words. A thread is ranked by how it recurs over time, and no rank, weight or count is ever shown.
- Local only: everything is derived on the phone from captures.
- Search and the map lens are the next slice. Threads, search and the map lens share the signals this slice defines.

## Criteria

### The front door

1. **RM1** Chronicle opens on **Memories**, every time, not on the map. A control at the top has four choices: Memories, Walks, Days, Map. It is a tab list for a screen reader, with the chosen one marked.
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

17. **RM17** Lately lists moments, newest first, walk or no walk, photos, videos, notes and memos together. Within a week, moments that belong to a thread come before the rest. It shows twenty at first and the next twenty as the end is reached.
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
