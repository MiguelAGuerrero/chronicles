<!-- Repo first: written from the owner's request in a session (Nov 11, 2026), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Free look: pan the Explore map, then load the areas around its centre

Nov 11, 2026 · @Miguel Guerrero

## Vision

Idea: Explore's map snaps from area to area, so there is no way to scroll the map to a place away from you (Carlisle while standing in Camp Hill) and load its information. Let a reader free the map to pan, then load the areas around the map's centre (the owner, Nov 11).
Verb: earn (it raises what you notice about places you aren't standing in; 0115 already reads "?" out of town)
Touches: decision 0092 and EC10, "One finger never pans the map" (amended here: only while Move map is on, the default stays snapping); Always, "Restraint in motion, colour and copy: the content is the novelty, not the chrome" (the toggle and the button are quiet controls); Never, "Tallies" and Never, "rankings" (the row stays nearest first, now nearest the looked-at point, with no count and no "best" in any copy); Never, "Data leaving the device without a tap" (no new host: the reads are the near-you reads); decision 0121 (a far Walk to already asks "Walk now" or "When I get there"); DEFERRED, "Explore's layers follow the selected area or you, not the panned map" (a look makes the looked-at point the page's centre, so the layers follow it).
Verdict: aligned if reshaped
Shape: As asked, with these changes. A looked-at place never says "You're here". Locate is the way back to you. Turning Move map off returns to snapping. Distances on the cards are measured from you, never from the looked-at point.
Criteria: FL1 (the default still snaps); FL7 (no "You're here" while looking); FL8 (Locate returns); FL11 (no count or rank in the copy); FL9 (no new host).
Open: the calls in `plan.md` (the copy, distances from you, the button's name, whether Move map resets on leaving the tab, the centre mark).

## What it is

On Explore, a **Move map** switch frees one-finger panning. With it on, the reader drags the map to Carlisle and taps **Show areas here**: the page lists the towns (or neighborhoods) around the middle of the map, nearest that point first, and reads them the way it reads the areas near you. The long press on a panned spot still offers What's good here and Walk here. **Locate** brings the page back to where you are.

## Decisions (the owner's calls, Nov 11)

- **Pan, then load the map's centre.** No search, now or here (a search needs a geocoder: a new host and typed text leaving the device, which 0005 forbids until a decision says otherwise).
- **A Move map toggle** frees one-finger panning; snapping stays the default. This amends 0092 and EC10; a decision record (0147) says so.
- **Nothing is stored.** The look and the toggle live in the screen, like the page and the selection.

## Criteria

1. **FL1** With Move map off (every visit to Explore starts so), the map is exactly as the carousel left it: one finger never pans (EC10, DN1), a swipe steps the row (EC8), the arrow keys step it.
2. **FL2** A Move map control sits on the map as a toggle button: its name says what it does, its state is said in words to a screen reader (pressed) and drawn with more than colour, and its target is at least 44 pt.
3. **FL3** With Move map on, a one-finger or mouse drag pans the map on web and native, with the usual coast; a drag no longer steps the row; pinch, the wheel, a double tap and the two-finger turn work as before; on web the arrow keys pan the map.
4. **FL4** Turning Move map off goes back to snapping: a swipe steps the row again, the selected area stays selected, and the map does not move.
5. **FL5** While Move map is on, a "Show areas here" button is on screen and a small mark at the map's middle says what it will load; neither is there while it is off.
6. **FL6** Show areas here loads the page around the map's middle: the row holds the towns around that point (the neighborhoods only as they are on the page near you), nearest that point first, the first selected and framed as on arrival; a town's page open when it is tapped closes, a card open closes, and the long press's choices close.
7. **FL7** While looking, nothing says "You're here": not the title or its subtitle, not a card or a town's note, not the home. The page says in words that it is not around you.
8. **FL8** Locate ends the look: the page is around you again, framed on you, with "You're here" where it was true, as before the look.
9. **FL9** A look reads through the same reads as the page near you (the near read, the ring read, outlines, the archive) with the same retry and one-at-a-time rules, and adds no host to `ALLOWED_HOSTS`.
10. **FL10** The long press on a panned spot (zoom 10 or closer) still offers What's good here and Walk here, and a drag that pans never starts one.
11. **FL11** No copy added by this slice carries a number or a rank ("top", "best", "closest"); the row's order is the nearest first and says so nowhere.
12. **FL12** Walk to on a looked-at area asks "Walk now" or "When I get there" by your distance from it (0121), never by the looked-at point's.
13. **FL13** A keyboard and a screen reader can use it: the toggle and the button are buttons with names; with Move map on, the map's label says the arrow keys pan it; a look is announced once ("Showing areas around the middle of the map").
14. **FL14** Leaving Explore turns Move map off; the look stands, like the page and the selection; nothing new is stored.

## Retired and amended

- The carousel's rule that one finger never pans the map (`specs/explore-carousel/spec.md`, criterion EC10) is amended: it holds unless Move map is on (FL1, FL3). Its tests (`carousel` "EC10", `snap` "DN1", "DN10") stay as they are and now describe the default.

## Out of scope

- Search by name (a geocoder: a new host, decision 0005).
- A look that survives a relaunch, or a list of places looked at (nothing stored).
- The Busy and Walkability layers over a looked-at place beyond what they already do around the page's centre.

## Record

(filled in as the slice is built)
