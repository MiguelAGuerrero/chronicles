# Local events: where "what's on near you" comes from, and what is open to us

An investigation (Nov 17) for the owner's idea of current events scoped to a town: festivals, fairs, markets, what
a venue or a shop has on. The owner asked what tools and techniques exist for a wide crawl (an LLM, an outside
API, a dataset), and how other apps fill an events index without owning a proprietary one. Nothing here is
adopted. The proposal built on it is `docs/research/local-events-pipeline-proposal.md`.

**How far to trust this page.** Two kinds of evidence, marked throughout:

- **Measured**: fetched and counted in this session (the Lehigh Valley survey, section 7).
- **Lead**: found by web search on Nov 17 and read as a search summary only. This session's network could not open
  the pages themselves, so every lead needs its primary source read before a decision rests on it. Under
  `docs/research/adjacent-apps.md`'s rule these are not yet citable precedent; they move there once read.

## 1. The short answer

1. **Nobody offers a free, open search over local events any more.** The marketplaces closed theirs: Eventbrite's
   public search endpoint went in 2019-2020, Facebook's event search in 2018, and Meetup's API is sold as a Pro
   feature (leads, section 3).
2. **The apps that list events without owning them harvest what venues publish.** Google's event results are built
   from schema.org `Event` markup on the venues' own pages; newspaper calendars are filled by syndication networks
   that take organizer submissions once and spread them (leads, section 2).
3. **Most of the useful data is already machine-readable.** A handful of calendar platforms cover a large share of
   sites, each with a feed or an API. In the pilot sample one arts organisation exposed 462 upcoming events through
   a public JSON API (measured, section 7).
4. **An LLM is the last rung, not the first.** The evidence favours having a model write a site's extraction rule
   once and running that rule deterministically, over sending every page to a model (leads, section 5). This is the
   owner's "steering rules" intuition, and the published numbers back it.
5. **The hard remainder is social.** The shop's chalkboard, the flyer, the post on Facebook or Instagram: no
   lawful bulk access exists. The nearest reachable thing is the shop's or venue's own website (section 6).

## 2. How event apps get their events

Six models. An index of any size mixes several.

| Model | Who | How the events arrive | Open to us? |
|---|---|---|---|
| Organizer marketplace | Eventbrite, Meetup, Facebook Events, Luma | The organizer creates the event on the platform, which sells tickets or attention | No: search APIs closed or gated (section 3) |
| Ticketing inventory | Ticketmaster, SeatGeek | The platform sells the seats, so it holds the listing | Partly: free keyed APIs, ticketed events only |
| Markup harvest | Google's event results | Crawls the web for schema.org `Event` on each event's own page | Yes: the same markup is public (sections 4, 5) |
| Syndication network | CitySpark, Evvnt | Organizers submit once; the network feeds newspaper and media calendars | No public data; shows the submit-once shape |
| Commercial aggregator | PredictHQ, AllEvents | Hundreds of sources merged, deduplicated, sold by API | Paid; pricing by quote |
| Open commons | OpenAgenda (France), Mobilizon and Gancio, City Scrapers | Open platforms, federation, or volunteer-written scrapers | Yes, as models; little US coverage |

Notes on each (all leads):

- **Google.** Its documentation requires `Event` structured data on a unique page per event, with a name, a start
  date and a place with an address. This is the clearest case of a large events index built without a proprietary
  dataset: the venues publish, the crawler reads. Source:
  https://developers.google.com/search/docs/appearance/structured-data/event
- **CitySpark and Evvnt.** CitySpark's media kit claims 1,800+ media partners and 2.5M+ event submissions; Evvnt
  was reported on 2,400+ sites. Both rest on organizers submitting once. Sources:
  https://intercom.help/cityspark/en/articles/9548055-cityspark-media-kit ,
  https://nnafoundation.org/evvnt-rolls-out-v2-event-discovery-to-2400-sites
- **PredictHQ.** Describes "hundreds of sources", a 14-stage processing pipeline and a `duplicate_of_id` field, so
  duplicates are flagged and kept, not silently dropped. Source:
  https://cf-origin.predicthq.com/blog/get-to-know-our-duplicate-of-id-field
- **OpenAgenda.** Each organizer keeps its own agenda; the platform exposes them through an API, in a
  schema.org-shaped format, under an open licence, and French public bodies republish them on data.gouv.fr. The
  closest thing found to the "comprehensive indexed store" the owner describes, run as a commons. Source:
  https://developers.openagenda.com/en/
- **Mobilizon and Gancio.** Open-source event platforms that federate events to each other over ActivityPub.
  Source: https://docs.mobilizon.org/6.%20Fediverse/3.gancio/
- **City Scrapers (City Bureau).** Open-source, volunteer-written scrapers, one per agency, that standardise public
  meetings into one database; copied in other cities from a template repo. The same per-source shape as
  AllThePlaces (`docs/research/incremental-places-builds.md`), applied to dated listings. Source:
  https://github.com/City-Bureau/city-scrapers/
- **AI extraction from flyers and posts.** One vendor (Seeker) says it reads event details from flyers, social
  graphics and Instagram posts. A marketing claim, unverified. Source: https://seeker.io/?p=18205

## 3. Outside APIs: what each still gives

All leads. "Search" means finding public events by place without already knowing the organizer.

| API | Search by place? | What the search found | Fit for us |
|---|---|---|---|
| Eventbrite | No | Public search lost access Dec 2019, whitelisted keys until Feb 2020; the API now returns only events you own or name by ID | None as a source. An organizer's own page can still be read by ID |
| Facebook / Meta Graph | No | Event search deprecated Apr 2018; page events need app review and return empty otherwise | None |
| Meetup | Unclear | Meetup presents its GraphQL API as a Pro feature; third parties claim basic search works without it. Not settled | Test before relying on it |
| Ticketmaster Discovery | Yes | Free key; 5,000 calls a day by default; branding and linking terms apply and were not read | Ticketed concerts, sport, theatre only |
| SeatGeek | Yes | Free client ID; a limit near 1,000 requests an hour was reported, unconfirmed | Same class as Ticketmaster |
| Bandsintown | No | The API is for artists and those acting for them; app IDs are granted on request | None |
| AllEvents | Unclear | Its own page advertises an events API; no public documentation or price found | Ask before assuming |
| PredictHQ | Yes | Commercial; priced by quote on locations, categories and horizon | Paid fallback, not a base |
| Google events via SerpApi or DataForSEO | Yes | Resellers scrape Google's results. Google sued SerpApi in Dec 2025; status unknown | Avoid |
| Reddit Data API | By subreddit | Free tier about 100 queries a minute per OAuth client, for non-commercial use; commercial use needs an agreement | A nominating source at most (section 6) |

Sources: https://groups.google.com/g/eventbrite-api/c/FT2MsDswdrA ,
https://developers.facebook.com/blog/post/2018/04/04/facebook-api-platform-product-changes/ ,
https://www.meetup.com/en-US/graphql/ , https://developer.ticketmaster.com/products-and-docs/apis/getting-started/ ,
https://seatgeek.com/api-terms , https://help.artists.bandsintown.com/en/articles/7053475-api-and-app-id ,
https://allevents.in/pages/events-api , https://www.predicthq.com/pricing ,
https://usagepricing.com/blueprint/activity/2025-12-19-serpapi-google-lawsuit .

The pattern: the free APIs that remain cover ticketed, commercial events. Community events (the fair, the market,
the library talk) are in none of them. They are on the organizers' own sites.

## 4. Datasets and ways to find sources

Finding the sites is the owner's "first and foremost". Five ways, cheapest first.

| Way | What it gives | Evidence |
|---|---|---|
| Wikidata official-website property | A site for a municipality, venue or organisation already in Wikidata | Measured: 28 of the 62 municipalities in Lehigh and Northampton counties, some stale (section 7) |
| Websites on places we already read | Overture places and OpenStreetMap carry a website for many venues and shops, already tied to a location | Not measured. The schema fields need confirming against the pipeline's own readers |
| Web Data Commons | Every schema.org entity extracted from the Common Crawl, with a subset per class including `Event`. The Oct 2024 crawl covered 2.4 billion pages from 37.4 million sites | Lead: https://www.uni-mannheim.de/dws/news/wdc-json-ld-microdata-rdfa-data-corpus-2024-published |
| Common Crawl's URL index | A table of every crawled URL, queryable by pattern through Athena, billed by data scanned. Finds sites by a platform's tell-tale paths without fetching them | Lead: https://github.com/commoncrawl/cc-index-table |
| A web search API | A query per town ("events calendar <town>") for what the others miss. Bing's API was retired Aug 11, 2025; Brave's is metered at about $5 per thousand requests with a small monthly credit | Leads: https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement , https://api-docs.search.brave.software/pricing |

Two of these change the plan's scale:

- **Web Data Commons answers "which sites publish events as data?" for the whole web in one download.** Filtering
  its `Event` subset to places with a Pennsylvania (then US) address yields a list of event-publishing domains, with
  no crawling by us. Its age (the newest release found is from Oct 2024) does not matter for discovery: we want the
  domains, not the stale events.
- **Common Crawl's index finds platform users by URL shape.** The pilot found three feed-bearing platforms
  (section 7), each with distinctive paths. A pattern query lists every site that has them.

## 5. Extraction: getting events out of a site

A ladder. Each source is read at the highest rung that works.

1. **A feed or an API the platform provides.** iCalendar (`.ics`) is the common denominator; several platforms add
   RSS or JSON. Measured in the pilot: CivicPlus (iCal and RSS), The Events Calendar for WordPress (a JSON API and
   iCal), embedded Google Calendars (a public calendar has an iCal address; not fetched).
2. **Structured data in the page.** schema.org `Event` as JSON-LD or microdata: what Google reads. Measured: 12
   JSON-LD events on ArtsQuest's listing page, microdata on both CivicPlus calendars.
3. **A rule written once per site.** A model reads a sample page and writes selectors or a small extraction
   function; the pipeline runs it without a model until it stops validating. One 2025 study, as reported by a
   scraping vendor's blog, measured generated extraction functions at 96.48% accuracy with 95.82% fewer model
   calls than per-page extraction. Lead, and vendor-reported:
   https://www.scrapingbee.com/blog/ecommerce-scraping-cascade-scrapy-local-llm/
4. **A model reads each page.** Adapts to any layout and to prose ("join us Saturday at 2"), costs a call per
   page, and can invent a date. No independent comparison of the tools (Firecrawl, Crawl4AI, ScrapeGraphAI) was
   found; the claims are the vendors' own. Lead: https://kadoa.com/blog/how-ai-is-changing-web-scraping-2026

Deduplication, as the scraper tools describe it (leads, vendor documentation): exact match on a platform's own
event ID where there is one; otherwise a normalised title, a start time within a window and a distance. One tool's
defaults are a title similarity of 0.82, 90 minutes and 800 m.

## 6. Community sources: Reddit, Facebook, shop boards

- **Reddit.** Local subreddits do carry "what's on this weekend" threads. Free API access is for non-commercial
  use, and a commercial project needs an agreement whatever its volume (lead). Posts are prose, so they need rung
  4, and they describe events second-hand. Under decision 0108 a community source may only nominate: a post can
  point the pipeline at an organizer's site, never place an event.
- **Facebook and Instagram.** Where most small shops and bars actually announce things. No API access for public
  event search (section 3), and scraping behind a login breaks the terms. Out of reach.
- **Nextdoor and similar.** Closed; no public data.
- **Physical boards and flyers.** Not online. Reaching them means someone photographing a board, which is a
  capture, not a crawl.
- **What is reachable instead:** the shop's or venue's own website, found through the places data (section 4).
  Coverage will be thin for exactly the smallest businesses, and the proposal says so.

## 7. The Lehigh Valley measurement (Nov 17)

Measured from this session. A small sample: 20 sites tried, 13 distinct sites answered (11 municipal, ArtsQuest
and Discover Lehigh Valley; SteelStacks redirects to ArtsQuest).

**Finding the sites.** Wikidata lists 1,245 entities in Lehigh and Northampton counties, 233 with an official
site. Of the 62 municipalities, 28 have one listed; among those, Emmaus's has moved to a new domain and
Coopersburg's certificate has expired.

**What the sites run.**

| Site type | Count | Sites | How it is read |
|---|---|---|---|
| CivicPlus | 2 | Easton, Forks Township | iCal and RSS feeds, both confirmed working |
| The Events Calendar (WordPress) | 2 | ArtsQuest, Wilson | JSON API and iCal; Wilson's API returned no upcoming events |
| Embedded Google Calendar | 1 | Palmer Township | A public calendar's iCal address; not fetched |
| Another WordPress calendar | 2 | Bath, Wind Gap | No feed found |
| Plain HTML or custom | 6 | Allentown, Bethlehem, Nazareth, Bethlehem Township, Macungie, Discover Lehigh Valley | A per-site rule |

**What the feeds hold.**

- Easton's main calendar feed: 227 entries, 226 of them council, board and commission meetings, with recurring
  entries out to 2032. Only that one category was pulled.
- ArtsQuest's API: 462 upcoming events. In the first 50, 44 named a venue (five distinct names) and none carried
  coordinates.

**Crawl manners.** None of the 12 sites whose `robots.txt` was read disallows crawling outright; Macungie has
none. The two CivicPlus sites ask for a 10-second crawl delay and name AI crawlers; the rule set for those
crawlers was not read.

**Not reached:** Emmaus (new domain not allowed in this session), Coopersburg (expired certificate), Lower
Macungie (connection reset), South Whitehall, Slatington and Pen Argyl (refused by the session's proxy).

## 8. Terms and law, in brief

Leads, and not legal advice.

- **Public pages, logged out.** hiQ v. LinkedIn held that scraping public pages likely does not breach the
  computer-fraud statute; contract and copyright claims remain possible. In Meta v. Bright Data (Jan 2024) a
  district court found Meta's terms did not bind a scraper that never logged in. Source:
  https://www.fbm.com/publications/what-recent-rulings-in-hiq-v-linkedin-and-other-cases-say-about-the-legality-of-data-scraping/
- **Facts and expression.** The standard US position (Feist, 1991) is that facts such as a name, a time and a
  place are not protected, while descriptions and images are. Not confirmed by this search.
- **The safe shape that follows:** read the organizer's own site, not a marketplace's copy of it; honour
  `robots.txt` and crawl delays; keep the facts and a link back, never the description or the picture; name the
  crawler honestly. The places pipeline's adapter declaration (decision 0108: licence, attribution, pace, allowed
  uses, terms checked) already has a field for each of these.

## 9. What was not settled

- Whether Meetup's public search works without a Pro account.
- Ticketmaster's caching and display terms.
- The licence OpenAgenda applies by default.
- Whether the Web Data Commons `Event` subset is large enough for US towns to be worth the download: the first
  measurement of any discovery work.
- What library, chamber-of-commerce and tourism-bureau calendar platforms expose: the search returned nothing
  usable, and none was in the pilot sample beyond Discover Lehigh Valley (no feed found).
- Songkick, Dice, Resident Advisor and Luma: no evidence either way.
