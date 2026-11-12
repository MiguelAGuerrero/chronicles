# 0149. The recording bar's Edit offer waits, in a pill above the bar

Date: 2026-11-12 · Status: accepted · Area: tabs, captures · Amends: ME23 (`specs/media-editing`), on the recording bar alone · From: `/tend` inbox T12

## Context
ME23 offers Edit for 6 seconds wherever a photo or video was just kept. On the recording bar, "Photo saved to your
walk" and an Edit button took the place of the bar's time and distance for those seconds, and at 320 px the words were
cut to "Photo save…" beside Edit (the tabs sweep of Nov 11, UX review U7 and F9). An offer with an action that ends on
a timer is what `.claude/rules/ui-patterns.md` and decision 0113 settled for Undo ("Undo stays until it is used or
dismissed"; M3, "Snackbars with actions shouldn't auto-dismiss").

## Decision
The owner's yes to T12, Nov 12, its recommended shape:
- **On the recording bar only**, the offer after its photo is a pill above the bar: "Photo saved to your walk · Edit ·
  ✕", in the Undo pill's look.
- **It waits** until Edit, its Close (✕) or the next capture of the walk, from the bar or from any other path (Memories'
  band). It is announced politely, as Undo is, without moving focus. It also goes when there is nothing true left to
  offer: its photo deleted (or waiting on Undo), a later photo from the bar that failed to save, the walk stopping,
  or the tabs leaving the screen (below).
- **The bar's line keeps its time and distance throughout.** Paused, the numbers come first, "0:05 · 18 m · Paused",
  so a narrow screen cuts the word, which the pause glyph also shows, never the numbers; the spoken label is unchanged.
- ME23's other places (the walk screen, Navigate's ready screen) keep their 6 seconds; `capture-edit` still opens the
  editor on Crop as its own Modal.

## Consequences
- The pill sits in flow above the bar, on the page's ground, so while it waits it takes room from the screen above
  rather than covering its controls (Explore's card, Memories' band).
- The offer lives with the bar, and the bar unmounts whenever the tabs lose focus: returning to the walk, or opening
  any screen over the tabs (a day, a replay), also ends the offer. That is said rather than kept in a store; Edit
  stays in the photo's viewer.
- The rule and its words are `barOffer*` in `lib/recordingBar` (test `tend tabs T12`); the `launch` journey pictures
  it at 390 and 320 px and checks it is still up after 6 s; the `edit` journey opens the editor from it.
- The spec's ME23 text still says 6 seconds for all three places; this record amends it for the bar.
