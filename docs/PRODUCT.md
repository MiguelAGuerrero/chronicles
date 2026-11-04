# Chronicles: what the app is and does

A synopsis for agents. Read this first to know the product; read `AGENTS.md`
for the decisions, rules and traps behind it, and the owner's "Explorer App
Concept" doc in Claude Docs for the spec itself. When this file and
`AGENTS.md` disagree, `AGENTS.md` is right and this file needs an update.

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
  under a small map. The one you're in says "You're here".
- Each tile is the same picture at the same scale: an 800 m ring around the
  area's point, with its streets, busy streets (magenta), parks, the streets
  you walked, a "?" for each kind still waiting and a check for each find. It
  also shows how far the area is, "New to you" or how often you walked there,
  and eight kinds (history, art, culture, green, views, food, shops,
  nightlife), each with 0 to 3 bars.
- The bars are presence, not quality. They are fixed steps per kind over the
  same ring everywhere, explained under "How bars count".
- Rings are read by themselves while the tab is open, nearest first.
- A tile opens the area's card:
  - the eight kinds in words;
  - its busy streets;
  - what's waiting (kinds only, never names);
  - what you found;
  - the areas next door;
  - Walk to its busiest street.
- A long press on the small map still offers **What's good here?** and
  **Walk here**. There are no counts of places on this tab.
- Suggested routes (a route with detours shaped by preferences, a route
  preview, "Walk this way") are deferred to their own slice.

### Navigate (during)

- A drawer whose foot is **Start walk**: one tap starts recording where you
  are, with the saved settings and the destination if one is set. Under Start,
  a summary line ("Quiet", "Explore · Your spot · 120 m away") opens a **walk
  settings dialog** (as does a pull on the grip): quiet or Explore mode, the
  destination (a long press on the map, set with the dialog closed), "What I'm
  into" and the "?" range (Explore only), reminders and alerts, all in one
  scroll with its own Start walk.
- A capture row (camera, mic, pencil) sits above the drawer, so a moment can
  be kept with no walk open ("jot it down"). Such a loose moment is stored at
  once and placed when its one fix arrives; nothing tracks between moments.
- With a walk minimized, Navigate is a live view of it: trace, dot, captures,
  destination and the capture row, with the recording bar as the way back.
- A Locate button at the map's right edge (also on Explore) reads one fresh
  fix, shows the dot there and frames 250 m around you. Nothing tracks after.

### The walk screen (during)

- The map follows a live dot, with the walked trace in green and rides (bus,
  train) dashed. A green ring marks where the walk began; the replay adds an
  orange ring where it ended. Every map has a scale bar in its bottom-left
  corner. Pins mark captures, grouped by screen distance when zoomed
  out. A pin of one photo shows the photo itself, small and round. Faint
  pins with a clock badge show earlier walks' captures nearby (memories on
  revisit); a tap previews them.
- Capture buttons (camera, mic, pencil) float in the lower middle. Photos and
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
- **Open in Maps** hands the destination to the phone's maps app (Apple Maps
  on iPhone, the Android chooser, Google Maps elsewhere) for walking
  directions, when Chronicles' route is wrong: in the blue bar, on a route
  that can't be found, beside Go here on the long-press
  card and in a pin's viewer. Navigation and the walk go on.
- **Explore mode** (off by default, the walk starts quiet): "?" marks within
  range (60-300 m), a chip when on a busy strip, an optional pocket alert
  (a light haptic once per place), and a nudge when an area is a dead zone.
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

### Chronicle (after)

- The home map shows stars where walks were, at the level for the zoom
  (neighbourhoods, towns, states, countries). A merged star zooms in; a single
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
  the path running in a fixed 30 s with a stop at every capture, the card,
  then naming. Photos stay up, memos and videos play to the end. The first
  replay waits for Continue at each stop; re-watches advance by themselves.
  The card says distance, time, captures, new streets in words ("your first
  time down Elm Street"), finds by name, and the low ("Passed ... without
  stopping"). **Name it** sets the title and an epilogue; **Not now** leaves
  it unnamed, and the card's More menu can rename it later. Every way out of the first replay ends on Chronicle.
- **The day's replay** flies pin to pin through a day's loose moments and
  plays each walk's own path.
- **The capture viewer** opens from any pin: full-screen photos and videos
  over a thin strip of details, cards for notes and memos. Its More menu
  saves a keeper to the photo library (captions baked in), edits a note's
  words, or deletes the moment. A caption editor and Remind me here live here too.
- **Deletes** (a walk, a walk's media, one moment) hide at once with a 5 s
  Undo, then run as if it never happened.

## Settings and notifications

- Explore settings (a panel, not a screen): "What I'm into" (8 kinds), the
  "?" range with a ring preview on the map, the pocket alert (phone only).
- Notifications: Remind me here and Pause reminder, each switchable, plus a
  test. Permission is asked only from a tap (first pause, a reminder saved, a
  switch turned on), never at launch. On the web, notifications come from a
  service worker and only work while the page is alive.
- Distances show in km or miles: a "Distances" choice in the Start dialog,
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
  vector tiles.

## Status at a glance

| Area | State |
|---|---|
| v0: record, capture, stop, replay, storage | Shipped |
| v0.5: places (stars by area), navigate (walk me back, go here) | Shipped, audited |
| v1: discovery (Explore mode, "?" marks, finds, Remind me here, notifications) | Shipped, audited |
| Reminder bell (a pin with a reminder wears a bell) | Shipped, audited (web verified by the e2e; native unverified) |
| v1.5: landing (busy areas on the Explore tab, strip chip, dead-zone nudge) | Shipped |
| Explore atlas (the tab as a grid of area tiles, presence bars, familiarity) | Shipped, audited (web verified by the e2e; native unverified) |
| Moments and days, memories on revisit, thumbnails | Shipped, audited |
| Rides, clearing walks and moments, motion polish | Shipped, audited |
| Navigation and tabs (three-tab layout, docked drawer, recording bar) | Shipped, two audit batches done |
| Quality of life: start and end markers, scale bar, Locate on Navigate and Explore | Shipped (web verified by the qol e2e; native unverified) |
| Quality of life round 2: km or miles, time left while navigating, the "Not recording" chip with Open Settings and a retry on return | Shipped (web verified by the qol e2e; native unverified) |
| Quality of life round 3: rename a walk later, edit a note, photos on their pins, months in the walks list | Shipped (web verified by the qol e2e; native unverified) |
| Bridges and Open in Maps | Shipped on web, audited (native unverified) |
| Suggested routes (interesting ways, route preview, "Walk this way") | Deferred, next slice |
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
- Pure logic with unit tests: `src/lib/` and `src/lib/__tests__/`.
- End to end: `scripts/e2e-web.js` (a headless walk with mocked GPS and fake
  streets).
