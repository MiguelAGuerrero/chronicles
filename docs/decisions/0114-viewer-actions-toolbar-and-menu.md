# 0114. The viewer's actions: a docked toolbar and a menu, nothing over the moment; UI follows standard patterns

Date: 2026-11-09 · Status: accepted · Area: captures, chronicle, process, vision

## Context
Owner threads put Respond on the viewer's face as a floating row of kinds (Photo, Voice, Note) over the photo (OT1), because the steward read "Capture is one tap away" (`docs/VISION.md`, Always) as covering a reply, and the build floated the row over the media because the viewer's own strip held the bottom. The owner saw it on a phone (Nov 9): "This UI is atrocious", cluttered, and not how such a screen works anywhere else. Nothing in the process looked at the screen: the audit read code and the e2e checked that buttons existed.

## Decision
The owner's calls, Nov 9:
- **The viewer follows the standard photo-viewer pattern.** Top bar: Close, title, More. A toolbar docked under the moment, below its info line: **Respond** and **Edit**. More holds the rest (Add to a thread, Open its thread, Save, Open in Maps, Delete). Respond opens an action sheet of kinds (Photo, Voice memo, Note, Cancel). Nothing interactive sits over the photo, the video or a note's card.
- **"Capture is one tap away" is about the capture stack** on the screens you walk or capture from (Navigate, the walk). A reply, an edit or any other action on a moment that already exists is a secondary action and belongs in a toolbar or a menu. The steward's S1 for owner threads is overruled.
- **Screens follow standard UI patterns** (iOS Human Interface Guidelines, Material), written down in `.claude/rules/ui-patterns.md`, which loads for every screen.
- **An audit looks at the screens**: `/audit` captures phone-size screenshots of every changed screen state, and the auditor and the steward must open them and judge them against the patterns.

## Consequences
- OT1, OT3 and OT11 are amended and OT27 added in `specs/owner-threads/spec.md`.
- `RespondBar` and `ThreadChip` go; the viewer's dock and the reply sheet replace them.
- The audit skill and the auditor and steward agents read the screenshots.
- **Proposed edit to `docs/VISION.md`** (the owner makes it): under Always, "Capture is one tap away on every screen you walk or capture from" gains "(the capture stack; actions on a moment that exists live in its toolbar or menu, decision 0114)".
