---
paths:
  - "src/components/**"
  - "src/app/**"
---
# UI patterns

Screens follow the standard patterns of iOS (Human Interface Guidelines) and Android (Material) before anything of
our own (decision 0108, the owner's call after a viewer that floated a row of buttons over a photo). When a screen
does something the platform's own apps do (view a photo, edit a list, confirm a delete), it does it the way they do.

## Where actions live

- **Bars, toolbars, menus, sheets.** A screen's actions sit in its top bar (close or back, a title, at most two
  actions and More), a toolbar docked at the bottom (one to three labelled actions), a More menu, or an action sheet.
  Nowhere else.
- **Nothing interactive over content.** A photo, a video, a map's subject or a note's card is never covered by a
  button, a pill or a row of controls. A transient toast may cross it; a control may not. The media area is laid
  out between the bars, not under them.
- **One primary action.** A screen or a sheet has one obvious next step; the rest are secondary and go in a menu.
- **A choice of several kinds is an action sheet** (Photo or video, Voice memo, Note, Cancel), not a row of buttons
  on the screen.
- **Secondary is not urgent.** "Capture is one tap away" (`docs/VISION.md`) is about the capture stack on the screens
  you walk or capture from. An action on a moment that exists (reply, edit, add to a thread, save, delete) belongs
  in its toolbar or menu.

## Layout

- **Nothing wraps.** A row of controls fits one line on a 320 px phone; if it can't, it has too many controls.
- **Targets are 44 px** (48 on Android), and controls in one row share one height and baseline.
- **Text over a picture** needs its own solid ground; never white text straight on a photo.
- **Labels on toolbar actions** (icon and word); icon-only buttons only in the top bar, each with a spoken name.
- **Inputs are 16 px or more** on the web (iOS zooms otherwise; `react-native-web.md`).

## How it is checked

- `/audit` captures the slice's journeys with `E2E_SHOTS` at 390 x 844 and the auditor and the steward open every
  changed screen's picture and judge it against this page. A finding names the picture.
- A journey that changes a screen calls `shot()` for each state of it (the default, a sheet or menu open, a long
  text), after the Modal's fade (`waitForTimeout(800)`), or the review has nothing to look at.
