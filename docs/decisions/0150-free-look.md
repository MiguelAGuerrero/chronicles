# 0150. Free look: a Move map toggle pans Explore's map, and Show areas here loads the areas around its middle

Date: 2026-11-11 · Status: accepted · Area: explore, map

## Context
Explore's map only snaps from area to area (0092, EC10: one finger never pans), so a reader in Camp Hill had no way to
move the map to Carlisle and load what is there. The owner asked for a way to scroll to a place and load its information.
The gate (`/vision`) said aligned if reshaped; the plan was audited before any code (16 findings, 15 accepted).

## Decision
The owner's calls, Nov 11:
- **Pan, then load the map's middle**; **no search** (a geocoder is a new host and typed text leaving the device, 0005).
- **A Move map toggle** frees one-finger panning; snapping stays the default and every visit to Explore starts so. This
  amends 0092 and EC10 (they hold unless Move map is on).
- **Show areas here** lists the towns around the map's middle in plain distance order from that point, selected first,
  as its own page. The page says "Around the middle of the map" and never where the reader is or is not.
- **Distance is not a ranking.** Cards keep their distance, measured from the reader's fresh fix (30 minutes) and left out
  when there is none; ranking in the Never lines is for the quality of a place.
- **The layers follow the look:** Busy, Walkability and the town borders read around the looked point. This amends the
  DEFERRED line "Explore's layers follow the selected area or you, not the panned map".
- **Out-of-town stars follow the look** (amends 0115's "within 50 km of you" to "of the page's centre"); a tapped star's
  distance is from the reader. They are not built, so the slice that builds 0115 carries it (FL19).
- Nothing is stored about a look; a look's near reads are marked and never taken for where the reader was (FL15).

## Consequences
`specs/free-look` (FL1-FL21). A far Walk here from the long press asks "Walk now" or "When I get there" (0121). Native
paths (runtime dragPan, the swiper handlers) are unverified on a device.
