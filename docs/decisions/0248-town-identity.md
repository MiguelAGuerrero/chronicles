# 0248. Town identity: one town is one card, by its border

Date: 2026-11-20 · Status: accepted · Area: explore · Amends: the town read of 0083 (TO4) and 0124's row · From: `/fix duplicate-city`, then `/slice town-identity`

## Context
The owner, Nov 20, with a screenshot of two Philadelphia cards on Explore's row: "Philadelphia got listed twice". The
town read reads town borders only under you; Philadelphia's map label (City Hall) lay in a tile not read, more than 3 km
from the piece of border read, so the border was taken for a second town of the same name. The narrow fix (a city's
label joined within 12 km) was reviewed and found to drop the city you stand in past the read, to still list a city
twice from reads at two spots of it, and to let the wrong one of two same-named cities be "You're here".

## Decision (the owner's answers, Nov 20 and 21)
- Do it right as a slice (asked against: shipping the narrow fix, scrapping it): a town row keeps its border's identity,
  so rows of one town merge whatever spot they were read from, and a label is joined to a border by the border under
  it, read for it, never by a distance. A migration was accepted for it (SQLite 31; IndexedDB keeps rows whole).
- The plan as reviewed, built and deployed (`/slice and /deploy`, Nov 21). Which walks a town's card counts ("Walked
  once") is unchanged: widening it by distance would credit one Kansas City's walks to the other (the steward, S1);
  counting by the border needs placing to keep the identity too, deferred.
- Left as they are, the owner silent on them: a town card's "Walked 23 times" in digits, and your town's card, its label
  past 12 km, saying "You're here" with a long walk to the label.

## Consequences
The town read may read up to eleven more border tiles, once each ever (kept in `outline_tile`), only under labels that
share a name with a border read. `ATLAS_OWN` a16 lists every town row again once; neighborhood rows of a15 stand.
Placing walks (`AREA_RULES`) is untouched, so the home's Philadelphia area can still sit at the middle of a border piece.
