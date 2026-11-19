<!-- Repo first: from the owner's issue of Nov 19 (typed as /fix, routed to /slice at the hard stop) and their answers the same day. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# The walk's drawer: details up, settings by section

Nov 19, 2026 · @Miguel Guerrero

## Vision

Idea: "currently we have an ellipses button that's supposed to operate as a settings for the navigation drawer itself, but my expectation was that those settings were accessible by pulling up the drawer. And instead of having a long list of user settings, those settings will have a menu item that directly targets a specific section that you want to adjust. This is in style of All Trails, which provides detailed information about the walk currently, which we might want to move towards. And the settings can be compacted or at least polished underneath a dedicated view per section, which is accessible with the ellipses." (the owner, Nov 19). Their answers the same day: pulled up, the drawer shows this walk's details in words; the … opens a menu of four sections; a section opens inside the drawer with a back arrow.
Verb: honour (the walk: the details say where and when this walk is, what came before, in the screen you walk from: "Does the moment arrive whole: place, time, the walk, what came before?"); earn for the settings, which only become easier to reach.
Touches: Never, "Fitness numbers: pace charts, calories, heart rate" (Not fitness tracking, 0020; Shapes: "Pace, calories, heart rate: out; Distance and time"): AllTrails' pull-up panel is a stat sheet (distance, elevation gain, moving time, pace) and is the part reshaped. Never, "Celebration: … big numbers" and Always, "Restraint in motion, colour and copy": no stat tiles, no large figures. Always, "Counts are words, in a clause. Distances and times are fine." (0052): what was captured is a clause, never a digit. Never, "Scores, streaks, completion, coverage": no share of a route done, no new streets counted. Never, "A capture behind a menu, a drawer or an extra tap" and Always, "Capture is one tap away": the capture stack is not moved into the drawer and is as reachable as today (the raised drawer covers what it covered before). Never, "Data leaving the device": nothing new is read from or sent anywhere; the details read what the screen already holds. Decisions 0220 (Pause, then Resume or Stop; the … while walking only), 0192 (What I'm into its own page), 0167 (found before quiet), 0193 (precedent).
Verdict: aligned if reshaped
Shape: pulled up, "This walk": a few plain lines at the drawer's body size: when it started, how far walked in how long, by ride if any, paused if any, the street you are on, where you are heading and how far, what you have kept in a clause ("two photos and a voice memo"). No pace, speed, elevation, calories, splits, percentages, goals, tiles or big figures. The … raises the same drawer on "Walk settings", four rows; a row shows that section alone, with Back.
Precedent: AllTrails (from memory, unverified): while recording, the bottom sheet pulled up shows the recording's stats in large figures, with options behind a …: the model for "pull up for this walk, … for its options", a counter-example for the figures. Google Maps' navigation (from memory, unverified): the bottom card swiped up offers options, Settings among them, which opens a page of its own. iOS Settings, Notifications (support.apple.com, verified Nov 18): a list of rows, each opening its own page of switches, no Save, Back returns.
Criteria: WD5-WD8 carry the reshaping (WD7 the Never lines over every view, the steward's S2-S4); WD13 holds capture one tap away; WD16 nothing leaves.
Open: none. The owner, Nov 19: the capture stack rides on the drawer (the steward's S1, WD17); the menu says each section's state (WD1); This walk says the lows (WD18).

## How adjacent apps do it

- **AllTrails** (iOS): while recording, the map with a bottom sheet; pulled up, the sheet shows the recording's
  numbers in large figures (distance, elevation gain, moving time, pace); a … button holds the recording's options.
  Source: from memory, unverified (support.alltrails.com unreachable from cloud sessions, Nov 17). **Unverified**. The
  model for the two routes into one drawer; a counter-example for the figures (VISION.md, Never: fitness numbers, big
  numbers).
- **Google Maps** (iOS, Android): during navigation the bottom card swiped up shows the trip and a list of options
  ("Search along route", "Share trip progress", "Settings"); Settings opens a page of its own with Back. Source: from
  memory, unverified. **Unverified**. The model for settings reached from the pulled-up card (WD9).
- **iOS Settings, Notifications** (iOS): the Notifications page lists the apps; a tap on one opens that app's own page
  of switches; each switch acts at once, there is no Save, and Back returns. Source:
  https://support.apple.com/guide/iphone/change-notification-settings-iph7c3d96bab/ios , read Nov 18, 2026.
  **Verified**. The model for the menu's rows and a section with Back (WD1, WD3, WD4).
- **iOS navigation bar, the back button's title** (iOS): a pushed page's back carries the previous screen's title
  ("‹ Settings"). Source: from memory, unverified. **Unverified**. The model for "‹ Walk settings" (WD3).

## What it is

Today the walk's drawer (`options-card`, under the strip's `ReadyBar`) is one long list: the Explore switch, the "?"
range, Passing a place, On the map, Pocket alert, Route leaning, the notification settings, motion, Share GPS log and
What I'm into. A pull, a tap on the numbers and the strip's … all raise it. The owner expected the pull to tell them
about the walk, as AllTrails does, and the … to lead to the settings one section at a time.

After this slice the drawer has three views, inside the same raised drawer:

- **This walk** (pulled up, or a tap on the numbers): the walk's details in words, and a last row, "Walk settings ›".
- **Walk settings** (the …, or that row): four rows, Explore, Map & routes, Reminders, Location & motion.
- **A section** (a row): that section's controls alone, under "‹ Walk settings" and the section's name.

The ready screen's bar, its twin, is unchanged: pulled up it still shows the start settings.

## Decisions

- Nov 19 (the owner): run as a slice, the vision gate first.
- Nov 19 (the owner): pulled up, the drawer shows this walk's details in words; no pace, elevation or calories.
- Nov 19 (the owner): the … opens a menu of sections; a section opens inside the drawer with a back arrow to the menu,
  so the map, and the range ring, stay in view above it.
- Nov 19 (the owner, on the plan): the capture stack rides on the drawer's top edge on every view (WD17); the menu's
  lines say each section's state (WD1); This walk says the walk's lows, its signal gaps and recorder trouble (WD18).
- Nov 19 (the owner): the sections are Explore (the Explore switch, "?" range, Passing a place, Pocket alert, What I'm
  into), Map & routes (On the map, Route leaning), Reminders (the notification settings), Location & motion (motion,
  Share GPS log).

## Criteria

The owner's tasks, in their words: "adjust a specific section of the walk's settings from the …" and "pull up the
drawer for detailed information about the walk".

- **WD1** (the task): while walking, a tap on the strip's … raises the drawer on "Walk settings": This walk first
  (walk-drawer-sections ui 1, the owner's call after the cold find), then four rows in this order, Explore, Map & routes, Reminders, Location & motion, each its name in ink, a muted line saying how the section
  is set now, in words (Explore: "Off", or "On, “?” within 400 m"; Map & routes: "The direct way", or the leanings
  that are on, "Leaning to green and sights"; Reminders: "Off", "On", or the one that is on; Location & motion:
  "Motion on", "Motion off", "Motion blocked" or "No motion here"), and a chevron; a tap anywhere on a row shows that section alone in the drawer. The long list is gone: no view of the
  drawer shows two sections' controls at once.
- **WD2** (finding): someone told only "during a walk, change how far away a “?” shows", shown the walk screen at rest,
  taps the … (or pulls the drawer up and takes "Walk settings"), then Explore, and finds the “?” range; the same told
  "turn off reminders during a walk" finds Reminders (the cold find, decision 0167).
- **WD3** a section: at its top a back control in ink, "‹ Walk settings", and the section's name as a heading; under
  them exactly that section's controls, as listed in the Decisions, each saving as it changes as before (E16-E21, PA6,
  the leanings, the notification settings, MO2): no Save or Done.
- **WD4** going back: in a section, the back control, Android's Back and Escape on the web show the menu, the drawer
  still raised; on the menu or This walk, Back and Escape lower the drawer; a drag down lowers it from any view; with
  the drawer up on the menu or a section, the … lowers it.
- **WD5** (the task): a drag up on the strip, or a tap on its numbers, raises the drawer on "This walk", the walk's
  details in words, each line shown only when it has something to say: when it started ("Started at 2:14 pm"); how far
  walked in how long, the time walked with pauses left out, as the strip counts it; how far by ride, with any ride; how long paused, with
  any pause; the street you are on, when one is known within reach; where you are heading and how far, while a way is
  shown, as "Heading for <place>, 1.2 km away"; what has been kept on this walk, in a clause ("Two photos and a voice
  memo"), and no line while nothing is.
- **WD6** (finding): someone told only "during a walk, see when it started", shown the walk screen at rest, pulls the
  strip up or taps its numbers (the cold find).
- **WD7** (the gate) no fitness, no figures, no countdown: no view of the drawer (This walk, the menu, a section)
  shows pace, speed, elevation, calories, heart rate, splits, a percentage, a goal or a target, a count in digits, or
  "to go", "left", "remaining" or "of" beside a distance; the heading line keeps its words and colour when you
  drift from the way; every line is at the drawer's body size in ink or muted, with no tile, ring, chart or figure
  larger than the text around it.
- **WD8** live: while This walk is up, its time moves each second with the strip's, its distance as fixes arrive, and
  its clause as a moment is kept; its distance and time are the strip's, word for word.
- **WD9** the settings from This walk: its last row is "Walk settings" with a chevron, showing the menu; so the
  sections are reached while paused, when the strip has no … (decision 0220).
- **WD10** fresh each time: lowered and raised again, the drawer opens on This walk after a pull or a tap on the
  numbers, and on the menu after the …, never on a section left open before.
- **WD11** the range ring: with Explore on, the ring around you shows while the Explore section is open, fitted into
  the map above the raised drawer (E21 holds), and not on This walk or the menu.
- **WD12** spoken: the numbers' button is named with its numbers and "Walk details" ("Lower the walk details" while
  up); the … keeps "Walk settings" ("Lower the walk settings" while up on the menu or a section), expanded only while
  the menu or a section shows; the back control is a button named "Back to walk settings"; each view's title is a
  heading.
- **WD13** unchanged around it: mid-memo neither the … nor a pull raises the drawer (NR7 audit 4); the raised drawer
  is no taller than it was (`raisedHeight`), lowered only as far as WD17 needs;
  What I'm into's page still opens from the Explore section's row and its Back returns to that section, raised (WI4).
- **WD14** the ready screen's twin is unchanged: its bar, pulled up, shows the start settings, with no menu and no
  This walk.
- **WD15** 320 px: on a 320 px wide screen at the default text size, no menu row's name, no section's back control and
  no heading wraps.
- **WD16** nothing leaves: while any view of the drawer is up, the page makes no network request it would not make
  with the drawer down, and nothing is written.
- **WD17** capture one tap away: with the drawer up on any view, and while it moves, the camera, mic and note ride on
  its top edge in their column, each visible whole and one tap from capturing; the raised height leaves them clear of
  the top row (the minimize button, the navigation bar) on a 667 pt tall screen; the edge buttons above them (Recenter,
  Walk me back, the compass) are hidden while the drawer is up, as they were covered before; a memo started with the
  drawer up keeps Save in the mic's place and the timer beside it until it is saved.
- **WD18** the lows stay in: This walk says, in words, when the signal was lost on this walk ("No signal for 6 min, at
  2:31 pm"; several, "No signal three times, 14 min in all") and while the walk is not recording ("Not recording
  now"); nothing when neither happened. Counts in words; never a share of the walk.

## Record

Built Nov 19, 2026 on `claude/serene-sagan-lz8nzp`; not deployed.

- **Tests first:** 14 of 18 by the history (`npm run check:test-first walk-drawer-sections`). WD1's and WD14's todos
  were committed first (`819e5b7`) but on lines the history check does not read (an id on the line after
  `check.todo(`, or beside a real check of the same id); WD2 and WD6 are the cold find's (UNTESTED); WD16 was first
  held by `nothingLeaves()` and is now named in `walkdrawer`.
- **Passed:** unit tests (`walk-screen/walkDrawer.test.ts`, 12), typecheck, lint, `npm test`; e2e `walkdrawer` (new,
  37 checks), `walk`, `into`, `launch`, `ready`, `layers`, each once on these files.
- **Changed beside it:** WI19 (the What I'm into row is the Explore section's last; its unit test and the `into`
  journey amended); the strip's spoken tail is "Walk details" (`walk` journey, tend walk-screen 12); `Ticking`'s
  clock reads on the whole second (`useSecondClock`) so the strip and This walk keep step.
- **Cold find** (Nov 19, the ux-reviewer with the pictures and three tasks only): the “?” range (likely, after trying
  Layers), Reminders (likely) and when the walk started (guessing: nothing drawn led to This walk). Owner's call: This
  walk atop the … menu (`walk-drawer-sections ui 1`).
- **UI review** (Nov 19): no high. Accepted and fixed: U1 the menu whole on a 667 pt phone (`ui 2`, rows 48 pt), U2
  Reminders "Blocked" when notifications cannot show (`ui 3`), U4 the views' titles a size up (`ui 4`). Deferred
  (`docs/DEFERRED.md`, "The walk's drawer"): U3 and U6 the map not moving the walker above the drawer, U5 "Turn on"
  beside a blocked motion (predates the slice), U1 at 568 pt, the cold find's U2 (the Explore note's "reminders").
  Rejected: U7 (a muted state line may wrap at 320 rather than lose its end; WD15 holds the names) and the cold find's
  U3 (the menu's picture was taken before Explore was switched on).
- **Native:** never run on a device; three checks in `docs/NATIVE_UNVERIFIED.md`, "Navigation and tabs" (Android's
  Back stepping a section, the screen readers' headings and names, the stack riding the drawer).
