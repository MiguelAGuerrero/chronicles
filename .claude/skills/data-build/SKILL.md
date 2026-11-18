---
name: data-build
description: Start a places-data build in chronicles-data by hand, choosing which sources to fetch (Wikidata, OpenStreetMap), and read how it went. Use when a data change needs a fresh fetch or a published archive and the weekly build is not due, or when a spec waits on "run the weekly build by hand".
when_to_use: A chronicles-data change that needs a new fetch (an adapter, a class, a query) or a first run of a source; the app waits on a contract version or pack that is not published; the owner asks to refresh the data.
argument-hint: [wikidata] [osm] [box w,s,e,n]
---

# data-build: $ARGUMENTS

The weekly build (`weekly-build.yml`) runs itself on Mondays and on a push to `main` that changes the pipeline; it is
never run by hand. A build by hand is its own workflow, **`manual-build.yml`** ("Manual places build") in
`MiguelAGuerrero/chronicles-data`, one checkbox for each source the pipeline ingests. Both call the one job, `build.yml`.

## Run it

Use the GitHub MCP tool `actions_run_trigger` (`method: run_workflow`, `owner: MiguelAGuerrero`,
`repo: chronicles-data`, `workflow_id: manual-build.yml`, `ref: main`) with `inputs`:

| Input | Is | Default |
|---|---|---|
| `wikidata` | `"true"` or `"false"`: fetch Wikidata now (minutes) | `"true"` |
| `osm` | `"true"` or `"false"`: fetch OpenStreetMap now (four extracts, over an hour; its extracts are asked for only if they changed) | `"true"` |
| `box` | `w,s,e,n`: sweep only this box; empty is the usual fetch | empty |

An unticked source is built from its kept answers, not left out. **Tick only what the change needs:** a Wikidata
change is `wikidata: "true", osm: "false"`; every hand run that also fetched OpenStreetMap once cost an hour. At least
one must be ticked, or the run stops at once (a rebuild from kept answers alone is a push to `main`).

## Before and after

- The run builds `main`, not a branch: merge the data change first, or the run fetches nothing new. The build
  publishes a release only when a block's places changed, then starts the Pages workflow itself; a run that
  changed nothing is a green run with "Not published" in its log.
- Say before starting that this reaches outside the session: it fetches from Wikidata and Geofabrik and may publish a
  new archive the app reads. When the owner has not asked for a build, ask first; a skill that was called by another
  never starts one on its own authority.
- Watch it with `actions_list` (`list_workflow_runs`, `manual-build.yml`) and `actions_get`; read a failure with
  `get_job_logs`. Do not poll in a loop: a run takes minutes to hours.
- The owner's review is the run's `report` artifact. Report the version, whether it published, and the report's
  words, not a count the app would show as a score.
- Never run the weekly workflow's job again to retry: start `manual-build.yml`.
