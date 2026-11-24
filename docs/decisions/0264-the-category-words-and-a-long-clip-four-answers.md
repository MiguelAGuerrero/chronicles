# 0264. The Nov 24 third batch's category words and long clip: four answers

Date: 2026-11-24 · Status: accepted · Area: explore, captures, replay · Relates to: 0003, 0067, 0109, 0203, 0233, 0239, 0263

## Context
On Nov 24 a third batch was built on one branch: T49 (one table for the eight categories' names, "Green" and "Views &
oddities" on the area card and in "What I'm into", a muted line under each of its headings; decision 0239) and T43 (a web
video over 15 s kept whole; decision 0233). The batch's review (the `auditor`, the `ux-reviewer`, the `steward`) left four
questions only the owner could settle, which the owner answered in person:

1. An area card's kind row has no room at 320 px, and since T49 not at 390 either, for "Views & oddities", its amount
   word, its dots and "Suggest a walk" (auditor F1, ux U1, steward S1; `docs/DEFERRED.md`'s 320 px row, decision 0067).
2. 0233 says a long clip's "length is said"; as built it was said only behind the editor's Trim, while a memo's card says
   "Voice memo · 0:39" (auditor F3, ux U2, steward S5).
3. A long web clip holds its replay card for its whole length; 0203 was ruled when the longest video was 30 s, and a
   long clip that is the walk's last moment has no Next past it (steward's silent 1 and 2, ux U5).
4. T49's new words: History's and Art's muted lines, How the marks work's lower-case names, the planner's title and the
   card's spoken "Suggest a walk through views", and "How many shops the walk passes" (steward S2, S8, S9; ux U3, U6);
   and the builder's calls on food's one name, the plural nouns and the five lines.

## Decision
The owner's answers, in person, Nov 24.

1. **"Two-line rows".** Every kind row on an area's card: the name on top, its amount word under it as supporting text,
   the dots and "Suggest a walk" trailing. It also mends the words cut at 320 px today, and closes the deferred 320 px
   row.
2. **"On its card, like a memo".** A video's card says its length as a memo's card does, "Video · 0:20" as "Voice memo ·
   0:39", for every video, long or short (not the editor's title). A video whose length is not known says none.
3. **"Whole, as built".** A long clip plays whole in the replay (0203). The missing Next after a long clip that is the
   walk's last moment is filed as a later entry.
4. **"Accept all".**
   - History's muted line: "Monuments, buildings, places of worship and cemeteries". The muted lines may wrap to two
     lines at 320 px (a layout call, made after the answer; no copy changes).
   - Art's: "Statues, murals, fountains and signs".
   - How the marks work uses the card's capitalised names: "Sights (History, Art, Culture, Green and Views & oddities)",
     and the same for Local life.
   - The planner's title and the card's button take the label: "A walk for views & oddities", "Suggest a walk through
     views & oddities" (titles and spoken names take the label; sentences keep the noun "views").
   - "How many shops the walk passes" becomes "Shops along the walk", and views likewise, "Views along the walk".
   - "Food" stays food's one name; Green's, Culture's and Views & oddities' muted lines stay as built.

## Consequences
- `tend explore audit 45` draws the two-line rows (`KindRow`, `components/atlas/KindStrip.tsx`) and the atlas journey
  reads a "Views & oddities" row with its "Suggest a walk" at 390 and 320; the deferred 320 px row leaves
  `docs/DEFERRED.md`.
- `tend captures audit 19` says a video's length on its card ("Video · 0:20", a captioned one "Busker · 0:02", none
  with no length); the words of 4 are `tend explore audit 46`.
- The Next after a last long clip is a later entry (`docs/DEFERRED.md`, replay).
- The builder's calls on food's one name, the plural nouns and the five muted lines are the owner's since this answer.
