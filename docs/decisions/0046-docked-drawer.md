# 0046. Navigate's drawer docks Start and the capture row low at every height

Date: 2026-11-02 · Status: superseded by 0075 (Navigate is the ready walk screen) · Area: tabs, navigate

## Context
Navigation & tabs, after the audit (the owner's calls, Nov 2). U1, after AllTrails' sticky Start: Start moved as the drawer was pulled up (0021).

## Decision
Start is the drawer's foot; the capture row sits above the peek, over the drawer, whose settings scroll above both (a band under the row when opened). The grip is the handle plus a strip (44 px).

## Consequences
- The settings later left the drawer for a dialog, and the drawer stays at its peek (0056).
- Small buttons are 44 pt themselves: react-native-web has no `hitSlop`.
- Native unverified: the docked drawer.
