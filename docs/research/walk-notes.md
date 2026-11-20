# Walk notes: the owner's own walks as the loop's usage signal (investigation, 2026-11-20)

From: the owner's /investigate, Nov 19-20: "Put it through investigate", of the idea left out of the tend review
(`docs/research/tend-process-review.md`, "Left out"; `docs/research/agentic-process-framework.md` 2.2, 2.4, 2.5): a one-minute
note after a walk (what I reached for that wasn't there, what got in the way, what I'd keep) as the only usage signal a
local-only app can have. Queued as G8. Decision 0238. Status: queued.

No surface in the app: this is the loop's process. The skill would stop on that (section 0.3); the owner's ask overrules it.

## What the owner sees today (no picture: the channel, decoded)

| Where the owner's own use reaches the work | What it is | Evidence |
|---|---|---|
| A message in a session, often with a screenshot | Ad hoc; the largest course corrections came this way | The walkability rework after the owner tried the layer (decision 0096); today's walkability screenshot (G5); the iPhone video fix (STATUS, "fix ios-video") |
| An answer "in person" to an inbox entry | Judges what the loop proposed; never says what the loop did not think of | 48 commits since Nov 5 cite an answer "in person" |
| A `[phone]` entry with **Do** and **Expect** | A device check the loop asks for | T13, T18, T23, T24 open since Nov 11-12, none answered |
| The expectation lens's ratification (decision 0236) | The owner ratifies lines the loop drafted from VISION and adjacent apps | `docs/expectations/`, `scripts/expectations.js` |
| Nothing else | The app sends nothing anywhere (decision 0005) | |

## Why the loop has no demand signal (most to least)

1. **The owner's use reaches the loop only when the owner opens a session about it.** It is not stored, counted or routed: a
   screenshot changes one thing and is gone.
2. **The expectation lens drafts "reasonable" from a model.** 0236 names its own risk: "a model's 'reasonable' drifts toward
   the average app (likes, sharing, counts), which VISION excludes". Ratification filters lines; nothing supplies lines from use.
3. **Heavy asks are not answered.** The four `[phone]` entries have waited a week: a Do and Expect script is a chore; a note
   must cost less than a minute.
4. **Where `/tend` goes next is set by code churn** (`next` ranks by resets, decision 0229), never by where the owner was
   frustrated, and section 9's evolution sources list no use at all.
5. **The repositories are public** (`chronicles` and `chronicles-data`): anything committed is published, so a note that names
   a street or a time publishes where the owner walks. (This run found that the walkability brief of Nov 19 named a street
   from the owner's screenshot; this run removes it from the tip. It stays in the history of `7158ddd`, which only the owner
   can choose to rewrite.)

## How others do it

Recorded in `docs/research/adjacent-apps.md`, "Ask how it went, just after (Honour, Return)", for the in-app pattern; the
research methods are cited here. Every page was seen only as a search summary (fetches are blocked from cloud sessions), so all
are **Unverified**.

- **Diary studies** (UX research): an entry made just after the event keeps it fresh; prompts anchored to a specific situation,
  not general reflection; reflective questions saved for a wrap-up. Sources: https://www.nngroup.com/articles/better-diary-studies/
  and secondary guides (https://cleverx.com/blog/how-to-run-a-diary-study). Unverified.
- **Dogfooding** (practitioners): keep a friction log while using your own product, batch the fixes; one input among others,
  since the team is a narrow slice of users (PostHog). Sources: https://dev.to/godnick/i-dogfood-everything-i-build-heres-why-it-makes-better-products-50bc ,
  https://newsletter.posthog.com/i/146560398/mistakes-to-avoid . Unverified. Here the narrow slice is the point: VISION's
  audience is "narrow on purpose", the owner first.
- **Strava**: "How did that activity feel?" on the save screen, optional, feeding its effort features. Unverified; a
  counter-example in part (a 1-10 number).
- **Apple Journal**: suggestions built on the device from workouts and places, and open reflection prompts. Unverified.

## Options

| | Shape | Answers | Risk | Cost |
|---|---|---|---|---|
| A | `/walked`: the owner types anything after a walk; the skill sorts it into reached for, got in the way, keep; stored in the repo with places stripped; `/tend` reads it | 1-5 | A note that slips a place through the rewrite | M: a skill, a small script and its tests, `tend.js`, three skill files; no native |
| B | A private Notion page the owner writes on the phone; sessions read it at run start | 1-4, and 5 fully | State outside the repo, which every skill assumes is not so; invisible to a session without the connector | S to M |
| C | Inside the app: a private note "for the maker" | 1 | Mixes product feedback into the Chronicle; needs an export (data leaving by a tap); ships a developer surface to every user | M, native, an architectural call |
| D | Leave it | none | Course corrections keep arriving only with a screenshot; the lens's lines rest on a model's "reasonable" | none |

## The owner's calls (Nov 20)

1. Where kept: **in the repo, places stripped** (over a private Notion page, the repo as written, and leave it).
2. Writing one: **a free line, then prompts** only for what is missing (over the three prompts always, and free text only).
3. What it steers: **the lens, the sweeps, and silence** (over evidence only, and adding "settled after three walks", which
   needs G6).
4. A reminder: **a report line only** (over a weekly reminder, and nothing).

All four were the recommended options. Decision 0238.

## The recommendation

A, as the owner shaped it. Size **M**: nine criteria over about eight files (a new skill, `scripts/walks.js` and its test,
`scripts/tend.js`, `tend/SKILL.md`, `tend/expectations.md`, the orchestrator's skill, the skills map), no native code.

`/vision`: **no surface** (nothing a person using the app sees or does changes). The rule it nears is outside the app: VISION's
local-only stance is about the app's data, but the owner's whereabouts in a public repository are the same concern, so the place
rule is a criterion, not a preference.

## Done when

After the owner's next walk, `/walked` with one sentence stores a note naming an area and a kind, the committed line holds no
street, town or time of day, and the next `/tend` run's report cites it: a sweep of that area first, or a drafted line marked
"seen on a walk".

## What the slice will touch

- `.claude/skills/walked/SKILL.md` (new, owner-only: `disable-model-invocation`), and its row in `.claude/skills/README.md`.
- `scripts/walks.js` (new, plain Node like `records.js`: `add`, `list`; append-only `.claude/skills/tend/walks.jsonl`), its test
  in `src/lib/__tests__/arch/`, and the place check: street suffixes, the gazetteer's town names (`src/lib/gazetteer`), coordinates,
  clock times.
- `scripts/tend.js`: `next` puts an area with an unanswered "got in the way" note first; `balance` lists the window's notes by kind
  and says when there were none for 14 days.
- `.claude/skills/tend/SKILL.md` (lens 0, section 9's sources, the report), `.claude/skills/tend/expectations.md` (a line "seen on
  a walk"), `.claude/skills/tend-orchestrator/SKILL.md` (the silence line in the insights).
- `records audit 14`'s list of skills, if `/walked` names a record document.

## Open for the owner

None: the four calls above settle what the owner sees and does.

## Engineering unknowns

- How strict the place check is: a street-suffix pattern catches "Main Street" but not "the bridge by the river"; the skill's
  rewrite is the first guard, the script the second, and the owner sees the stored words before the commit.
- How an area is named from a sentence: the area list is `scripts/features.js`; a note that fits none is kept with area `app`.
- G7's lease, if G7 lands first: `/walked` writes only its own file, outside the leased process files.
