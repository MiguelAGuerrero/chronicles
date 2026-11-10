---
paths:
  - "src/components/**"
  - "src/app/**"
---
# UI patterns

Screens follow the platforms' own patterns before anything of our own (decision 0108). The sources, with quotes
and URLs, are in `docs/research/ui-references.md` (Apple HIG and WCAG 2.2 read first-hand; Material 3 and NN/g not
yet, see its header); rule ids below (T7, M3, ...) point there. How adjacent apps solve our jobs is in
`docs/research/ui-teardown.md` (leads to verify, not facts). Its goal-to-control matrix (section 2) is the first
stop for "which control is this?". **[app]** marks a house rule stricter than the sources.

## Where actions live

- **Controls live in bars, menus and sheets; never as loose buttons on content** (T7, V2). Content may run under a
  bar (T7); a control may not float over it. A transient toast may cross content.
- **One primary action per bar or screen** (T-toolbar "only specify one primary action"; one FAB per screen).
- **A choice of several kinds to create is a pull-down menu from its button** (M3: three or more items; with only
  one or two kinds, separate buttons). An **action sheet** is for clarifying an action already started, such as
  discarding a draft (A1), never as a menu.
- **Rare actions on an item go in More** (matrix 3); a context menu or swipe is only ever a shortcut to something
  also in the visible UI (M4, X6).
- **"Capture is one tap away"** (`docs/VISION.md`) is about the capture stack on the screens you walk or capture
  from. An action on a moment that exists (reply, edit, add to a thread, save, delete) belongs in its toolbar or
  menu (decision 0108).

## Confirmation and feedback

- **Don't confirm a common delete that can be undone; act and offer Undo. Confirm a rare, irreversible one**,
  with the specific verb, never "OK" (A3, matrix 7, 8). (The app's delete-with-confirm-and-Undo, D4, predates this;
  see `docs/DEFERRED.md`.)
- **One modal at a time** (S2): a sheet closes before another opens; overlays inside the viewer, never a Modal on a
  Modal (iOS).
- **No confirmation for routine success** (matrix 20); a status that needs no action sits inline and is announced
  to a screen reader without moving focus (F4).

## Layout and labels

- **Labels or icons, consistently within a bar** (T5): never mix labelled and icon-only items in one bar. Our
  toolbars are labelled **[app]**; icon-only buttons carry a spoken name (X4).
- **Targets 44 pt on iOS, 48 dp on Android** (X0); WCAG 2.5.8's minimum is 24 px, so the platform sizes govern.
- **Text over a picture needs its own solid ground** (V4, X1): 3:1 for controls and 4.5:1 for text.
- **Never colour alone to show state** (X3).
- **Nothing wraps on a 320 px phone** **[app]** (stricter than WCAG 1.4.10): a row that can't fit has too many
  controls.
- **Inputs are 16 px or more on the web** **[app]** (iOS zooms otherwise; `react-native-web.md`).
- **In the moment viewer, the picture sits between its bars** **[app]**: the HIG lets content run under bars and
  hide them on a tap (T7, V1); ours keeps them up and the picture clear, until a tap-to-hide is built.

## How it is checked

- A slice's plan, when it changes a screen, lists each action with its intent and its matrix row (control, avoid).
- `/audit` captures the slice's journeys with `E2E_SHOTS` at 390 x 844. The `ux-reviewer` judges every picture
  against these rules and the matrix and cites the source of each finding (or marks it opinion); the auditor and
  the steward look at the pictures too.
- A journey that changes a screen calls `shot()` for each state of it (the default, a menu or sheet open, a long
  text), after the Modal's fade (`waitForTimeout(800)`), or the review has nothing to look at.
