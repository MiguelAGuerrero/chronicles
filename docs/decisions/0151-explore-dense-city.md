# 0151. Explore in a dense city: busy names drawn by the map, the read off the page

Date: 2026-11-12 · Status: accepted · Area: explore, map, landing

## Context
The owner tried Explore in Downtown Baltimore on an iPhone (Nov 12): moving between neighborhoods was not smooth and
the Busy layer's street names stacked on each other. Measured with `scripts/perf-explore.js` at 4x CPU: a first read of
an area froze the page for one 4.4 s task (deriving street pieces 1.7 s, storing them 1.7 s, decoding 0.5 s, the density
pass 0.4 s); every switch lost about 1 s (the map's own move about 320 ms, React about 350 ms, Explore rendered 3 to 5
times). The names were DOM markers, one per strip, with no collision.

## Decision
The owner's calls, Nov 12:
- **Measure first, then fix**, with the harness's numbers before and after.
- **Busy names are drawn by the map** (a symbol layer with collision, web and native): one per street, a heavier street
  placed first, every name the same look, more as zooming in gives room. EC7's limits stay.
- **On the walk screen and in Navigate the base map's names keep their room** and the trace and route draw over the
  busy names; only Explore gives busy names priority.
- **The base map's own name of a busy street stays** (only one that would overlap a busy name gives way): hiding it by
  name would leave a street nameless wherever its busy name has no room.
- **The read runs in a web worker on the web** and starts only once the map settles, on both platforms; native runs the
  same code on the JS thread, yielding between stages. If the worker can't start, the read runs on the page. The worker
  is a web exception to native first (`docs/ARCHITECTURE.md`).
- **No pre-rendered image of the area**: a city at street zoom is several times iOS Safari's canvas limit, baked text
  can't avoid overlaps or be tapped, and it is redrawn whenever an area is read again.
- **The "?" pins and the area points stay DOM markers this round**; they move to map layers next if a drag still
  stutters on the phone.

## Consequences
`specs/explore-dense-city` (DC1-DC16). No storage change, no migration. The worker is a separate file with a hash, like
the route chunks fix stale-chunk removed: the page-side fallback (DC8) is what keeps a page left open across a deploy
working. Native's symbol layer and yields are unverified on a device.
