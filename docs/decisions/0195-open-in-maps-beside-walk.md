# 0195. Open in Maps beside Walk: two controls named for where you end up, in place of Go here and its sheet

Date: 2026-11-17 · Status: accepted · Area: explore, chronicle, navigation · Supersedes the Go here label and sheet of [0189](0189-go-here-on-explore-tiles.md) and [0190](0190-go-here-on-the-rest-of-the-surfaces.md); builds on [0058](0058-open-in-maps.md) and [0121](0121-drive-there-walk-back.md)

## Context
The owner, Nov 17, after the live build: "The 'walk here' and 'go here' distinction is very confusing." They then asked for the UI to be reimagined so there is a clear distinction between just opening Maps and walking there through the app itself. Both controls said "go there"; the first starts a walk Chronicles guides and records, the second only got you there, through Navigate or the phone's maps app. Two reviewers had raised the same in the audit and the cold find ("found by elimination"); it was set aside then because "Go here" was the owner's own word. The vision gate judged the reshape **aligned** (`specs/open-in-maps-here/spec.md`, Vision), and the steward's one breach and five drifts were accepted.

## Decision
The owner's calls, Nov 17:
- **Two outcome-named controls on every host**: the host's walk action (the accent: Chronicles guides and records) and **"Open in Maps ↗"** (outlined, an external-link glyph, never the accent: it leaves the app and records nothing). It opens the phone's maps app straight from the tap, with the destination alone. No sheet and no choice after the tap.
- **The hosts are 0190's**: an Explore tile, the area card's footer, a storefront row, a complex row, Explore's long-press card, Chronicle's star sheet and Chronicle's long-press card. A row too far to walk still has Open in Maps. It is not on the area you are in, nor while the card's far question is open, nor on a long press below the zoom where Walk here exists.
- **Both on every tile**, as two half-width buttons. The walk button names what its tap does at every distance (0121): within 2 km with a fresh fix, "Walk there" starts the walk; beyond that, or with no fresh fix, it opens the area's card with its Walk now / When I get there question showing; past 10 km it reads "Set as destination" and saves the place for Navigate, starting nothing. A walk open is routed, as the card's Walk to does (NV10). Only the selected tile's Walk there is the accent (0172); every other tile's buttons are outlined.
- **The word "Go here" is gone from the app.** The walk screen's long-press card and its other two buttons, and a pin's viewer menu item, which route you inside a walk, now say **"Route here"**. What they do is unchanged.
- **Kept from 0190:** what leaves the device is the destination (the link carries coordinates; Android's `geo:` label is the area's name for an area, a complex or a street, and "Destination" for a star or a pressed spot).
- **Chronicles' own navigator** is reached through Walk to, Walk here and When I get there (and Navigate's long press), as before.

## Consequences
- Removed: `GoHereSheet`, `useGoHere`, `lib/atlas/goHere.ts`, the sheet's Back and Escape handling (and `pageBack`'s sheet option), the "Replaces where you were heading" line. The criteria GH1-GH15 (`explore-go-here`) and GE1-GE13 (`go-here-everywhere`) are retired by this record (`RETIRED`); `specs/open-in-maps-here` (OM1-OM14) carries what stands.
- Added: `lib/atlas/mapsButton.ts` (core), `components/OpenInMapsButton.tsx` (`useOpenInMaps`, the button's three looks).
- Native: Apple Maps from each host has never run on a device (`docs/NATIVE_UNVERIFIED.md`).
