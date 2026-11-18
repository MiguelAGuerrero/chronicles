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
