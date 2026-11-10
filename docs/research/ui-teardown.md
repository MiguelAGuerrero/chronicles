<!-- Compiled Nov 9-10, 2026 by research agents for decision 0114. Second pass read the vendors' own pages (support.apple.com at iOS 27, support.google.com/photos, dayoneapp.com, slack.com): each claim is marked Verified, Corrected, New or Unverified. Polarsteps and app-store pages refused automated fetches and stay unverified, as do claims that rested only on press articles. -->

<!-- Second pass, compiled Nov 10, 2026 for decision 0114. Vendor help pages on support.apple.com, support.google.com, dayoneapp.com and slack.com were loaded directly and read; each claim is now marked Verified (with a quote and URL), Corrected, New (found on the page, not in the first pass) or Unverified (with the reason). Press sites, Polarsteps and the App Store stayed blocked, so claims resting only on them remain unverified. -->

# Adjacent-app teardown for Chronicles' moment jobs (second pass)

Date: 2026-11-10. Research only; nothing under /workspace was changed. First pass: `docs/research/ui-teardown.md` (2026-11-09).

## How this was sourced (read first)

- **Loaded directly this time:** `support.apple.com` (iPhone User Guide), `support.google.com/photos`, `dayoneapp.com` (guides, release notes, release posts) and `slack.com/help`. I fetched each page and read its text, not a search summary. Quotes below are copied from those pages.
- **Versions.** Apple's iPhone User Guide now defaults to **iOS 27**. Every Apple quote below comes from the iOS 27 page unless another version is named. I also loaded the iOS 26 and iOS 18 versions of "View photos and videos" to compare. Google's pages were read with the Android platform tab (`co=GENIE.Platform=Android`), plus the computer tab for Memories. Day One's iOS release notes run up to 2026.22 (23 October 2026).
- **Still blocked (proxy refused the connection):** `www.macrumors.com`, `www.polarsteps.com`, `stories.polarsteps.com`, `polarsteps.helpscoutdocs.com`, `apps.apple.com`, `help.dayoneapp.com`, `forums.dayoneapp.com` and Apple's image CDN `ipcdn-web.apple.com` (so I could not see screenshots; I used their alt text, which Apple writes as layout descriptions). As instructed, I did not try `support.polarsteps.com`. I tried each blocked host once.
- **Limits of help pages.** They say which button does what, and often whether it is "at the top" or "at the bottom". They rarely draw the whole toolbar. Where a page names a button but not where it sits, I say so.
- Labels: **Verified** (the page says it; quote and URL given), **Corrected** (the page says something else), **New** (on the page, not in the first pass, and relevant), **Unverified** (with the reason). Anything marked **(inference)** is my reasoning, not a source.

---

## 1. Apple Photos (iOS)

**Viewer: where actions live**
- First pass: bottom toolbar with Share, Favorite, Info, Edit, Delete (Technobezz, iOS 26.5). **Partly verified, positions unverified.** Apple's pages name the viewer's buttons: "tap [the Share button]", "tap [the Info button]", "tap [the Edit button]", "Delete: Tap [the Delete button]", "tap [the More button]". They do not say where these buttons sit, and the screenshots were blocked. The alt text of the viewer screenshot says only: "An open photo with thumbnails of other photos across the bottom of the screen. At the top left is a Back button to go back to browsing." I found no Favorite (heart) button in any iOS 27 Photos page I read. https://support.apple.com/guide/iphone/view-photos-and-videos-iph3d267610/27/ios/27 , https://support.apple.com/guide/iphone/get-started-with-photos-iphc259d0ac7/27/ios/27 , https://support.apple.com/guide/iphone/delete-or-hide-photos-and-videos-iphb4defbde9/27/ios/27
- **New: the viewer has a thumbnail strip and a Back button.** "Swipe left or right on the photo to keep browsing, or swipe the thumbnails below the photo to quickly jump forward or back." "Tap [the Back button] to close the photo". In the iOS 18 version of the same page the exit was "a Close button" "At the top right". So iOS 26 and 27 moved the exit to a Back button at the top left. https://support.apple.com/guide/iphone/view-photos-and-videos-iph3d267610/18/ios/18 , https://support.apple.com/guide/iphone/view-photos-and-videos-iph3d267610/26/ios/26
- **Info: Verified, with more detail.** "Tap the photo or video whose metadata you want to see, then swipe up or tap [the Info button]." The panel lists people and pets, "A caption field to describe the photo or video, and make it easier to find in Search", Visual Look Up items, "Event information for photos and videos taken at concerts or sporting events", the device, date and time ("tap Adjust to edit"), camera metadata, the place ("tap the link to view the location in Maps; tap Adjust to edit the location"), who shared it, and "What albums the photo is in". To close: "Swipe down or tap [the Info button]". https://support.apple.com/guide/iphone/see-photo-and-video-information-iph0edb9c18f/27/ios/27
- **New: keywords also live in Info.** "Tap [the Info button] or swipe up on the image. Tap Add Keywords". https://support.apple.com/guide/iphone/add-keywords-hq2498vl3iq1/27/ios/27
- Caption is not drawn on the image (first pass, from AppleToolbox and MacRumors). **Unverified as worded**: Apple describes the caption only as a field in Info that makes the photo "easier to find in Search". It never says the caption is shown on the photo. The same Apple page doesn't say it isn't. Sharing does carry it: "Sharing a photo or video includes sharing its associated metadata, such as date and time, location, device, and captions." https://support.apple.com/guide/iphone/share-photos-and-videos-iphf28f17237/27/ios/27
- iOS 26 ticket button for recognised events (MacStories). **Unverified** (MacStories was not loaded). Apple's Info page confirms the event data ("Event information for photos and videos taken at concerts or sporting events") but does not mention a toolbar button.
- Delete goes to Recently Deleted for 30 days. **Verified**: "Deleted photos and videos are kept in the Recently Deleted collection for 30 days before being permanently removed from all devices." https://support.apple.com/guide/iphone/delete-or-hide-photos-and-videos-iphb4defbde9/27/ios/27
- **The "…" (More) menu: Resolved** (first pass had no source). Apple's pages name these items under the viewer's More button:
  - Hide: "Hide: Tap [the More button], then tap Hide." (delete-or-hide page above)
  - Duplicate and Copy: "Open a photo or video, then tap [the More button]. Tap Duplicate." / "Tap Copy". https://support.apple.com/guide/iphone/duplicate-and-copy-photos-and-videos-iph1d6b0a5cf/27/ios/27
  - Adjust Info (date, time, place): "Tap a photo or video to open it, then tap [the More button]. Tap Adjust Info, then tap Adjust Date & Time or Adjust Location." (Info page above)
  - Add To (album): "tap a photo or video to view it in full screen ... Tap [the More button], tap Add To, then tap Album, Shared Album, or create a new one." https://support.apple.com/guide/iphone/add-delete-find-photos-videos-albums-iphee7aff030/27/ios/27
  - Don't Feature a Person: "Open a photo of the person ... Tap [the More button], then tap Don't Feature a Person." https://support.apple.com/guide/iphone/hide-people-memories-and-holidays-iph10a9dd2a1/27/ios/27
  - The full menu order and any other items are **unverified** (no page lists the whole menu).
- **New (iOS 27): star ratings.** "Use star ratings to rank your photos and videos from 1 to 5 stars." They are off by default ("Turn on Show Ratings Controls"); when on, the viewer gains an "Unrated" button, ratings show "in the top-left corner of an image in your photo library grid", and the library can be filtered by rating. https://support.apple.com/guide/iphone/apply-star-ratings-c64zplz6wcgr/27/ios/27 , https://support.apple.com/guide/iphone/sort-and-filter-the-photo-library-iph2e66e2f2c/27/ios/27

**Chrome over media and when it hides**
- A single tap hides or shows the interface. **Verified** (current guide): "To focus on the photo you're viewing, tap it to hide the controls onscreen. Tap it again to show the controls." The history (iOS 18.0 changed it, 18.2 restored it) is **unverified**; it rests on TechRadar and 9to5Mac, which I did not load. https://support.apple.com/guide/iphone/view-photos-and-videos-iph3d267610/27/ios/27
- Video playback controls. **Partly verified.** Screenshot alt text: "An open video with a Play/Pause button, a progress bar, and a Mute/Volume button along the bottom." Text: "you can pause the video, or drag the gray bar to go forward or back". The page does not say whether the controls stay until tapped. (Same page.)
- Lesson from iOS 18.0/18.1 (complaints about the hidden scrubber, partly reversed). **Unverified**: press sources only (9to5Mac, AppleInsider), not loaded.

**Grouping**
- iOS 18: one scrolling page with Customize and Pin. **Superseded** for the current version; see below.
- iOS 26/27 tabs. **Resolved**: three. Album screenshot alt text: "At the bottom of the screen, from left to right, are the Library, Collections, and Search buttons." https://support.apple.com/guide/iphone/create-and-work-with-photo-albums-iphc0fc668ab/27/ios/27 . The collapse into a floating Liquid Glass control is **unverified** (press only).
- **New:** Collections can be reordered, resized and collapsed ("Reorder collections: Tap Reorder, touch and drag"; "Hide the collection tiles: Tap Collapse All"), and there is a user-edited "Pinned" collection. "To quickly add a collection to Pinned, touch and hold it, then tap Pin." https://support.apple.com/guide/iphone/browse-your-photo-collections-iph4f36c4148/27/ios/27
- **New:** the Library tab has "Years or Months" (and All) buttons at the bottom to jump through time. https://support.apple.com/guide/iphone/browse-your-photo-library-iph7d24753a5/27/ios/27

**Memories (resurfacing)**
- Where they live. **Verified**: "Tap Collections. Swipe left under Memories ... or tap Memories to view them all." A memory opens first as a grid; "Play the memory movie: Tap [the Play button]." https://support.apple.com/guide/iphone/view-your-memories-iphd4f70e68f/27/ios/27
- Controls during playback. **Corrected.** The first pass (from an iOS 13 page) said swiping changes the mood. In iOS 27, swiping moves through the movie: "Go backward or forward: Swipe left or right. Or tap the screen, then slide the frames at the bottom of the screen". Pausing is "Tap the screen, then tap [the Pause button]" (not hold). Screenshot alt text: "At the bottom of the screen are the Memory Mixes and Browse buttons. At the top of the screen are the Back, Mute, and More buttons. At the top center of the screen are the location of the photo and the name of the song playing." https://support.apple.com/guide/iphone/play-memory-movies-iphee2ee53fe/27/ios/27
- Look, music, length, photos. **Verified, with updated names.** "Memory Looks are curated combinations of different songs, pacing, and styles" (tap the screen, then Customize, then Customize Look, then swipe). Length: "you can change its length to short, medium, or long" (Customize, then Transition and Duration). Add, remove and reorder photos with Browse. The title is edited from the memory's More button. https://support.apple.com/guide/iphone/personalize-your-memory-movies-iph1a5832438/27/ios/27
- Apple Intelligence memory from a description. **Verified**: "Just type a description, and Apple Intelligence finds the best photos and videos, crafts a storyline with unique chapters and a narrative arc, and sets it to music." (Collections, Memories, Create). (play-memory-movies page above)
- "No official way to turn off the music." **Corrected.** There is a Mute button while a memory plays: "Mute: Tap the screen, then tap [the Mute button]." I found no setting that turns music off for all memories (Google has one; see §4). (play-memory-movies page above)
- **New: how resurfacing is turned down or off.**
  - Off entirely: "Tap Collections. Tap your account in the top-right corner. ... Turn off Show Featured Content to prevent Photos from automatically generating featured photos and memories." Holidays: "Turn off Show Holiday Events". https://support.apple.com/guide/iphone/hide-people-memories-and-holidays-iph10a9dd2a1/27/ios/27
  - From the memory itself: "Touch and hold a memory, then tap Feature Less", then "Feature This Day Less", "Feature This Place Less" or "Feature a Person Less". "Touch and hold a memory, then tap Delete Memory." Undo: "Reset Suggested Memories". https://support.apple.com/guide/iphone/share-or-delete-memories-iph2af67b000/27/ios/27
  - A person: More, then "Don't Feature a Person", then "Feature This Person Less or Never Feature This Person". (hide-people page above)
  - **New:** memories can be marked as favourites: "Touch and hold a memory, then tap Add to Favorite Memories." (view-your-memories page above)

**Reply or link to another item:** none found. (inference, from finding no such feature in the Photos pages I read; the iOS 27 guide's Photos pages contain no linking or reply feature.)

**One-handed use:** Info opens with a swipe up and closes with a swipe down; tap toggles the controls; the tab buttons are at the bottom. The exit is a Back button at the top left, which is out of thumb reach for a right hand (inference). Edge-swipe back is not mentioned on these pages.

---

## 2. Apple Journal (iOS)

**Entries and capture**
- Bottom toolbar of a new entry (suggestions, photo library, camera, audio, location, State of Mind). **Partly verified.** Apple names these buttons while composing: "the Choose Photo or Video button", "the Take Photo or Video button", "the Locations button", "the Record Audio button", "the Add Drawing button", "the Format button" and "the Show Writing Prompts button" ("in the toolbar"). State of Mind appears as an attachment type ("State of Mind tiles"). The order, the position (bottom) and the tree icon are **unverified**. https://support.apple.com/guide/iphone/add-formatting-photos-and-more-iph492ee70a8/27/ios/27 , https://support.apple.com/guide/iphone/write-in-your-journal-iph9824e83ce/27/ios/27
- Audio transcription. **Verified, with a limit**: "You can record audio and have your words transcribed in a journal entry. Audio transcription is available in English only (excluding Singapore and India locales)." The transcript goes into the text only when you ask: "tap [the More button], then tap Add Transcript to Entry." (add-formatting page above)
- The **+** opens suggestions, prompts and a blank option. **Verified, and it can be switched off.** "Choose a journal, then tap [the Create an Entry button]. Start writing or choose a journaling suggestion or reflection prompt." To skip the chooser: "Create new entries without viewing suggestions or prompts: Go to the Settings app, tap Apps, tap Journal, then turn off Show Suggested Moments or Get Writing Prompts." That the sheet is full-screen is **unverified**. (write-in-your-journal page above), https://support.apple.com/guide/iphone/change-journal-settings-iphf965002cf/27/ios/27
- **New: capture entry points outside the app.** Home Screen: "touch and hold [the Journal app]. Choose New Entry, View Suggestions, Add Photos, or Record Audio." From another app's Share sheet: "tap Share, then tap Journal". (write-in-your-journal page above)
- **New: attachments are a grid above the text and can be moved inline.** "Add photos or videos to the grid or inline with text"; "View an attachment in full screen: Tap the thumbnail." (add-formatting page above)

**Moments it surfaces (Journaling Suggestions)**
- The user chooses which suggested items go in. **Verified**: "To start a new entry with all the suggested attachments, tap [the Journal Now button]"; or "tap the suggestion" then "Tap an attachment to select or deselect it", then "Add to Entry". A suggestion can be removed: "touch and hold the suggestion, then tap Remove." (write-in-your-journal page above)
- Turning suggestions off or limiting them. **Verified, path updated**: "Go to the Settings app, tap Privacy & Security, tap Journaling Suggestions, then turn any of the categories on or off." "data used for suggestions is private and stored on your iPhone." Notifications are separate: "Settings, Notifications, Journaling Suggestions". The "clear history" option is **unverified** (not on this page). The Journaling Suggestions API for other apps was not re-checked (developer.apple.com not tried). (change-journal-settings page above)
- Early reviewers found suggestions not very relevant. **Unverified** (AppleInsider not loaded).
- No throwback or "on this day" view at launch. **Unverified** (MacStories, Digital Trends not loaded). The current guide does not describe one; the nearest is the Insights calendar ("tap Insights, then tap a date on the calendar"). https://support.apple.com/guide/iphone/view-and-search-journal-entries-iph6257be047/27/ios/27

**Grouping and search**
- Multiple journals and Places. **Verified**: "Tap [the New Journal button], then name the new journal." "You can see your entries based on their location with the map view ... tap Places." "Entries that include a location, or photos with location information, are added to the map." (write-in-your-journal and view-and-search pages above)
- Search filters and sort. **Verified, corrected in detail.** "Tap [the Search button], then choose a category such as Photos or Reflections or type the text you're looking for." "Sort entries: Tap [the More button], tap Sort By, then choose Entry Date or Moment Date." Bookmarked is a search category: "tap [the Search button], then tap Bookmarked." (view-and-search page above). So the filters are under Search, and sorting is under More.
- **Insights with streaks and word counts: Verified** (the first pass flagged this). "Tap [the Journals Back button] to see your current streak—the number of consecutive days or weeks you've journaled—along with other insights." Screenshot alt text: "the current streak and metrics like number of words written." The widget can show "your current streak". This is a pattern Chronicles must not copy. https://support.apple.com/guide/iphone/build-a-journaling-habit-iph70107aec2/27/ios/27
- **New: bookmarking an entry is a swipe right.** "Swipe right on an entry, then tap [the Bookmark button]." (view-and-search page above). In Messages, swipe right means reply (§6). (inference: the same gesture means different things across Apple apps.)
- A user said the Places map is hard to use. **Unverified** (AppleVis not loaded).

**Reply or link:** none found in the iOS 27 Journal pages (write, add formatting, view and search, settings, habit). Not confirmed absent; no page says linking is impossible.

---

## 3. Day One

**Capture**
- Tap **+** opens a new entry; long press opens the other options. **Verified, date corrected.** Current guide: "Tap the + icon at the bottom of the screen to start a new entry. Media icons are displayed when the entry is first opened. Tap these to add media or start typing and they will hide." https://dayoneapp.com/guides/day-one-ios/creating-entries-in-day-one-for-ios/ . The long press came in **2024.13 (24 June 2024)**, not June 2026: "Long-press the + button to show the full New Entry menu". https://dayoneapp.com/guides/release-notes/ios-release-notes/
- **New: this pattern has been tried and reverted before.** Version 3 (2018): "Tab Bar Plus button now opens a new entry directly, long press for additional New Entry options". Version 3.2 (October 10, 2018): "Tab Bar Plus button immediately shows Action Sheet (as it was prior to v3)". It came back in 2024.13. (release notes above)
- **New: the + can move sides.** 2024.14 (8 July 2024): "Enhanced UI with the ability to move the new entry button to the opposite side of the screen for improved accessibility". (release notes above)
- Quick Start list and the Lock Screen widget. **Verified.** "To add a new entry go to More > Quick Start." The list is Photos, Prompts, Templates, Today, Audio, Camera, Video, Draw, Scan Text, Scan to PDF, File, Suggestions; the user can reorder it ("tap 'Edit', then tap the handle and drag"). Lock Screen widget, 2025.15 (21 Jul 2025): "New lock screen 'Quick Entry' widget: Tap + to start a new journal entry." (creating-entries guide and release notes above)
- Forum complaints after redesigns. **Unverified** (forums.dayoneapp.com refused the connection).

**On This Day**
- Shows entries, photos and locations from the same date in earlier years; reached from the More tab or a Calendar date. **Verified**: "Revisit past entries, photos & videos, and locations from over the years." https://dayoneapp.com/features/on-this-day/ . "Click on the More tab with three dots on the bottom right corner to access On This Day view"; "Tap any date in Calendar to open the Today view. On This Day is at the bottom of the Today view." https://dayoneapp.com/guides/tips-and-tutorials/on-this-day-view/
- Off per journal. **Verified**: "On This Day can be disabled per journal. ... Tap Advanced > Hiding options and make sure Show in On This Day is enabled." **New:** notifications are a separate setting: "On This Day notifications can be adjusted in Day One > Settings > On This Day. Specific journals can be enabled/disabled here. The reminder time can be selected." (on-this-day-view guide above)
- On the web since September 2025. **Verified, but the guide disagrees.** The release post (September 9, 2025): "You'll see a new Today tab. Click the On This Day button to reveal your entries." https://dayoneapp.com/releases/on-this-day-now-available-on-web/ . The guide still says "On This Day view is not available on Web or Windows apps yet." (on-this-day-view guide above). The guide is probably stale (inference).
- **New:** "On This Day excludes entries on current day", and there is an On This Day map ("On This Day now shows a map of all entry locations from past years"). (release notes above)

**Views and grouping**
- List, Calendar, Media, Map. **Verified**: "You can view your List, Calendar, Media, and Map. ... The view options are along the top of the app." List: "Entries on the same date will be under one date heading". Media: "filter between Photos, Video, Audio, and PDF entries". Map: "Tap on the pins to view the entries associated with those locations." https://dayoneapp.com/guides/day-one-ios/journal-views-in-day-one-for-ios/ . Starting an entry from the map: "Long press a location in the Map view to create a new entry at a specific location" (creating-entries guide above).
- **Tags: Corrected in detail.** iOS: "While creating an entry, tap More above the keyboard and tap 'Tag'. Type a new tag or choose from existing tags ... Tap any highlighted tag to remove it from the entry." Hashtags in the text also become tags. Tags can be added from the list by swiping an entry. https://dayoneapp.com/guides/tips-and-tutorials/tagging-guide/ . The editing guide puts tags under the paper clip: "Tap the paper clip icon to access options to add photos, ... add tags". https://dayoneapp.com/guides/day-one-ios/editing-and-formatting-entries-in-day-one-for-ios/ . Any/All is **verified** in release notes 7.19 (31 October 2022): "You can choose whether to filter the timeline with entries that contain either any or all of the selected tags". The magnifier at the top right is **unverified** (help.dayoneapp.com refused the connection; the dayoneapp.com search guide URL I tried returned 404).
- Day One's timeline as a summary vs Apple Journal's timeline as the only reader. **Unverified** (MacStories not loaded).

**Viewer (photos in an entry)**
- **Partly resolved.** No guide describes a full-screen photo viewer. What the pages say: in the editor, "long press on any photo for options to Cut, Copy, Share, Favorite, Insert Text Below, Rotate Left, and Delete." https://dayoneapp.com/guides/getting-started-with-day-one/adding-media-in-day-one/ . Release notes: 6.0 (March 16, 2021) "Redesigned photo viewer to give you easier access to photo information and actions"; 2023.5 "Videos can now be viewed full-screen with a single tap on the video". The layout of that viewer is **unverified**.
- **New: no caption field.** "Day One does not have a separate caption field stored with a photo's metadata. To caption a photo ... you insert a line of text directly below that photo in the entry." (adding-media guide above)

**Reply or link: Resolved. Entries can link to each other (since 2026.13).** "Entries can be linked to each other using the link picker while writing an entry (version 2026.13 and later), or by copying a link to an entry and pasting it into another." On iOS: "Select the text you want to turn into a link. Tap the link button in the formatting bar ... Start typing the title of the entry you want to link to. ... Tap the entry you want to link to." Release note 2026.13 (22 June 2026): "The link picker now lets you link to other entries." https://dayoneapp.com/guides/tips-and-tutorials/linking-journal-entries/ . The guide does not mention backlinks (whether the target entry shows that something links to it). (inference: it is a link inside text, not a reply attached to an item.)

---

## 4. Google Photos (Android and iOS)

**Viewer**
- Bottom bar Share, Edit, "Add to", Trash; date, time and place at the top (9to5Google, 2025). **Partly verified.** Google's pages say "At the bottom, tap [Share]" and "At the bottom, tap Edit" for an open photo. https://support.google.com/photos/answer/6220402?hl=en&co=GENIE.Platform%3DAndroid , https://support.google.com/photos/answer/6128850?hl=en&co=GENIE.Platform%3DAndroid . Trash "At the bottom" is documented after selecting from the grid, not explicitly in the viewer (https://support.google.com/photos/answer/6128858?hl=en&co=GENIE.Platform%3DAndroid). "Add to" in the viewer's bar and date and place on top of the photo are **unverified** (no Google page describes them; 9to5Google was not loaded).
- Everything else in the three-dot menu, which is **at the top**. **Verified.** Archive: "Select a photo. At the top, tap More. From the drop down, tap Archive." https://support.google.com/photos/answer/7362432?hl=en&co=GENIE.Platform%3DAndroid . Lens: "At the top, tap More, then Google Lens". https://support.google.com/photos/answer/7539151?hl=en&co=GENIE.Platform%3DAndroid . About: "At the top, tap More, then About. Alternatively, you can swipe up." (edit page above). "Delete from device": "At the top, tap More, then Delete from device." (delete page above)
- Swipe up shows details. **Verified**: "Tap More. Alternatively, you can swipe up to view the photo details. Tap Add a caption…." https://support.google.com/photos/answer/6191058?hl=en&co=GENIE.Platform%3DAndroid . So the caption is also reached from the details.
- The bar floats as a pill (TechNerdiness). **Unverified** (one third-party source, not loaded; no Google page says so).
- Older change: action buttons moved into a pop-up. **Unverified** (Android Central not loaded).
- **New:** a video's "Key moment" button finds up to three segments and offers "Create clip" or "Share moment". https://support.google.com/photos/answer/16570890?hl=en&co=GENIE.Platform%3DAndroid

**Memories (resurfacing)**
- Story carousel gestures. **Verified**: "At the top, tap a featured memory. To move to the next or previous photo: Tap or swipe right or left. To skip to the next or previous memory: Swipe up or down. To pause on a photo: Touch and hold it." https://support.google.com/photos/answer/9454489?hl=en&co=GENIE.Platform%3DAndroid
- How to turn it down or off. **Verified, and more complete than the first pass.**
  - Off entirely: "Photos settings, then Preferences, then Memories, then Memory types. Turn off Time-based memories and Themed memories", and turn off each kind of creation.
  - Hide people and pets: "Preferences, then Memories, then Hide faces", with "Show less" or "Blocked".
  - Hide dates: "Preferences, then Memories, then Hide dates."
  - From inside a memory: "Tap More, then Hide, then Hide this date from all memories"; "To hide a memory: Tap Remove this memory"; "To hide a photo from a memory: Tap Remove this photo from this memory."
  - Notifications only: "If you still want to view featured memories, but don't want to be alerted when a new memory is available, you can turn off your memories notifications."
  (all on the 9454489 page above). The AndroidPolice source was not needed.
- **New: music.** Per memory: "At the bottom, tap Volume." For all: "Preferences, then Memories. Turn Background music off." (9454489 page above)

**Grouping**
- Collections, albums and the three tabs (Photos, Collections, Search). **Verified in substance**: "At the bottom, tap Photos"; "At the bottom, tap Search"; "At the bottom, tap Collections, then Trash". (getting-started page above). The 2024 rename history is **unverified** (press only).
- Memories feed renamed Moments, under Collections. **Verified in substance**: "At the bottom, tap Collections, then Moments, then Add." https://support.google.com/photos/answer/6128849?hl=en&co=GENIE.Platform%3DAndroid . The memories page distinguishes "the featured memories carousel" (top of the Photos view) from "Moments" (album highlights): "Changes you make to these settings only apply to the featured memories carousel, not in Moments." (9454489 page above)
- October 2026 "Pinned" section. **Unverified** (9to5Google not loaded).

**Reply or link:** none for your own items. (inference) Shared albums and conversations are social features, out of scope for Chronicles.

---

## 5. Polarsteps

All Polarsteps claims stay **unverified**. `www.polarsteps.com`, `stories.polarsteps.com`, `polarsteps.helpscoutdocs.com` and `apps.apple.com` were refused by the proxy (one try each), and `support.polarsteps.com` was not tried, as instructed. The first-pass text is kept unchanged as leads.

- Automatic route tracking on a world map; each step is "pinned to a time and place on the map" with photos, video, text and tips. https://apps.apple.com/us/app/polarsteps/id947925763 , https://stories.polarsteps.com/stories/how-to-capture-your-polarsteps-trip-your-way (unverified)
- Adding a step: the **+** on the timeline adds the current location (ongoing trips); suggested steps appear after visiting a new place; or tap a white dot on the map. https://support.polarsteps.com/article/71-how-to-i-add-edit-steps (unverified)
- Photos are not added automatically: Edit Step, then the camera icon or "Add your best photos"; Suggestions, Your library or More; drag to reorder; no per-photo captions. https://polarsteps.helpscoutdocs.com/article/72-how-do-i-add-photos , https://support.polarsteps.com/article/291-how-to-add-new-images-to-your-step (unverified)
- Photos can be moved between steps. https://support.polarsteps.com/hc/en-us/articles/36497088196242-How-to-move-photos-between-steps (unverified)
- User complaints: the path is "invisible because of all the photos"; straight lines between steps; the profile map hidden behind UI. https://apps.apple.com/au/app/polarsteps/id947925763 , https://onthegosolo.com/?p=765 (unverified)
- Followers can like and comment; not in the printed Travel Book. https://polarsteps.helpscoutdocs.com/article/162-are-comments-likes-and-spots-also-shown-in-the-travel-book (unverified)
- Step detail layout and swiping between steps: still unknown.

---

## 6. Replies to a specific item: Apple Messages (iMessage) and Slack

**iMessage**
- **Starting a reply: Verified.** "Do one of the following: Swipe right on the message bubble that you want to reply to. Touch and hold the message bubble that you want to reply to, then tap Reply." https://support.apple.com/guide/iphone/send-and-reply-to-messages-iph82fb73ba3/27/ios/27 . The iOS 17 and iOS 14 dates and "iMessage only, not SMS" are **unverified** (press only; the page does not restrict it).
- **Showing it: Partly verified.** "An inline reply quotes the message you're responding to. This keeps a busy conversation organized by clarifying which response relates to which message." The focused view is confirmed by the way out: "To return to the main conversation, tap the blurred background." In a group, "Everyone in a group conversation can see your inline reply." (same page). The faded connecting line, the "1 Reply" / "X Replies" label under the original, and the pop-up opened from that label are **unverified**: Apple's page does not mention them and MacRumors was refused.

**Slack**
- **Starting a reply: Verified, mobile corrected in detail.** Desktop: "Hover over the message you'd like to reply to. Click the Reply in thread icon." Mobile: "Tap the message you'd like to reply to. Tap Reply in Thread, or tap the Add a reply field to add to an existing thread." Also send to the channel: "If you'd like to send your reply back to the channel or DM's main view, check the box below your message." Later: "tap and hold the thread reply (on mobile) and select Send reply to this channel." https://slack.com/help/articles/115000769927
- How a thread shows under its parent in the channel (avatars and count). **Unverified**: the help page does not describe it (its screenshot alt text is only "A thread to keep discussion organized in Slack"), and the Computerworld source was not loaded.
- The Threads view. **Verified**: "From Home, tap Threads at the top of your screen to see all the conversations you're following. Threads with unread replies will appear at the top of the list." From it you can "Reply to any thread", "Select a thread to open it in the original conversation", or "Unfollow a thread". (same page)
- **New:** per-thread notifications: "Tap the thread. Tap the three dots icon below the original message. Select Get Notified about New Replies ... or Turn Off Notifications for Replies." (same page)

---

## 7. Apple Voice Memos

- Record, list, play, trim, folders. **Verified.** "Tap [the Record button] to begin recording." "Tap [the Stop button] to stop recording." Pause and resume: "Tap [the Pause button] to stop recording; tap Resume to continue." Trim: "tap [the Edit Recording button]. Tap [the More button], then tap [the Trim button]." Folders: "Select one or more recordings, tap [the More button], tap Move to Folder". "All Recordings" is the main list. https://support.apple.com/guide/iphone/make-a-recording-iph4d2a39a3b/27/ios/27 , https://support.apple.com/guide/iphone/edit-or-delete-a-recording-iphc9bdaee83/27/ios/27 , https://support.apple.com/guide/iphone/organize-recordings-iph73bfaba07/27/ios/27
- Playback speed, Skip Silence, Enhance Recording. **Verified**, under "tap [the More button], then tap Options". "The setting you choose for a recording stays with that specific recording". https://support.apple.com/guide/iphone/play-it-back-iphebbd067ce/27/ios/27
- Transcripts. **Verified, sources no longer disagree.** "Speech in your audio recordings can be transcribed to text in Voice Memos. You can view the transcription while you're recording or after." "Tap [the More button], then ... Choose View Transcript ... Choose Copy Transcript." Limited to "iPhone 12 or later" and listed languages. Search covers transcripts: "The list shows only recordings with that text—either in the title or in the audio transcription." https://support.apple.com/guide/iphone/view-a-transcription-iph00953a982/27/ios/27
- Capture without opening the app. **Action button verified**: the action list includes "Voice Memo: Record personal notes, musical ideas, and more." "To perform the action assigned to the Action button, press and hold the Action button." https://support.apple.com/guide/iphone/use-and-customize-the-action-button-iphe89d61d66/27/ios/27 . Whether it works while locked is **unverified** (the page does not say). The Control Center and Lock Screen controls and Siri are **unverified**: the Control Center page explains "Add a Control" but does not list Voice Memos in the text I read (https://support.apple.com/guide/iphone/use-and-customize-control-center-iph59095ec58/27/ios/27). **New:** while recording, other apps can be used and "you can see your recording in progress in the Dynamic Island". (make-a-recording page above)
- **Recordings named after their location: Resolved, verified.** "Your recording is saved with the name New Recording or the name of your location, if Location Services is turned on". (make-a-recording page above, and https://support.apple.com/guide/iphone/search-for-or-rename-a-recording-iph0e546e6ec/27/ios/27)
- **New:** "Deleted recordings move to the Recently Deleted folder, where they're kept for 30 days by default", and the period can be changed (Settings, Apps, Voice Memos, Clear Deleted). (edit-or-delete page above)

---

## Synthesis

Changes from the first pass are marked **[changed]**.

| Job | Common pattern | Exceptions | Chronicles should copy | Chronicles should not copy |
|---|---|---|---|---|
| (a) Capture, one tap, one hand | One primary **+** or Record button. **Tap = default capture; long press = the other types** (Day One, verified; since June 2024). **[changed]** System entry points outside the app: the Action button (Voice Memos, verified), Home Screen quick actions (Journal: New Entry, View Suggestions, Add Photos, Record Audio, verified), a Lock Screen widget (Day One, verified), the Share sheet (Journal). **[changed]** Voice Memos names a recording after the place (verified). | Journal shows suggestions and prompts first but lets the user turn that off in Settings. **[changed]** Day One once shipped tap-to-entry (2018), reverted it within months to an action sheet, then brought long press back in 2024: the pattern is contested. **[changed]** Polarsteps does not take photos into a step until you edit it (unverified). | One capture button: tap does the default capture, long press opens the other types; the long press must have a visible alternative, since Day One reverted the pattern once (inference). **[changed]** Keep each type one step away. Name a capture after where it was made by default, as Voice Memos does (inference). A Lock Screen or Action button entry later, as a native question. Consider letting the button sit on either side, as Day One does for accessibility. **[changed]** | A suggestions or prompt sheet before every capture. Prompts that push the user to write. |
| (b) View one moment full screen | **Media first; tap toggles all controls** (Apple, verified). **[changed]** Primary actions are few and named (Apple: Share, Info, Edit, Delete; Google: Share and Edit "at the bottom"). **The overflow menu holds the rest: Google puts More "at the top"** (verified); Apple's More holds Hide, Duplicate, Copy, Add To, Adjust Info, Don't Feature a Person (verified; its position is not stated). **[changed]** **Swipe up for details; swipe down closes them** (both, verified). Captions and keywords live in the details panel, not on the image (Apple, Google). **[changed]** Apple adds a thumbnail strip at the bottom and a Back button at the top left. **[changed]** | Google reportedly puts date and place on top of the photo (unverified). **[changed]** Apple's event button (unverified). Apple iOS 27 adds 1 to 5 star ratings, off by default (verified). **[changed]** Day One has no caption field; text goes below the photo. **[changed]** | Place and time as one quiet line, but in the details panel reached by swiping up, not only on top of the image, until a source confirms Google's overlay (inference). **[changed]** A short row of named actions within thumb reach; the overflow "…" for the rest. Close with a swipe down or a Back control the thumb can reach, since Apple's Back is top-left (inference). **[changed]** Tap hides everything. **Replace the floating row of reply buttons with one "Reply" action** that opens the capture choice (tap = default, long press = type) (inference). | Several action buttons floating over the image. **Star ratings or a Favorite heart** (Apple iOS 27 ratings "rank your photos", verified): a score by another name. **[changed]** Hiding the video scrubber (press reports, unverified). |
| (c) Reply to a moment; thread across days | **Start:** swipe right on the item, or touch and hold, then Reply (iMessage, verified); tap the item, then "Reply in Thread", or type into an existing thread's "Add a reply" field (Slack mobile, verified). **[changed]** **Show:** the reply **quotes the original**, and the reply view is a focused layer over a blurred conversation, left by tapping the blur (iMessage, verified). **[changed]** A list of all threads, unread first (Slack, verified). | **Day One now links entry to entry** (2026.13, verified): select text, then pick an entry; no backlinks documented. **[changed]** Photos, Journal and Google Photos have no item-to-item reply (none found). Journal uses swipe right for Bookmark, so the gesture is not universal (verified). **[changed]** The "X Replies" label and connecting line in iMessage are unverified. **[changed]** | In the viewer: one Reply action; in feeds, swipe right or long press. The reply shows a small quote of the moment it answers, like iMessage (inference). **[changed]** A focused thread view that dims the rest and closes on a tap outside. A list of named threads, like Slack's Threads view, ordered by recent activity rather than a count (inference). **[changed]** A quiet line under the original that opens the thread, in words, not a number. | **A count label like "3 Replies"**: say it in words through `lib/quietLines` or not at all. Participant avatars. Slack's "also send to channel" checkbox. A text-only link (Day One style) as the only connection: it hides the thread from the original (inference). **[changed]** |
| (d) Feed, Lately, a year ago today | Reverse-chronological list under **date headings** (Day One, verified). Resurfacing: an "On this day" view (Day One, verified; excludes today), a memories carousel at the top of the photo grid (Google: tap to advance, **hold to pause**, swipe up or down for the next memory, verified), Apple's Memories under Collections (verified). **[changed]** **Ways to turn it off are layered:** a global off (Apple "Show Featured Content", Google "Memory types", Journal "Show Suggested Moments"); per source (Day One per journal); **from the item itself** (Apple long press, "Feature This Day/Place/Person Less", "Delete Memory"; Google More, "Hide this date from all memories", "Remove this memory", "Remove this photo"); and **notifications separately** (Google, Day One, Journal). Music can be muted per memory (Apple, Google) or globally (Google). **[changed]** | Journal's Insights shows **streaks and word counts** (verified). **[changed]** Apple and Google make movies with music and Apple Intelligence chapters (verified). | Date-headed feed. One resurfaced moment, labelled in words ("a year ago today"). **An off switch in settings, plus "show this day less" and "don't show this again" on the resurfaced item itself (long press or "…"), plus a separate notification switch** (inference from the three apps). **[changed]** Hold to pause any auto-advancing playback. Sound off unless asked, with a mute control in reach (inference). **[changed]** | Streaks, word counts, activity graphs (Journal Insights, now verified). **[changed]** Auto-made movies with music, "Looks" and chapters; this conflicts with restraint and the fixed five-beat replay (inference). |
| (e) Replay a walk on a map | Map with pins; tap a pin to see its entries (Day One, verified); long press on the map to start an entry there (Day One, verified). **[changed]** A map of places as a browse view (Journal Places, verified). Polarsteps' tracking, steps and route line: unverified. **[changed]** | Polarsteps users reportedly complain that photos hide the path, about straight lines, and a map hidden behind UI (unverified). **[changed]** | Draw the real trace, not straight lines between stops. Keep the route visible above the media: small markers, the photo only on selection (inference; the complaints behind it are unverified). **[changed]** Tap a marker to open the moment. | Covering the map with thumbnails. Likes and comments on steps. |
| (f) Group and search | Tags (Day One: picked from the editor's More or paper clip, toggled off by tapping; Any/All filter, verified), keywords (Apple iOS 27, in Info, verified), albums and collections with a user-pinned section and reorder (Apple, verified), multiple journals (Journal, verified). Search with categories (Journal: Photos, Reflections, Bookmarked) and type filters (Day One Media: Photos, Video, Audio, PDF). Map as a browse view. Search covers transcripts (Voice Memos, verified). **[changed]** | Apple lets the user collapse, resize and reorder collections (verified). **[changed]** | User-named threads as the grouping. Filters for type, place and date. Map as one way to browse. Search that reaches voice transcripts, if Chronicles transcribes on device (inference). **[changed]** | Counts on collections or albums; say them in words or leave them out. A rating filter (Apple iOS 27). **[changed]** |

**Synthesis recommendations that changed**
1. **(b) Where the viewer's actions live.** The overflow menu is at the top in Google (verified), and Apple's exit is a Back button at the top left. Recommendation now: primary named actions in a bottom row, close by swiping down (thumb reach), details by swiping up. Place and time go in the details panel unless a page confirms Google's on-photo overlay. Star ratings and favourites are added to "do not copy".
2. **(c) How a reply is started and shown.** The verified iMessage pattern is "swipe right or touch and hold, then Reply", with the reply quoting the original in a focused view closed by tapping the blur. The "X Replies" label is unverified. Recommendation now: the reply shows a quote of its moment; the original carries a quiet line in words. Day One's entry links (2026.13) are a new comparison: linking inside text, which Chronicles should not use as its only thread mechanism (inference).
3. **(d) How resurfacing is turned off.** All three apps give a global switch, a from-the-item "less or remove", and a separate notification switch. Recommendation now: all three layers, and sound muted by default.
4. **(a) Capture.** The tap and long-press pattern dates from 2024, not 2026, and Day One reverted it once in 2018. Recommendation kept, with a visible alternative to the long press; naming captures by place (Voice Memos) added.
5. **(d) Journal Insights** moved from "if real" to verified: streaks and word counts are a confirmed anti-pattern.

**Still unverified after this pass**
- Apple Photos: the order and position of the viewer's buttons; whether a Favorite button exists in iOS 27; the iOS 26 event ticket button; whether video controls stay until tapped; the iOS 18.0 scrubber history; the floating tab control.
- Apple Journal: the order and position of the entry toolbar; whether the chooser is full-screen; "clear history" for suggestions; no throwback view at launch; reviewer and user complaints; whether entries can link (not found, not confirmed absent).
- Day One: the full-screen photo viewer's layout; the search magnifier position; forum complaints; backlinks for entry links.
- Google Photos: "Add to" in the viewer's bottom bar; date and place on top of the photo; the floating pill bar; the October 2026 Pinned section; the 2024 rename history.
- Polarsteps: everything (all hosts refused).
- iMessage: the faded connecting line, the "X Replies" label and its pop-up; the version history; SMS exclusion.
- Slack: how a thread shows under its parent (avatars, reply count).
- Voice Memos: Action button while locked; Control Center and Lock Screen controls; Siri.

---

## URLs used and whether they loaded

**Loaded (HTTP 200) and used**

Apple, iPhone User Guide (iOS 27 unless noted):
- https://support.apple.com/guide/iphone/toc (table of contents, used to find page IDs)
- https://support.apple.com/guide/iphone/view-photos-and-videos-iph3d267610/27/ios/27
- https://support.apple.com/guide/iphone/view-photos-and-videos-iph3d267610/26/ios/26
- https://support.apple.com/guide/iphone/view-photos-and-videos-iph3d267610/18/ios/18
- https://support.apple.com/guide/iphone/see-photo-and-video-information-iph0edb9c18f/27/ios/27 (also reached by redirect from https://support.apple.com/guide/iphone/iph0edb9c18f/ios, the first pass's page ID)
- https://support.apple.com/guide/iphone/add-keywords-hq2498vl3iq1/27/ios/27
- https://support.apple.com/guide/iphone/apply-star-ratings-c64zplz6wcgr/27/ios/27
- https://support.apple.com/guide/iphone/sort-and-filter-the-photo-library-iph2e66e2f2c/27/ios/27
- https://support.apple.com/guide/iphone/delete-or-hide-photos-and-videos-iphb4defbde9/27/ios/27
- https://support.apple.com/guide/iphone/duplicate-and-copy-photos-and-videos-iph1d6b0a5cf/27/ios/27
- https://support.apple.com/guide/iphone/add-delete-find-photos-videos-albums-iphee7aff030/27/ios/27
- https://support.apple.com/guide/iphone/create-and-work-with-photo-albums-iphc0fc668ab/27/ios/27
- https://support.apple.com/guide/iphone/get-started-with-photos-iphc259d0ac7/27/ios/27
- https://support.apple.com/guide/iphone/browse-your-photo-library-iph7d24753a5/27/ios/27
- https://support.apple.com/guide/iphone/browse-your-photo-collections-iph4f36c4148/27/ios/27
- https://support.apple.com/guide/iphone/edit-photos-and-videos-iphb08064d57/27/ios/27
- https://support.apple.com/guide/iphone/share-photos-and-videos-iphf28f17237/27/ios/27
- https://support.apple.com/guide/iphone/interact-with-content-in-a-photo-or-video-iph37fdd714b/27/ios/27
- https://support.apple.com/guide/iphone/view-your-memories-iphd4f70e68f/27/ios/27 (same ID as the first pass's iOS 13 page)
- https://support.apple.com/guide/iphone/play-memory-movies-iphee2ee53fe/27/ios/27
- https://support.apple.com/guide/iphone/personalize-your-memory-movies-iph1a5832438/27/ios/27
- https://support.apple.com/guide/iphone/share-or-delete-memories-iph2af67b000/27/ios/27
- https://support.apple.com/guide/iphone/hide-people-memories-and-holidays-iph10a9dd2a1/27/ios/27
- https://support.apple.com/guide/iphone/write-in-your-journal-iph9824e83ce/27/ios/27
- https://support.apple.com/guide/iphone/add-formatting-photos-and-more-iph492ee70a8/27/ios/27
- https://support.apple.com/guide/iphone/view-and-search-journal-entries-iph6257be047/27/ios/27
- https://support.apple.com/guide/iphone/change-journal-settings-iphf965002cf/27/ios/27
- https://support.apple.com/guide/iphone/build-a-journaling-habit-iph70107aec2/27/ios/27
- https://support.apple.com/guide/iphone/send-and-reply-to-messages-iph82fb73ba3/27/ios/27 (same ID as the first pass's iOS 16 page)
- https://support.apple.com/guide/iphone/make-a-recording-iph4d2a39a3b/27/ios/27 (same ID as the first pass's iOS 16 page)
- https://support.apple.com/guide/iphone/play-it-back-iphebbd067ce/27/ios/27
- https://support.apple.com/guide/iphone/view-a-transcription-iph00953a982/27/ios/27
- https://support.apple.com/guide/iphone/edit-or-delete-a-recording-iphc9bdaee83/27/ios/27
- https://support.apple.com/guide/iphone/organize-recordings-iph73bfaba07/27/ios/27
- https://support.apple.com/guide/iphone/search-for-or-rename-a-recording-iph0e546e6ec/27/ios/27
- https://support.apple.com/guide/iphone/use-and-customize-the-action-button-iphe89d61d66/27/ios/27 (same ID as the first pass's page)
- https://support.apple.com/guide/iphone/use-and-customize-control-center-iph59095ec58/27/ios/27

Google Photos Help (Android tab unless noted):
- https://support.google.com/photos/answer/9454489?hl=en (computer tab) and https://support.google.com/photos/answer/9454489?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/?hl=en (index, used to find answer IDs)
- https://support.google.com/photos/answer/6220402?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/6128850?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/6128858?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/7362432?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/7539151?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/6191058?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/6128849?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/10688442?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/16570890?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/15532903?hl=en&co=GENIE.Platform%3DAndroid
- https://support.google.com/photos/answer/14169846?hl=en&co=GENIE.Platform%3DAndroid

Day One:
- https://dayoneapp.com/guides/ (index) and its section pages https://dayoneapp.com/guides/day-one-ios/ , https://dayoneapp.com/guides/tips-and-tutorials/ , https://dayoneapp.com/guides/getting-started-with-day-one/
- https://dayoneapp.com/guides/tips-and-tutorials/on-this-day/ (redirects to https://dayoneapp.com/guides/tips-and-tutorials/on-this-day-view/)
- https://dayoneapp.com/guides/tips-and-tutorials/on-this-day-view/
- https://dayoneapp.com/features/on-this-day/
- https://dayoneapp.com/releases/on-this-day-now-available-on-web/
- https://dayoneapp.com/guides/day-one-ios/journal-views-in-day-one-for-ios/
- https://dayoneapp.com/guides/journal-views-in-day-one-for-macos/ (redirects to https://dayoneapp.com/guides/tips-and-tutorials/journal-views-in-day-one-for-macos/)
- https://dayoneapp.com/guides/day-one-ios/creating-entries-in-day-one-for-ios/
- https://dayoneapp.com/guides/release-notes/ios-release-notes/
- https://dayoneapp.com/guides/tips-and-tutorials/tagging-guide/ (stands in for the blocked help.dayoneapp.com tagging guide)
- https://dayoneapp.com/guides/tips-and-tutorials/linking-journal-entries/
- https://dayoneapp.com/guides/getting-started-with-day-one/adding-media-in-day-one/
- https://dayoneapp.com/guides/day-one-ios/editing-and-formatting-entries-in-day-one-for-ios/
- https://dayoneapp.com/guides/tips-and-tutorials/today-view/

Slack:
- https://slack.com/help/articles/115000769927 (redirects to https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions)

**Loaded (200) but not useful for this teardown:** https://support.apple.com/guide/iphone/keep-track-of-messages-iphe9b48b89e/27/ios/27 , https://support.apple.com/guide/iphone/group-conversations-iphb10c80fc5/27/ios/27 (no reply-count text), https://support.apple.com/guide/iphone/access-features-from-the-lock-screen-iphcd5c65ccf/27/ios/27 , https://support.apple.com/guide/iphone/keep-recordings-up-to-date-iph38b91c7af/27/ios/27 , https://support.apple.com/guide/iphone/change-sound-recording-options-iph31c1ca6c7/27/ios/27 (Camera), https://support.apple.com/guide/iphone/add-photos-video-and-more-iph23f4d9aa9/27/ios/27 (Notes), https://support.apple.com/guide/iphone/mark-items-as-favorites-iphbb0f5ff34/27/ios/27 (Music), https://support.apple.com/guide/messages/toc , https://support.apple.com/guide/voice-memos/toc (Mac guides), https://support.google.com/photos/answer/6153599 , /6131416 , /15706520 , /15604413 , /6128843 , /6128838 , /7378858 , /6156103 (all with `?hl=en&co=GENIE.Platform%3DAndroid`), and /9238719 , /10224497 , /13685656 , /14169044 , /6153593 (returned a page with no article).

**Redirected to the guide's welcome page (old or wrong page ID), so replaced by the pages above:** https://support.apple.com/guide/iphone/view-photos-and-videos-iph6e7917d0e/ios , https://support.apple.com/guide/iphone/watch-memories-iph5e7cd2d1c/ios , https://support.apple.com/guide/iphone/get-started-with-journal-iph0e5ef3c44/ios

**Did not load**
- https://dayoneapp.com/guides/tips-and-tutorials/search-and-filter/ : 404 (a guessed URL)
- https://help.dayoneapp.com/en/articles/2751820-tagging-guide : proxy refused (403)
- https://forums.dayoneapp.com/forums/topic/they-made-audio-recordings-more-tedious/ and https://forums.dayoneapp.com/forums/topic/new-design-30th-may-2024-removed-quick-access-to-templates-why/ : proxy refused
- https://www.macrumors.com/how-to/send-inline-replies-ios-messages-app/ and https://www.macrumors.com/how-to/swipe-to-reply-messages-iphone/ : proxy refused
- https://www.polarsteps.com/ , https://apps.apple.com/us/app/polarsteps/id947925763 , https://stories.polarsteps.com/stories/how-to-capture-your-polarsteps-trip-your-way , https://polarsteps.helpscoutdocs.com/article/72-how-do-i-add-photos : proxy refused
- https://ipcdn-web.apple.com/assets/v2/web/… (three Apple screenshots): proxy refused; alt text used instead
- support.polarsteps.com: not tried, as instructed

**Cited in the first pass and not re-fetched this time** (claims resting only on them are marked unverified above): every press source (Technobezz, AppleToolbox, MacRumors 2020, MacStories, TechRadar, 9to5Mac, PhoneArena, AppleInsider, iGeeksBlog, iMore, Digital Trends, AppleVis, iClarified, 9to5Google, Android Headlines, TechNerdiness, Android Central, Android Police, Beebom, Gadget Hacks, iOSHacker, Computerworld, iDownloadBlog, onthegosolo.com); Apple's older-version or other-locale pages (superseded by the iOS 27 pages listed above); https://support.apple.com/guide/mac-help/mchl35c53342 ; https://www.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/ ; https://developer.apple.com/documentation/journalingsuggestions.md ; https://discussions-cn-prz.apple.com/thread/255010992 ; the remaining Polarsteps help URLs.
