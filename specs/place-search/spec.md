<!-- Repo first: written from the owner's request in a session (Nov 16, 2026), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Place search: find a town or a city by name, from a gazetteer that lives on the phone

> Amends decision 0150 ("no search, a geocoder is a new host and typed text leaving the device"): this search has no host, so that reason no longer applies. It needs one new decision record (written at ship, with the owner's answers to the open calls in `plan.md`).

Nov 16, 2026 · @Miguel Guerrero

## Vision

Idea: Explore has no way to go to a town by its name; you scroll to it (Free look's Move map) or you are there. Search for a town or a city by name, against a public dataset of places bundled in the app, so nothing is geocoded off the phone (the owner, Nov 16). Two parts: the search, and the data behind it, a structured table of named places the search reads.
Verb: earn (it raises what you notice about a place you are not standing in: you can name it and be shown what is there, with no scrolling)
Touches: decision 0005 and Never, "Data leaving the device without a tap" (the typed text never leaves; the pack is bundled, no host, nothing fetched); 0150 (amended: "no search" held only while a search needed a geocoder); Never, "Ratings, reviews, ... rankings of places" (a gazetteer carries population, which is a ranking signal: it is left out of the shipped pack altogether, and results are ordered by nearness or by name, never by size); Never, "Tallies" and Always, "Counts are words" (no "12 results", no population, no count in any copy or announcement); Always, "Restraint in motion, colour and copy" (one quiet control, a plain field, a plain list); Always, "Moments and the trace are truth; areas are recomputed" (a search stores nothing: no history of what was looked for, no recents); decision 0150's look (a picked place is a look at that point, with its words and its way back, Locate).
Verdict: aligned if reshaped
Shape: As asked, with these changes. The shipped pack holds a name, its region and country, and a point; never a population or a rank, so nothing can order or show one. Results come nearest first from where the reader is (a fresh fix) or from the map's middle, else alphabetical by name then region; the list says nothing of "top" or "best". A search leaves nothing behind (no recents). Picking a result is a look at that place: the existing page "Around <name>", never saying where the reader is, with Locate as the way back. Search is on Explore, where the carousel is; Navigate's destination and the walk planner are not changed (the owner's call, Nov 16).
Criteria: GZ12, GZ13 (no population in the pack, no rank in the order); GZ9 (no host, nothing leaves); GZ16 (nothing stored); GZ6 (a look, not a place's score or card of facts).
Open: the calls in `plan.md` (where the data can be built from, alternate names such as Munich or Wien, the control's place).

## What it is

On Explore a magnifier opens a field. Typing the start of a town's name lists the matching towns and cities, each with its region and country; tapping one moves Explore there and lists the areas around it, as a look. The names come from GeoNames's `cities5000` (public data, CC BY 4.0) turned by a script into the app's own pack, bundled in the app and read on the phone: it works with no signal, and what you type goes nowhere.

## Decisions (the owner's calls, Nov 16)

- **GeoNames `cities5000`** (about 50,000 towns and cities worldwide), bundled in the app. Smaller villages are not in it; Move map still reaches them.
- **Bundled, not downloaded.** Works offline from the first launch; no host is added.
- **Explore's search field; a result moves Explore there.** Not Navigate's destination, not a search from every tab.

## Criteria

1. **GZ1** The owner's task, in their words: *search for a town or a city by name, without scrolling to it.* Someone who was not told where it is finds it from the screen they would look on: a magnifier button drawn on Explore's map in the title card's row, named "Search places" for a screen reader and by a tooltip on web, at least 44 pt. The cold find (`ux-reviewer`, pictures and the task only) places it.
2. **GZ2** The magnifier opens a search field over the map (a sheet at the top, the row and tabs left alone), focused, with a visible label ("Search towns and cities", not only a placeholder), a Clear control while it holds text, a font of at least 16 px on web, and a way out that is a control (a Close button) and also Escape on web and Back on Android.
3. **GZ3** Matching ignores case, diacritics and punctuation ("zurich" finds Zürich, "st louis" finds St. Louis and Saint Louis) and takes the start of the name or the start of any word in it ("york" finds New York). Words typed after the first may also start the region or country ("springfield il", "carlisle pa"), so two places with one name are told apart by typing more. Nothing is listed for an empty field; a single typed letter lists nothing but its prompt; from two letters the list answers on each keystroke.
4. **GZ4** The list is ordered by nearness to where the reader is (a fresh fix, `youFresh`) or, with none, to the middle of the map; with neither, alphabetical by name then region. The order's origin (fix, map middle, none) is an argument of the search: it is the live map's middle, never a remembered camera, so a search after a pick is not biased by the last one. It never orders by size and says nothing of an order. It lists at most a screen's worth, the nearest kept; when more match, the list ends with "Keep typing to narrow it." (no number), and every place stays reachable by typing more.
5. **GZ5** A result is one row, one control: the place's name and, under it, its region and country ("Carlisle · Pennsylvania, United States"), so two Springfields are told apart. No population, no distance (the order carries it), no rank, no count; a test fails on any distance text or digit.
6. **GZ6** Picking a result closes the search and looks at that place: Explore leaves a town's page and the card and the long press's choices, the map goes to the place and the page lists the areas around it as a look (`looked`, FL6), its title "Around <name>" and its subtitle the region, never saying where the reader is or is not (FL7); a screen reader hears it announced (the announcement spy, as FL13). The look's words are all named for the place: the title, subtitle, row label, announcement and the empty line ("No towns or neighborhoods are mapped around <name>."), none saying "middle of the map". A pick during an in-flight Look here read cancels that read first. Locate ends the look (FL8).
7. **GZ7** A picked place whose map data cannot be read (no signal, no town mapped there) says what the look's page says today (FL20, the reads' failure words) and keeps Locate and Move map on screen, with Move map named as the way on; the search itself never fails because of it.
8. **GZ8** No match says so in words ("No towns or cities start like that.") with a way on ("Smaller places are reached by Move map."), no count and no error look. A gazetteer that cannot be read says "Search is unavailable." (no apology) with a Try again button, and the rest of Explore is untouched.
9. **GZ9** Nothing leaves the phone: with the search open and typed in, the journey's request log shows no request that was not there before; the typed text is in no URL, header or body. The pack is bundled: no fetch of the data, ever. (Amends 0150's reason for "no search".)
10. **GZ10** It works offline: with the network down the field, the matching and the pick work, and only the look's own map reads report their failure (GZ7).
11. **GZ11** A keyboard and a screen reader can use it: the field and each result are named; arrow keys step the results on web, Enter picks the first or the stepped one; focus returns to the magnifier on close; the live region speaks only when the list changes between none and some, or while loading, never on each keystroke and never with a number ("Matches listed", "No matches").
12. **GZ12** The data is the app's own pack, built by a script from a dataset (`scripts/build-gazetteer.js`), read through one adapter (`GazetteerSource`) the way boundaries are: another dataset or a downloaded region is another pack. The pack's `id` names the dataset and its date; no dataset is hard-coded in `src/`. Alternate English names (Munich, Florence) are kept for every place that has them, up to three each, by no size test (decision record: the only size consideration is pack weight, a build limit).
13. **GZ13** The shipped pack holds, for each place, its name, its ASCII name, its region, its country and its point; no population, no rank, no feature class beyond "a town or a city". A test over the pack fails when a field outside that list appears.
14. **GZ14** Data credit: GeoNames, CC BY 4.0, is credited in words with the pack's date wherever the app credits its map data: the atlas card's credit line, the web map's attribution and the native credits path.
15. **GZ15** The pack is read the first time the search is opened and never at launch; while it reads, the field is usable and the list says "Getting ready…"; the cost is on the JS thread once and the matching after it answers in bounded work for 50,000 places (a generous time bound and a count of comparisons, never a tight timing).
16. **GZ16** A search stores nothing: no recents, no history, no row, no key. A search leaves no trace after Close but the look, if one was made.
17. **GZ17** Search is on Explore's own screen only, on the page near you, a town's page, a look, with no fix and no area yet, and at widths of 1000 px and more (the title card's row in each): not on Navigate, Chronicle or while the walk planner's page is open (the magnifier is absent, not inert). While Move map is on the magnifier still works and a pick leaves Move map as it found it.
18. **GZ18** The long names fit: a place name of 60 characters and a region of 40 never run under the Close button or off the row, at 390 px and 320 px, on one line each with the full name read by a screen reader.
19. **GZ19** The overlays never overlap in any combination of the search sheet, a town's page, an open card, a banner or notice, the long press's choices and Move map, at 390 px, 320 px and 1000 px, and the Busy names stay clear of the magnifier (`NAMES_CLEAR_OF`): the sheet covers the title card and the Layers button's column or sits clear of both.

## Out of scope

- Addresses, streets, neighborhoods, businesses and places under about 5,000 people (not in the data; Move map and the atlas's own neighborhoods cover what they cover).
- A destination for Navigate, a search from every tab, a result opening a card of facts (a pick only looks).
- Recents, favourites, a list of places searched (GZ16).
- A larger or downloaded gazetteer (cities1000, country packs): later, as another pack (GZ12).
- Names in other scripts and every language's alternates beyond what `plan.md` records (a call there).

## Record

<!-- Filled in as the slice is built. -->
