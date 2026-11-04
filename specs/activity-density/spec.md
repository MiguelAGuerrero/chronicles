<!-- Activity density. Written in the repo first (2026-11-03) from the owner's calls in the session on
     "the busy streets calculator misses Phillipsburg's Main Street"; to be copied into the concept doc as a tab.
     The doc wins once it exists. -->

# Activity density (AD)

Busy streets stop being a yes-or-no test of fixed thresholds. They become a grade of
how densely places of any kind sit along each street, judged against the town around
it, so even a small town shows where its activity centres. Places come from
OpenStreetMap and from Overture Maps Places, which has the shops OpenStreetMap is
missing in small US towns.

"Busy" here never means foot traffic. It means a density of places: stores, food,
services, attractions. That density is what marks a town's centre, its main street and
its strips.

## Why

On South Main Street in Phillipsburg, New Jersey, by the park, the owner saw stores and
no busy street. Three causes, found in the code (2026-11-03):

1. Only food, bars, books, clothes and a few gift-type shops counted toward density
   (`discovery/tilePois.ts`'s table, built for marks). Barbers, salons, convenience
   stores, pharmacies, banks, laundromats and the rest were dropped.
2. The thresholds were fixed (≥5 places, ≥1 per 40 m, over ≥200 m), set for dense
   places.
3. The Explore tab drew busy streets only. Pockets were computed and thrown away.

On top of that, OpenStreetMap is thin on shops in small US towns. Overture's tiles
over downtown Phillipsburg hold 86 places on Main Street that it is at least 80% sure
of (checked 2026-11-03, release 2026-10-21.0).

## Decisions

- **Density of places is the measure, not busyness** (the owner, 2026-11-03): stores,
  attractions and points of interest, as a proxy for where a town centres. No foot
  traffic or popularity data.
- **Places come from OpenStreetMap and Overture Places** (the owner, 2026-11-03).
  Overture is free, needs no key, is read by tile like the map, and its licences allow
  keeping results on the phone.
- **Every place counts; services count less** (the owner, 2026-11-03).
- **Judged against the town, with a floor** (the owner, 2026-11-03): each town shows
  its densest streets, while a purely residential area shows nothing.
- **Shown as graded magenta streets** (the owner, 2026-11-03): evolve today's magenta
  busy-street shading into grades along the streets.

## Acceptance criteria

### What counts

1. **AD1 · Every kind of place counts.** Density counts every place of a known kind,
   from either source, at one of three weights:
   - **Full:** shops of any kind, markets, food and drink, bars and nightlife, art,
     culture, entertainment, history.
   - **Half:** personal services (salons, barbers, laundromats), health, banks,
     lodging, places of worship, community and civic places, gyms, parks and views.
   - **Quarter:** offices and business services (law, real estate, insurance,
     contractors) and vehicle services.

   Anything else counts for nothing: ATMs, parking, stops and stations, schools,
   utilities, places with no kind.
2. **AD2 · Marks and bars don't change.** What can be marked, found or offered on a
   checklist, and the atlas's presence bars, stay as they are, from OpenStreetMap's
   places. Overture places and the new kinds feed density only.

### Overture places

3. **AD3 · Overture joins, by tile.** Every read that measures density (What's good
   here, an exploring walk's read, an atlas ring) also reads Overture's place tiles for
   the same z14 tiles as its map read. The request carries the tile and nothing else:
   no key, no account, no position beyond the tile.
4. **AD4 · Only places Overture is sure of.** An Overture place counts only if its
   confidence is at least 0.8 and it isn't marked closed.
5. **AD5 · One place counts once.** A place in both sources counts once: the same name
   (normalized, or one name contained in the other) within 60 m.
6. **AD6 · The release follows Overture's.** The app uses Overture's newest release
   that it finds online, checks at most once a day, and treats a new release like a new
   map build: remembered areas and atlas tiles measured with the old one show as stale
   and are measured again.
7. **AD7 · Overture failing never fails a read.** If Overture can't be reached, or the
   release is gone, density is measured from OpenStreetMap alone. The area is marked as
   measured without Overture and is measured again on a later read.
8. **AD8 · Reads stay small.** An Overture tile is downloaded at most once per release
   while the app is open, however many reads cover it.

### How density is measured

9. **AD9 · Density runs along the streets.** Each place counts toward its nearest named
   street within 40 m. A street's density at any point is the weighted places along it
   nearby, fading to nothing about a block (120 m) away. A café on a corner adds to its
   own street, not to every street around it.
10. **AD10 · Judged against the town, with a floor.** Within one read, a stretch of
    street gets a grade (faint, medium or strong) from its density compared with the
    read's other streets. The same pattern of places gets the same grades whether it is
    sparse or four times denser, once the sparse one clears the minimums. A stretch
    below the floor (about three full-weight places within a block) gets no grade,
    whatever the town, so a residential area with a few scattered places shows nothing.
    Medium and strong have minimums of their own, so one small cluster is never strong
    just because nothing else in town is.
11. **AD11 · Phillipsburg's Main Street shows.** On a test fixture built from
    Overture's real tiles for downtown Phillipsburg (places and streets, release
    2026-10-21.0), South Main Street by the park is graded medium or strong.

### What shows

12. **AD12 · Graded magenta streets.** Wherever busy streets are drawn today (the home
    map's What's good here and the walk map), graded stretches draw in magenta, wider
    and stronger as the grade rises. Pockets keep their faint shading. Stale areas stay
    dimmed.
13. **AD13 · Busy streets keep their names.** A busy street is a run of one named street
    at medium grade or above, at least 120 m long. Its name is what the walk's
    "On <street>" chip, the atlas tile's and card's "Busy along" line, and a pocket's
    name use, strongest first.
14. **AD14 · The Explore tab draws the grades.** An atlas tile's and card's small map
    draws the graded stretches inside its ring, in the same three grades.
15. **AD15 · Nothing is a score.** No density value, count or percentage is shown
    anywhere. Grades are drawn, never written as numbers.
16. **AD16 · Overture is credited.** Where the app credits its map data, it also
    credits Overture Maps Foundation.

## Not in this slice

- Overture places as marks or finds, or in the atlas's presence bars.
- Building footprints, land use, address points or street centrality as signals (the
  research's fallback for towns where neither source has the shops).
- A downloaded copy of Overture tiles kept across launches.

## Record

(Filled in as the slice is built.)
