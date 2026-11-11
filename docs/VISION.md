# Chronicles: the vision

The identity every feature answers to. The `/vision` skill argues from this page before a spec is
written, the `steward` subagent attacks a spec against it, and `npm run check:vision` blocks what can be
caught mechanically (decision 0094). Agents propose changes to this page; only the owner makes them, each
with a decision record.

- **Draft 1, 2026-11-05.** Lines marked **[proposed]** are recommendations not yet confirmed by the
  owner. The gate may cite them as reasons, never as rules, and says which is which.
- **Last reviewed:** 2026-11-10 at `b7b28c2` (`/vision review` moves this line).

## Who it is for

People who walk to notice: they value novelty and exploration, wander a town with no plan, and want to
keep what they found. A narrow audience on purpose (the owner, Nov 5). Not hikers (no trails), not
runners (no fitness), not completionists (nothing is a score), not reviewers (no ratings), not tourists
working through a list.

## What it is

An instrument for making memories on foot, **Chronicle first** (the owner, Nov 5). It brings together
what other apps do apart (a way, a camera and notes, a replay, a journal) under one philosophy: **every
moment captured is worth remembering**. Exploration and navigation exist to feed the corpus of moments;
the walks are one way into it; the map is one view of it, not its home. Later, recall and search make the
corpus a second mind (the owner, Nov 5). The overlap with adjacent apps is incidental: they each do one
verb for everyone; Chronicles does all three for a few.

## The three verbs

Every user-visible feature serves at least one. A feature that serves none is another app's feature that
wandered in.

| Verb | Where | It means | The question to ask |
|---|---|---|---|
| **Earn** | Explore, Navigate | Help the walker notice: where there is a lot, what makes a place itself, the interesting way | Does it raise what you notice, or only what you are told? |
| **Honour** | Capture, the walk | Keep a moment where and when it happened, one tap away, with its context | Does the moment arrive whole: place, time, the walk, what came before? |
| **Return** | Chronicle, replay, revisit, recall | Give moments back: ceremonies, revisits, threads, search | Does it bring a moment back worth having, at the right time, truthfully? |

## Never

Against the identity. The gate says **out**, then offers the nearest thing that fits.

| Never | Why (the owner's call) | The nearest thing that fits |
|---|---|---|
| Ratings, reviews, stars, "best of", rankings of places | Structural, never editorial; distinctive, not good (concept doc; Nov 1) | Your own note on a place, which is a moment; open-data signals such as a heritage listing |
| Scores, streaks, completion, coverage, levels, badges, leaderboards | Nothing is a score (0020) | A clause in words (0052); faint fog; "New to you", "you walked there often" |
| Tallies such as "12 of 87" or "40%" of places, streets or finds | No counts on Explore (NV14); counts are words (0052) | The finds named; "what's waiting" as kinds only |
| Popularity, trending, foot traffic, other people's activity | Worth the stop, not the most popular (Nov 1) | Presence of places from open data (0080, 0084) |
| A feed, followers, likes, public profiles | A personal memory tool, not social (Nov 1) | A whole outing sent as a reel through the share sheet, with no server |
| Several ways ranked by minutes; "fastest" as a label | The interesting way, not only the fastest (0020) | One suggested way; only Walk me back is the shortest (0029) |
| Nagging: off-route alarms, "time for a walk", re-engagement pushes | Follow the wind (0020) | A quiet re-route; Remind me here, opt-in per capture (0032) |
| Celebration: confetti, fanfare, big numbers, accent-coloured wins | Restraint (0001, 0052) | The card's line in words |
| Editing out the lows | The lows stay in (0001) | "Passed ... without stopping" |
| A capture behind a menu, a drawer or an extra tap | Capture is one tap away (Nov 1) | The stack at the edge, before and during a walk |
| Data leaving the device without a tap: accounts, analytics, telemetry, crash reports, a server as truth | Local only (0005) | The share sheet on a tap; a cloud only by a decision that says what it is for |
| All-day tracking | One fix per moment (0036) | A walk you start; a moment's one fix |
| Simulated or sample data in the app | No simulation (AGENTS.md) | An empty state in words |
| Fitness numbers: pace charts, calories, heart rate | Not fitness tracking (0020) | Distance and time, said plainly |
| Writing the owner's words for them | The epilogue is "one line in your own words" (concept doc) | A suggested title from the data, always editable, never overwriting |

## Always

- **Capture is one tap away** on every screen you walk or capture from.
- **A moment carries its context**: place, time, its walk, what came just before ("Oct 20, 40 minutes
  in, just after the bakery", concept doc). It never appears as a bare thumbnail, filename or count.
- **Moments and the trace are truth**; streets, areas and summaries are recomputed. A map update never
  loses a memory (concept doc).
- **Counts are words**, in a clause. Distances and times are fine.
- **Guidance is structural**: where there is a lot, and what makes a place itself, never whether it is good.
- **A route is a suggestion**; drifting is never nagged.
- **The lows stay in**; a chronicle that flatters is not one you trust.
- **Restraint** in motion, colour and copy: the content is the novelty, not the chrome.

## Shapes: how ideas fit

Verdicts: **aligned**, **aligned if reshaped**, **not now** (out of scope by a decision, may return),
**out** (against the identity), **no surface** (engineering with nothing a user sees).

| Idea | Verdict | The shape that fits |
|---|---|---|
| Ratings or reviews of places | out | Your note on a place is a moment; distinctiveness from open data |
| Suggested routes | aligned if reshaped | One way that detours for busy strips and places worth the stop within a stated budget; no "fastest" and no minutes compared; drifting never nagged; Walk me back stays shortest (0022, 0029) |
| Several routes to one point, Apple Maps style | out | Open in Maps hands that job to the phone's maps app |
| A streak of days walked | out | A weekly lookback in words (concept doc, Replay) |
| Badges for neighbourhoods explored | out | The atlas's "New to you" and familiarity in words (0066) |
| A heatmap of where others walk | out | Activity density from open data (0080) |
| Search over moments | aligned (Return) | Results are moments in their context, never snippets |
| Moments grouped by likeness | aligned (Return) | **[proposed]** threads the owner makes first; suggested groups only once there is a corpus to learn from |
| AI-written captions or epilogues | aligned if reshaped | Suggest, never write; the owner's words are never replaced |
| A cloud | not now | 0005 holds until a decision says what the cloud is for; **[proposed]** the device stays truth and the cloud is a mirror |
| Offline maps | not now | Out of scope by decision (0020), not against the identity |
| Pace, calories, heart rate | out | Distance and time |

## The Chronicle (the owner, Nov 5)

- Chronicle comes first; moments are its spine. Walks are one part of a larger presentation, and the map
  is secondary, a way to recall walks.
- Moments come together by likeness: for example, every text moment as one thread over time, read like a
  conversation with yourself.
- Recall and search, later, make the corpus a second mind; navigation and exploration feed it.
- The presentation must be emotionally resonant, easy to digest and searchable.
- **[proposed]** Browse standard, dwell diegetic: the index is a plain typographic timeline with lenses and
  search; opening a moment puts it back on its street at its time of day, in the ceremony's register. A row
  that could appear unchanged in a generic journal app is wrong.

## Open questions (the owner's)

1. Likeness: threads the owner makes, groups the app suggests, or both in that order?
2. Searchable voice memos need on-device transcription, a phone-only feature: acceptable?
3. A cloud, when it comes: a mirror of the device, or a place where work happens?
4. The Chronicle register: browse standard, dwell diegetic?
5. "Nothing is ever calculated for you" (concept doc, Memory) against suggested likeness and recall the
   app volunteers ("a year ago today"): where is the line?
6. The found tally on a place's sheet ("12 of 87 · list from Nov 1", E10): keep, soften or remove?
   `npm run check:vision` carries it as debt until then.

## Precedents

An owner's call that overrules the gate, or accepts a reshaping, is a decision record listed here, so the
same argument is not had twice.

| Decision | The call |
|---|---|
| 0020 | Positioning: nothing is a score; the interesting way; follow the wind |
| 0034 | Busy areas are information only |
| 0052 | Counts are words |
| 0094 | The vision gate: the gate advises and the owner decides; the mechanical check blocks |
| 0095 | Scenic routes: a row per leaning beside Direct, kept over the page's "one way"; no minutes compared, the detour in words (reshaped at the gate, Nov 5) |
| 0099 | The found tally is removed: a place's sheet names its finds and never counts them (answers open question 6, Nov 5) |
| 0103 | A static places archive in the chronicles-data repo, read by tile; significance is a gate, never a measure; Curiosities are a kind of "Viewpoints & oddities"; reverses 0084's "no host" (reshaped at the gate, Nov 5) |
| 0107 | Storage awareness: the room left said in words beside the captures, once for each level; every failed save held for Retry; no gauge, no limit on capturing, no Storage screen (reshaped at the gate, Nov 9) |
| 0108 | The places archive becomes a pipeline of adapters; a community source may only nominate, and a nomination reaches only the owner's review list, never a pack (the steward's finding, the owner's call, Nov 9) |
| 0109 | Listed places enter when remarkable and public: a listing is the gate, reachable from public ground the bar, never a mundane building or a closed place on a listing alone, a Landmark house excepted; the archive reads OpenStreetMap's tags; attractions pinned; Overture stays for busy streets (reshaped at the gate, Nov 9) |
| 0110 | The slice's calls: OpenStreetMap only corroborates; the new kind is "Buildings and structures", never named for significance; passed places whisper as the card says them; reachability is said ("No street or path close by"), never a filter |
| 0111 | The audit's calls: one place within 200 m for the same name and kind; a listed site, battlefield or wreck is a Monument, not a building |
| 0112 | The app opens on Chronicle's Memories, which keeps a moment in one tap: the stack's three kinds in plain ink, fixed low, never a hero block (reshaped at the gate, Nov 9) |
| 0115 | Places out of town: kinds filter what you see, never what exists; one-of-a-kind businesses only by a structural signal, never ratings or popularity; "?" within 50 km in countless stars, named only on a tap, never listed or counted (reshaped at the gate, Nov 9) |
| 0121 | Drive there, walk back: a far Walk to asks Walk now or When I get there; the walk starts only on Start, never on arrival; Walk me back leads to where the last ride ended (reshaped at the gate, Nov 10) |
| 0127 | Presence by bars: a place may light two bars, never making two redundant; a route from a bar leans on places you pass, by kind, never named (reshaped at the gate, Nov 10) |
| 0131 | A moment's responses in a sheet over the viewer: plain entries in words, no count, no unread (reshaped at the gate, Nov 11) |
| 0139 | Media: bare tiles; the day header says where |
| 0143 | Complexes: information only; the street kept; a viewing never fetches (reshaped at the gate, Nov 11) |
