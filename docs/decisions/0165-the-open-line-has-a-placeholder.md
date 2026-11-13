# 0165. The journal's open line carries a placeholder

Date: 2026-11-13 · Status: accepted · Area: memories · Amends: decision 0155 (JN10: no hint text on the open line)

## Context
Decision 0155 made the Chronicle journal's open line promptless: no hint text, a still ink mark where writing begins
(JN10; a UX review asking for a hint, ux 2, was rejected). On the owner's phone the blinking cursor alone read as
less friendly than a hint.

## Decision
The owner, in person on Nov 13: the empty line shows the muted placeholder "What’s on your mind?" (`LINE_PLACEHOLDER`,
`lib/journal/lines.ts`). It replaces the still mark, which would overlap the placeholder's first letter. The line
still has no accent colour, no count, no reminder or notification, and the keyboard is not raised at launch.

## Consequences
- JN10 is amended; `journal` journey's JN10 check expects the placeholder.
- The steward's earlier finding (a question reads as a prompt) is overruled by the owner; the wording is theirs.
- Native placeholder rendering is unverified on a device.
