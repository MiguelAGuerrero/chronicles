# Evolve: where a proposal comes from, its shape, its size, its rank and its form (section 9)

`SKILL.md` section 9 says when a run proposes and how many `G` entries may be open; this file is how. Read it before
drafting any `G` entry, from section 9 or from section 5 ("an addition too large for one commit").

**Where an evolution comes from.** Each proposal names its source; one that has none is not made.

1. `docs/VISION.md`: the question of the verb the area serves, asked of the
   area as built; a Shapes row that is aligned and unbuilt; what the page says
   comes "later" (recall, search, likeness). Chronicle first.
2. What was left out on purpose: the area's `[owner]` items and "left out"
   lists in DEFERRED, a spec's later rounds, a decision's "waits for".
3. **The next thing a person would try.** From each screen of the area, the job
   they would reach for next and cannot do, or can do only by leaving the app.
4. What the area now makes possible elsewhere: a corpus big enough to search,
   a kind that could drive a route, a context line another screen could carry.
5. Repeated loop findings with one cause: three patches to the same screen
   say the screen wants a redesign, which is an evolution, not a fix.
6. **An unmet expectation** (lens 0) of a feature in scope by VISION, whatever the balance and state, with its `Workflows:`.

Never from: what other apps have (`docs/research/adjacent-apps.md` informs how, never what; a lens 0 line rests on
"Who it is for" as well), a Never row, or the wish to have something to propose. But every proposal is grounded in how
they do its job (decision 0193): the precedent is the model the owner evaluates the shape against. "This area is
whole; nothing to add" is an answer, and makes it `resting`.

**Shape each one as the thinnest slice a person would notice.** Run `/vision`
on it; **out** is dropped, a reshaping is proposed reshaped; its `Precedent:` line
goes in the entry, and the shape says where it departs from the apps and why. Then size it:

- **S**: three criteria or so, inside the size of "Hard stops".
- **M**: one slice, about ten criteria or fewer, no architectural decision.
- **L**: anything more. Never proposed whole: propose its first S or M slice
  and say what the rest would be.

Every size is built the same way on a yes: `/slice --from=G<n>`, held to the
entry's criteria.

**Rank by payoff against cost and risk**, in words, not points:

- *Payoff:* which verb (Return, then Honour, then Earn, since Chronicle comes
  first); how often a person meets it (every walk, every time the app opens,
  now and then); whether it deepens the replay or the corpus of moments;
  whether later evolutions need it first.
- *Cost:* S, M, the screens and modules touched, new native code (unverified).
- *Risk to what is stable:* which polished areas it reopens, whether it
  touches truth (walks, traces, captures) or only cache and views, whether a
  wrong guess can be reverted in one commit.

Prefer a noticed S over a deep M, and an M on a polished base over anything on
a rough one. Across the three entries keep a spread: not three in one area,
and one small enough to ship this week.

**File** under "Next evolutions" (section 5's `npm run records -- inbox add`), numbered on from the
ledger's `lastG`:

```
- **G4 [M] Chronicle: search over moments, by word** (2026-11-11) · Return · aligned
  Area: memories. From: VISION.md Shapes, "Search over moments"; polished since <sha>.
  Touches: <the gate's Never and Always lines and decisions, quoted, or none>.
  The slice: 1. <criterion, an observable outcome> 2. <…> (three to ten, the gate's own criteria among them).
  Precedent: <how 2-3 adjacent apps do this job, each with its source; where the shape departs, and why>. Mock-up: <link>.
  Payoff: <words>. Cost: <words>. Reopens: <areas>. After it: <what it unlocks>.
  Instead: <the smaller shape>.
```
