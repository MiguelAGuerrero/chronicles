# 0135. The loop does not write its own sources: rule files are add-only for it, and never cited by the run that edited them

Date: 2026-11-11 · Status: accepted · Area: process · Extends: 0128, 0133, 0134

## Context
A loop commit ships only what conforms to a cited source, and the area rule files are among the sources it cites.
The commit check kept the loop out of the UI patterns file and the research notes, but left every other rule file
open, with no test asked of an edit there: the loop could reword a rule, then cite it. The survey behind 0134 found
the same pattern reported elsewhere (an agent weakening the check it is held to). The owner's call, Nov 11: close it.

## Decision
- The loop may **add** lines to a rule file, which is where a fix records the trap it settled. A loop commit that
  changes or removes a line already in one fails `check:tend`; a reworded rule goes to the owner as an inbox entry.
- A loop commit that names a rule file in its `Source:` line may not edit that file, and no loop commit in a push may
  cite a rule file that another loop commit of the same push edited.
- Held where the rest is: by the loop's own run of the check, and by CI on every push to `main` (0133).

## Consequences
- A trap the loop added in one run can be cited by a later run. It is then on `main`, in a commit the owner has had
  the chance to read; the reflect step, when built, is where a rule that keeps being cited gets a second look.
- The check reads the `Source:` line for a rule's path or bare file name; a rule cited only by its heading is not seen.
