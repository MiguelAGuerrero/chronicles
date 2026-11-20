# 0238. Walk notes: the owner's own walks steer the loop, written in a line, kept in the repository with places stripped

Date: 2026-11-20 · Status: accepted, waits on G8's build · Area: process, tend · Amends: 0236 (expectation lines may also come from a walk note), 0229 (`next` puts an area a walk note found in the way first) · From: the owner, in person, Nov 20 (`/investigate`, decision 0231)

## Context
The app sends nothing anywhere (0005), so the owner's own walks are the only evidence of use. Today they reach the loop only
when the owner opens a session with a screenshot; the expectation lens (0236) drafts "what a person would reasonably expect"
from a model, a risk 0236 names itself; four `[phone]` entries with Do and Expect have waited a week. Both repositories are
public, so anything committed is published. Investigation: `docs/research/walk-notes.md`.

## Decision
The owner's four answers, Nov 20, each the recommended option:
- **Kept in the repository, places stripped.** A note is stored beside the tend run log with the app's area names and the day
  only: never a street, a town, coordinates or a time of day. The owner sees the stored words before they are committed.
- **Written as a free line, then prompts.** `/walked` takes anything (a sentence, dictation, a screenshot, which is never
  committed), sorts it into reached for, got in the way and keep, and asks once only about what is missing, "nothing" always
  an option.
- **It steers the lens, the sweeps and silence.** "Reached for" becomes a drafted expectation line marked "seen on a walk",
  which the owner still ratifies (0236 holds: never the proxy); "got in the way" puts its area first in `next` until a sweep of
  it has run; "keep" protects the behaviour it names from a refinement that would change it (filed `[owner]`, not shipped).
- **A report line, no reminder.** `/tend` and the orchestrator say once when no note has come in for 14 days; nothing else.
- **Not chosen:** a private Notion page; the repository as written; "settled after three walks" (it would need G6's states).

## Consequences
- G8, built by `/slice --from=G8`: a new owner-only skill `/walked`, `scripts/walks.js`, and changes to `scripts/tend.js`,
  `/tend`, its lens and the orchestrator.
- The walkability brief of Nov 19 named a street from the owner's screenshot; it is removed from the files. It remains in the
  history of `7158ddd`, which only the owner can choose to rewrite.
