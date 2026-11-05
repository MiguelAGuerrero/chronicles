# Chronicles: what the app is and does

A synopsis for agents. Read this first to know the product; read `AGENTS.md`
for the decisions, rules and traps behind it, and the owner's "Explorer App
Concept" doc in Claude Docs for the spec itself. When this file and
`AGENTS.md` disagree, `AGENTS.md` is right and this file needs an update.

The identity the features answer to, what the app never does and how an idea fits, is `docs/VISION.md`
(decision 0094).

## In one paragraph

Chronicles is a companion for wandering towns and cities on foot. Before a
walk it suggests where to drift. During the walk it records the way, finds
the route when asked, and keeps whatever you notice (photos, videos, voice
memos, notes) where you noticed it. After the walk it gives the outing back
as a replay, and later shows you what you kept the next time you pass that
spot. It replaces juggling a trails app for the way, a camera and notes for
the moments, and a replay app for the souvenir. Everything stays on the
device: no accounts, no backend, nothing sent anywhere.

## Who it is for

People who explore a town with no plan and want to remember it: a new city, a
neighbourhood they are getting to know, an afternoon with nowhere to be.
Not hikers (no trails), not runners (no fitness tracking), not completionists
(nothing is a score).

## Principles that shape every feature

- **The interesting way, not only the fastest.** Walk me back is the one
  shortest route; everything else may detour for life and sights.
- **Follow the wind.** A route is a suggestion. Drifting off it is never
  nagged.
- **Nothing is a score.** No completion, streaks, coverage or leaderboards.
  Unwalked streets stay faint, a find is a memory, counts are said in words.
- **Capture is the hinge.** A photo, memo or note joins the way (Navigate) to
  the memory (Chronicle), and can find a place for Explore.
- **Restraint.** The replay has five beats in a fixed order, no confetti, and
  the lows stay in ("Passed Hessian Memorial without stopping").
- **Local only.** No server, no simulation, no fake data in the app.
- **Native first.** Built on the Expo modules the phone uses; the web build is
  a fallback with each exception listed in `AGENTS.md`.

## The three tabs

The app is three tabs in one loop: Explore before, Navigate during,
Chronicle after. The app opens on Explore. A walk screen opens over them while recording, and a
recording bar brings a minimized walk back.

### Explore (before)

- **An atlas of the areas near you** (decision 0066): neighborhoods, or towns
  through a Neighborhoods | Towns switch, as a grid of tiles nearest first,
  under a small map. The one you're in says "You're here": the town whose
  real border you are inside (town outlines: Overture's borders, decision
  0083), by its label point only where no border is known. The map draws
  it tinted and frames the whole town, the towns around in grey lines (town borders, decision 0088),
  as do a town's page, the walk screen (lines only), the replay and a day.
- Each tile is the same picture at the same scale: an 800 m ring around the
  area's point, with its streets, busy streets (magenta, graded faint to
  strong), parks, the streets
  you walked, a "?" for each kind still waiting and a check for each find. It
  also shows how far the area is, "New to you" or how often you walked there,
  and eight kinds (history, art, culture, green, views, food, shops,
  nightlife), each with 0 to 3 bars.
- The bars are presence, not quality. They are fixed steps per kind over the
  same ring everywhere, explained under "How the marks work". History, art,
  culture, green and views count only places worth finding (the ones that can
  turn up as a "?"), so a plain parish church counts toward nothing; food, shops
  and nightlife count every place. A ring with fewer than three mapped places
  says nothing about its kinds (atlas grading, decision 0084).
- Rings are read by themselves while the tab is open, nearest first.
- **A walk through a kind** (decision 0100, kind walk KW1-KW14): on an area's card, tapping a kind under "What's here" (Green,
  History, ...) opens it in place with one suggested walk through where that kind is concentrated (the same 400 m cells as
  the busy areas), moved onto streets. It says its length as a distance in the displayed unit, never a time, and whether it can
  be walked the whole way (a stretch built around cars is named; "not known" when nothing could be read). Settings: about how
  far (steps in km or miles, 2 km by default) and what to do about a stretch built around cars (say so, the default, or don't
  suggest it). "Start this walk" opens the walk screen ready; the walk says distance only and is otherwise ordinary. It names
  no place, so the "?" marks stay hidden until reached. Scenic routes (0095) are a separate feature on Go here; this walk skips their preview.
- **The small map moves in steps** (discrete navigation, decision 0092, an
  experiment): a swipe goes to the next area that way, never panning. It
  selects the next neighborhood (its ring, its name, its tile scrolled into
  view) without opening its card; on a town's page with none of its
  neighborhoods selected, it opens the next town's page. A swipe lands where
  it would have panned the map (a flick goes further) and picks the area
  nearest there, on that side; a tap on the map clears the selection; the arrow keys step on
  the web. Pinch, the wheel, the two-finger turn and the long press stay.
- A tile opens the area's card:
  - the eight kinds in words;
  - its busy streets;
  - what's waiting (kinds only, never names);
  - what you found;
  - the areas next door;
  - Walk to its busiest street.
- A long press on the small map still offers **What's good here?** and
  **Walk here**. There are no counts of places on this tab.
- **Busy streets are a density of places** (activity density, decision 0080):
  every kind of place counts (shops, food, services, attractions), from
  OpenStreetMap and Overture Maps Places, measured along each street and
  graded against the town itself, so a small town shows where its activity
  centres. Never foot traffic, and never a number.
- Explore's route preview and "Walk this way" are deferred: Walk here and
  "Walk to its busiest street" start at once.

### Navigate (during)

- Navigate opens the walk screen itself, **ready**: full screen with no tab bar, a
  map around you from one fix, and the walk's bottom strip reading 0:00 and no
  distance, with **Start** where Stop will be. One tap starts recording in place,
  with the saved settings and the destination if one is set: the clock starts and
  the strip becomes the walk's controls, and nothing else moves. A chevron at the
  top-left goes back to the tab you came from. With a walk open, Navigate opens
  that walk.
- The bar pulls up (a drag on it, or a tap) into the **walk settings**: quiet or
  Explore mode, the destination (a long press on the map), "What I'm into" and the
  "?" range (Explore only), reminders and alerts, distances. Start stays at its
  foot. A destination shows on the resting bar in one line ("To Your spot · 120 m
  away").
- The camera, mic and note are stacked at the right edge, above the bar, in the
  same place before and during a walk. Before Start they keep a moment with no
  walk open ("jot it down"), stored at once and placed when its one fix arrives;
  nothing tracks between moments.
- A Locate button sits above the stack (also on Explore): it reads one fresh
  fix, shows the dot there and frames 250 m around you. Nothing tracks after.

### The walk screen (during)

- The map follows a live dot, with the walked trace in green and rides (bus,
  train) dashed. The map stays north-up unless you turn it with two fingers (a compass then
  shows above the edge buttons and sets north again, decision 0082); a soft cone on the dot shows the way
  you are walking, read from the last 20 m of the trace (decision 0075). A green ring marks where the walk began; the replay adds an
  orange ring where it ended. Every map has a scale bar in its bottom-left
  corner. Pins mark captures, grouped by screen distance when zoomed
  out. A pin of one photo shows the photo itself, small and round. Faint
  pins with a clock badge show earlier walks' captures nearby (memories on
  revisit); a tap previews them.
- Capture buttons (camera, mic, pencil) are stacked at the right edge, above the strip. Photos and
  videos come from the system camera (video capped at 30 s), memos from the
  mic, notes from the pencil. Captions can be added to photos later.
- The bottom strip has time, distance, Pause, walk options and hold-to-stop.
  A status chip shows only when something is wrong (waiting for GPS, weak GPS,
  not recording) or on a ride. "Not recording" is a button: it says why, with
  Open Settings on a phone, and the walk picks recording back up when you
  return with location allowed.
- **Pause** stops recording; captures still work while paused. A reminder
  shows after 10 min paused, as a notification on a phone.
- **Navigation inside a walk**: a long press picks a spot (Go here); a pin's
  viewer has Go here; **Walk me back** appears once 50 m from the start and
  takes the shorter of the trace and the streets. A blue bar shows the
  distance and time left, the route is drawn ahead of you, and the trace hides while
  navigating. Off-route re-routes quietly; arrival says "You're here".
  Bridges and tunnels cross what lies under them without a turn onto it, and a
  route starts on the street you are walking along.
- **Scenic routes** (decision 0095): on Go here, or a destination set before
  Start, the app shows Direct beside up to three scenic routes, one per
  leaning switched on: **Through green** (parks, gardens, woods), **Past the
  sights** (places worth seeing, of the kinds in "What I'm into") and **Along
  busy streets**. Each is at most 30% longer. Every row gives its own
  distance in km or miles, and a scenic row what it passes ("Through green ·
  360 m · through India Point Park"): never a time or minutes compared, never
  naming a place not yet found. A tap highlights one on the map; Go starts it; off
  route it re-routes on the same leaning. Within 5 km; with nothing scenic,
  the direct way at once. Walk me back stays the shortest way.
- **Open in Maps** hands the destination to the phone's maps app (Apple Maps
  on iPhone, the Android chooser, Google Maps elsewhere) for walking
  directions, when Chronicles' route is wrong: in the blue bar, on a route
  that can't be found, beside Go here on the long-press
  card and in a pin's viewer. Navigation and the walk go on.
- **Explore mode** (off by default, the walk starts quiet): "?" marks within
  range (60-300 m), a chip when on a busy strip, an optional pocket alert
  (a double-tap once per place, on phones and browsers that can buzz), and a nudge when an area is a dead zone.
  A capture within 60 m of an unfound place finds it.
- **Remind me here**: flag a capture, and the next walk that passes within
  75 m of it shows its card, or a notification when the app is behind.
  Its pin wears a small bell on every map while the reminder is set.
- **Unwalked streets near me** bolds the fog of named streets within 1 km.
- **What happened here**: a long press on the map lists captures near that
  spot, from any walk.
- Walk options: the Explore switch, settings, motion permission, and
  **Share GPS log** (the raw readings, for diagnosing location problems).
  A finished walk's More (⋯) menu shares its log too.
- **Gaps in the trace** (the app closed, or the GPS lost for a minute or more)
  are read against the map: an obvious way fills in by itself as walked; any
  other walkable way is offered faint, the one whose length best fits the
  time at the walk's own pace, to keep or dismiss. A gap with nothing to offer
  is joined by grey dots. Every gap's card has **Draw my way**: tap along where
  you went and the line follows the paths between taps, on the walk screen or
  the replay.
- Standstills, GPS wander, rides and motion (step detection) are all read
  from the raw fixes at read time; nothing derived is stored as truth.

#### Map layers and walkability (before and during)

- **Layers.** One Layers button on the Explore map and the Navigate map opens a small panel of switches: Walkability, Busy streets and Town
  borders. Each draws something over the base map and shows its own legend while on. All three start off, so a fresh map is clear; the button is outlined, and its glyph
  and a firmer edge say a layer is on. One setting for every map, kept across launches.
- **Walkability** tints the map a light blue where the ground is easy on foot (streets close together, crossings, places along them) and a darker slate where it is
  built around cars (streets far apart and busy), and nothing in between. It is judged from how the ground is built, so a walkable grid with its
  sidewalks unmapped still reads walkable; a missing sidewalk never lowers a reading. It comes from Overture's transportation tiles, with
  OpenStreetMap through Overpass when those can't be read, kept on the device. No number, share or rank is shown anywhere.
- **Busy streets** is the graded magenta shading of streets with many places along them, now on request on any walk. Turning it on where nothing is
  remembered reads the area once.
- An open area card (a neighborhood or a town) has an "On foot" line in words that say what the ground is ("Streets close together, with crossings",
  "Streets far apart and busy", or both side by side), read when the card opens; it says nothing where neither stands out.
- While navigating, with the Walkability layer on, a quiet line says "Next: a stretch built around cars on <street>" before a fast road, or "Next: an area built around cars"
  as the route enters one, 200 m ahead, once, with no sound; it never changes the route.

### Chronicle (after)

- **Chronicle opens on Memories** (decision 0098): a control at the top chooses
  **Memories | Walks | Days | Map**, and leaving for another tab puts it back on
  Memories. Memories is the feed:
  - **A resurfaced moment** at the top, different on each open, in the user's own
    words, with a label that says why ("A year ago today", "Last October", "You
    keep coming back to the water"). **Relive it** opens the replay of its walk
    (or its day); **Another** steps to the next. Nothing from the last day is
    resurfaced; it is in Lately.
  - **Threads**: things the user keeps coming back to, found in the words of
    notes and photo captions (a word in three moments on two days). A tile shows
    the user's own word and a line in words ("Just beginning", "Often, lately",
    "Comes back every October"). A thread's page shows two of the user's own
    sentences and its moments; **Rename** and **Not a thread** change only the
    thread. No rank or count is shown.
  - **Lately**: every moment, newest first, a thread's moments leading within a
    week; a card opens the moment and a small line opens the walk's replay.
  - **Show less like this** and **Not this one** (on the ... of the top card and
    of every card) change what is brought back, never what is kept; both have Undo.
  - Memos show here but join threads only once they have a transcript (not yet).
- **Walks, Days and Map** are what Chronicle was before: the walks list, the days
  list with Replay this day, and the map with its stars. The map is mounted only
  there.
- The home map shows stars where walks were, at the level for the zoom
  (neighbourhoods, towns, states, countries; a walk's towns are the borders
  it crossed, by town outlines, drawn as tinted regions behind the stars from
  zoom 8, all alike). A merged star zooms in; a single
  star is selected and its walks listed. Placed loose moments are pins from
  z11.
- A bottom sheet with three heights peeks with **Walks | Days**:
  - **Walks**: a list of walks (date, distance, time, captures) under a
    header per month, or a place's walks. A row's More menu renames the walk
    (its title and one line), or deletes it or just its media.
  - **Days**: local midnight to midnight, each with its walks and loose
    moments as a timeline, and **Replay this day**.
- A star's sheet offers **Walk here**. With no walk finished, the peek shows
  an empty line and a Navigate button.
- **The replay** (the make-or-break): reading the streets, the fog clearing,
  the path, the card, then naming. The path has a rhythm (decision 0085): it
  glides into each moment and away, zips through long empty stretches with
  the camera pulled back, and cuts across a gap with "20 min later". A clock
  rolls through the time of day. Notes and memos stack as speech bubbles in a
  corner; photos and videos grow from their pin into a card and tuck into a
  pile, which opens them full screen; places passed without stopping whisper
  by. Nothing waits for a tap: a tap (or Hold) holds it, Skip goes to the card;
  about a minute at most, memos and videos always in full (a soft skeleton
  stands in while one loads), and the screen stays awake while it plays. With a screen
  reader, the moments one at a time instead. The card says distance, time,
  captures, new streets in words ("your first time down Elm Street"), finds by
  name, and the low ("Passed ... without stopping"). **Name it** sets the
  title and an epilogue; **Not now** leaves it unnamed, and the card's More
  menu can rename it later. Every way out of the first replay ends on Chronicle.
  The replay is one ceremony, a view of the walk's story (decision 0086):
  another could be swapped in.
- **The day's replay** tells the day the same way: from moment to moment and
  walk to walk, each walk's own path, "3 h later" between them.
- **The capture viewer** opens from any pin: full-screen photos and videos
  over a thin strip of details, cards for notes and memos. Its More menu
  saves a keeper to the photo library (every edit and the caption baked in), edits a note's
  words, or deletes the moment. Remind me here lives here too.
- **Editing a photo or video** (Media editing, ME1-ME23): one Edit screen, from the
  viewer or from the Edit pill shown for 6 s after every photo or video. Crop with
  Free, Square, 4:5 and 16:9, and Rotate; nine filters a phone's photo app has
  (Original, Vivid, Warm, Cool, Dramatic, Fade, Mono, Noir, Sepia; photos only);
  drawing like the iPhone's Markup (Pen, Marker, Eraser, three thicknesses, six
  swatches, Undo, Redo); a text bar; a trim for videos. The file is never changed:
  edits are kept with the moment and can be changed or reverted later. Saving out
  renders everything into one photo or video.
- **Deletes** (a walk, a walk's media, one moment) hide at once with a 5 s
  Undo, then run as if it never happened.

## Settings and notifications

- Explore settings (in the drawers: the ready bar's and the walk's, no panel of their own): "What I'm into" (8 kinds), the
  "?" range with a ring preview on the map, the pocket alert (phones, and browsers that can
  buzz: Android Chrome, maybe iPhone Safari).
- Notifications: Remind me here and Pause reminder, each switchable, plus a
  test. Permission is asked only from a tap (first pause, a reminder saved, a
  switch turned on), never at launch. On the web, notifications come from a
  service worker and only work while the page is alive.
- Scenic routes: three switches in the walk settings (Green, Sights, Streets
  with life), all on by default; all off, Go here goes the direct way.
- Distances show in km or miles: a "Distances" choice in the walk settings (the ready bar pulled up),
  defaulting from the device's region. It reaches every distance the app shows,
  the scale bar included.
- There is no Settings screen, no dark mode (light forced), and no account.

## Platforms

- **Phone (iOS, Android)**: the full app. Background location keeps recording
  with the screen off; memos record with the phone locked. Needs a development
  build (MapLibre and background location are native modules; Expo Go won't
  do). **Native has never run on a device**: every native path is unverified,
  and reports touching it must say so.
- **Web**: the same loop with a browser's limits, deployed to GitHub Pages on
  every push to `main`. It traces the real browser location while the page is
  open and visible, holds a wake lock, and shows the gap when the page was
  hidden. iOS Safari suspends a hidden page, so a pocketed iPhone records
  nothing on web.
- Map data is OpenStreetMap via OpenFreeMap, with signal assumed (no offline
  maps). Streets, places and attractions are derived on the device from the
  vector tiles. Busy streets also read Overture Maps Places by tile, for the
  shops OpenStreetMap is missing (decision 0080).

## Status at a glance

| Area | State |
|---|---|
| v0: record, capture, stop, replay, storage | Shipped |
| v0.5: places (stars by area), navigate (walk me back, go here) | Shipped, audited |
| v1: discovery (Explore mode, "?" marks, finds, Remind me here, notifications) | Shipped, audited |
| Reminder bell (a pin with a reminder wears a bell) | Shipped, audited (web verified by the e2e; native unverified) |
| v1.5: landing (busy areas on the Explore tab, strip chip, dead-zone nudge) | Shipped |
| Explore atlas (the tab as a grid of area tiles, presence bars, familiarity) | Shipped, audited (web verified by the e2e; native unverified) |
| Discrete navigation (Explore's map steps from area to area, DN1-DN13) | Shipped, audited, an experiment (web verified by the e2e; native unverified) |
| Town presence (a town graded across its whole outline, with its busy areas listed) | Built (web verified by the e2e; native unverified) |
| Resurfaced moments (Chronicle opens on Memories: a moment brought back, threads from the user's words, Lately) | Built (web verified by the e2e `resurface`; native unverified) |
| Moments and days, memories on revisit, thumbnails | Shipped, audited |
| Rides, clearing walks and moments, motion polish | Shipped, audited |
| Navigation and tabs (three-tab layout, recording bar) | Shipped, two audit batches done |
| Navigate, ready (Navigate is the walk screen, ready; the capture stack; the bar pulls up to the settings) | Shipped on web (native unverified) |
| Quality of life: start and end markers, scale bar, Locate on Navigate and Explore | Shipped (web verified by the qol e2e; native unverified) |
| Quality of life round 2: km or miles, time left while navigating, the "Not recording" chip with Open Settings and a retry on return | Shipped (web verified by the qol e2e; native unverified) |
| Quality of life round 3: rename a walk later, edit a note, photos on their pins, months in the walks list | Shipped (web verified by the qol e2e; native unverified) |
| Bridges and Open in Maps | Shipped on web, audited (native unverified) |
| Scenic routes (Go here offers Direct and one route per leaning: green, sights, streets with life) | Shipped on web (native unverified) |
| Explore's route preview, "Walk this way" | Deferred |
| Media editing: crop, rotate, filters, drawing, text, video trim, all saved out | Shipped on web (native unverified; the video module never compiled) |
| Backup and export of a walk | Code exists, no UI, deferred |
| Quick capture outside the app (widget, lock screen, share sheet) | Deferred |
| Remind me here outside a walk | Deferred (needs background location) |

## Out of scope

Trails and nature navigation, offline maps and routing, automatic 3D or video
replays, completion and leaderboards, fitness tracking, accounts and sync,
address search (needs a geocoding server).

## Open questions (the owner's, in the spec)

- Two things are named Explore: the tab and the walk's mode.
- Whether the replay keeps its "Passed ..." low (now in words).
- What the Explore tab lists in a city, where a trails app lists trails (answered by the atlas, decision 0066).

## Where things live

- Spec: the "Explorer App Concept" doc in Claude Docs, one tab per version.
- Decisions and traps: `AGENTS.md`.
- Screens: `src/app/` (tabs, `walk.tsx`, `replay/[id].tsx`, `day/[key].tsx`).
- Pure logic with unit tests: `src/lib/` and `src/lib/__tests__/<feature>/` (the
  features are listed in `scripts/features.js`).
- End to end: `scripts/e2e-web.js` and one file per journey under `scripts/e2e/journeys/` (a headless walk with mocked GPS and fake
  streets).
