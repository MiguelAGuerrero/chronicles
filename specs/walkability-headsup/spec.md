<!-- Walkability heads-up. Written in the repo first (2026-11-04), after the code, at the owner's request: "the heads-up
     should be given a spec". Part of the walkability slice (specs/walkability, WK15, WK16). To be copied into the concept
     doc as a tab. The doc wins once it exists. -->

# Walkability heads-up (WH)

While you navigate, a quiet line says a stretch of the way ahead is built around cars, before you reach it, so you
can choose with the map in mind. It says. It never decides: nothing about the route changes.

"Built around cars" is what the map data says, not a ruling that a place can't be walked (specs/walkability).

## Why

The walkability layer (WK13) shows car-oriented streets on a map you have to look at. On a route you are following,
the useful moment is just before the stretch, without opening anything.

## Decisions

- **Silent** (the owner, 2026-11-04): no sound, no haptic, no notification. A pocketed phone is not told.
- **Only on a navigated route** (the owner, 2026-11-04): it looks ahead along the route you are following. A walk with
  no route says nothing; there is no guess about where you are heading.
- **It never routes** (specs/walkability WK16): no "avoid", no alternative, no change to the route.
- **Words, not a number** (AGENTS.md, nothing is a score): no distance, count or percentage in the line.

## Acceptance criteria

### Which stretches

1. **WH1 · A stretch built around cars of 100 m or more.** Along the route, a run of street whose band is built around
   cars (specs/walkability WK5-WK8) and that is at least 100 m long. Shorter runs, mixed streets, streets easy on foot
   and streets with no data say nothing.
2. **WH2 · One stretch is one stretch.** A stretch is its street and the last segment of it, so a new route over the same
   stretch (a reroute, even one that starts inside it) is the same stretch.

### When

3. **WH3 · 200 m before it.** The line appears when the walker is within 200 m of the start of a stretch that is still
   ahead (or already on it), and not before.
4. **WH4 · Once.** A stretch is said once on a route. Walking back toward it, or a reroute over it, says nothing again.
5. **WH5 · Kept until passed.** It stays while the walker is on the stretch, and after it for 15 s counted from when it
   first appeared; then it goes.
6. **WH6 · One at a time.** Only the nearest unsaid stretch shows; the next is said once the first has gone.

### What it says

7. **WH7 · The words.** "Next: a stretch built around cars on <street>", with the pedestrian-and-car icon beside it
   (specs/walkability WK21). With no street name: "Next: a stretch built around cars". No digit appears in the line.
8. **WH8 · Quiet.** No sound, no haptic, no notification, no modal and nothing to press. It cannot be tapped, takes no
   focus and its icon has an accessible label. A screen reader hears it once, politely (a polite live region).

### Where

9. **WH9 · In the pills.** It sits at the top of the walk's pills, left of the capture stack and above the bottom
   strip, so no button moves and none is covered. It is not shown while a voice memo is recording.

### What it needs

10. **WH10 · A route, and nothing else.** With no navigation, or after End or arrival, nothing shows and what was said is
    forgotten. It does not depend on the map's walkability switch (WK13): the layer can be off.
11. **WH11 · Reads only the route's tiles.** The tiles within 100 m of the route, 12 at most, from the device where kept
    (specs/walkability WK2, WK4), once per route. Nothing is read without a route.
12. **WH12 · No data says nothing, never an error.** If the tiles can't be read (offline, Overture and Overpass both
    failing), or none is a stretch, the line does not show and nothing else changes (WK3).
13. **WH13 · It never touches the route.** It takes the route and the walker's position and gives back words; it adds
    no button, does not reroute and changes neither the route, its length, nor the navigation bar.

## Not in this slice

- A haptic or sound, or a setting for one (asked, and declined, 2026-11-04).
- Looking ahead along the street you walk with no route (declined, 2026-11-04).
- Choosing or offering another way, or avoiding car-oriented streets (0022).
- Saying how far away the stretch is, or how long.
- Mixed stretches.

## Record

Built with the walkability slice (2026-11-04) as WK15 and WK16, then given this spec. Tests named by id:
`src/lib/__tests__/walkHeadsUp.test.ts` (WH1-WH8, WH10-WH13; these assert behaviour that was built first, so they were
written to pass, not seen failing) and the e2e journey `headsup` (WH3, WH7-WH10, WH13: a fake Overture tile with
every street fast, a real walk and a routed destination). WH9's "not while a voice memo is recording" is checked in
code only (`!recordingVoice` in `walk.tsx`).
**Not run on a device** (`docs/NATIVE_UNVERIFIED.md`, Walkability).
