---
paths:
  - "src/lib/gaps/**"
  - "src/components/GapCard.tsx"
  - "src/lib/tileCollector.ts"
  - "src/lib/__tests__/gaps.test.ts"
---
# Filling gaps

Gaps in the trace filled with the streets most likely walked (the concept doc's "Filling gaps" tab, G1-G14; `specs/filling-gaps/spec.md`). The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.


- **A gap in the trace is filled with the streets most likely walked** (the
  owner's calls, Nov 3). This is map matching across a gap, with the time as
  the limit. It is opt-in unless the answer is obvious.
  - An uncertain stretch is drawn faint (`FAINT_OPACITY`, the trace's green
    and edge, see-through). It counts for nothing until kept.
  - A kept or self-filled stretch is walked trace in every way.
  - The app-closed / GPS-lost case only. Dead reckoning from the phone's
    sensors (weak GPS with the app open) is a later slice.
- **The decision** (`gaps/infer.ts`, pure; rules in `gaps/rules.ts`):
  - A gap is two walked fixes more than 60 s apart, no pause or ride between,
    40 m or more apart and at most 30 min (`gapsOf`, on the trace read
    *without* fills).
  - The likely way is the shortest walk over street pieces. Each end joins
    every street edge within 40 m, split where it is nearest, and the split
    edges keep their piece. It needs at most 2.5 m/s.
  - A piece is certain when the shortest way avoiding it is longer than the
    budget. The search is A* with only the edges of that piece the way uses
    banned, pruned at the budget. There are two budgets: direct (1.25 × the
    way) and time (the gap at 1.8 m/s, a brisk walker, if longer).
  - At least half the way must be street, not joins (a plaza isn't a street
    stretch).
  - **Splitting replaces the edge** (`PieceGraph.split`). Each join splits
    the street edge it lands on into two halves and removes the original.
    The first version kept the original beside its halves. It also banned
    whole pieces, so a mid-block end was always "certain" and a 30-min gap
    on one block filled by itself (gaps audit 1).
  - 90%+ of the way certain under the time budget fills by itself; else 50%+
    under the direct budget is offered; else nothing.
  - A budget whose prism (a circle on the gap's middle, half the budget
    across) leaves the read box is never judged, so unread ground never
    looks certain.
- **Reads** (`gaps/index.ts`): `readBounds` is the time budget (or 2x the
  straight line, capped at 4 km across). The z14 tiles over it plus 250 m are
  fetched and decoded in code (`fetchTiles`), so the walk screen, a snap and
  the replay all see the same pieces.
  - Results are memoized per session by build, walk and gap.
  - Unread (offline, no `tile_url`) is `undefined`, never `null`: the snap is
    left not done (`snapDone`), and the live hook retries after 2 min.
  - `loadReplay` reads the network only with `{ readGaps: true }` (the
    replay's second load, after `ensureTileBuild`), so a walk still opens
    from the device first.
- **Fills** (`readTrace(..., stills, fills)`, after `holdStill`) add points
  along the line, spread evenly over the gap (every 10 m, and at least every
  20 s, so no break is left).
  - Their speed is `GAP_RULES.pace`, so a slow stretch is never smoothed into
    a standstill.
  - A fill with walked fixes inside it, or a break across it, is skipped.
  - `snap` and `assignAreas` take `fills` too; `snapWalk` and `loadReplay`
    read the stretches first, then the trace with them.
- **Truth:** `gap_fill` (SQLite migration 14, IndexedDB v12, in
  `KEPT_STORES`) holds kept and dismissed stretches with their line, so a map
  update never moves a kept one.
  - A decision matches a gap when their times overlap by more than half the
    *longer* (`sameGap`) and its line runs from within 25 m of the gap's fix
    before to within 25 m of the fix after (`meets`). So one decision never
    lands on two gaps (gaps audit 4). The newest wins. Inferences match the
    same way, this exact gap's key first.
  - A decided gap is never read. `deleteWalk` removes its rows.
- **UI:**
  - The live trace (`useLiveTrace`) reports gaps (`onGaps`) and takes fills.
    `useLiveStretches` lives in `OpenWalkProvider`, so a minimized walk keeps
    its stretches.
  - A map tap within about 20 px of a stretch opens `GapCard` (`stretchAt`).
    That is 0.45 of the press reach, and taps within 30 m of either end don't
    count, since the recorded trace and captures are there (gaps audit 8).
    An offer gets Keep and Not this way; a filled or kept stretch gets Not
    this way only.
  - On the walk screen the card closes when another card takes its slot
    (long press, mark, memory, options) and after walking 30 m. It isn't
    shown under the capture viewer (gaps audit 7).
  - On the replay, faint stretches show on the card beats only.
  - Deciding on the replay re-snaps with `tileCollector()` and reads the
    replay again, with the card busy until it's done. `tileCollector()` reads
    tiles in code, with no camera moves: the tiles within 150 m of the walk,
    at most `MAX_DERIVE_VIEWS` (`tilesNear`, gaps audit 6).
  - The replay's second load (`readGaps: true`) is always shown, not only
    when a snap follows. In a new session, nothing is inferred until it is
    read (gaps audit 2).
  - `withFilled(tr, fills)` adds fills to a trace already read. Use it
    instead of reading twice (gaps audit 9).
- **E2E** (`E2E_ONLY=gaps`): a walk is started, backdated and given stored
  fixes with two gaps, then reloaded (a real gap would take minutes). The
  live fixes at "now" form their own short run, so "no fill" is five lines.
  `window.__project` (set only with `window.__perf`) turns a point into page
  coordinates for taps. The web map writes `data-runs` and `data-faint`.
- **Audited (Nov 3):** 17 findings, 12 fixed with a regression test each
  (`gaps audit N` in `gaps.test.ts`; 2 and 7 in the e2e). Filled stretches
  stay styled as trace (the owner's call).
- **Deferred:**
  - Inferences aren't stored. A new session reads each gap's tiles again;
    the day replay never reads them; unreadable tiles keep a walk re-snapping.
  - A long fill's share of the replay isn't capped.
  - There is no way to reach a stretch without a map tap (screen readers).
  - Inference on a very dense grid can take about 0.5 s of JS on a desktop.
  - Walk me back ignores stretches.
  - The backup bundle leaves decisions out.
  - A dismissed stretch can't be brought back.
- **Native** (unverified on a device): migration 14, the faint layer, the
  card over the native map.
