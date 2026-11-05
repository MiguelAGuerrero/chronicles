<!-- Repo first: written from the owner's request in a session (Nov 5), after the steward's read of the shipped Memories screen (decision 0098). Not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Memories, in context and under your control

Nov 5, 2026 · @Miguel Guerrero

Chronicle now opens on Memories (`specs/resurfaced-moments`). An adversarial read of it against `docs/VISION.md` found one broken rule and a few gaps. A moment arrives without its context, so a card shows a town and a day, not where, when in the day, or how far into the walk. The app brings moments back, and you cannot see or undo what you hid, nor switch it off. Lately says "Newest first" while a thread's moments jump ahead. This slice fixes those three: moments arrive whole, the controls are findable, and the labels are true.

## Vision

Idea: Make every moment on Memories arrive with its place, time of day and how far into the walk it was; let the owner see, restore and switch off what the app brings back; and make Lately and its copy say only what is true.
Verb: return (a moment given back whole, truthfully, and only as the owner allows).
Touches: Always, "A moment carries its context: place, time, its walk, what came just before ... It never appears as a bare thumbnail, filename or count" (MC1-MC7 and MC17 mend it). Always, "Counts are words" (MC7). Never, "Writing the owner's words for them" (the context reads a moment's kind, never its words: MC5). Never, "Editing out the lows" and "Nagging" (the controls hide nothing from the walk or Lately, no notification is added, and Forget keeps the off switch: MC8-MC10). Never, "Data leaving the device" (the street comes from the cache on the phone: MC2). Open questions 1 and 5 (who may volunteer a moment) stay open: this slice gives the owner the controls, it does not settle the rule.
Verdict: aligned
Shape: as asked.
Criteria: MC1-MC7, MC17 (context, in words, from the device, never a claim that is not known), MC8-MC12 (hide, restore, switch off, reset), MC13-MC16 (labels and copy that state facts).
Open: none for this slice. Deferred, still open for the owner: owner-made threads first (VISION.md [proposed]), a share of the top card for moments without words, the words the stop list drops, lows and finds in Memories, search and the map as a lens, a dwell register.

## Decisions (the owner's calls, Nov 5)

- **Scope:** context, controls and honest labels. Owner-made threads, a share for unworded moments and visible stop words wait.
- **Lately is strictly newest first.** A thread's moments are reached from the rail, not by jumping the queue. This retires the thread-leads-within-a-week rule of RM17 (`specs/resurfaced-moments`); the last-day-first rule it replaced is subsumed.
- **A place is the street the moment snapped to, plus the walk's town.** Nothing new is stored; a moment with no street says so in words.
- **The controls live in a menu on the Memories header.**

## Criteria

### Arriving whole

1. **MC1** Every moment on Memories, the top card included, shows a place line that says only what is known: its street and its town ("Hope Street, Fox Point"); the street alone for a moment outside a walk; the town alone when no street is known; "No place kept" when neither is. A town is the walk's (`Walk.area`). Where the walk's town is known, the line is never "No place kept". The line is never blank.
2. **MC2** A street is shown only if its geometry lies within 40 m of the moment's own fix. It is the street the moment snapped to when its walk ended, if that street is in the cache and within 40 m; else the nearest cached street within 40 m; else none. A street with no name counts as none. Nothing is fetched; a moment with no fix has no street.
3. **MC3** A moment of a walk says how far into the walk it was, in words, pauses not counted: "At the start", "Ten minutes in", "One hour and five minutes in". A moment outside a walk says "On its own".
4. **MC4** A moment says its time of day in words with its day: "Tuesday evening", "Last Sunday morning". The part of the day is by the phone's clock zone as it is now (a moment made in another zone reads by the zone you are in), with the boundaries `walkTitle` already uses: night before 5, morning before 12, afternoon before 17, evening before 21, night after.
5. **MC5** A moment made within ten walked minutes after the capture immediately before it in the same walk says so by that capture's kind: "just after a photo", "just after a note", "just after a voice memo". Only the immediately previous capture counts; a deleted one never does. It never quotes that capture's words. Otherwise the clause is absent.
6. **MC6** Context is read only for the moments rendered (the top card, the cards rendered in Lately, an open thread's moments), once per moment per open. Opening Memories reads nothing for a moment not rendered, and scrolling, re-rendering or Another asks for nothing already read.
7. **MC7** The walk-time clause and every sentence this slice writes hold no digit: durations are words (`numberWord`). Street names are the map's words and may hold digits ("5th Avenue"); dates and a memo's length keep their digits, as in RM22.
8. **MC17** While a moment's context is still being read, its card shows no place claim at all, neither a street nor "No place kept". A read that fails is not "no street": the card shows no place claim and the next render asks again.

### In your hands

9. **MC8** A menu on the Memories header opens **Hidden**: every moment hidden by Not this one, every thread removed, and every word brought up less, each with **Bring back**. A moment's row shows its kind and its context line, with no picture and no words, until tapped open; a thread shows its name; a word shows as the stored word, labelled "word". Bringing one back makes it eligible again at once and removes it from the list. Hiding is not privacy and no copy says so.
10. **MC9** The same menu has **Bring moments back**, a switch, on by default. Off: Memories shows no top card and no Another, and in the top card's place one quiet line, "Bringing moments back is off", with the switch on it. The rail and Lately stay. It touches the top card and Another only: revisit memories (0037) and Remind me here are untouched. With it off and nothing kept, the empty state shows as before. The choice is kept and survives a reload.
11. **MC10** The same menu has **Forget my choices**: after one confirmation inside the same sheet, it clears everything Hidden lists and every thread rename. The switch keeps its state. The confirmation says that hidden moments, removed threads and softened words will be offered again. Moments, walks and threads' contents are not touched.
12. **MC11** Show less like this says which word it will bring up less: the toast names at most one, "Fewer like this: harbor", or reads "Fewer like this" for a moment with none. Every word it set appears in Hidden (MC8).
13. **MC12** The switch and the restores are kept in the same meta key as the other choices (`resurface_prefs`) and read back after a reload. A stored value from before this slice reads as the switch on and nothing restored; a stored `off` that is not a boolean reads as on.

### Saying only what is true

14. **MC13** Lately is strictly newest first, by the time each moment was kept, ties broken by id, with no thread priority, and its sub-line "Newest first" is true. A thread's page lists its moments newest first, as before.
15. **MC14** Memories' copy states a fact and gives no instruction or chat. Every sentence is in `lib/resurface/copy.ts` and asserted verbatim: "Hidden. It stays in Lately and in its walk." (Not this one); "Fewer like this: harbor" (MC11); "That is not a thread." (Not a thread); "Nothing kept yet." with the Navigate button (the empty state); "Bring back" (Hidden); a failed save adds "Couldn't keep this choice; it may come back." to the toast.
16. **MC15** Words the owner wrote are shown in italics and nothing else is: the placeholders the app writes ("A voice memo", "A moment you kept") are upright.
17. **MC16** "No place kept" and "On its own" name the app's lack, not the moment's: they read as facts about what is stored, never as a failure of the capture.

## Routes and data

- No new route, truth, cache, migration or dependency. The Hidden list is a local view of the Memories screen, like a thread's page.
- `Prefs` (`lib/resurface/types.ts`) gains `off: boolean`. `parsePrefs` reads a missing or non-boolean field as `false`.
- Street names come from the street cache (`street_segment`) through `db.getSegmentsIn` around a moment's fix. The cache is tagged with the tile build; if the snapped segment's id is no longer in it, the nearest street within 40 m is used (MC2).

## Tests

- Unit (`src/lib/__tests__/resurface/`): `context.test.ts` (MC1-MC5, MC7, MC16), `shell.test.ts` additions (MC6, MC17, MC8-MC12, over `fakePorts()`, including a rejecting `getSegmentsIn`), `feed.test.ts` (MC13, replacing RM17's thread rule), `copy.test.ts` (MC11, MC14 verbatim).
- E2E journey `resurface` (extended): MC1, MC3, MC8-MC10, MC14, MC15 on a seeded street cache, a walk with a pause and moments at known minutes; MC9's quiet line.

## Deferred

- Owner-made threads first, app-found ones labelled as suggestions (VISION.md [proposed]).
- A share of the top card for photo-only and voice-only moments, "One you did not write about".
- The words the stop list and the 40% rule drop, shown and restorable.
- Lows and finds in Memories; search and the map as a lens; a dwell register for opening a moment.
- Re-deriving a street from the trace when the cache lacks it (the owner's call: today the town alone is shown). AGENTS.md's "recompute from the trace" would allow it; it is a write to a cache from a read path.
- A place label stored on the capture at the moment it is made (a migration): not needed while the street cache answers.
- "What came just before" as the nearest named place; this slice names only the previous capture's kind.

## Native (unverified on a device)

Views are React Native only. The per-moment street read (`getSegmentsIn` over SQLite) and the Hidden list have only run on the web build.
