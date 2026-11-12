# 0148. Chronicle's empty peek: Navigate alone, and a line that is true while you walk

Date: 2026-11-12 · Status: accepted · Area: tabs, chronicle · Amends: 0050 · From: `/tend` inbox T10

## Context
Since 0050 (U7), Chronicle's peek with no walk finished held the empty line, "Walk somewhere and it is starred here",
with Days and a Navigate button, a walk minimized or not. The tabs sweep of Nov 11 found three ways to the same
places on one screen: the peek's Days repeats the section bar's Days (0136), its Navigate the Navigate tab, and with a
walk minimized the recording bar's › is a third way to the walk (UX review U8; NN/g H8). And with a walk minimized the
line asked you to walk while you were walking (steward S1). `tend tabs 7` had already kept the line whole on its own row.

## Decision
The owner's yes to T10, Nov 12, its recommended shape:
- **With nothing open**, the peek holds the empty line and Navigate alone. Days goes: the section bar holds it.
- **With a walk open and none finished**, the line reads "This walk is starred here when it ends", and the peek offers
  no button: the recording bar's › is the way back to the walk.
- Whether a walk is open is read from the open walk's keeper (`useOpenWalkInfo`), never from what Chronicle last read
  (tabs audit 2). The words and the offer are `emptyPeek` (`lib/quietLines`).

## Consequences
- The line sits under the grabber in both states; the peek is the plain height with no button and grows for Navigate
  (`tend tabs 7`, `tend tabs audit 3`, `audit 4`).
- The line is true only once it is known: before Chronicle's first read the peek is plain (`tend tabs audit 1`), and a
  walk stopped from the bar stays "this walk" until Chronicle reads it again (`tend tabs audit 2`).
- A day kept before any walk is reached from the section bar's Days, or a drag up, which opens on the days.
- 0050's U8 (a Walks | Days switch once a walk is finished) and U13 (no counts) stand.
