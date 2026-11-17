# Local events: a technical proposal for a current-events index

A proposal (Nov 17), not a spec and not a plan: no criteria, no slices, nothing adopted. It answers the owner's
ask for a generalisable pipeline that finds, reads and keeps current the events of a town, starting in the Lehigh
Valley and able to grow into a wide, indexed store. The evidence is in `docs/research/local-events-sourcing.md`;
section numbers below ("research 4") point there.

It has not been through the vision gate. Section 9 lists what the owner must decide first.

## 1. What it is, and what it is not

- **It is** a build-side pipeline, apart from the app, that turns organizers' own published calendars into small
  dated packs a phone downloads. The phone sends nothing but a request for a file.
- **The durable asset is the source registry**, not the events. Events expire in days; a list of 10,000 calendars,
  each with a known way to read it, is the "highly indexed store" that compounds.
- **It is not** a marketplace, a ticket seller, a place to submit events, or a crawler of social platforms.
- **Decided already** (the owner, Nov 17): the phone polls and holds its followed towns locally; pilot towns are
  crawled on a schedule with no demand signal from phones; the pilot ships as static packs from `chronicles-data`
  behind a contract a server can later replace; the pilot is the Lehigh Valley.

## 2. Principles

1. **Read the organizer, not the marketplace.** The venue's own site is the origin, is lawful to read politely,
   and is where community events actually are (research 3, 8).
2. **Structured first, model last.** Feed, then markup, then a rule a model wrote once, then a model per page
   (research 5). Each source records which rung it uses.
3. **A model proposes; a validator disposes.** Nothing a model extracts is published unless it parses as a real
   date in the future at a known place. A model-read prose source may only nominate.
4. **Every source is an adapter with a declaration**, as decision 0108 set for places: licence, attribution, pace,
   allowed uses, role, terms checked.
5. **An event is cache, never truth.** It carries when it was fetched and when it stops being shown. A pack that
   cannot be refreshed empties itself; the app never shows a stale event.
6. **Facts and a link.** Name, time, place, kind, the source's URL. No descriptions, no images, no prices.
7. **Nothing is ranked.** No popularity, no attendance, no "trending". Order is by time and distance only.

## 3. The pipeline

```
  seeds ──▶ DISCOVER ──▶ CLASSIFY ──▶ registry (sources)
                                          │  per source, on its own cadence
                                          ▼
              FETCH ──▶ EXTRACT ──▶ NORMALISE ──▶ LOCATE ──▶ DEDUPE ──▶ GATE
              (raw store)  (ladder)   (one schema)  (venue→place)          │
                                                                           ▼
                                             phone ◀── PUBLISH ◀── PACKAGE (dated packs)
```

The stages after FETCH mirror the places pipeline (fetch, raw store, adapt, conflate, gate, package, publish), so
the frame, the schema tooling and the publishing path are reused. Two stages are new: DISCOVER and the time
dimension in PACKAGE.

### 3.1 The source registry

One row per calendar, not per site (a town site and its library may each have one).

| Field | Meaning |
|---|---|
| `id` | Our own opaque ID, as for places |
| `kind` | venue, arts organisation, tourism bureau, library, market, municipal, shop, aggregator API |
| `localities` | The town outlines it serves (our existing division IDs) |
| `home`, `calendar` | The site and the page or feed that lists events |
| `platform`, `rung` | The detected platform and the extraction rung in use (1 to 4) |
| `recipe` | For rung 3: the generated rule, its sample page and the date it last validated |
| `declaration` | Licence, attribution, pace, role, `robots.txt` and terms as read, and when |
| `cadence`, `health` | How often it is fetched; last success, consecutive failures, events yielded |
| `found_by` | Which discovery method produced it, so each method's yield can be measured |

### 3.2 Discover

Each method writes candidate rows; none publishes anything. In order of cost (research 4):

1. **Seeds we hold:** Wikidata's official-website property, and the websites carried by the places we already
   read. This ties every candidate to a location from the start.
2. **Web Data Commons' `Event` subset:** one download, filtered by address, giving the domains that already
   publish events as data.
3. **Common Crawl's URL index:** pattern queries for the platforms' tell-tale paths.
4. **A search API per town** for the gaps, with a model picking the calendar link from the results.
5. **Nominations:** a community source (a subreddit thread, later) may point at an organizer's site. It adds a
   candidate for review and nothing else.
6. **The owner's adds**, as `edits.json` does for places.

### 3.3 Classify

Fetch the candidate's home page once; fingerprint the platform; find the calendar link (by pattern, and by a model
when patterns fail); assign the rung. A source whose calendar is all civic meetings is kept in the registry and
marked so, not fetched daily.

### 3.4 Fetch and extract

- **Fetch** honours the declaration: `robots.txt`, crawl delay, a named user agent, conditional requests so an
  unchanged calendar costs one small round trip. Raw responses go to the raw store, so extraction can be re-run
  without re-fetching.
- **Extract** is one adapter per platform family, not per site. The pilot points to five families first:

| Family | Rung | Reads | Pilot evidence |
|---|---|---|---|
| iCalendar feed (any platform) | 1 | `.ics` | CivicPlus ×2; Google Calendar ×1 |
| The Events Calendar (WordPress) | 1 | Its JSON API, paged | ArtsQuest (462 events), Wilson |
| schema.org `Event` in the page | 2 | JSON-LD, microdata | ArtsQuest, both CivicPlus sites |
| Generated rule | 3 | Site-specific selectors | 6 of 13 sites had nothing better |
| Ticketed-event APIs (optional) | 1 | Ticketmaster, SeatGeek | Not in the pilot; terms unread |

- **Rung 3 in detail.** A model is given one saved calendar page and the event schema, and returns a rule. The
  rule is run on that page and on a second fetch; it is accepted only if both yield events that pass the gate.
  From then on no model is called. When a rule yields nothing for several runs, or its events stop validating,
  the source is flagged and the rule regenerated. This bounds model spend to roughly one call per source per
  redesign, not one per page per day.
- **Rung 4** (a model per page) is held for prose sources and is nominate-only.

### 3.5 Normalise

One schema, in Zod as the places contract is, exported as JSON Schema:

| Field | Note |
|---|---|
| `id` | Opaque; stable across fetches (from the source's own event ID, else a hash of source, title and start) |
| `title` | As published, trimmed |
| `start`, `end`, `all_day`, `tz` | Recurring events expanded to instances inside the horizon |
| `status` | scheduled, cancelled, postponed, as the source says |
| `place` or `lat`/`lon`, `locality` | From LOCATE; an event with neither is dropped |
| `kind` | A pinned table: festival, fair, market, music, film, stage, talk, class, exhibition, sport, civic |
| `url`, `src` | The event's own page and the registry source |
| `fetched_at`, `expires_at` | When read; when the app must stop showing it |

### 3.6 Locate

Feeds name venues and rarely give coordinates (research 7). So:

1. Match the venue's name and address to a place in the places registry, inside the source's localities.
2. Otherwise look it up in a per-source venue table, filled once by hand or by a geocoder and then reused. The
   pilot's 462 ArtsQuest events needed about five names.
3. Otherwise place the event at the source's own location, if the source is a single venue.
4. Otherwise drop it and count it in the run's report.

### 3.7 Dedupe and gate

- **Dedupe:** exact on the source's event ID or URL; otherwise normalised title, start within a window, and
  distance (research 5 gives one tool's defaults as a starting point to tune). The organizer's own listing wins
  over an aggregator's copy. Duplicates are linked, not deleted, as PredictHQ does.
- **Gate:** drop what is past, beyond the horizon, without a start or a place, cancelled (kept as a status for
  events already shipped), private, or of kind civic unless the owner wants meetings in. The gate reads no source
  name and no count, as PP5-PP7 require of places.

### 3.8 Package and publish

- **A pack per region and day window**, read by tile like the places archive, holding the next N days (60 is a
  starting guess). Events are small; the pilot's whole region is likely a few hundred kilobytes, to be measured.
- **Rebuilt daily**, and published when the events differ, with the manifest carrying the build time and the
  horizon. The phone's existing daily manifest check finds it.
- **On the phone:** events are read for the tiles of followed towns and where you are, kept locally, and dropped
  at `expires_at` with no network needed. Offline, yesterday's pack still answers for today.

## 4. Freshness

| Source kind | Cadence | Why |
|---|---|---|
| Venues, arts organisations | Daily | Shows are added and cancelled within days |
| Tourism bureau, markets, libraries | Every few days | Slower turnover |
| Municipal, small shops | Weekly | Rare changes; mostly long-dated |

Conditional requests make an unchanged source nearly free. A cancellation reaches a phone within one cadence plus
one manifest check: at worst about two days for a venue. That is the honest limit of polling static packs, and
the reason `expires_at` is short.

## 5. Scaling up, in stages

Each stage is useful by itself and is the measurement for the next.

| Stage | Scope | New work | What it proves |
|---|---|---|---|
| 0 | Lehigh Valley, a registry kept by hand (about 50 to 100 calendars) | The schema, the iCalendar and WordPress adapters, LOCATE, the pack | That the pack is worth showing at all |
| 1 | The same towns, every rung | The markup adapter and generated rules | The share of sources each rung covers, and model cost per source |
| 2 | Pennsylvania | Automated discovery (seeds, Web Data Commons, Common Crawl) | Discovery yield per method; registry upkeep per thousand sources |
| 3 | US regions | Per-region packs; health-driven cadence | Whether scheduled jobs and release assets still hold it |
| 4 | The owner's backend | A database and job queue replace the scheduled jobs | See section 6 |
| 5 | Community nominations | A reviewed nominating adapter | Whether nominations find sources discovery misses |

## 6. When a real backend earns its place

Static packs built by scheduled jobs hold as long as one run fits in a job and the registry fits in a file. The
signs that they no longer do:

- A full run cannot finish inside the job limit even when split by source (the places fetch already strained it).
- Per-source cadence needs a scheduler, not a cron line: thousands of sources each due at a different time.
- The registry needs queries ("every source of this platform that failed this week") a file cannot answer.

The backend that replaces them, kept apart from the app as the owner described:

- **A relational database with spatial indexes** for the registry, venues and events.
- **An object store** for raw responses.
- **A job queue** that fetches each source when due and re-extracts on a rule change.
- **A publisher that still writes the same static packs.** The phone keeps reading files; it never queries the
  database. This keeps the device-side contract, and the privacy property with it, unchanged by the move.

A queryable API for phones is a separate step with a different privacy cost (the server sees each question), and
needs its own decision.

## 7. Cost, as far as it can be said

No figures are claimed; these are what stage 0 and 1 must measure.

- **Fetching:** bounded by sources times cadence, less everything unchanged. Small.
- **Model calls:** rungs 1 and 2 use none. Rung 3 uses about one per source per redesign. Rung 4 scales with
  pages and is the cost to keep out.
- **Discovery:** Web Data Commons is a download; Common Crawl queries bill by data scanned; search APIs bill per
  query (research 4).
- **Upkeep:** the real cost at scale is broken sources. `health` exists so a run reports them, and so the share
  that breaks per month is known before stage 2 commits to thousands.

## 8. Risks

| Risk | Answer in the design |
|---|---|
| A stale or cancelled event shown | Short `expires_at`; status carried; daily venue cadence; the app drops without network |
| A model invents an event | Rungs 3 and 4 validate; rung 4 never publishes |
| A site objects, or its terms forbid it | Declaration per source; `robots.txt` honoured; a per-source off switch; facts and a link only |
| Coverage is thin for the smallest shops | Said plainly in the app's empty state; no simulation, no padding |
| Spam or commercial noise | Kinds are a pinned table; sources are organizers, not open submissions |
| Sources churn | `health`, regeneration of rules, and discovery re-run on a schedule |
| The feature drifts into a listings app | Section 9, items 1 and 2 |

## 9. For the owner to decide

1. **The vision gate.** Not yet run. `docs/VISION.md` says the walker is "not tourists working through a list" and
   asks whether a feature raises what you notice or only what you are told. A calendar leans toward the second;
   events shown as time-bound presence at a place lean toward the first.
2. **Look and feel.** The owner asked for the look and feel of Eventbrite-style apps. Those apps lead with
   images, prices, "popular" rails and attendance, several of which the Never table rules out. Which parts are
   wanted: the dated list, the kind filters, the card per event?
3. **Local-only.** A backend the owner runs needs a decision amending 0005 that says what the cloud is for.
4. **Community sources.** Decision 0108 limits them to nominating. Does that hold for events, where a thread may
   be the only mention of a small happening?
5. **Municipal sites.** A community source, or one that may place an event? And are civic meetings in or out?
6. **Descriptions and images.** The proposal keeps neither. Wanted enough to take on the copyright question?
7. **Ticketed-event APIs.** Ticketmaster and SeatGeek would add commercial concerts and sport, with keys and
   branding terms. In scope, or against "community events"?
8. **A model in the pipeline.** A key and a budget in `chronicles-data`, the first data-sending dependency of
   the build.
9. **The kinds table**, and whether events are told apart from places on Explore at all.

## 10. What to do first

Stage 0 needs no new decision beyond the gate: the iCalendar and WordPress adapters against ArtsQuest and the two
CivicPlus towns, in `chronicles-data`, producing one pack to look at. Two measurements should run beside it,
because they size everything after: the Web Data Commons `Event` subset filtered to Pennsylvania, and a survey of
the venue, library and tourism sites the first survey did not reach.
