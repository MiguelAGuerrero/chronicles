# 0184. Place search: a gazetteer bundled in the app, searched on the phone; a pick is a look at the place

Date: 2026-11-16 · Status: accepted · Area: explore, storage, architecture

## Context
Explore had no way to go to a town by its name: a reader scrolled with Move map (0150) or stood there. Decision 0150 said "no search":
a geocoder is a new host and typed text leaving the device (0005). The owner asked for search against a public dataset of places
that needs no geocoding service.

## Decision
The owner's calls, Nov 16:
- **GeoNames `cities5000`** (70,042 places at the Nov 16, 2026 dump), turned by `scripts/build-gazetteer.js` into the app's own pack
  (`assets/gazetteer/places.json`, 5.6 MB), **bundled** in the app. No host is added; the pack is read on the phone the first time the
  search opens, never at launch. CC BY 4.0: credited in the map's credits.
- **Search lives on Explore** (a magnifier beside the title card). A pick is a look (0150): the page "Around <name>", with Locate
  as the way back. Not Navigate's destination, not a search from every tab.
- **Shipped with the defaults the plan named:** every ASCII alternate name is kept (no size test; the pack is under its 6 MB budget),
  the magnifier is an icon with no word beside it (the cold find checks it is found), and a pick leaves Move map as it found it.

Shape the gate and the steward added (accepted): the pack holds no population, rank or class, so nothing can order or show a size;
results come nearest first from a fresh fix, else the live map's middle, else by name then region; a capped list keeps the nearest and
says "Keep typing to narrow it." without a number; a row carries a name, region and country only; a search stores nothing (no recents).

## Consequences
- Amends **0150**: "no search" held only while a search needed a geocoder. Also amends **0092** and **EC10** in the one move that a
  pick moves the map while Move map is off.
- `specs/place-search` (GZ1-GZ19). The index (about 250,000 keys) is built once on first open on the JS thread: about 0.7 s in Node,
  not measured on a phone (see `docs/NATIVE_UNVERIFIED.md`); a precomputed index in the pack is the fix if it is slow.
- Places under about 5,000 people are not in the data; Move map still reaches them.
