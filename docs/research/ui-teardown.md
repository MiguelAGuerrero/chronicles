<!-- Compiled Nov 9-10, 2026 by a research agent for decision 0108. Every vendor page was blocked from the session's network: each claim rests on search-engine summaries of the cited URL, not the page itself; doubtful ones carry a warning sign. Treat it as leads to verify, not as fact. -->

# Adjacent-app teardown for Chronicles' moment jobs

Date: 2026-11-09. Research only; nothing under /workspace was changed.

## How this was sourced (read first)

- **No page was loaded directly.** This cloud session blocks direct fetches. `support.apple.com` and `dayoneapp.com` both failed DNS resolution ("outside the session's allowed network domains"), and the proxy also refused other hosts (for example `www.google.com`). After two hosts failed, I stopped trying direct fetches.
- Every claim below comes from **web-search result summaries**: the search engine read the page and quoted or paraphrased it. Each claim cites the URL the search attributed it to. The search engine read the text; I did not see it myself. Treat each citation as "source as summarised", not "page verified".
- To verify, allow `support.apple.com`, `dayoneapp.com`, `support.google.com`, `support.polarsteps.com` and `slack.com` in the environment's network settings, then re-check the claims marked ⚠.
- Apps change often. Apple Photos changed a lot in iOS 18 and changed again in iOS 26. The Google Photos viewer was redesigned in 2025. Day One changed its + button in 2026. I have noted versions where the sources gave them.
- Anything marked **(inference)** is my own reasoning, not something a source said.

---

## 1. Apple Photos (iOS)

**Viewer: where actions live**
- The **bottom toolbar** of a full-screen photo has Share, Favorite (heart), Info, Edit (a three-sliders icon on iOS 26.5) and Delete (trash). Source: Technobezz, written for iOS 26.5. https://www.technobezz.com/how-to-edit-photos-on-iphone ⚠ third-party; I found no Apple diagram of the whole toolbar.
- **Info: swipe up or tap Info.** The panel shows people identified in the photo, a caption field ("describe the photo or video, and make it easier to find in Search"), Visual Look Up items, and where the photo was taken, with a Maps link and an "Adjust" option. https://support.apple.com/en-md/guide/iphone/iph0edb9c18f/ios (Apple, via search)
- A caption is added from the same Info panel. It is searchable but is **not drawn on the image**. https://appletoolbox.com/adding-captions-to-photos-and-videos-in-ios-14/ , https://www.macrumors.com/2020/06/26/ios-14-captions-photos/
- iOS 26: when Photos recognises a public event, it adds a **ticket button to the bottom toolbar**. Tapping it opens the Info panel at the matched event. This is a contextual action that appears only when relevant. https://www.macstories.net/stories/ios-and-ipados-26-the-macstories-review/16
- Delete sends items to Recently Deleted for 30 days. https://support.apple.com/bn-in/guide/iphone/iph3d267610/13.0
- ⚠ I could not verify the current contents of the "…" (More) menu, such as Duplicate or Hide. The search found no source for it.

**Chrome over media and when it hides**
- In iOS 18.2 and later, **a single tap hides or shows the interface**, as it did before iOS 18. https://techradar.com/phones/not-a-fan-of-the-new-photos-app-ios-18-2-is-fixing-one-of-its-worst-quirks , https://9to5mac.com/2024/11/11/ios-18-2-photos-app/
- Videos open full screen, and the playback controls (play, mute, timeline) stay over the video until you tap. https://www.phonearena.com/news/apple-reverses-annoying-video-playback-change-ios-18.2_id164693
- Lesson from iOS 18.0/18.1: hiding the scrubber in full screen drew strong complaints, and Apple partly reversed the change. https://9to5mac.com/2024/12/27/ios-182-makes-the-photos-app-better-with-these-five-changes/ , https://appleinsider.com/inside/ios-18/tips/how-to-make-ios-18-photos-work-more-like-it-used-to

**Grouping**
- iOS 18 replaced the tabs with one scrolling page of collections, with a "Customize" button at the bottom to reorder, show or hide sections, and a Pin action in a collection's "…" menu. https://www.macrumors.com/how-to/ios-customize-reorder-photos-app/ , https://9to5mac.com/2024/06/11/ios-18-photos-hands-on-get-ready-for-major-changes/
- iOS 26 brought tabs back: Library (the grid) and Collections. Sources disagree on whether there is a third Search tab. When you scroll, the tabs collapse into a small floating Liquid Glass control. https://appleinsider.com/articles/25/06/12/photos-in-ios-26-brings-back-tabs-and-generates-spatial-photos , https://macrumors.com/guide/ios-26-photos-app , https://ios.gadgethacks.com/news/why-photos-in-ios-26-finally-makes-sense-again/

**Memories (resurfacing)**
- While a Memory movie plays, tapping the screen shows the controls (pause and customisation). Swiping changes the "mood", which changes both music and editing style. Length can be set to short, medium or long. Edit (at the top) lets you add or remove photos, change the music and edit the title. https://support.apple.com/en-asia/guide/iphone/view-memories-iphd4f70e68f/13.0 (Apple, older iOS version)
- With Apple Intelligence, you can type a description and Photos builds a memory movie with chapters and music. You can refine it, retry it or edit it. https://support.apple.com/guide/mac-help/mchl35c53342 , https://appleinsider.com/articles/24/08/30/hands-on-everything-new-with-photos-in-ios-18
- I found no official way to turn off the music. A user forum thread asks for it. https://discussions-cn-prz.apple.com/thread/255010992

**Reply or link to another item:** none. Photos has no way to link one photo to another. Connections are albums, people, places and memories. (inference, from finding no such feature)

**One-handed use:** The main actions sit in the bottom toolbar, the Info panel opens with a swipe up, and in iOS 26 the tabs collapse to a floating control in the bottom-left corner. All of these are within thumb reach. (inference from the above)

---

## 2. Apple Journal (iOS)

**Entries and capture**
- The bottom toolbar of a new entry has: suggestions, photo library, take a photo or video, record audio, add a location, and (rightmost, a tree icon) State of Mind, which uses Health. https://appleinsider.com/inside/ios-18/tips/how-to-use-search-and-other-new-features-in-the-ios-18-journal-app/ , https://www.igeeksblog.com/how-to-use-journal-app-on-iphone/
- iOS 18: audio can be transcribed after recording, and the app offers to do it. https://9to5mac.com/heres-everything-new-in-the-journal-app-for-ios-18/
- The **+** button opens a full-screen sheet of suggestions, reflection prompts (open questions) and a blank-entry option. https://www.macstories.net/reviews/apples-journal-app-journaling-for-all/

**Moments it surfaces (Journaling Suggestions)**
- Suggestions are built on the device from recent photos, workouts, music and places. **The user chooses which suggested moments go into an entry.** https://www.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/
- Suggestions can be turned off, limited by data type, or have their history cleared in Settings > Privacy & Security > Journaling Suggestions. Other apps can use the same suggestions through the Journaling Suggestions API. https://imore.com/apps/the-iphones-new-journal-app-is-here-but-its-ios-172s-new-journaling-suggestions-api-that-really-matters , https://developer.apple.com/documentation/journalingsuggestions.md
- Early reviewers found the suggestions not very relevant at first. https://appleinsider.com/inside/ios/tips/inside-apple-journal---the-most-personal-diary-youll-ever-have
- Criticism: the main timeline is the only way to read old entries ("piling up"), and there was no throwback or "on this day" view at launch. https://www.macstories.net/reviews/apples-journal-app-journaling-for-all/ , https://digitaltrends.com/?p=3498472

**Grouping and search**
- iOS 26 adds multiple journals (for example work or travel), a Places map that plots entries by where they were written, and better search. https://9to5mac.com/2025/06/17/apples-journal-app-is-coming-to-ipad-and-mac-with-big-upgrades/ , https://www.macrumors.com/2025/06/09/journal-app-finally-coming-to-mac-and-ipad/
- Search filters (bookmarked, text-only, places, drawings) and sorting by Entry Date or Moment Date are in the "…" menu. https://www.igeeksblog.com/how-to-use-journal-app-on-iphone/ ⚠ the search engine itself rated this a low-quality source.
- An **Insights** view with word counts, **streaks** and activity graphs is reported by the same source. ⚠ unverified. If true, this is a pattern Chronicles must not copy.
- One user said the Places map is hard to use. https://atlas-entry.applevis.com/comment/195436

**Reply or link:** I found no feature for replying to one entry from another or for linking entries. ⚠ (not found, not confirmed absent)

---

## 3. Day One

**Capture**
- June 2026: the tab-bar **+ opens a new entry directly; a long press opens the other New Entry options** (photo, audio, camera and so on). https://www.iclarified.com/67094/day-one-journal-app-updated-with-new-editor-dark-mode-audio-recording-more , https://dayoneapp.com/guides/day-one-ios/creating-entries-in-day-one-for-ios/
- "Quick Start" (More > Quick Start) lists Photos, Prompts, Templates, Today, Audio, Camera, Video, Draw, Scan Text, Scan to PDF, File and Suggestions. There is a Lock Screen Quick Entry widget (2025.15). https://dayoneapp.com/guides/release-notes/ios-release-notes/
- Forum complaints after redesigns ("They Made Audio Recordings More Tedious", "removed quick access to templates") show that users notice when a capture type moves one step further away. https://forums.dayoneapp.com/forums/topic/they-made-audio-recordings-more-tedious/ , https://forums.dayoneapp.com/forums/topic/new-design-30th-may-2024-removed-quick-access-to-templates-why/

**On This Day**
- Shows entries, photos and locations from the same date in earlier years. On iOS it is reached from the More tab, or by tapping a date in Calendar. https://dayoneapp.com/guides/tips-and-tutorials/on-this-day/ , https://dayoneapp.com/features/on-this-day/
- It can be turned off per journal ("Show in On This Day" under the journal's Hiding options). https://dayoneapp.com/guides/tips-and-tutorials/on-this-day-view/
- On the web since September 2025. https://dayoneapp.com/releases/on-this-day-now-available-on-web/

**Views and grouping**
- **List** (reverse-chronological, entries grouped under date headings), **Map** (pins; tap a pin to see its entries; press and hold a spot to start an entry there), **Calendar**, and **Media** (filter by Photos, Video, Audio or PDF). https://dayoneapp.com/guides/day-one-ios/journal-views-in-day-one-for-ios/
- **Tags:** in edit mode, a tag icon above the keyboard; tap a tag to toggle it. Filtering by several tags shows an "Any / All" picker. Search (magnifier, top right) filters by favourites, tags, places or keyword. https://help.dayoneapp.com/en/articles/2751820-tagging-guide , https://dayoneapp.com/guides/journal-views-in-day-one-for-macos/
- The search engine noted a design contrast: Day One's timeline works as a summary, while Apple Journal's timeline is the only way to read entries. https://www.macstories.net/reviews/apples-journal-app-journaling-for-all/

**Viewer:** ⚠ I found no source for how a photo inside an entry opens full screen. Release notes mention a full-screen video player. https://dayoneapp.com/guides/release-notes/ios-release-notes/

**Reply or link:** ⚠ not researched to confirmation. The search found nothing about linking entries.

---

## 4. Google Photos (Android and iOS)

**Viewer (2025 Android redesign, version 7.42)**
- **Date, time and location moved to the top of the photo**, so you no longer swipe to see them. The bottom bar is **Share, Edit, "Add to"** (album, archive, locked folder) and **Trash**. Lens left the bottom bar. https://9to5google.com/2025/08/25/google-photos-viewer-redesign-android/ , https://www.androidheadlines.com/2025/08/google-photos-redesigns-viewer-metadata-and-menus-just-got-smarter.html
- Everything else is in the **three-dot menu**: About, Google Lens, Create, Cast, Save as, Download, Delete from device, Help. Swiping up now shows details (location, info) instead of actions. https://9to5google.com/2025/07/01/google-photos-view-redesign/
- One 2026 guide says the bottom bar now **floats as a pill** over the photo (version 7.82). https://www.technerdiness.com/android/google-photos-icons-symbols-explained/ ⚠ only one source.
- Earlier change: action buttons moved into a pop-up to cut clutter. https://www.androidcentral.com/apps-software/google-photos-update-with-new-pop-up-ui-for-action-buttons

**Memories (resurfacing)**
- A carousel of stories. Tap or swipe left and right to move between photos, **touch and hold to pause**, swipe up or down to change memory. https://support.google.com/photos/answer/9454489
- Controls: Settings > Preferences > Memories > **Hide people & pets** and **Hide dates** (a single day or a range). Each memory also has a "Hide this date from all memories" option. https://support.google.com/photos/answer/9454489 , https://www.androidpolice.com/2021/05/31/how-to-hide-people-pets-dates-and-certain-creation-types-in-google-photos-memories/

**Grouping**
- Library became **Collections**, with albums behind an Albums folder (views: All, Shared with me, My albums). https://9to5google.com/2024/08/08/google-photos-library-collections-redesign/ , https://www.androidcentral.com/apps-software/google-photos-collections-library-replacement-rollout
- Later the bottom bar became three tabs (Photos, Collections, Search). The Memories feed moved into Collections and was renamed **Moments**. https://9to5google.com/2025/03/23/year-long-google-photos-redesign/
- October 2026: a customisable "Pinned" section in Collections. https://9to5google.com/2026/10/26/google-photos-collections-redesign/

**Reply or link:** none for your own items. (inference) Shared albums have social features, which are out of scope for Chronicles.

---

## 5. Polarsteps

- **Automatic route tracking**, plotted on a world map. Each **step** is "pinned to a time and place on the map" and holds photos, video, text and tips. https://apps.apple.com/us/app/polarsteps/id947925763 , https://stories.polarsteps.com/stories/how-to-capture-your-polarsteps-trip-your-way
- Adding a step: the large **+** on the timeline adds your current location (ongoing trips only); **suggested steps appear by themselves** after you visit a new place; or tap a small white dot on the map to add a past location. https://support.polarsteps.com/article/71-how-to-i-add-edit-steps
- **Photos are not added automatically.** Open the step, tap Edit Step, then the camera icon or "Add your best photos". You choose from Suggestions, Your library or More. Drag to reorder; tap the small x to remove. **There are no per-photo captions**; the text belongs to the step. https://polarsteps.helpscoutdocs.com/article/72-how-do-i-add-photos , https://support.polarsteps.com/article/291-how-to-add-new-images-to-your-step
- Photos can be moved between steps. https://support.polarsteps.com/hc/en-us/articles/36497088196242-How-to-move-photos-between-steps
- Map complaints from users: the path is "invisible because of all the photos"; there were only straight lines between steps until the real route could be shown; the profile map is "hidden behind the profile photo and other UI elements". https://apps.apple.com/au/app/polarsteps/id947925763 , https://onthegosolo.com/?p=765
- Social: followers can like and comment. These do not appear in the printed Travel Book. https://polarsteps.helpscoutdocs.com/article/162-are-comments-likes-and-spots-also-shown-in-the-travel-book
- ⚠ I could not confirm how the step detail view lays out or how you swipe between steps.

---

## 6. Replies to a specific item: Apple Messages (iMessage) and Slack

**iMessage**
- **Starting a reply:** iOS 17 added **swipe right on a bubble (including an image)** to open a reply field. The chosen message comes into focus and the rest blurs. Before that (from iOS 14), you **long-pressed and chose Reply**. iMessage only, not SMS. https://www.macrumors.com/how-to/swipe-to-reply-messages-iphone/ , https://beebom.com/how-swipe-right-imessage , https://ios.gadgethacks.com/how-to/respond-specific-messages-group-chats-with-inline-replies-ios-14-0321762
- **Showing it:** a "faded thread" line joins the reply to the original. The original gets a **"1 Reply" / "X Replies"** label underneath. Tapping the label opens a pop-up with only that thread; tapping outside closes it. The reply also appears in the main conversation. https://www.macrumors.com/how-to/send-inline-replies-ios-messages-app/ , https://ioshacker.com/how-to/inline-replies-in-imessage
- Apple's (older iOS 16) guide: "you can respond to a specific message inline". https://support.apple.com/or-in/guide/iphone/send-and-reply-to-messages-iph82fb73ba3/16.0/ios/16.0

**Slack**
- Desktop: **hover over a message, then the reply-in-thread icon**. A checkbox under the composer sends the reply to the channel as well. On mobile, **tap the message or thread** to open it, then "Add a reply". Press and hold a reply for more actions. https://slack.com/help/articles/115000769927
- In the channel, a thread shows as a line under the parent message with participant avatars and the reply count. https://www.computerworld.com/article/3159196/slack-finally-launches-threaded-replies.html ⚠ launch-era (2017) description.
- There is a separate **Threads** view listing every thread you follow. https://slack.com/help/articles/115000769927

---

## 7. Apple Voice Memos

- A Record button starts recording. Recordings are listed under "All Recordings"; tap one to play. Edit lets you trim. iOS 15 added playback speed, Skip Silence and Enhance Recording. Folders are listed under "Organize recordings". https://support.apple.com/en-la/guide/iphone/iph4d2a39a3b/16.0/ios/16.0 , https://www.imore.com/voice-memos , https://support.apple.com/en-me/guide/voice-memos/toc
- Newer versions: a transcript can be copied from the "…" menu. https://www.igeeksblog.com/how-to-use-voice-memos-on-iphone-ipad/ (sources disagree on transcription)
- **Capture without opening the app (one-handed):** the Action button can be set to Voice Memo. It is also available as a Control Center control and a Lock Screen control, and through Siri ("record a voice memo"). https://support.apple.com/en-kg/guide/iphone/iphe89d61d66/ios , https://www.idownloadblog.com/2026/01/07/start-voice-recording-quickly-iphone/ ⚠ sources disagree on whether the Action button works while the phone is locked: https://www.applevis.com/forum/ios-ipados/voice-memos-action-button
- ⚠ I could not confirm that recordings are named after their location automatically.

---

## Synthesis

| Job | Common pattern | Exceptions | Chronicles should copy | Chronicles should not copy |
|---|---|---|---|---|
| (a) Capture, one tap, one hand | One primary **+** or Record button in thumb reach. **Tap = the default capture; long press = the other types** (Day One 2026). System entry points outside the app: Lock Screen and Control Center controls, the Action button (Voice Memos), a widget (Day One). | Apple Journal opens a full-screen chooser first (suggestions, prompts, blank), which is one extra step. Polarsteps does not take photos into a step until you edit it. | One capture button: tap does the default capture, long press opens the other types. Keep each capture type no more than one step away; Day One users complained when one moved further (inference). A Lock Screen or Control Center control later, as a native question. | A full-screen chooser before every capture. Prompts that push the user to write. |
| (b) View one moment full screen | **Media first, little chrome.** A few actions in a **bottom toolbar** (Photos: Share, Favorite, Info, Edit, Delete; Google: Share, Edit, Add to, Trash). Everything else in a "…" menu. **Swipe up for details** (place, map, caption). **Tap toggles all chrome.** Video controls stay until tapped. | Google moved date, time and place **onto the top of the photo** so no swipe is needed. Photos adds a toolbar button only when relevant (the event ticket). | Place and time as one quiet line in the top area, as Google does. A single bottom bar of three or four actions. "…" for the rest. Swipe up for the map and full details. Tap hides everything. **Replace the floating row of reply buttons with one "Reply" action** that opens the capture choice (tap = default, long press = type) (inference). | Several action buttons floating over the image. A Favorite heart if it would ever be counted (Chronicles has no favourites score) (inference). Hiding the video scrubber; Apple reversed that after complaints. |
| (c) Reply to a moment; thread across days | **Start:** swipe right on the item (iMessage, iOS 17+) or long press, then Reply; on desktop, hover then reply (Slack). **Show:** a quiet line or label under the original ("X Replies"), a thin connecting line, and tap to open **only that thread** in a focused view. A separate list of all threads (Slack). | None of the photo or journal apps have item-to-item replies (none found). Connections there are albums, tags and journals. | In the viewer: one Reply action, plus swipe or long press in feeds. In the original, a link under it that opens the thread view. A thread view that focuses the conversation and dims the rest, as iMessage does. A list of named threads, like Slack's Threads view. | **A count label like "3 Replies"**: say it in words through `lib/quietLines` or not at all. Participant avatars. Slack's "also send to channel". |
| (d) Feed, Lately, a year ago today | Reverse-chronological list grouped by **date headings** (Day One). Resurfacing: an "On this day" view (Day One) or an auto-made story carousel (Google: tap to advance, hold to pause). **User controls over what resurfaces**: per journal (Day One), hide people or dates (Google), choose which suggestions to include (Journal). | Apple Journal had no throwback view at launch and was criticised for it. The reported Journal "Insights" has streaks and word counts. | Date-headed feed. One resurfaced moment, labelled in words ("a year ago today"). A way to hide a date or turn resurfacing off. **Hold to pause** for any auto-advancing playback. | Streaks, word counts, activity graphs (Journal Insights, if real). Auto-made movies with music and moods; this conflicts with restraint and the fixed five-beat replay (inference). |
| (e) Replay a walk on a map | Map with pins or steps, and a route line between them. Tap a pin to see its items (Day One Map, Polarsteps). Tracking is automatic, but the user picks the media (Polarsteps). | Polarsteps users complain that **photos hide the path**, that the map is hidden behind UI, and about straight lines instead of the real route. | Draw the real trace, not straight lines between stops. Keep the route visible above the media: small markers, the photo only on selection (inference from the complaints). Tap a marker to open the moment. | Covering the map with thumbnails. Likes and comments on steps (Polarsteps' social layer). |
| (f) Group and search | Tags (Day One: toggle chips, an Any/All filter), albums or collections (Photos, Google), multiple journals (Journal iOS 26). Search with filters by type, place and date. Media views filtered by type. Map as a browse view. | Photos and Google let the user reorder and pin collections. Google keeps albums behind a folder. | User-named threads as the grouping (Chronicles' equivalent of an album or tag). Filters for type, place and date. Map as one way to browse. | Counts on collections or albums (for example "128 items"); say counts in words or leave them out. |

## URLs used and whether they loaded

**Direct fetches (WebFetch): all failed.**
- https://support.apple.com/guide/iphone/view-photos-and-videos-iph6e7917d0e/ios: did not load (DNS blocked)
- https://support.apple.com/guide/iphone/watch-memories-iph5e7cd2d1c/ios: did not load (DNS blocked)
- https://support.apple.com/guide/iphone/get-started-with-journal-iph0e5ef3c44/ios: did not load (DNS blocked)
- https://dayoneapp.com/guides/: did not load (DNS blocked)

**Cited through web-search summaries: not loaded by me; the search engine read the content.**
Apple: https://support.apple.com/en-md/guide/iphone/iph0edb9c18f/ios · https://support.apple.com/bn-in/guide/iphone/iph3d267610/13.0 · https://support.apple.com/en-asia/guide/iphone/view-memories-iphd4f70e68f/13.0 · https://support.apple.com/guide/mac-help/mchl35c53342 · https://support.apple.com/or-in/guide/iphone/send-and-reply-to-messages-iph82fb73ba3/16.0/ios/16.0 · https://support.apple.com/en-la/guide/iphone/iph4d2a39a3b/16.0/ios/16.0 · https://support.apple.com/en-me/guide/voice-memos/toc · https://support.apple.com/en-kg/guide/iphone/iphe89d61d66/ios · https://www.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/ · https://developer.apple.com/documentation/journalingsuggestions.md · https://discussions-cn-prz.apple.com/thread/255010992
Apple Photos press: https://www.technobezz.com/how-to-edit-photos-on-iphone · https://appletoolbox.com/adding-captions-to-photos-and-videos-in-ios-14/ · https://www.macrumors.com/2020/06/26/ios-14-captions-photos/ · https://www.macstories.net/stories/ios-and-ipados-26-the-macstories-review/16 · https://techradar.com/phones/not-a-fan-of-the-new-photos-app-ios-18-2-is-fixing-one-of-its-worst-quirks · https://9to5mac.com/2024/11/11/ios-18-2-photos-app/ · https://www.phonearena.com/news/apple-reverses-annoying-video-playback-change-ios-18.2_id164693 · https://9to5mac.com/2024/12/27/ios-182-makes-the-photos-app-better-with-these-five-changes/ · https://appleinsider.com/inside/ios-18/tips/how-to-make-ios-18-photos-work-more-like-it-used-to · https://www.macrumors.com/how-to/ios-customize-reorder-photos-app/ · https://9to5mac.com/2024/06/11/ios-18-photos-hands-on-get-ready-for-major-changes/ · https://appleinsider.com/articles/25/06/12/photos-in-ios-26-brings-back-tabs-and-generates-spatial-photos · https://macrumors.com/guide/ios-26-photos-app · https://ios.gadgethacks.com/news/why-photos-in-ios-26-finally-makes-sense-again/ · https://appleinsider.com/articles/24/08/30/hands-on-everything-new-with-photos-in-ios-18
Journal: https://www.macstories.net/reviews/apples-journal-app-journaling-for-all/ · https://appleinsider.com/inside/ios-18/tips/how-to-use-search-and-other-new-features-in-the-ios-18-journal-app/ · https://www.igeeksblog.com/how-to-use-journal-app-on-iphone/ · https://9to5mac.com/heres-everything-new-in-the-journal-app-for-ios-18/ · https://imore.com/apps/the-iphones-new-journal-app-is-here-but-its-ios-172s-new-journaling-suggestions-api-that-really-matters · https://appleinsider.com/inside/ios/tips/inside-apple-journal---the-most-personal-diary-youll-ever-have · https://digitaltrends.com/?p=3498472 · https://9to5mac.com/2025/06/17/apples-journal-app-is-coming-to-ipad-and-mac-with-big-upgrades/ · https://www.macrumors.com/2025/06/09/journal-app-finally-coming-to-mac-and-ipad/ · https://atlas-entry.applevis.com/comment/195436
Day One: https://dayoneapp.com/guides/tips-and-tutorials/on-this-day/ · https://dayoneapp.com/features/on-this-day/ · https://dayoneapp.com/guides/tips-and-tutorials/on-this-day-view/ · https://dayoneapp.com/releases/on-this-day-now-available-on-web/ · https://dayoneapp.com/guides/day-one-ios/journal-views-in-day-one-for-ios/ · https://dayoneapp.com/guides/journal-views-in-day-one-for-macos/ · https://help.dayoneapp.com/en/articles/2751820-tagging-guide · https://dayoneapp.com/guides/day-one-ios/creating-entries-in-day-one-for-ios/ · https://dayoneapp.com/guides/release-notes/ios-release-notes/ · https://www.iclarified.com/67094/day-one-journal-app-updated-with-new-editor-dark-mode-audio-recording-more · https://forums.dayoneapp.com/forums/topic/they-made-audio-recordings-more-tedious/ · https://forums.dayoneapp.com/forums/topic/new-design-30th-may-2024-removed-quick-access-to-templates-why/
Google Photos: https://9to5google.com/2025/08/25/google-photos-viewer-redesign-android/ · https://www.androidheadlines.com/2025/08/google-photos-redesigns-viewer-metadata-and-menus-just-got-smarter.html · https://9to5google.com/2025/07/01/google-photos-view-redesign/ · https://www.technerdiness.com/android/google-photos-icons-symbols-explained/ · https://www.androidcentral.com/apps-software/google-photos-update-with-new-pop-up-ui-for-action-buttons · https://support.google.com/photos/answer/9454489 · https://www.androidpolice.com/2021/05/31/how-to-hide-people-pets-dates-and-certain-creation-types-in-google-photos-memories/ · https://9to5google.com/2024/08/08/google-photos-library-collections-redesign/ · https://www.androidcentral.com/apps-software/google-photos-collections-library-replacement-rollout · https://9to5google.com/2025/03/23/year-long-google-photos-redesign/ · https://9to5google.com/2026/10/26/google-photos-collections-redesign/
Polarsteps: https://apps.apple.com/us/app/polarsteps/id947925763 · https://apps.apple.com/au/app/polarsteps/id947925763 · https://stories.polarsteps.com/stories/how-to-capture-your-polarsteps-trip-your-way · https://support.polarsteps.com/article/71-how-to-i-add-edit-steps · https://polarsteps.helpscoutdocs.com/article/72-how-do-i-add-photos · https://support.polarsteps.com/article/291-how-to-add-new-images-to-your-step · https://support.polarsteps.com/hc/en-us/articles/36497088196242-How-to-move-photos-between-steps · https://polarsteps.helpscoutdocs.com/article/162-are-comments-likes-and-spots-also-shown-in-the-travel-book · https://onthegosolo.com/?p=765
Messages and Slack: https://www.macrumors.com/how-to/swipe-to-reply-messages-iphone/ · https://beebom.com/how-swipe-right-imessage · https://ios.gadgethacks.com/how-to/respond-specific-messages-group-chats-with-inline-replies-ios-14-0321762 · https://www.macrumors.com/how-to/send-inline-replies-ios-messages-app/ · https://ioshacker.com/how-to/inline-replies-in-imessage · https://slack.com/help/articles/115000769927 · https://www.computerworld.com/article/3159196/slack-finally-launches-threaded-replies.html
Voice Memos: https://www.imore.com/voice-memos · https://www.igeeksblog.com/how-to-use-voice-memos-on-iphone-ipad/ · https://www.idownloadblog.com/2026/01/07/start-voice-recording-quickly-iphone/ · https://www.applevis.com/forum/ios-ipados/voice-memos-action-button
