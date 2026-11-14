<!-- Repo first: from the owner's calls at the reactions audit (Nov 14, decision 0177), not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Reaction links: a reaction opens its lens, the sign stays a plus, and a reaction is kept or said not to be

Nov 14, 2026 · @Miguel Guerrero

Reactions shipped (decision 0176, `specs/reactions`). Its audit's cold find placed "gather all my ideas" only late,
through Contents → Reactions, and its UI review found that the sign, once marked, read as "Happy" and "no reaction yet"
alike. The owner's calls (decision 0177): a reaction under a moment opens its lens, and the sign is always the face with
a plus. The same pass takes the top entry's sign out from under the held date's edge, and the reactions audit's three
deferred save items (7, 11, 12). Audit 15 (a video pin's bubbles) waits on the owner's design call in the plan.

## Vision

Idea: "A reaction under a moment opens its lens; the sign is always the face with a plus" (the owner, Nov 14, decision 0177), and a reaction is either kept or said not to be.
Verb: return (a reaction becomes a way back to every moment that carries it); honour (a reaction chosen is kept, or the owner is told).
Touches: decision 0176 and its criteria RX16, RX24, RX30, RX35 (a lens is the only gathering, one list, oldest first, no count; nothing is said of a place); Always "A moment carries its context" (the lens shows moments in context); Never "Scores" and Always "Counts are words" (a link says the reaction's name, never how many); Always "Restraint" (ink, no new colour; a link is the mark already drawn, not a new chip); decision 0168, amended by 0177 (the sign's glyph); ui-patterns "Found before quiet" (the link must look like one).
Verdict: aligned (the owner's calls of decision 0177; no rule is touched beyond what 0176 already holds)
Shape: The marks under an entry and under the viewer's info line become links to their lens, drawn as they are, with a target's size and a link's spoken role. The sign and the page's Reaction tool always show the face with a plus, and say what is chosen. The first entry under a date starts below the date's edge. A reaction that cannot be kept is not shown as chosen, and its panel says so in words.
Criteria: RL1-RL11 below.
Open: three calls in the plan's "For the owner".

## Decisions

- **Nov 14 (0177):** a reaction under a moment opens its lens, beside Contents → Reactions; the sign is always the face with a plus.

## Surfaces (decision 0167, from the code)

| Host of `ReactionMarks` or the sign | In this slice |
|---|---|
| A journal entry, under its dateline (`Entry`) | the marks are links to their lens (RL2) |
| The viewer, under its info line (`CaptureView`: the strip, the note's page, the card) | links when opened from an entry, a lens, a thread or Hidden (RL3); plain when opened from the slip, a reminder, or outside Memories (RL4) |
| The replay's step-through (`StepThrough`, through `CaptureContent`) | none: it draws no reactions (reactions audit 18) |
| A card (`MomentCard`: the thread screens, a lens) and a thread's bubble (`NoteBubble`) | plain: the card and the bubble are one button that opens the moment, whose viewer has the links |
| The sign (`ReactionSign`: the entry being written, an entry today) and the page's Reaction tool (`NotePage`) | always the face with a plus (RL6, RL7) |
| The reactions panel (`ReactionPanel`: above the bar, More's sheet, the viewer, a page) | says a reaction that was not kept (RL9) |

## Acceptance criteria

The owner's task (decision 0167)

1. **RL1** *"Gather all my ideas."* From the journal, someone who was not told where can find every moment with Idea: the word "Idea" under an entry is the way, and a tap shows the Ideas lens. A finding criterion: the cold find places it.

Links

2. **RL2** Each reaction under a journal entry is a link: one tap opens that reaction's lens (its moments, oldest first, in their context, as RX24), and Back returns to the journal. A lens opened from a moment is the same lens Contents → Reactions shows: whole, oldest first, never narrowed to, scrolled to or marked by the moment's place, walk, day or thread, and it says nothing of where it was opened from (steward 1).
3. **RL3** In a viewer opened from an entry, a lens, a thread or Hidden, each reaction under the info line is a link: one tap closes the viewer and opens that lens; Back returns to where the first lens was opened from (the journal, a thread, Hidden or the Reactions list), never a stack of lenses. A tap on the lens the viewer was opened from only closes the viewer.
4. **RL4** In a viewer opened anywhere else (the slip, a reminder, the walk screen, the replay, a day, Chronicle's Map, Navigate, Media), the reactions under the info line are plain words, as today: a moment the app brought back, or one met while walking, never takes the walker away (steward 2).
5. **RL5** A reaction that is a link looks and reads as one: its glyph and its name in ink, as now (the page's white on the viewer's dark strip), a target 44 px tall or more, the role of a link and a spoken name saying where it goes ("Ideas"); pressed, only the ink fades; never a count, a second colour, the accent, or a chip (steward 4). RL1's cold find is the test of whether it looks like one; if it fails, the fix stays in ink (an ink underline), never a chip or a colour (steward 5).

The sign

6. **RL6** The sign on the entry being written and on an entry kept today is always the face with a plus, whatever is chosen; its spoken name says what is chosen ("Reaction, Happy, Idea", or "Reaction, none"). Amends RX9.
7. **RL7** A note page's Reaction tool is always the face with a plus; its spoken name says what is chosen. Amends RX12.

The held date

8. **RL8** At rest, nothing lies over the first entry under a date: its sign and its dateline are clear of the held date's edge, at every width from 320 px.

Kept, or said not to be (the reactions audit 7, 11, 12)

9. **RL9** A reaction that cannot be kept is not shown as chosen, and the panel it was chosen in (above the bar, More's sheet, the viewer, a page) says "Not kept yet" (the journal's words), one line, the viewer's own line for it replaced, until the next choice or the panel closes; nothing else is said or counted (steward 3).
10. **RL10** A moment's reactions written together (a new page's held reactions, kept with its moment) are kept together or not at all: a failure leaves none of them.
11. **RL11** Reactions chosen on a new page before its first words are kept on its moment even if the page closes while that first save is still on its way.

## Steward (Nov 14)

Five findings, all accepted: steward 1 (a lens from a moment is the whole lens) in RL2; steward 2 (every Memories
viewer named; the slip's and a reminder's plain) in RL3, RL4 and the table; steward 3 ("Not kept yet", one line, cleared
when the panel closes) in RL9; steward 4 (pressed only fades the ink; white on the strip) and steward 5 (the cold find
tests "looks like a link"; an ink underline the only fallback) in RL5. Its silence on lens-hopping is answered in RL3:
Back goes to where the first lens was opened from.

## Record

Not built.
