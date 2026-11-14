# 0170. The owner's answer to T30: counts in words beside the reminders

Date: 2026-11-14 · Status: accepted · Area: memories, tabs, deletion · Amends: none · From: `/tend` inbox T30

## Context
The run that built T29 (`tend explore T29`, decision 0164: a reminder of several says "Two memories here") filed its
sibling lens as T30 `[owner]` ("Counts in digits beside the reminders: the memory preview, the walks row, a delete's
confirm"): a memory preview of a group says "2 more here" (`MemoryPreview.tsx`, MR4's "N more here"), a walks list
row ends "1 photo · 1 video · 1 voice memo · 1 note" (`walkRowMeta`, from `formatCaptures`, which the replay card
shares and T19 answers), and a delete asks "Its trace, 3 moments and 12 streets walked go." (`deletion/core.ts`, D4's
own example). The owner answered in person on Nov 14, during that run's review. This is the owner's own answer, not
a proxy's (0157).

## Decision
**T30, yes**, its recommended shape, "All in words", through `numberWord`, in one voice with the reminders and pins:
- the memory preview says "and two more here";
- the walks row's captures take T19's clause ("A photo, a video, a voice memo and a note"), built with T19, since
  the two share `formatCaptures`;
- a delete's confirm says "Its trace, three moments and twelve streets walked go." and "Two photos and a voice memo
  go."

It amends MR4's "N more here" and D4's example. One build per run (`/tend`, section 7): T30 waits in the inbox,
marked answered.

## Consequences
- No count of moments, memories or kinds is said in digits on the walk screen, the walks list or a delete's confirm.
- The criteria that pin the old words (MR4 in `specs/memories-on-revisit`, D4 in `specs/clearing-walks-and-moments`)
  are amended by the owner; the loop may not edit a spec.
