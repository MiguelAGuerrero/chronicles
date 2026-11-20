# Adjacent apps: who does our jobs, and how

The one list of the apps Chronicles is measured against, and the one place their implementations are recorded
(decision 0193). The owner, Nov 17: "Ensure, moving forward, that our skills, when looking at the extending
workflow, ground suggestions in how current apps adjacent to this product implement a feature, so we have a model
to evaluate our UI and user experience."

- **Who reads it.** `/vision` (the gate's `Precedent:` line), `/slice` (the spec's "How adjacent apps do it" and
  the plan's comparison), `/tend` (each `T` and `G` entry's `Precedent:`), `/audit`, the `steward` and the
  `ux-reviewer` (they judge against what is recorded here), and the tend orchestrator (every recommended option
  it puts to the owner cites one).
- **Precedent informs how, never what.** VISION.md: "The overlap with adjacent apps is incidental". An app doing a
  thing is no reason to build it (`/tend` section 9), and a precedent that breaks a Never line (Apple's star ratings,
  Journal's streaks) is recorded as a counter-example, never as a model. A departure from every recorded app is
  fine when it has a reason; say the reason.
- **What `docs/research/ui-teardown.md` is.** The dated, two-pass teardown of six moment jobs (Nov 9-10, decision
  0114), kept whole as the evidence behind the jobs below. This file is the living index: it was made beside the
  teardown, not in it, because the teardown is a closed research pass organised by app, with its own synthesis and
  URL ledger; a growing list organised by job would have rewritten it.

## How to add an entry

Under its job (add the job if it is new), one line per app:

```
- **<App>** (<platform, version if known>): <what it does: the controls, their words, the flow>. Source: <a URL |
  observed <date> on <device> | from memory, unverified>. **Verified** | **Unverified**.
```

**Verified** means the source was read or the app was seen, and the line says only what it showed. A source that
cannot be fetched is written "from memory, unverified", never cited. Unverified lines are leads, not models: a
recommendation resting only on them says so. Correct a line in place when a source contradicts it, and add the
source.

## The apps

| App | Kind | Why it is adjacent | Our verb |
|---|---|---|---|
| Apple Photos (iOS) | photo and media | The phone's own viewer: what a full-screen moment, its details and resurfaced memories feel like to our walkers | Return |
| Google Photos | photo and media | The same jobs on Android; memories that resurface, and how they are turned off | Return |
| Apple Voice Memos | photo and media | One-tap sound capture; recordings named after the place | Honour |
| Day One | journaling and memories | A journal with media, a map of entries, On This Day: the nearest whole to the Chronicle | Honour, Return |
| Apple Journal | journaling and memories | The system journal: capture entry points, Places map, suggestions (and streaks, a counter-example) | Honour, Return |
| Polarsteps | journaling and memories; walking and outdoor | A trip told as a route with steps and photos: the nearest to a replay | Return |
| Apple Messages, Slack | replies | How a reply to one item is started and shown: our responses and threads | Return |
| Apple Maps | maps and navigation | The phone's walking directions and route options; Visited Places; custom walks | Earn |
| Google Maps | maps and navigation; location history | Walking directions; Timeline, a day of visits kept on the device | Earn, Return |
| Organic Maps | maps and navigation | Offline, no-account maps on OpenStreetMap, with a track recorder: our data and privacy stance | Earn |
| Komoot | walking and outdoor | Route planning on foot, recorded tours with highlights and photos | Earn, Honour |
| AllTrails | walking and outdoor | Recording a walk (start, pause, stop) and photos along a trail | Honour |
| Strava | walking and outdoor | Recording a walk; the social and score shapes we refuse (a counter-example) | Honour |
| Fog of World | walking and outdoor; location history | Revealing the map where you have been: the shape our fog and familiarity must not become a score | Earn |
| Swarm (Foursquare) | location check-ins | Marking that you were at a place, and a history of them | Honour, Return |
| OpenStreetMap Carto | maps and navigation | osm.org's standard style, drawn from the data our maps use: how it draws borders and places | Earn |
| Positron (OpenMapTiles) | maps and navigation | Our own base map's style: what our borders and marks sit on | Earn, Return |
| iPhone Notification Center, Android notifications | the phone's own | Where a notification waits when the person is busy: the model for a reminder that is never lost | Return |

## Implementations, by job

### Capture in one tap (Honour)

- **Day One** (iOS): tap **+** starts an entry; a long press opens the other kinds (since 2024.13, June 2024); tried
  in 2018 and reverted within months to an action sheet. A Lock Screen "Quick Entry" widget (2025.15). Source:
  https://dayoneapp.com/guides/day-one-ios/creating-entries-in-day-one-for-ios/ and its iOS release notes
  (`docs/research/ui-teardown.md` section 3). **Verified**.
- **Apple Journal** (iOS 27): **+** opens suggestions and prompts first; "Show Suggested Moments" in Settings turns
  that off. Home Screen quick actions: New Entry, Add Photos, Record Audio. Source:
  https://support.apple.com/guide/iphone/write-in-your-journal-iph9824e83ce/27/ios/27 (teardown section 2).
  **Verified**.
- **Apple Voice Memos** (iOS 27): one Record button; "saved with the name New Recording or the name of your location,
  if Location Services is turned on"; the Action button can start one. Source:
  https://support.apple.com/guide/iphone/make-a-recording-iph4d2a39a3b/27/ios/27 (teardown section 7). **Verified**.
- **Polarsteps**: photos join a step only when the step is edited. Source: from memory, unverified (the host refused
  fetches, teardown section 5). **Unverified**.

### Edit right after the shutter (Honour)

- **Instagram** and **Snapchat** (iOS, Android): the editor opens straight after the shutter, before anything is
  posted or saved; its ✕ throws the shot away. Source: from memory, unverified. **Unverified**.
- **Apple Photos** and **Google Photos**: the camera keeps the shot; Edit is on the photo's own toolbar later (see
  "View one moment full screen"). **Verified** (as cited there).
- **Chronicles** (decision 0240): the editor opens by itself once the shot is accepted, the moment already kept, so
  its ✕ keeps the photo as taken and the editor says it is kept.

### A capture that could not be saved (Honour)

- **Google Photos** (Android): each item not yet in the cloud keeps a status on its own thumbnail: "Item isn’t backed
  up", "In Queue or Paused: Item isn’t currently backing up but it will eventually", "Permanent failure: Item
  permanently failed"; nothing leaves the library while it waits. Source:
  https://support.google.com/photos/answer/6193313 , read Nov 17, 2026. **Verified**.
- **Apple Photos** (iOS 26 and later): iCloud uploads are one library-wide state, read and paused for a day from one
  place ("open the Photos app, then tap Collections. Tap the profile button, then tap Pause"). Source:
  https://support.apple.com/en-us/108782 , read Nov 17, 2026. **Verified**.
- **Day One** (iOS): "An exclamation mark next to your avatar indicates a sync issue"; the state is in one place ("Tap
  the Profile Icon in the top right. Then tap Sync > Sync Status"). Source:
  https://dayoneapp.com/guides/day-one-sync/sync-status/ , read Nov 17, 2026. **Verified**.

### View one moment full screen (Return)

- **Apple Photos** (iOS 27): tap hides or shows the controls; named actions Share, Info, Edit, Delete; More holds
  Hide, Duplicate, Copy, Add To, Adjust Info; swipe up for details (caption, keywords, place); Back at the top left.
  Source: https://support.apple.com/guide/iphone/view-photos-and-videos-iph3d267610/27/ios/27 (teardown section 1).
  **Verified** (button positions unverified). Counter-example: 1 to 5 star ratings, off by default.
- **Google Photos** (Android): "At the bottom, tap [Share]", "At the bottom, tap Edit"; the rest under More, "At the
  top"; "you can swipe up to view the photo details". Source:
  https://support.google.com/photos/answer/6220402?hl=en&co=GENIE.Platform%3DAndroid and
  https://support.google.com/photos/answer/7362432?hl=en&co=GENIE.Platform%3DAndroid (teardown section 4).
  **Verified**.

### Reply to a moment; a thread across days (Return)

- **Apple Messages** (iOS 27): "Swipe right on the message bubble ... Touch and hold ..., then tap Reply"; the reply
  quotes the original in a focused view over a blurred conversation. Source:
  https://support.apple.com/guide/iphone/send-and-reply-to-messages-iph82fb73ba3/27/ios/27 . **Verified** (the
  "X Replies" label unverified).
- **Slack** (mobile): "Tap the message ... Tap Reply in Thread, or tap the Add a reply field"; a Threads list.
  Source: https://slack.com/help/articles/115000769927 . **Verified**.
- **Day One**: links entry to entry from selected text (2026.13); no backlinks documented. Source:
  https://dayoneapp.com/guides/tips-and-tutorials/linking-journal-entries/ . **Verified**.

### A feed, resurfacing, "a year ago today" (Return)

- **Day One**: List under date headings; On This Day (from More or a Calendar date; excludes today; off per journal;
  its notifications a separate setting). Source: https://dayoneapp.com/guides/tips-and-tutorials/on-this-day-view/ .
  **Verified**.
- **Apple Photos** (iOS 27): from a memory, touch and hold, then Feature Less ("Feature This Day Less", "Feature This
  Place Less") or Delete Memory; "Reset Suggested Memories" undoes. Source:
  https://support.apple.com/guide/iphone/share-or-delete-memories-iph2af67b000/27/ios/27 . **Verified**.
- **Google Photos** (Android): memories carousel at the top; tap to advance, "To pause on a photo: Touch and hold
  it"; More, "Hide this date from all memories". Source:
  https://support.google.com/photos/answer/9454489?hl=en&co=GENIE.Platform%3DAndroid . **Verified**.
- **Apple Journal**: Insights shows streaks and word counts. Counter-example (VISION.md, Never: streaks). Source:
  https://support.apple.com/guide/iphone/build-a-journaling-habit-iph70107aec2/27/ios/27 (teardown section 2).
  **Verified**.

### Replay a walk; moments on a map (Return)

- **Day One**: a Map view; "Tap on the pins to view the entries associated with those locations"; long press on the
  map starts an entry there. Source: https://dayoneapp.com/guides/day-one-ios/journal-views-in-day-one-for-ios/ .
  **Verified**.
- **Apple Journal**: Places, a map of entries with a location. Source:
  https://support.apple.com/guide/iphone/view-and-search-journal-entries-iph6257be047/27/ios/27 . **Verified**.
- **Polarsteps**: a trip drawn as a route with steps; users report photos covering the path and straight lines
  between stops. Source: from memory, unverified (teardown section 5). **Unverified**.
- **Google Photos** (Android): a memory advances on a tap and pauses on touch-and-hold, with no visible control for either
  (its entry under the feed job has the words). Source:
  https://support.google.com/photos/answer/9454489?hl=en&co=GENIE.Platform%3DAndroid . **Verified**.
- **Apple Photos** (iOS): a memory plays as a movie with music; a tap shows a pause control and a strip of its photos to scrub.
  The music and the movie's pans are counter-examples (VISION.md, restraint; `replay-cinematography.md`). Source: from memory,
  unverified. **Unverified**.
- **Relive** (iOS, Android): a route replayed as a video, its photos popping up along the line, with a scrub bar. The flyover
  camera and the scrub bar are counter-examples here (screen direction; RR19, no progress bar). Source: from memory, unverified.
  **Unverified**.
- **Pikmin Bloom** (iOS, Android): the day's recap draws the path walked with what was planted along it, then steps and counts.
  The path is the model; the counts are a counter-example (Never: scores, tallies). Source: from memory, unverified.
  **Unverified**.
- **Strava**: a recorded activity as a map with its line, then pace, splits and kudos. The map is the model; the
  numbers and kudos are counter-examples (Never: fitness numbers, likes). Source: from memory, unverified.
  **Unverified**.

### Group and search (Return)

- **Day One**: tags with an Any/All filter; Media view filtered by Photos, Video, Audio, PDF. Source:
  https://dayoneapp.com/guides/tips-and-tutorials/tagging-guide/ . **Verified**.
- **Apple Voice Memos**: search reaches transcripts. Source:
  https://support.apple.com/guide/iphone/search-for-or-rename-a-recording-iph0e546e6ec/27/ios/27 . **Verified**.

### Record a walk: start, pause, stop (Honour)

- **AllTrails**: Record, then pause and resume, Finish to save; photos taken during the recording are placed on the
  line. Source: from memory, unverified (support.alltrails.com unreachable from cloud sessions, Nov 17). **Unverified**.
- **Komoot**: record a tour, then save it with highlights and photos placed on the map. Source: from memory,
  unverified (support.komoot.com unreachable, Nov 17). **Unverified**.
- **Organic Maps**: a track recorder kept as a track among bookmarks, offline, without an account. Source: from
  memory, unverified (organicmaps.app unreachable, Nov 17). **Unverified**.

### Suggest a way on foot (Earn)

- **Apple Maps** (iOS 27): "Touch and hold anywhere on the map or enter an address in the search field, then tap the
  directions button", then "Tap Go or Steps for the route you want to take"; Options, below Directions, avoids
  "hills, stairs, or busy roads". Saved and custom walks or hikes are separate topics. Source:
  https://support.apple.com/guide/iphone/get-walking-directions-iph8eae299d1/ios , read Nov 17, 2026. **Verified**
  (how several routes are listed is not on the page).
- **Komoot**: planned routes with surface and way types and a difficulty. Source: from memory, unverified.
  **Unverified**.
- **Google Maps**: a destination, then "Add stop" and a search along the route by category, results as pins with the
  minutes each adds. Source: from memory, unverified. **Unverified**. A counter-example in part: minutes rank the stops.
- **Roadtrippers**: a start and an end, then categories of place shown within a distance of the route, added one by one
  to an itinerary. Source: from memory, unverified. **Unverified**. A counter-example in part: an itinerary is a list.

### Mark ground that is hard on foot (Earn)

None of these pages could be fetched from the cloud session (Nov 19, DNS refused); each line comes from a search result's summary of
the page, so all are leads. Recorded by `/investigate` (`docs/research/walkability-car-ground.md`).

- **Google Maps**: walking directions carry a caution in words, "Use caution – walking directions may not always reflect real-world
  conditions"; nothing marks the ground on the map. Source: quoted at https://walksydney.org/2018/12/10/pedestrians-left-at-the-kerb-by-google-maps/
  (search summary, page not read). **Unverified**.
- **Komoot**: route warnings (off-grid sections, steps, steep or dangerous terrain) add information the map does not show; the
  distance indicator shows which section a warning applies to. Source: https://www.komoot.com/help/warnings (search summary, page
  unreachable Nov 19). **Unverified**.
- **AccessMap** (Seattle, web): footways coloured by how their incline affects pace, an inaccessible one as a dotted red line, with a
  legend. Source: https://taskarcenteratuw.github.io/tcat-wiki/accessmap/user-manual/interface (search summary, page unreachable
  Nov 19). **Unverified**. A counter-example in part: red as a verdict.
- **Aviation charts** (Esri's charting conventions): restricted airspace drawn with a hatched band along the inside of its boundary,
  not a filled interior. Source: https://desktop.arcgis.com/en/arcmap/latest/extensions/aviation-charting/symbolizing-restricted-airspace.htm
  (search summary, page unreachable Nov 19). **Unverified**.

### Ask how it went, just after (Honour, Return)

Seen only as search summaries from a cloud session (Nov 20; the pages could not be fetched). Recorded by `/investigate`
(`docs/research/walk-notes.md`), where the same pattern is used for the owner's own walk notes, not for an app feature.

- **Strava**: after an activity, the save or edit screen asks "How did that activity feel?", optional, a 1-10 scale on mobile
  (a slider on the web), feeding its effort features; it can be added later, one activity at a time. Source:
  https://support.strava.com/hc/en-us/articles/360032535512-Perceived-Exertion (search summary, page not read). **Unverified**.
  A counter-example in part: the answer is a number.
- **Apple Journal** (iOS 17.2 and later): suggestions built on the device from photos, workouts and places visited, and open
  reflection prompts beside an empty entry. Source:
  https://www.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/ (search summary,
  page not read). **Unverified**.

### Say what an area holds: findable places apart from the places you go into (Earn)

- **Atlas Obscura** (web and app): lists only curiosities and odd places, each a page; restaurants and shops are not in
  it. Source: from memory, unverified. **Unverified**.
- **Google Maps** (Android and iOS): nearby search offers chips by type (Restaurants, Coffee, Shopping, Things to do,
  Hotels); landmarks and attractions sit under "Things to do", apart from places to eat or shop. Source: from memory,
  unverified. **Unverified**.
- **Walk Score** (web): groups nearby amenities by type (dining and drinking, groceries, shopping, errands, parks,
  schools, culture and entertainment) and sums them into a 0-100 score. Counter-example (Never: scores); the grouping by
  type is the model. Source: from memory, unverified. **Unverified**.

### Places worth noticing nearby (Earn)

- **Pikmin Bloom** (iOS, Android): postcards come from Niantic's Wayspot database (Ingress portals, PokéStops), seeded from
  the Historical Marker Database and grown by players' nominations under "a great place to explore … unique story";
  Decor Pikmin use OpenStreetMap and Foursquare place types. Source: docs/research/small-places-wayspots.md (Nov 14, with
  its URLs). **Verified**.
- **Google Maps** (iOS, Android): "Things to do" and the Explore sheet list attractions by category, ordered with star
  ratings and review counts. A counter-example (VISION Never: ratings, popularity). Source: from memory, unverified.
  **Unverified**.
- **Atlas Obscura** (iOS): a curated editorial list of odd places near you, each with a written entry. A counter-example
  (editorial guidance, and its terms forbid reuse of its data). Source: from memory, unverified; the terms from the
  research pass of Nov 17 (research_notes, state_city_nonprofit). **Unverified**.

### Places that share a spot on the map (Earn)

- **Leaflet.markercluster** (web map library): markers that stay together at the bottom zoom are spread out when
  their cluster is clicked (`spiderfyOnMaxZoom`, on by default), each on a drawn leg back to the shared point
  (`spiderLegPolylineOptions`: weight 1.5, colour #222, opacity 0.5); otherwise a cluster "shows the marker count in a
  circle". The legs are the model for `fix mark-overlap`'s row (drawn at once, not on a click, since two or three marks
  need no tap to part); the count is a counter-example (nothing is a score). Source:
  https://github.com/Leaflet/Leaflet.markercluster , read Nov 18, 2026. **Verified**.
- **Google Maps** (Android SDK marker clustering): nearby markers merge into one bubble with their number. A
  counter-example (a count). Source: from memory, unverified (developers.google.com unreachable from the session).
  **Unverified**.
- **Apple MapKit** (`displayPriority`, `collisionMode`): an annotation of lower priority that collides with another is
  hidden until the map zooms in. Not followed: a hidden mark is a place lost from the walk. Source: from memory,
  unverified (the page returned no body). **Unverified**.

### Where you have been: visits and history (Return, Earn)

- **Google Maps Timeline** (Android): kept on the device ("saving each of your devices' precise locations to that
  device"); opened from the profile picture, "Your Timeline"; a day chosen from **Today** at the top; tabs Places,
  Cities, World; a wrong visit edited from "Select place", one removed with More, then Remove. Source:
  https://support.google.com/maps/answer/6258979?hl=en&co=GENIE.Platform%3DAndroid , read Nov 17, 2026. **Verified**.
- **Apple Maps Visited Places**: "helps you keep track of places you've been, so you can easily revisit or share
  them later"; kept for 3 months, 1 year or Forever, chosen when turned on; one place removed from its card's More,
  or Clear History at the bottom of the list; end-to-end encrypted. Source:
  https://support.apple.com/guide/personal-safety/ipsae6d4500b/web , read Nov 17, 2026. **Verified**.
- **Fog of World**: the map stays fogged except where you have been; a percentage explored and levels.
  Counter-example (Never: coverage, levels); the fog alone is the model for our faint fog. Source: from memory,
  unverified. **Unverified**.
- **Swarm**: a check-in marks a place with an optional note and photo; a history map of places checked into, with
  streaks and stickers (counter-examples). Source: from memory, unverified. **Unverified**.
- **Strava personal heatmap**: every recorded activity's line overlaid on one map, brighter where you have gone more often,
  filtered by sport and date; a subscriber feature. Counter-example for the brightness (frequency drawn as intensity; the
  owner chose one even tone, decision 0222); the overlay of your own lines turned on and off is the job of Where I've been.
  Source: from memory, unverified (recorded for `specs/where-ive-been`, Nov 18). **Unverified**.

### Choose what you are shown: a long list of switches (Earn)

Recorded for the What I'm into page (decision 0192, `specs/what-im-into-page`).

- **iOS Settings, Notifications** (iOS): the Notifications page lists the apps under "Notification Style"; a tap on
  one opens that app's own page of switches (Allow Notifications, Time Sensitive Notifications, Badges), with "Customize
  Notifications" a further row for the app's types; each switch acts at once, there is no Save, and Back returns.
  Source: https://support.apple.com/guide/iphone/change-notification-settings-iph7c3d96bab/ios , read Nov 18, 2026.
  **Verified**.
- **Android system settings, an app's notification categories** (Android 8 and later): each app's notification
  settings are a page of their own listing its categories, each a switch, which the app may gather under group
  headings ("Notification channel settings with groups for personal and work accounts"). Source:
  https://developer.android.com/develop/ui/views/notifications/channels , read Nov 18, 2026. **Verified**.
- **Google Maps** (iOS, Android): Settings, then Notifications, opens a page of its own whose switches sit under
  plain section headings; the headings scroll away with their rows. Source: from memory, unverified. **Unverified**.
- **AllTrails** (iOS): Filters opens a full-screen page of sections (activities, difficulty, length, attractions), a
  heading over each block of chips; a filter for one search, not a lasting preference. Source: from memory,
  unverified. **Unverified**.
- **iOS Contacts** (iOS): a plain list whose letter headings stay pinned at the top while their names scroll under
  them, the next heading pushing the last one out. Source: from memory, unverified. **Unverified**.
- **iOS Settings, Notifications, the per-app summary line** (iOS): under each app's name in the Notifications list a
  short line says how its notifications are set ("Deliver Quietly", "Off", "Banners, Sounds, Badges"), in words and with
  no count. The precedent for a kind row's quiet line naming what was changed (`what-im-into-page` WI18, audit 7).
  Source: from memory, unverified. **Unverified**.
- **iOS navigation bar, the back button's title** (iOS): a pushed page's back button carries the previous screen's
  title ("‹ Settings"), and VoiceOver speaks it with "back button"; with no room the title drops to "Back" or the
  chevron alone. The precedent for Back reading "Walk" from the walk (WI20, audits 8, 10, 14). Source: from memory,
  unverified. **Unverified**.

### Keep the map's focus clear of a raised sheet (Earn)

Recorded for the walk's map under its raised drawer (`docs/research/walk-map-under-drawer.md`, Nov 20). The docs
hosts were unreachable from the cloud session, so the app lines are from memory.

- **Google Maps** (iOS, Android): pulled up, a place's or a trip's sheet leaves the map above it, and the blue dot or
  the place is moved into that part, not left under the sheet. Source: from memory, unverified. **Unverified**.
- **Apple Maps** (iOS): with the card at the bottom raised, the map's centre sits in the part left above it. Source:
  from memory, unverified. **Unverified**.

### Bring the map back to north while following (Earn)

- **Apple Maps** (iOS 27): "Tap [the Tracking Off button]. Your position is marked in the middle of the map. The top
  of the map is north." Then "Show your heading instead of north at the top: Tap [the Tracking On button]." and
  "Resume showing north at the top: Tap [the Tracking On With Heading button] or [the Compass button]." (the buttons
  are icons; the bracketed names are the page's own alt text). The page does not say whether the map keeps following
  once the compass is tapped. Source: https://support.apple.com/guide/iphone/set-up-maps-iph10d7bdf26/ios , read
  Nov 18, 2026. **Verified**.
- **Apple Maps in CarPlay** (iOS 27): when not following directions, "Show your current location: Tap [the Tracking
  Off button]. Your position is marked in the middle of the map." and "Show your heading at the top of the screen: Tap
  [the Tracking On button]. To resume showing north at the top, tap [the Tracking On Heading button]." Source:
  https://support.apple.com/guide/iphone/change-the-map-view-iph93c7df449/ios , read Nov 18, 2026. **Verified**.

Both make heading or north a state of the location button, and back to north one tap, with the walker's position the
centre of the map. `tend map 15` (CP4) cited the CarPlay page; that the position stays in the middle "throughout", so
back to north keeps following, is that run's reading: neither page says it in words.

### Draw a town's border on the map (Earn, Return)

- **OpenStreetMap Carto** (osm.org's standard style): borders are lines only, in a muted purple
  (`@admin-boundaries: #8d618b; // Lch(47,30,327)`); a town's (admin level 8) from zoom 12 is a 1.4 px line dashed
  `8,2,2,2,2.5,2,2,2` over a white 1.4 px backing line, 1.6 px from zoom 14; no fill. Source:
  https://raw.githubusercontent.com/gravitystorm/openstreetmap-carto/master/style/admin.mss , read Nov 17, 2026 (the
  T33 comparison) and again Nov 18, 2026. **Verified**.
- **Positron** (our base map, OpenMapTiles): only state (dashed) and country borders, both `rgb(230, 204, 207)`, a
  pale pink; no town borders, no fill. Source: https://raw.githubusercontent.com/openmaptiles/positron-gl-style/master/style.json ,
  read Nov 17 and Nov 18, 2026 (its `boundary_state` and `boundary_country_*` layers). **Verified**.
- **Organic Maps**: country and region borders only, in warm greys (`@border_country: #63635C`,
  `@border_region: #73726B`) at 0.7 opacity, regions dashed; no town borders, no fill. Source:
  https://raw.githubusercontent.com/organicmaps/organicmaps/master/data/styles/default/include/Basemap.mapcss and
  https://raw.githubusercontent.com/organicmaps/organicmaps/master/data/styles/default/light/colors.mapcss , read
  Nov 17 and Nov 18, 2026. **Verified**.
- **Google Maps**: a searched town is outlined with a red or pink dashed line, no fill, nothing dimmed outside it.
  Source: from memory, unverified (its help pages read for T33 do not describe it). **Unverified**.

A border is a quiet line in a hue the map's other layers do not use, and none tints the region. Our tinted,
firm-edged town (TB10) is our own; decision 0199 chose cocoa `#6e4f3f`, beside Organic Maps' warm greys, from this
comparison.

### A reminder that arrives while you are busy (Return)

- **iPhone Notification Center** (iOS 27): "Unless you have notifications silenced with a Focus, iPhone displays them
  as they arrive"; Notification Center keeps them ("Swipe down from the top-left corner. Then you can scroll up to see
  older notifications, if there are any"); one leaves when the person clears it ("Swipe left on the notification or
  group of notifications, then tap Clear or Clear All"), and a muted app's go "directly to Notification Center".
  Source: https://support.apple.com/guide/iphone/view-and-respond-to-notifications-iph6534c01bc/ios , read Nov 18,
  2026. **Verified**.
- **Android notifications** (Android Help; "Some of these steps may vary based on your device"): "At the top of your
  screen, notifications show when you swipe down"; one is dismissed by the person ("To dismiss one notification, swipe
  it left or right"); notification history, where the device has it, keeps "Snoozed notifications", "Recently
  dismissed notifications" and "A history of the day’s notifications". Source:
  https://support.google.com/android/answer/9079661?hl=en , read Nov 18, 2026. **Verified**.

On both pages a notification leaves the list when the person clears it, and neither describes one dropped unseen
(an inference from what the pages say, not their words). That is the model `tend explore 21-24` followed (a fire
waits until a place in front can show it). Those runs wrote "until it is seen", from memory; the pages say it stays
until it is cleared.

### Guide a drive (Earn)

- **Apple Maps** (iOS 27): directions from a search or a press on the map, then Go or Steps; the route card lists several driving
  routes, each with its time and distance; spoken directions go on with the phone locked or another app open; Options, below
  Directions, has an Avoid section. Source: https://support.apple.com/guide/iphone/get-driving-directions-ipha84a94043/ios , read
  Nov 18, 2026 through a fetcher that summarised the article's body (not verbatim). **Partly verified**. A counter-example in part:
  several routes ranked by time.
- **Organic Maps**: turn-by-turn driving on OpenStreetMap, on the device, with no account; voice guidance optional. Source: from
  memory, unverified (organicmaps.app unreachable from cloud sessions). **Unverified**.
- **Google Maps**: a route with its arrival time, spoken turns, "faster route available" prompts and rerouting said aloud. Source:
  from memory, unverified. **Unverified**. A counter-example: the prompt to change route is the nag this product leaves out.

### Keep a drive as part of the day (Honour, Return)

- **Apple Voice Memos**: the Action button can start a recording, saved with the name of your location. Source: support.apple.com,
  as read by the session that ran the gate for decision 0218 (Nov 18, 2026). **Verified there, not re-read here**. The model for a
  capture without the screen.
- **Polarsteps**: a trip as a route with steps; users report straight lines between stops. Source: from memory. **Unverified**. The
  model for the road in a replay, and the straight lines are what to avoid.
- **Google Maps Timeline**: kept on the device, and it records your day unasked. Source: as read by the same session. **Verified
  there, not re-read here**. A counter-example: nothing here is started for you.
- **iOS Driving Focus**: silences notifications while driving. Source: from memory. **Unverified**.

### Compose a plan from several choices: one page, a filter sheet, or steps (Earn)

Looked up Nov 18, 2026, for the owner's question on shop facets ("we might opt to using a step form like a wizard, but that decision
depends on how other apps handle this"). Every line here is from a web search's summary of the page named, not from the page read in
full: **partly verified** at best.

- **Roadtrippers Autopilot**: a short run of steps. A start and a destination first, then "a few simple questions" (who is
  travelling, where to eat and stay, interests, the vehicle); the plan it returns is a starting point that can be edited, and a
  suggestion can be asked for one stop at a time. Source: https://support.roadtrippers.com/hc/en-us/articles/24995143275412 and
  https://roadtrippers.com/autopilot , by search summary. **Partly verified**. The nearest precedent for a wizard: used once per
  trip, for a plan of days.
- **Komoot**: steps, because order matters. Plan, then the sport and the fitness level, then the destination: the sport changes
  which paths can be routed, so it is asked first. Source: third-party how-to guides (mantel.com, cyclingweekly.com), by search
  summary. **Partly verified**.
- **Airbnb**: the constraints are a place, dates and guests, each its own small step in one search panel; since 2022 the first
  screen leads with categories to pick from, not the question "where". Source: https://www.airbnb.com/2022-summer and a design
  critique (ixd.prattsi.org), by search summary. **Partly verified**.
- **Ecommerce filtering on a phone (Baymard)**: facets live in a separate layer (a full-screen sheet) with a sticky Apply, and the
  filters applied stay visible outside it so they can be removed without reopening it. Source:
  https://baymard.com/guidelines/1125-apply-buttons-in-mobile-filtering-interfaces and
  https://baymard.com/blog/how-to-design-applied-filters , by search summary. **Partly verified**. Its counts beside each value
  are what this product leaves out.
- **NN/g on wizards**: a wizard is steps in a set order where later steps can depend on earlier answers; it suits novices and
  processes done rarely (setup, configuration). Source: https://www.nngroup.com/articles/wizards/ , by search summary (the article's
  full list was not retrieved). **Partly verified**. Other pattern libraries (PatternFly, Visa) say never to use one where a single
  page would do; that is theirs, not NN/g's.

What they share: steps are used where an answer changes what the next question is (Komoot's sport), or where the plan is large and
made rarely (a road trip of days); filters that are independent of each other sit together, on the page or in one sheet, with what
is applied left in view.


### Tying a moment to a place (Honour)

- **Swarm (Foursquare)**: the person picks the venue from the places near them and checks in; the nearest is never assumed. Source: from memory, unverified.
- **Day One**: an entry's place is offered from nearby places; the writer picks one or none. Source: from memory, unverified.
- **Apple Journal**: a place is a suggestion the person attaches or leaves; nothing is attached unseen. Source: from memory, unverified. Used by `specs/tap-to-capture-places`.
- **Google Maps**: a place's sheet carries "Add photos"; the photo taken or picked goes to that place in one step, with nothing armed for a later one (public, unlike ours). Source: from memory, unverified. **Unverified**. Used by `specs/capture-at-a-place`.
- **Swarm (Foursquare)**: the check-in screen for the chosen venue has a camera button in line; the photo belongs to that check-in. Source: from memory, unverified. **Unverified**. Used by `specs/capture-at-a-place`.

### Back up everything and restore it (Honour, Return)

- **Apple Journal** (iOS): Settings > Apps > Journal > "Export All Journal Entries", then "Export": one ZIP,
  "AppleJournalEntries", in Files, with photos, locations and other media. The page describes no import back into
  Journal; its restore is an encrypted device backup through Finder. Source: https://support.apple.com/121822 , read
  2026-11-20 (`/investigate` app-backup). **Verified**.
- **Day One** (iOS, macOS, Android, web): Settings > Import/Export, all journals and the full date range, "Export Day
  One JSON": "exports all data and media and can be re-imported into Day One"; back in with "Import JSON" (macOS:
  File > Import > JSON Zip File). The page does not say whether an import merges or replaces. Source:
  https://dayoneapp.com/guides/tips-and-tutorials/transitioning-day-one-data-to-a-new-device and
  https://dayoneapp.com/guides/settings/importing-data-to-day-one/ , read 2026-11-20. **Verified**.
- **Organic Maps**: every bookmark and track as a single KMZ the app and Google Earth read; "Import Bookmarks and
  Tracks" reads a folder of KML, KMZ and GPX files back in. Source: from memory and a search summary of
  organicmaps.app's FAQ and its 2024-03-11 news (the host did not resolve from the session), unverified. **Unverified**.
- **Polarsteps**: "Download my data" in the website's account settings mails a link to a zip of trips, steps, photos
  and routes as JSON; no import back. Source: a search summary of support.polarsteps.com article 124 (the host
  refused the fetch), unverified. **Unverified**.

What they share: one file, made from settings on a tap, holding the media with the words. Only Day One reads its own
file back; Apple Journal and Polarsteps export a copy you can keep but not restore. Used by
`docs/research/app-backup.md` (decision 0241).
