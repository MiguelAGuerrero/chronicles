<!-- Mirror of the Claude Docs tab "Memories on revisit (queued)" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc is the owner's authoring surface; this file is the greppable copy. When they differ, the doc wins and this file needs a re-export. Last exported: 2026-11-03. -->

# Memories on revisit

**In progress (Nov 1): queued by the owner after the motion slice and Explore this area, both now on main.**

Walking past a spot where you captured something on an earlier walk, the app quietly shows that a memory is there, for you to open if you want. It sits between the two existing features. "What happened here" waits for a long press. "Remind me here" pushes only the captures you flagged.

## The owner's decisions

- **Faint memory pins.** Past captures within about 100 m show as small faded pins, distinct from this walk's pins. Nothing pops up.
- **Everything you captured** on past walks: photos, videos, memos and notes. "Remind me here" stays the louder, flagged version.
- **A tap opens a quick preview:** the photo or the note's first line, the date and the walk. A tap on it opens the full viewer, with the other memories from that spot.
- **No pocket buzz.** "Remind me here" stays the one that reaches your pocket.

## Draft criteria (superseded by the criteria below)

1. **R1 · Which memories.** Within about 100 m of the latest accepted fix, captures from earlier walks show as faint pins. Captures from this walk never do; they keep their own pins.
2. **R2 · They come and go.** The pins fade in as you come near and out as you leave, and are grouped by screen distance like capture pins. There are never more than a few, nearest first.
3. **R3 · Distinct.** A memory pin is visibly not a capture pin, a ? mark or a star: smaller and faded, the same shape family as capture pins.
4. **R4 · The preview.** A tap opens a small card: a thumbnail or the first line of the note, the date and the walk's title. A tap on the card opens the full viewer with every memory from that spot, as "What happened here" lists them.
5. **R5 · Quiet.** No haptic and no notification, ever. A quiet walk hides them.
6. **R6 · Cheap.** They read captures by area (the existing `capturesIn`) at most once per 50 m walked, never every fix, within the walk screen's render budget.
7. **R7 · Web too.** The same on the web build while the page is open.

## Open points for the spec

- With Remind me here: a flagged capture that also fires as a reminder shows as one memory, not twice.
- Media a memory points to that is missing (a deleted or unrestored file) shows its line without a thumbnail.
- Ordering against Explore's ? marks and the deferred motion effects (the pin drop).

## Criteria

The owner's call, Nov 1: memories show on **every walk**, quiet or exploring, like Remind me here.

1. **MR1 · Which.** Captures from earlier walks, with a place, within 100 m of the latest accepted fix show as memory pins. There are at most 6, nearest first. This walk's own captures never show as memories.
2. **MR2 · Grouped.** Memory pins group by screen distance, as capture pins do, and a group shows its count.
3. **MR3 · Distinct.** Memory pins have the same round shape as capture pins, smaller (75%) and faded (55% opacity). They never look like the square ? marks.
4. **MR4 · The preview.** A tap opens a small card above the capture row. It shows a photo's thumbnail, or a kind icon when there is none (other kinds, or a missing file); a note's first line or the kind's name; and the date and the walk's title. With a group, it adds "N more here". A map tap, ✕, Back or Escape closes it, and so does walking 30 m away.
5. **MR5 · Into the viewer.** A tap on the card opens the full viewer with every memory from that spot, as What happened here lists them, oldest first, with their walk context.
6. **MR6 · Every walk, never loud.** Memories show on quiet and exploring walks alike. They never buzz and never notify.
7. **MR7 · No doubling.** While a capture's reminder card is showing, that capture has no memory pin.
8. **MR8 · Cheap.** Captures are read by area (a 150 m box) at most once per 50 m walked, never per fix. Filtering to 100 m runs on the cached set, and the pins change only when the set of memories does.
9. **MR9 · Web too.** The same on the web build.

Tests: memories.test.ts (unit) for MR1, MR7 and MR8; the e2e for MR2–MR6 and MR9, on a second walk past the first walk's captures.

10. **MR10 · A clock badge** (after the audit: a faded pin read as "my pin, faded"). A memory pin carries a small white badge with a clock at its head's top right, so it reads as from the past. Capture pins and ? marks never have one.

## Thumbnails (the owner's call, Nov 1: save a small copy, with expo-image-manipulator)

1. **TH1 · A small copy with every new photo.** It is 240 px on its long edge, a JPEG, kept beside the photo, and its path is stored on the capture (`thumb_path`). It is never larger than the photo.
2. **TH2 · Never in the way.** Making the copy never holds up or fails the capture: if it fails, the photo is kept without one.
3. **TH3 · Older photos catch up.** A photo without a copy gets one the first time a preview shows it, made once.
4. **TH4 · Previews use it.** The memory preview shows the small copy, and loads the full photo only while there is none.
5. **TH5 · One model.** It is the same on phones and the web (expo-image-manipulator has both). It takes SQLite migration 12 (a nullable column); IndexedDB stores the whole record, so it needs no new version.

Tests: thumb.test.ts (unit) for the size; the e2e checks a new photo's copy (stored, decodable, at most 240 px) and that the preview loads it.
