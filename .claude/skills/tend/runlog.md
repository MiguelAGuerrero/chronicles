# The run log's line: what each field holds (section 10, step 1)

When the line is written, its form and its tone are `SKILL.md` section 10's; this file is what each field holds. Read it before running `npm run tend:log`. `traps.md`, "The
run log and the commit gates", has what the script misreads.

The script adds the date and what the commits say (findings shipped, the review's fixes, entries built, reverts)
and refuses a line that leaves a count out.

- `found` counts everything the sweep found, shipped or not, zeros included.
- `answers` is each entry answered this run, as `yes`, `no` or `reshape`, with `"by"` (`owner` or `proxy`) and
  `"pick"` (`recommended`, `other`, `reshape`, `no`; decision 0235), the owner's `words` verbatim with theirs (and in
  the record: an inbox operation's reason or note naming the entry), the proxy's only a yes and never on an `[arch]`
  or `[phone]` entry (0157), and the owner's keep of a proxy yes as `"confirms": "<that line's date>"`.
- `expectations` and `compass` are lens 0's (`expectations.md`), required of a sweep and a build (a build whose grown
  slices' specs all read `Verdict: no surface`, with nothing a person sees, logs `"expectations":"none: <why>"` in
  place of lines, the reason kept in the line; decision 0250).
- A sweep's `state.to` is the script's, computed with the run's own line and written to the ledger, and a given one
  that differs is refused (leave it out).
- `review` is the review's findings (`accepted`, `rejected`, `deferred`, a filed low counted deferred).
- `e2e` is the journeys run, or `"full"` for the full pass.

A full pass made on its own logs mode `e2e` with the line `npm run e2e:all` prints (`"e2e":"full"`, the base it ran
on, `journeys`, `ok`, `red` and `flaky` as `{ journey, check }`, `minutes`; `docs/TESTING.md`, "Choosing the
journeys", 6).
