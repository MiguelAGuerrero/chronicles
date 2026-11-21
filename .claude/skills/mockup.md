# Mock-up: a drawn page the owner approves before a look is built

Decision 0252. Every skill that proposes, plans or builds a change to what a screen shows uses this page; a skill names
it as `mockup.md`. Only the owner approves a look: never a proxy, a reviewer or the run itself.

## When one is needed

A **new or changed look**: the work adds, removes, moves, regroups, restyles or rewords what a screen shows (a screen,
a control, a state, a sheet, a row, a line of copy, a notification's words). It needs a mock-up the owner approved
before any code or test is written.

Not needed: a fix whose only visible effect is what its cited rule requires (focus order, a label no longer cut, a
sheet that scrolls at large text, contrast brought to its ratio, a target grown to 44 pt), a bug that puts back what
an approved look already showed, and work with no surface (`/vision` says **no surface**). When in doubt, it is needed.

## What it is

One private Design canvas made with the Artifact tool (`quickstart`, intent `design`, which names the Design type;
follow that type's instructions), one artboard per picture, kept in the repo as `docs/mockups/<id>/` (the canvas's
`canvas.json`, its `.dc.html` artboards and the before pictures); `<id>` is a short kebab-case name of the change
(`contents-switch-stays`), the slice's slug for a spec, since an entry's number is given only when it is filed. Upload
the pictures and the app's icon font (`@expo/vector-icons`' `Ionicons.ttf`, so a glyph is the app's own) as the
canvas's assets. The page holds, for each screen the change touches:

1. **Before:** today's screen, a picture of the real build at 390 x 844 (`E2E_SHOTS`, the journey's `shot()`, at
   device scale 1), named by its shot.
2. **After:** the change drawn at the same size beside it, over the before picture where only part of the screen
   changes, in HTML and CSS with the app's tokens
   (`src/components/ui.tsx`, `theme`) and its real words (the copy modules, or the entry's quoted words). Draw only
   what the entry or plan says; a detail it leaves open is drawn as the recommended shape and named as a choice
   under the picture.
3. **Every state the change touches:** the default, open, empty, the longest text it can meet, and 320 px wide where
   width matters.
4. **Two shapes side by side** when there is a real choice, the recommended first and labelled so; otherwise one.
5. **A short legend** beside the pictures (a note on the canvas): what changed, the rule or criterion it rests on, and what it does not do
   (no count, no colour, no new control, where the gate said so).

Give the canvas a plain title ("Contents switch mock-up") and an artboard title for each picture ("Today at 390 px",
"Recommended at 320 px"), and keep its link. Commit the folder with whatever names it: the entry's record commit, or the spec.

## Where the approval is recorded

- **A `T` or `G` entry** (`/tend`, `/investigate`): a line after `Recommended:`,
  `Mock-up: <the page's link> (docs/mockups/<id>/)`. The owner's yes to the entry approves the look it shows; a
  "yes, but" about the look is a reshape: redraw, `inbox set`, ask again.
- **A spec** (`/slice`): a section `## Mock-up` with two lines, checked by `scripts/mockup.js` (`check:docs`):
  - `Drawing: <the page's link> (docs/mockups/<id>/)`
  - `Approved: "<the owner's words, verbatim>" (the owner, YYYY-MM-DD)`, or, from an approved entry,
    `Approved: with G<n>, "<the owner's words>" (the owner, YYYY-MM-DD)`.
- **A `/fix` or an audit's fix:** the commit message's last paragraph before the trailers,
  `Mock-up: <link>, approved "<the owner's words>" (YYYY-MM-DD)`.

## Asking

- **A skill the owner typed** (`/slice`, `/fix`, `/investigate`, `/audit`): publish, then ask with AskUserQuestion,
  the recommended shape first ("Approve as drawn (Recommended)", the other shape, "Redraw: say what"). The owner may
  answer with words; record them verbatim. No code or test until approved.
- **`/tend` and anything it runs:** never asks mid-run. A finding that needs a mock-up is filed `[owner]` with its
  mock-up drawn and published; the run asks at its close (section 10, step 5), the page linked in the question.
- **The tend orchestrator:** puts every mock-up to the owner; a proxy answer never approves a look.

## Building to it

The build follows the approved drawing. A departure found while building (it does not fit at 320 px, a word that does
not read, a state the drawing did not show) stops the build: redraw that part and ask (a typed skill), or file it with
the redrawn page (`/tend`). The review of a screen change gives the `ux-reviewer` and the auditor the approved drawing
beside the built pictures, and a difference from it is a finding.
