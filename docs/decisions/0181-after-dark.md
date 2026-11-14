# 0181. After dark: lit streets and open places, never a safety grade

Date: 2026-11-14 · Status: accepted · Area: layers, walkability, navigation · Reshaped at the gate

## Context
The owner (Nov 14): "There should be some idea of safety assessment, whether that be crime rate or another metric that can
evaluate an area based on how known it is to walk around perfectly fine and safely." The vision gate ruled crime data out:
it rates places by reputation (Never: ratings and rankings of places; Always: "guidance is structural … never whether it is
good"), misleads in busy centres (rates per resident peak where many pass through), and has no open worldwide source. It
offered the structural shape: what the walker can see on the ground, lighting and places still open.

## Decision
The owner's calls, Nov 14:
- **After dark, not crime data**: a fourth map layer, "After dark", off by default, with a heads-up on a navigated walk.
- **Both moments**: the layer on Explore, Navigate and the walk; the heads-up while navigating after sunset.
- **Overpass per tile** for OpenStreetMap's `lit` and `opening_hours` (Overture carries neither, checked Nov 14), kept on the
  device 30 days, under one Overpass gate with walkability's fallback: one back-off, one 60-a-day count, after dark at most 40.
- **Our own opening-hours reader**, common forms only; anything else unknown, never open. No dependency.
- **Local sunset**, worked out on the device; no library, no network.
- **A layer of its own**: Walkability and Storefronts unchanged.
- The plan's defaults, taken with the go-ahead: pharmacies and fuel left out of the open marks; a ring does nothing on a tap;
  dark starts at sunset, not civil twilight; tile requests to Overpass as walkability's fallback already makes them.

## Consequences
- `specs/after-dark/spec.md` (DK1-DK17). Evidence only adds: a street is drawn lit only when tagged lit; nothing is drawn dark;
  only `lit=no` feeds the heads-up, said as "mapped as unlit". No number or safety word anywhere it speaks (DK11). No route reads
  it (DK17).
- `dark_tile` is cache (SQLite migration 30, IndexedDB 23, in `DERIVED_STORES`).
- The UI review made the lit line a darker amber drawn whole (3:1 on the ground; `after-dark ui 2`), so it is seen at dusk.
- How much of a town is tagged was not measured (Overpass is blocked from the cloud session): the first run on a phone tells.
- Native is unverified on a device.
