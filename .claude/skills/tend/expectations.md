# Lens 0: the expectation (decision 0231)

`/tend` section 2's first lens, in full. Each `/tend` run (one iteration) but a triage applies it, before the other
lenses, to each feature the run touches: a sweep to its area's features, an inbox build to the feature it builds,
`evolve` to the features it proposes for.

1. **Write three to five lines** per feature, each in this form: "A person [from `docs/VISION.md`, "Who it is for"]
   using <feature> would reasonably expect …". Each is grounded in that section and in how two or three adjacent
   apps do the job (`docs/research/adjacent-apps.md`, verified or not). A source the file lacks is marked "not yet
   recorded"; the loop never edits `docs/research/`.
2. **The `steward` checks them** against VISION's Never lines at the run's first review pause (an `evolve` run,
   before it files). A line that breaks one is dropped and named, with its Never row.
3. **Answer each line kept:** `met`; `failed`, a defect (section 3); or `lacking`, growth (section 9, source 6).
4. **Record them** in the report and in the run log's `expectations`, which `npm run tend:log` requires of a sweep
   and of an inbox run with a yes (a build), three to five written per feature, the dropped ones counted:

   ```
   "expectations":[{"feature":"memories",
     "lines":[{"line":"A person who … using Memories would reasonably expect …","is":"lacking"}],
     "dropped":[{"line":"…","never":"<the Never row it breaks>"}]}]
   ```
