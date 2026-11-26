# 0270. A walk note waits to be published, a leaked line may go at the owner's word, a keep holds until a later note, and regions and countries are refused too

Date: 2026-11-26 · Status: accepted · Area: process, tend · Amends: [0238](0238-walk-notes.md) (when a note is published, append-only, how long a keep holds, what the place check refuses, a resting area) · From: the owner, in person, Nov 26, on the steward's review of G8's plan (`specs/walk-notes/plan.md`)

## Context
G8 (`specs/walk-notes`) builds decision 0238's walk notes. The steward's plan review (Nov 26) found six questions 0238
left open, each a rule the plan would otherwise have decided by itself: a note pushed at once reaches GitHub at a
public time close to when the walk ended; nothing said who removes a line that slips a place through; nothing said how
long a "keep" holds; a "reached for" could meet a feature whose five lines are in force; the gazetteer pack holds
regions and countries beside its towns; and an area the owner set resting could be found in the way.

## Decision
The owner's answers, Nov 26:
- **Hold, publish later** ("Hold, publish later (Recommended)"): `/walked` commits the note, its dates the day only, and
  does not push. The next `/tend` run carries it to `main` in its own push, or the owner types `/walked publish`. The skill
  says plainly that the note waits in this session and is lost if the session ends first, and that GitHub shows when a
  push is made.
- **An agent, at your word** ("An agent, at your word (Recommended)"): an agent may remove one leaked line from
  `.claude/skills/tend/walks.jsonl` at the owner's word, the one exception to append-only: a commit whose message quotes
  the owner's words, which the gate allows for that removal only. A history rewrite stays the owner's.
- **Until a later note says so** ("Until a later note says so (Recommended)"): a keep holds until a later note about that
  area releases or contradicts it.
- **Wait for me** ("Wait for me"): with five lines in force, a walk's "reached for" is said in the report and waits for
  the owner to choose which line to drop; nothing is displaced.
- **Refuse them too** ("Refuse them too (Recommended)"): the check refuses a region or a country from the gazetteer pack
  as it refuses a town.
- **Yes, a walk wakes it** ("Yes, a walk wakes it (Recommended)"): a "got in the way" note puts its area first in `next`
  once, even when it is resting.

## Consequences
- `node scripts/tend.js commits` holds an agent commit that touches `walks.jsonl` to that file alone, its subject
  `walked: a note of <day>`, both its dates `<day> 00:00:00 +0000`, and only appended lines the check takes; or to the
  removal of one line with the owner's words quoted. A refusal there names the line and the class, never the words.
- A `/tend` run that carries a note keeps its dates through every rebase (`--committer-date-is-author-date`).
- Five of the six answers were the recommended options; "Wait for me" was the other.
