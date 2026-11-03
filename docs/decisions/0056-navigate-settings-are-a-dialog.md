# 0056. Navigate's settings are a dialog; the drawer stays at its peek

Date: 2026-11-03 · Status: accepted · Area: tabs, navigate

## Context
The owner's call, Nov 3: the settings were split from Start, which was unintuitive. Supersedes the drawer half of 0021 ("pulling the drawer up shows the additional settings") and the settings band of 0046.

## Decision
The drawer no longer pulls up through half and full heights. It stays at its peek: Start, and a summary line under it (`start-options`, text `peek-choices`: the mode, then the destination). A tap on the line, or a pull on the grip, opens `StartDialog`: mode, destination, "?" range and what I'm into (Explore only), pocket alert, reminders and alerts, in one scroll, with its own Start walk. Every choice saves as it changes; Done and Escape only close it. Start still just starts.

## Consequences
- `components/StartDialog.tsx`, through `components/Modal`. Nothing opens mid-memo or with a walk open.
- The range ring shows on the map only while the dialog is open in Explore. A destination is still a long press on the map, so the dialog says to close it first.
- `drawerTo(pg, 'half' | 'full')` in the e2e opens the dialog; `'peek'` closes it with Escape.
- Native unverified: the Modal over the tab map.
