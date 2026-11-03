# 0032. Reminders fire on every walk, quiet or exploring

Date: 2026-11-01 · Status: accepted · Area: explore, reminders

## Context
After the Explore audit. A walk starts quiet (0031), and quiet hides marks and hints; the question was whether "Remind me here" belongs to Explore too. The owner's call: a reminder is set on purpose.

## Decision
Reminders fire on every walk, quiet or exploring.

## Consequences
- `discovery/recall.ts` (pure) and `recallCheck.ts` run whatever the walk's mode. Every write goes through `saveRecall`/`stopRecall`.
- A check runs after 10 m walked: on web the walk screen checks each fix; on a phone the location task checks every accepted fix of each batch (`filterFixes` + `withoutPauses`).
- Where a fire goes is decided when it is shown (`deliver`): the walk screen's card if it is in front and listening, else a notification with a fixed `recall-<walk>` identifier (0033).
- Memories on revisit follow the same rule, but quietly (0037). Reminders and memories go on during a ride (0040).
- Deferred: Remind me here firing outside a walk (needs background location).
