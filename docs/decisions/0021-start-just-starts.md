# 0021. Start just starts; the drawer holds the extras

Date: 2026-11-01 · Status: accepted · Area: navigation tab

## Context
The owner's call, Nov 1, after AllTrails' Navigate page; spec rev 31.

## Decision
Start sits at the drawer's peek and starts at once where you are, with the saved choices and the destination if one is set. Pulling the drawer up shows the additional settings: quiet or Explore, what I'm into and the range, the destination (a long press on Navigate's map), reminders and alerts. Walk here stays a one-tap start from Chronicle and Explore and never fills the drawer.

## Consequences
- U1 docks Start at the drawer's foot at every height (0046).
- `memoGate` makes Start and Walk here wait for a memo being saved and refuse one still recording.
- Motion permission is asked first thing in the Start, Walk here and Resume taps (`askMotion`, 0026).
