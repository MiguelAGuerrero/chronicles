# 0273. A fresh fix when a screen needs where you are: read as it comes to the front, said when location is off, never tracked

Date: 2026-11-27 · Status: accepted, the outing and planner pages built in fix outing-current-position; the rest waits on G17's build · Area: location, Explore, Navigate, the outing and the walk planner · Amends: [0070](0070-app-opens-on-explore.md) (NV16: "Explore reads one fix as the app opens and frames it, once per launch") · Keeps: [0036](0036-no-all-day-tracking.md) (no all-day tracking), NV17 (no tracking outside a walk) · From: the owner's /investigate, in person, Nov 27 (`docs/research/current-position.md`)

## Context
The owner, Nov 27: "I'm in Allentown and it's showing me a plan from all the way from Catasauqua or Coplay … we should
ensure any location, sensitive journey is updated to the users current position, and if location services are off,
that should be prompted". They also floated tracking all the time by default, or turning it on on entering navigation.
On the web build, the app launched at one point and moved 4 km, Explore still said "You're here" on the first town and
Plan an outing planned "Around here" around it: Explore reads one fix per launch (0070, NV16) and hands it, of any age,
or with none the area it last listed, to the outing and planner pages, which read none of their own (against OJ10, QC30,
WP3). With location refused, nothing said so, and the walker dot was drawn at the last listed area. The gate found the
ask aligned if reshaped: tracking by default is out (VISION.md Never, "All-day tracking", 0036), and a walk's recorder
already tracks from Start.

## Decision
The owner's four answers, in person, Nov 27:
- **"Fresh fix when needed (Recommended)".** One fresh fix (`lib/locate`) whenever a screen that uses your position
  opens or comes to the front, and when the app returns to the front; nothing watches in between. Explore no longer
  reads once per launch (amends 0070, NV16); Navigate's ready map reads on the app's return as on its focus (NV17 kept).
  Not a watch while Explore or Navigate is on screen, and not all-day tracking (0036 kept).
- **"Fix it now (Recommended)".** Plan an outing and the walk planner are mended at once by a `/fix` (fix
  outing-current-position): each reads one fresh fix as it opens, says it needs your location when refused, and routes
  Start from that fix. The rest is G17.
- **"Quiet notice each time (Recommended)".** With location off or refused, Explore says so in the quiet notice each time
  it comes to the front (`LOCATION_OFF`, Open Settings on a phone); with no fix read, no walker dot and no "You're here".
  Not a one-time explainer screen before the system prompt, and not today's silence.
- **"Up to 30 min, said (Recommended)".** When a fresh fix does not come in time, a screen that plans from where you are
  may use one up to 30 minutes old (`FRESH_FIX_MS`) and says so in a line ("From where you were 20 minutes ago." or
  similar); older than that is no position.

## Consequences
- The `/fix` (fix outing-current-position) for the outing and planner pages, Q4 included there; G17 in `docs/STATUS.md`,
  "Next evolutions", for the rest, built by `/slice --from=G17`.
- `specs/navigation-and-tabs/spec.md` NV16 and `specs/explore-atlas/spec.md` AT1 ("Explore reads one fix as the app
  opens") say the old; the slice rewords them in the owner's doc and re-exports (the specs mirror it).
- 0036 holds: between reads nothing watches; the background task stays a walk's only.
- A fix never leaves the device (0005).
- Native, never run on a phone: the read on `AppState`'s return, its cost of up to 10 s of high-accuracy location each
  time, and Open Settings from the notice on Explore.
