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
Chronicle after. The bar reads Chronicle, Explore, Navigate, and the app opens on Chronicle's
Memories, whose band keeps a moment in one tap (decision 0112). A walk screen opens over them while
recording, and a recording bar brings a minimized walk back.

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
- A place may light two bars (presence and kinds, decision 0127): a museum or
  gallery lights History as well as Culture when the data already says it is
  historic (a listed museum in the places archive, or a historic word in its
  name), so the Coplay Cement Company Kilns light Coplay's History. A plain
  museum lights Culture alone, so the two bars never say the same thing.
- Rings are read by themselves while the tab is open, nearest first.
- **Whole towns** (decision 0132): a town's page lists every neighborhood inside its border, wherever you stand, nearest
  you first: the hamlets inside it too (Hanover Acres in Allentown), never a ward ("1st Ward"). A town with no border
  keeps its 5 km reach and 24 nearest. On the map, a town at its own scale shows every findable place as a small dot in
  its kind's colour, found or not; a neighborhood (or the town zoomed in) shows the places still to find: a "?" where it
  has room and a dot where it would crowd; a tap on a dot, or on a "?" with places under it, zooms in. Found places
  leave the "?" view (presence, not completion); the card still names them. Walks are placed in hamlets inside a town.
- **A walk planner for a kind** (decision 0102, walk planner WP1-WP27): on an area's card, a kind that has something under "What's here"
  (Green, History, ...) has a "Suggest a walk" button, which opens a page of its own over Explore. It plans up to three routes from where
  you are, drawn on the map and listed as rows: through the middle of where the kind is, across the area, and around the edge. The first is selected when the page opens, as in Apple or Google Maps. Each says
  only its own distance in the displayed unit, how much of the kind it passes and where ("plenty along much of the way", "mostly near the
  end"), how much of it is only getting there, which other kinds it also passes (by kind, never by place), and whether it can be walked the whole way; a strip along each row and a shading of the
  highlighted route show the same without a number. A route leans on the places you pass (monuments, buildings,
  churches, art, views) when there are enough of them to make one; museums and theatres, which you go into, still count
  toward how much of the kind it passes (decision 0127). It never shows or names a place not yet found, so the "?" marks stay hidden until
  reached; only places you have already found may be pinned. The settings are on the page: a loop (the default, back where you start)
  or a one way, a distance as a hard ceiling (2 km by default; where the kind fills less ground the route is shorter, and the page
  says so), how much of the kind a route must pass, and what to do about a stretch built around cars. "Suggest different routes"
  replaces the three and keeps no history. Start plans again from where you are and either routes the walk you have open (capture is
  on the page meanwhile) or starts one ready; it says distance only, never a time left. Scenic routes (0095) are a separate feature on
  Go here.
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

- **Places worth the stop** (decision 0103): curiosities (follies, roadside
  oddities, natural oddities, covered bridges and lighthouses, places that
  mark a fact, ruins) and National Historic Landmarks join the map's own
  places as marks, from a weekly archive built from Wikidata. Curiosities are
  a kind of "Viewpoints & oddities" in What I'm into, on by default. Nothing
  is ranked or counted; a place shows only while its sources say it exists.
  Live since Nov 10, when its address was set (PW16). Since
  Nov 9 the archive comes from the places pipeline in chronicles-data
  (decision 0108): any open source can join through an adapter, a community
  source may only suggest a place for the owner's review, and an area is
  rebuilt only when its own places change. The app keeps to the contract that
  repo publishes.
- **Remarkable and public** (decisions 0109-0111): attractions in the map
  stay places to find, and the National Aviary joins them. A new kind,
  "Buildings and structures", on by default, holds the archive's listed
  buildings and structures. "Community spaces" (decision 0127), on by default
  unless Museums and galleries was switched off, holds arts centres, libraries
  and community centres whose names say they are historic. "Community parks" (decision 0143), on by default, is a
  subset of Parks the reader can switch off: a park whose name says playground, playfield, tot lot, ball field or courts,
  with nothing notable in or near it (a place to find inside it, a notable word in the name, a large outline, an archive
  place near). Every other park stays; nothing says what a park holds. A place to find with no street or path within 60 m
  says "No street or path close by" on its card; nothing is hidden for it. The
  replay whispers one or two passed places by name, more as "a few places". A
  place in both the map and the archive, of the same name and kind within
  200 m, is one place. The rule that takes a National Register listing when the
  place is public (its type, a sign it is open, or a Landmark) is built and
  moves to chronicles-data's pipeline. `npm run places:coverage` measures what
  the app keeps of a town's destinations, for the owner.
- **Complexes** (CX1-CX16, decision 0147). A named place made of other places (Strawberry Square,
  the Lehigh Valley Mall; a market, a campus, a station, a civic centre) is a subdivision of the area
  you are in. The area's card lists the nearest few by name with their kind as a word ("Shopping",
  "Market", "Campus", "Station", "Civic") and Walk to, and a "See more" lists the rest, with no number,
  no line about what a complex holds, no size or ranking; the selected area's complexes are quiet
  outlines on the map, named only at close zoom. A moment taken inside one leads its arrival line with
  it and keeps its street ("Strawberry Square, N 2nd St, Harrisburg"), from complexes already on the
  phone: viewing a moment fetches nothing. Information only: never a mark, a find or a place a walk is
  assigned to. A complex is a named building from Overture that holds enough places, or a market, a
  station, a campus or a civic building by its type; five switches, beside What I'm into, hide a kind
  from the card and the map. Built on web, native unverified.

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
- **A moment can hold several media** (moment stacks, decision 0123). After a capture, an "Add to this
  moment" pill left of the stack offers the camera, the mic and a note, one tap each: what it keeps joins
  the moment just made, with its own time, at the moment's one place (no new fix). It goes after two minutes
  with no capture, after 100 m walked from the moment's first capture, on Not now, on leaving the screen,
  opening another moment, or starting or stopping a walk. The stack's own buttons always make a new moment.
  A stacked moment shows once everywhere, by its first photo or video, with a small two-card mark; its
  viewer steps through what it holds (Previous and Next in this moment, the arrow keys, a swipe), never
  saying how many; More offers Delete this photo (one) or Delete this moment (all). Separate moments are
  grouped by a thread, never merged. More also offers Split this photo out (never the moment's first): it shows at
  once as its own moment, placed on the walk's trace at its own time (off a walk, at the moment's place), and is
  kept once its Undo has passed. Walk settings offer **Group captures into one moment**, off by default: with it on,
  the stack's own buttons add to the open moment, and "Adding to this moment · New moment" shows where the pill was.
  In the replay a stacked moment is one beat: its photos and videos come up together as a grid (up to 3×3, scrolling
  past nine, videos muted), its memos and notes as bubbles beside it.
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
- **A note is a page** (note pages, decision 0149), in Apple Journal's manner: the pencil opens it full screen in
  one tap, headed by the day in large type and a line of when, where and which walk (the short form stays in the
  top bar once that scrolls away). Headings, lists, checklists, quotes, bold and italic come from typing (`# `,
  `- `, `[ ] `, `1. `, `> `, `**`) or from **Aa** above the keyboard; **@** mentions a moment, and the camera there
  keeps a photo as its own moment and mentions it where the cursor was. What is written is kept as it is written,
  with no Save; Back and Done both keep it, a page left empty keeps nothing, and a note emptied and left goes with
  Undo. A note holds up to 20,000 characters; near the end the page says "Room for a few more lines". Checklists are
  never counted. Everywhere else a page reads as its words; a note written before pages reads as it was typed.
- When room for new photos and videos runs low, one line says so in words beside the capture buttons, once
  for each level (low under 500 MB, very low under 100 MB), with OK to dismiss; it never blocks a capture and
  never shows a number. A photo or video whose save fails is held with Retry ("Photo not saved"), and says why
  in words. On the web the app asks the browser once to keep its data, never mid-walk, and says once on
  Navigate, ready if it was refused. There is no Storage screen (0041). Storage awareness, decision 0107.
- The bottom strip has time, distance, Pause, walk options and hold-to-stop.
  A status chip shows only when something is wrong (waiting for GPS, weak GPS,
  not recording) or on a ride. "Not recording" is a button: it says why, with
  Open Settings on a phone, and the walk picks recording back up when you
  return with location allowed.
- **Pause** stops recording; captures still work while paused. A reminder
  shows after 10 min paused, as a notification on a phone.
- **Navigation inside a walk**: a long press picks a spot (Go here); a pin's
  viewer has Go here; **Walk me back** appears once 50 m from where it leads and
  takes the shorter of the trace and the streets. It leads to the walk's start,
  or, after a ride (a drive, a bus), to where the last ride ended; "Walk back
  here" on the long press's card sets the spot by hand for the walk (decision 0121). A blue bar shows the
  distance and time left, the route is drawn ahead of you, and the trace hides while
  navigating. Off-route re-routes quietly; arrival says "You're here".
  Bridges and tunnels cross what lies under them without a turn onto it, and a
  route starts on the street you are walking along.
- **Drive there first** (decision 0121): on Explore's area card, Walk to a
  place within 2 km starts the walk at once; past 2 km (or with no fresh
  position) it asks **Walk now** or **When I get there**, and past 10 km offers
  When I get there alone. When I get there keeps the place as Navigate's
  destination and starts nothing: the walk starts only when you tap Start,
  never because you arrived.
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
  **Memories | Walks | Days | Map | Media**, and leaving for another tab puts it back on
  Memories. The bar always names what is shown: the sheet's own Walks | Days and Map
  (and a drag, or a long press's Walk here) move it too, and one map stays up across
  Walks, Days and Map (SB1-SB5, decision 0136). The app opens here (decision 0112). Memories is the feed:
  - **The band** at its foot: camera, mic and note, one tap each, in plain ink,
    fixed while the feed scrolls and first for a screen reader. A moment kept there
    heads Lately at once and is placed by its one fix ("Note kept here"); with a walk
    minimized it goes to the walk ("Note saved to your walk"), and the recording bar
    shows no camera on Memories. With nothing kept, Memories is one line and the band.
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
  - **Lately**: every moment, strictly newest first; a card opens the moment and a
    small line opens the walk's replay. Each moment arrives with its place (the
    street and the walk's town), the time of day, how far into the walk it was and,
    when the capture before it was close, "just after a photo" (decision 0098).
  - **A menu on the header** opens **Hidden** (what you hid, set to fewer, removed
    or softened, each to bring back), the switch **Bring moments back**, and
    **Forget my choices**.
  - **Show less like this** and **Not this one** (on the ... of the top card and
    of every card) change what is brought back, never what is kept; both have Undo.
  - Memos show here but join threads only once they have a transcript (not yet).
- **Media** (decision 0139), Chronicle's fifth section: every photo, video and voice memo piece kept, in an
  edge-to-edge grid of square tiles with hairline gaps, newest on top, as a photo gallery. A tile is bare (a photo's
  small copy; a video's or memo's glyph and its length) and the context is the header of its day, pinned while its
  tiles scroll: the day ("Yesterday", "Tue, Nov 3", the year when not this one) and where ("A morning walk in Alfama",
  a walk's own title, "Not on a walk, on Hope Street"). Years, Months and Days on the gallery's bar; a month or year
  is its first photo large and its places in words, and a tap goes one level in. The View menu holds Sort (Newest or
  Oldest First), Show (All Items, Photos, Videos, Memos; "Videos only" on the bar), Zoom In and Out (three, five or
  seven across; a pinch does the same) and Square or Aspect Ratio Grid; sort, size and shape are kept. A tile opens
  its moment whole in the viewer at that piece, with its place and walk, and the viewer steps through the gallery's
  moments in its order, with no "i of n". Nothing counts; notes have no tile. With nothing kept, one line.
- **A note mentions moments** (decision 0125): typing @ on a note's page (or its @ button) picks
  another moment; the viewer draws it as a card of that moment (its picture or kind, date, place and walk) that
  opens it, with Back to the note; elsewhere it reads as words. The moment mentioned says "Mentioned in a note",
  and its More opens the note. A mention touches no thread.
- **A moment's responses** (decision 0131): a moment that has been answered says so at the end of its viewer's
  info line, in words ("a couple of responses"), and More has **Responses**; either, or a swipe up as in iOS
  Photos, opens a sheet over the viewer. It reads like a conversation: the moment first, then every response
  oldest first, each with its date and time, its place (or "No place kept"), its walk ("not on a walk") and its
  content, a response to a response saying which it answers. A tap opens a response alone, with Back to the
  sheet; Respond, under the sheet, answers the sheet's moment, and the new response arrives at the end. No count,
  no unread mark, no bubble.
- **Threads the owner makes** (decisions 0104, 0105): moments the owner connected, beside the
  Chronicle's threads above it; both are "threads", told apart by an icon (a link for
  the owner's, a repeat arrow for the Chronicle's), spoken as "connected by you" and "found for you". From a moment's menu, **Add to a thread** names a
  thread or makes a new one with a second kept moment; **Respond**, in the viewer's toolbar under the moment
  (a menu: photo or video, voice memo, note), keeps a new moment linked to the one it
  answers, in its thread. A thread reads oldest first, a reply under what it
  answers, like a conversation: a note is read in place, in a bubble with its time and
  walk (its More opens it full screen, to respond or edit), while a photo, video or memo keeps its card; its size is a phrase ("a few moments, since March"), its name is the
  owner's and optional. **Remove from this thread** and **Delete this thread**
  (with Undo) never delete a moment; a thread left with fewer than two moments
  dissolves. **Keep as my thread** copies a Chronicle thread. The viewer says "In a
  thread" and names it only from the thread itself.
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
  an empty line and a Navigate button; with a walk open, "This walk is starred
  here when it ends" and no button, the recording bar's › being the way back
  (decision 0148).
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
- **Deletes** (a walk, a walk's media, one moment, a thread) hide at once with an
  Undo that waits until you tap Undo or Close or delete something else, then run
  as if it never happened. A moment or a thread goes with no question first; a
  walk and a walk's photos, videos and memos still ask and say what goes. A delete
  waiting when the app is killed is completed at the next launch (decision 0113).
- **The moment viewer** steps aside: a tap on a photo hides its bars. Its top bar
  is Close and More (Remind me here and Go here are in More), and what you just
  did to a moment (a reply kept, added to a thread, a reminder set) is said in its
  info line rather than in a pill.

## Settings and notifications

- Explore settings (in the drawers: the ready bar's and the walk's, no panel of their own): "What I'm into" (8 kinds), the
  "?" range with a ring preview on the map, the pocket alert (phones, and browsers that can
  buzz: Android Chrome; not iPhone Safari, decision 0138).
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
| Complexes (a named place made of other places on Explore's card and map and in a moment's line, CX1-CX16) | Built; web verified by the e2e `complexes`; native unverified |
| Reminder bell (a pin with a reminder wears a bell) | Shipped, audited (web verified by the e2e; native unverified) |
| v1.5: landing (busy areas on the Explore tab, strip chip, dead-zone nudge) | Shipped |
| Presence (what a place is, classified once and read by the map's density, the marks, the bars, scenic greens and the planner alike, the places archive included; memorials and nature reserves join the notable classes) | Shipped (both slices: PR1-PR8, PS1-PS11) |
| Explore atlas (the tab as a grid of area tiles, presence bars, familiarity) | Shipped, audited (web verified by the e2e; native unverified) |
| Discrete navigation (Explore's map never pans by one finger, DN1, DN10-DN13; the directional step retired by the carousel) | Shipped, audited, an experiment (web verified by the e2e; native unverified) |
| Explore carousel (a full-height map and one row of area cards; the selected area highlighted and the only one named; a map swipe steps the row; EC1-EC20, decision 0124) | Built, web verified by the e2e (`carousel`, `snap`); native unverified; not audited |
| Explore one level per row (near you the towns, yours leading and selected; a town's page its own card, then its neighborhoods; the title names the level, the back pill reads "Towns"; decision 0126, fix explore-town-scope) | Shipped 2026-11-10 (web verified by the e2e; native unverified) |
| Town presence (a town graded across its whole outline, with its busy areas listed) | Built (web verified by the e2e; native unverified) |
| Resurfaced moments (Chronicle opens on Memories: a moment brought back, threads from the user's words, Lately) | Built (web verified by the e2e `resurface`; native unverified) |
| Owner threads (respond to a moment; connect moments across walks; Threads on Memories) | Built (web verified by the e2e `threads`; native unverified) |
| Response thread (a moment's responses in a sheet over the viewer; RT1-RT14) | Built 2026-11-11 (web verified by the e2e `responses`; native unverified) |
| Moment references (a note mentions moments with @) | Built on `claude/ui-conformance` (web verified by the e2e `threads`; native unverified) |
| Capture from Chronicle (the app opens on Memories; the band keeps a moment in one tap; HC1-HC15) | Built (web verified by the e2e `capturehome`, `launch`; native unverified) |
| Moment stacks (a moment holds its media; Add to this moment; one card and pin per moment; the viewer's pieces; deleting one; Split out; the replay's grid; Group captures) | Built, rounds 0-2 (web verified by the e2e `upgrade` and `stacks`; native unverified) |
| Moments and days, memories on revisit, thumbnails | Shipped, audited |
| Media gallery (Chronicle's fifth section: every photo, video and memo in a grid under day headers; Years, Months, Days; Sort, Show, Zoom, Square or Aspect; MG1-MG22) | Built (web verified by the e2e `gallery`; native unverified) |
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
| Storage awareness: the room left said in words beside the captures; a failed save held for Retry; the web asks to be kept | Shipped on web (web verified by the space e2e; native unverified) |
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
