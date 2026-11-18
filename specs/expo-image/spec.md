# Pictures through expo-image (EI1-EI6)

Last exported: not from the concept doc. The source is the performance review of Nov 18 and the owner's go-ahead in
that session: "with reasonable defaults forward; I don't mind dependencies if it's best practice and aligns with how
production-ready apps manage their own assets."

## Vision

Idea: Every picture the app shows is drawn through expo-image with memory and disk caching and recycling in the gallery, with no fade or other new motion; nothing a person sees changes but pictures arriving sooner.
Verb: none (engineering, no visible change)
Touches: Always, "Restraint in motion, colour and copy" (kept: no fade, no placeholder art); decision 0038 (each photo's small copy stays what lists show; expo-image only draws it)
Verdict: no surface
Shape: as asked
Precedent: none found in docs/research/adjacent-apps.md for drawing pictures; Apple Photos and Google Photos show a grid of small copies that stay in memory as you scroll back (from memory, unverified)
Criteria: none
Open: none

## What it is

Every picture on screen (a moment's photo or a video's still on its card, its pin's small copy, a gallery tile and a
month's cover, the replay's cards and pile, a memory preview, a reminder card) was drawn by React
Native's `Image`, which keeps nothing between screens and decodes again on every mount; on the web it is a `div` with a
CSS background. `expo-image` (SDK 58's `~58.0.18`, the module Expo recommends) keeps decoded pictures in memory and on
disk, reuses a list cell's view (`recyclingKey`), and draws a real `<img>` on the web. Pictures read from the device's
own files: nothing is fetched and nothing leaves it.

Not drawn through it: `Baker.native.tsx`, which renders off screen for `react-native-view-shot` to bake an edit into a
file (it needs the image drawn before the shot, as React Native's does); an edited photo (`EditedPicture`), drawn
through react-native-svg under its edit's matrix and colour filter; and `Image.getSize`, which measures a photo and
draws nothing.

## Decisions

- **The owner's go-ahead, Nov 18**, for the dependency and for building past the plan without a stop ("with reasonable
  defaults forward").
- **No transition** (a fade would be new motion, VISION Always "Restraint in motion"): a picture appears as before.
- **One wrapper** (`components/Picture.tsx`) holds the defaults, so a new host gets them by using it.

## How adjacent apps do it

- **Apple Photos**: the library grid is drawn from small copies the system keeps decoded; scrolling back shows them at
  once with no fade. Source: from memory, unverified. **Unverified**.
- **Google Photos**: thumbnails come from a local cache before any full image; a grid cell is reused as the list
  scrolls. Source: from memory, unverified. **Unverified**.

## Criteria

1. **EI1** Every picture the app draws on screen is drawn through one wrapper over expo-image; only the off-screen
   baker draws through React Native's `Image`.
2. **EI2** A picture once drawn is kept, decoded in memory and on disk, so seeing it again draws it without reading
   and decoding the file anew.
3. **EI3** A gallery tile scrolled out and back draws its own picture, never a reused cell's last one (each tile's
   picture is keyed by its piece).
4. **EI4** Nothing new moves: no picture fades or animates in.
5. **EI5** Pictures look as before: each keeps the fit it had (cover or contain), and the gallery's tiles still fill
   their cells.
6. **EI6** (device) On a phone, the gallery scrolled through a few hundred photos and back, and the replay's pile, draw
   every picture, with memory settling once the scroll stops.

## Record

Not built yet.
