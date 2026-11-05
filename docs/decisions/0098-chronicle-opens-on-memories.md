# 0098. Chronicle opens on Memories: what you kept, brought back

Date: 2026-11-05 · Status: accepted · Area: chronicle, product

## Context
The owner went back to Chronicle only to pick a walk and replay it. The replay is a ceremony, and a ceremony is good once; after that the tab gave no reason to open it. Chronicle's verb is to remember, and the map is a tool for that, not the front door.

## Decision
The owner's calls, Nov 5:
- **The front door is the feed**, not the map and not the walks. It leads with what the user keeps coming back to (threads), and brings back one moment each time it opens. A walk is a tool that makes moments; it stays, as its own section, like Days and the map.
- **One screen, four sections:** Memories | Walks | Days | Map. Memories is where Chronicle opens, after another tab and after a walk's first replay. A replay or a day opened from a section returns to it.
- **Threads come from the user's own words first** (notes, photo captions). Memos show in the feed now and join threads once something transcribes them; transcription is its own later slice (it needs a native module and a development build). The thread code reads signals, not captures, so a transcriber or an image tagger plugs in without touching the feed.
- **Nothing is a score.** Threads are ranked inside by how they recur over time; no rank, weight or count is shown. Lines are words.
- **Choices are kept in meta** (`resurface_prefs`): Not this one, Show less like this, a renamed or removed thread. No migration.
- **Local only:** everything is derived on the phone from the captures, each time Memories opens; nothing about threads is stored.

## Consequences
- The spec is `specs/resurfaced-moments/spec.md` (RM1-RM25); the plan is `specs/resurfaced-moments/plan.md`; the mock was a published artifact, https://claude.ai/artifact/HqApXsfK4HsvKdvnEXn9gR.
- Chronicle's old body (the map and its sheet) is mounted only for Walks, Days and Map, so Memories carries no map. Older e2e journeys open Chronicle with `tabTo(pg, 'chronicle')`, which now clicks Map.
- Search, the map as a lens on results, a thread played as one ceremony, finds and lows in the feed, memo transcripts and photo features are deferred (`docs/DEFERRED.md`).

## Later calls (2026-11-05, after the audit)
- **The Map remembers its view while the app is open.** Leaving Chronicle takes the map down; the camera and the framed places are kept, so Map, Walks and Days come back where they were (NV3). Memories still opens first.
- **What was kept in the last day heads Lately**, newest first, so a walk just finished is at the top; after that, week by week with a thread's moments leading.
