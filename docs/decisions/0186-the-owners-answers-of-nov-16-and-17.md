# 0186. The owner's answers of Nov 16 and 17: Name it asks, the archaic Old Towns, the web's search pack on first search, Not now asks, the typed name after Back, a chevron, the browser's back as architecture; the accent at rest's two exceptions, a mic glyph, no walked hue yet

Date: 2026-11-17 · Status: accepted · Area: replay, presence, explore, web · Extends: 0172 (O17, typed words never go without asking; the neighbourhood read-past; "The accent at rest", its two named exceptions), 0165 (T21, "A quiet Back"; T22, "Show me swatches"), 0184 (place search) · From: the reviews of `tend chronicle 9`, `tend presence 1`, `/tend map` (Nov 16), `tend replay 15` and `/tend explore` (Nov 17, `tend explore 19`-`20`, `tend chronicle 11`-`12`); the search-pack run; T22's swatches

## Context
Between Nov 16 and 17 the owner answered twelve questions in person, each put to them by the loop's coordinator from a run's question or a
review's finding. The answers were acted on in the runs that asked (or, for the search pack, in a run still under
way), and quoted in the commits, `docs/DEFERRED.md` and `.claude/rules/`, but no decision recorded them together. They
are recorded here, verbatim, with what each answered and where it was built. These are the owner's own answers, not a
proxy's (0157), except the one line marked as the proxy's below.

## Decision

### Nov 16
- **Name it on the first replay: "Ask there too".** The question (the review of `tend chronicle 9`, the auditor's F5):
  since O17 (0172) Rename asks "Discard these edits?" before typed words go; leaving the first replay with words typed
  in Name it (Escape or Back twice, or Android's Back) still dropped them without asking. The answer: leaving the first
  replay with typed Name it words asks "Discard these edits?", as Rename does. Built in `tend replay 15` (`39b34ee5`).
- **The archaic spellings "Old Towne", "Olde Town", "Oldtown": "Add them in this run".** The question (the review of
  `tend presence 1`, the auditor's F6): the neighbourhood read-past (0172) read past "Old Town" but not its archaic and
  joined spellings. The answer: in the same run, "Old Towne", "Olde Town", "Olde Towne" and "Oldtown" read as "Old Town"
  in both readers (`presence/notable.ts`, `discovery/parkKind.ts`). Built in `tend presence audit 1` (`bdffe11e`).
  - **"Old Quarter's" keeps its museum**: the proxy's acceptance, Nov 16, under the owner's "Add them", of the cost the
    auditor named. After `normalizeWords` a possessive "Old Quarter's" cannot be told from "Old Quarters" (lodgings, a
    building), so a museum there keeps its History (the read errs toward keeping). Built with the same commit.
- **The web's search pack: "Fetch on first search".** The question (the review of `/tend map`, Nov 16, the auditor's
  F33, medium): the place-name pack (0184) is inlined in the web's one bundle, downloaded and parsed on every cold web
  launch, though search runs only when it opens. The answer: on the web only, the pack becomes its own file with a
  fixed name, fetched the first time search opens, from the app's own site (no host added, nothing leaves the device);
  a web exception listed in `docs/ARCHITECTURE.md`, with the stale-page trap (a fixed name survives deploys), and a
  post-export check that `index-*.js` holds no `geonames-cities5000`. Being built in a parallel run (the `[loop]` item
  "The place-name pack is downloaded and parsed on every cold web launch", Explore and discovery).

### Nov 17 (the review of `tend replay 15`, the `steward`)
- **Not now with typed words: "Ask there too".** Q1: the card's Not now left the first replay at once, words typed in
  Name it or not. The answer: with words typed, Not now asks "Discard these edits?"; with nothing typed it leaves at
  once. Built in `tend replay audit 15` (`722a9e4c`).
- **The card after Back: "Show the typed name".** Q2: after the name step's Back, the card's title showed the walk's
  stored title while the typed name waited unsaved. The answer: after Back, the card's title shows the typed name
  (unsaved) until Keep it or leaving. Built in `tend replay audit 16` (`dce289fe`).
- **The name step's Back: "Add the chevron".** S3: the name sheet's quiet "Back" (T21, 0165) read as a word, not a way
  back. The answer: a muted back chevron before "Back" (no new colour, no new words), with the spoken hint "Returns to
  the card, your words kept". Built in `tend replay audit 16` (`dce289fe`).
- **The browser's back on the web: "File it as architecture".** S4 (low): the browser's own back, or Safari's edge
  swipe, from the name step, the card or a re-watch's fog still leaves at once and drops the typed words; a guard needs
  a routing decision (a guard on leaving the route, or a pushed history entry); native is unaffected. The answer: an
  `[arch]` question, not a loop fix. Recorded as a note on the existing `[arch]` item "The browser's own Back on the
  name step" (`docs/DEFERRED.md`, Replay rhythm), in the record of `tend replay T21` (`28daf0a1`).

### Nov 17 (the search-pack run, T22's swatches, and the review of `/tend explore`, the `ux-reviewer`)
- **Place search on the web, offline before the first search: "Acceptable".** The question (the parallel run building
  "Fetch on first search" above): a page loaded online that goes offline before its first search cannot fetch the
  pack, so the search shows "Search is unavailable." with Try again; on a phone the pack stays bundled and search works
  offline. The answer: acceptable on the web. Built in that run.
- **T22, the walked colour: "Umber #5d4037", then "Let's re-imagine the palette".** The question: T22's swatches
  ("Show me swatches", 0165): three walked hues apart from the accent, olive `#5f6b12`, plum `#86198f` and umber
  `#5d4037`, each 3:1 or more on the map's ground, rendered on the replay's beat one and the walk's card from throwaway
  exports (none committed). The owner first picked umber; after the `ux-reviewer`'s second opinion (under beat one's
  trace umber loses its own colour, plum alone keeps it but sits beside the voice memo pin's purple) they answered
  "Let's re-imagine the palette". So no hue is chosen: umber is withdrawn, `COLORS.walked` stays as it is, T22 stays
  open in the inbox, and a rethink of the map's palette comes before any walked hue is built.
- **The selected tab's accent tint (the review's U6): "Keep the accent tint".** The question: the tab bar's selected
  tab (`tabBarActiveTintColor: theme.accent`) is a selection at rest in the accent, the case `tend explore 20` moved to
  ink on the map. The answer: it keeps the accent, a named exception to "The accent at rest" (below). Nothing built.
- **A memo card's play disc (the review's U2): "A mic glyph".** The question: a filled disc with a play triangle is the
  standard play button, but on a moment card the card is the one button and a tap opens the moment. The answer: a small
  ink mic with no disc, as a reaction's "Idea" is drawn on the same card, with "Voice memo, 0:42" beside it. Built in
  `tend chronicle audit 6`, replacing `tend chronicle 12`'s ink disc.
- **The area card's coloured status lines: "Leave them coloured".** The question: "You're here" (blue), "Walked once"
  (green) and a storefront's line (magenta) are colours at rest on the area card, which the rule's words "everything at
  rest is ink" could be read to cover. The answer: they are map-key colours that tie a line to its mark on the map, not
  the accent; the rule is about the accent. A named exception (below). Nothing built.

### The accent at rest: its two named exceptions
Decision 0172's rule ("The accent is kept for a card's single primary action, app-wide; everything at rest is ink")
holds everywhere but here, by the owner's answers above; a run does not cite 0172 to change either:
1. **The selected tab's tint** stays the accent: the platforms' convention for a tab bar.
2. **Colours that are a map's key** (a status line coloured as its mark on the map: "You're here", "Walked once", a
   storefront's line) stay coloured: they are not the accent.

### Spec wording
The loop may not edit a spec; the owner amends these, and the commits and rule lines above say what ships meanwhile.
- **QL22** (`specs/quality-of-life/spec.md` and the owner's quality-of-life doc): "Escape and Back cancel" for Rename.
  Since O17 (0172; `tend chronicle 9`, `tend chronicle audit 5`), with the title or the line changed, Escape, Back and a
  tap outside ask "Discard these edits?" (Discard, or Keep editing, which Enter and Done also choose); unchanged, they
  cancel at once. Proposed: "Escape and Back cancel; with the words changed they first ask 'Discard these edits?'".
- **The first replay's name step**: no spec under `specs/` names its Back, Escape or Not now (searched Nov 17), so
  nothing there pins the old behaviour; `.claude/rules/replay.md` holds the answers as built.
- **GZ9 and GZ10** (`specs/place-search/spec.md`, l.39-40): GZ9 says "The pack is bundled: no fetch of the data,
  ever", and GZ10 "It works offline: with the network down the field, the matching and the pick work". Since "Fetch on
  first search" and "Acceptable" (Nov 16, 17), on the web the pack is fetched from the app's own site the first time
  search opens (no host added, nothing typed leaves the device), and a page that goes offline before that first search
  shows "Search is unavailable." with Try again. Proposed for GZ9: "On a phone the pack is bundled; on the web it is
  fetched once from the app's own site when search first opens; nothing typed is ever sent." For GZ10: "On a phone it
  works offline; on the web it works offline once the pack has been fetched, and before that says 'Search is
  unavailable.' with Try again."

## Consequences
- Each answer above is built, being built, or needs nothing built; none but T22 waits in the inbox. The browser's back
  stays an `[arch]` item for the owner's routing call; T22 stays open until the palette is rethought.
- The accent at rest has two named exceptions (the section above); `.claude/rules/tabs-and-home.md` and
  `.claude/rules/explore-atlas.md` carry them.
- `.claude/rules/replay.md` ("The owner's answers of Nov 17") and `.claude/rules/presence.md` already carry the built
  behaviour; this record is where the answers stand together, quoted.
- QL22's, GZ9's and GZ10's wording wait on the owner (the section above).
