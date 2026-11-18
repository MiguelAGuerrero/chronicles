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
  as read by the session that ran the gate for decision 0212 (Nov 18, 2026). **Verified there, not re-read here**. The model for a
  capture without the screen.
- **Polarsteps**: a trip as a route with steps; users report straight lines between stops. Source: from memory. **Unverified**. The
  model for the road in a replay, and the straight lines are what to avoid.
- **Google Maps Timeline**: kept on the device, and it records your day unasked. Source: as read by the same session. **Verified
  there, not re-read here**. A counter-example: nothing here is started for you.
- **iOS Driving Focus**: silences notifications while driving. Source: from memory. **Unverified**.
