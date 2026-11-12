---
paths:
  - "src/lib/journal/**"
  - "src/components/journal/**"
  - "src/components/chronicle/MemoriesScreen.tsx"
  - "src/lib/__tests__/journal/**"
---
# The journal (Chronicle's Memories)

Memories is a journal page (decision 0154): one sheet in book order, opening at today, ending in an open line where writing, a photo or a voice note is the capture. The spec is `specs/chronicle-journal/spec.md` (JN1-JN24). The codemap is in `docs/ARCHITECTURE.md`. This is cut 1 of four: Walks, Days, Map and Media are as they were.

## What it must stay

- **Two voices.** The owner's words are in the platform's serif (`components/journal/type.ts`; no font is bundled); everything the app says is in its sans, muted. No sentence the app composed is ever set in the serif.
- **Typographic, never a costume.** No paper, binding, page turn or accent colour; no card around an entry.
- **The journal starts no walk and no trace.** An entry reads one fix when it begins (0036); with a walk open it reads none and is placed from the trace.
- **The past is fixed.** New entries land at the end; nothing inserts on a past page. A response is a new entry.
- **No prompt.** No hint text in the line, no "nothing kept yet", no empty days, no count. The slip keeps its place while an entry is written: a card that leaves at the first character reads as a prompt (the steward's finding 7).

## How it works

- **The page** (`lib/journal/page.ts`, pure): `journalMoments` joins the feed's moments and an open walk's (`state.inOpenWalk`, JN8) and sorts them oldest first; `journalPage` takes the latest `limit` and adds a heading per day, today's always, and the slip under it. `JournalPage` is a plain `ScrollView`, not an inverted list (react-native-web flips an inverted list with a transform and reverses the wheel): it scrolls to its end while `pinned`, and asks for an older page near the top only once it has first reached the foot (`opened`), or a page opens with two. On the web it keeps what was on screen by adding the height that arrived to the offset; native uses `maintainVisibleContentPosition`.
- **The pen** (`lib/journal/pen.ts`, a reducer; `OpenLine` runs its effects): the first character is `begin` (`useCaptures.beginNote`, a new moment or a piece of the open one); each change after is `save` (`writeNote`, 400 ms after the last keystroke; at once, `now`, when the line lets go, on Retry and on `pagehide`); all words deleted is `drop` (`dropNote`: the piece, and the moment when it held nothing else). The state lives in a ref so each event is decided against the latest, and effects run through one promise chain.
- **One fix per kept entry** (JN12): `dropNote` leaves the moment's location read as `spare`; the next capture begun within two minutes takes it instead of reading again. A dropped moment is never placed (`dropped`).
- **One entry** (JN15) is moment stacks' open moment (`momentPill`, `lib/openMoment`), used without the Group captures setting: `onKept` opens it, a keystroke's `save` calls `momentPill.piece` (its two minutes start again), Done is `newMoment`, leaving Memories is `leave`, and on a walk the trace's distance feeds `walked`. When the store's open id is no longer the pen's moment, the pen gets `closed`.
- **The piece being written is drawn in the line, not on the page** (`writing`): the entry shows its dateline and its other pieces, and the line under it holds the words. After `clear` the page reads again and draws them.
- **The dateline** (`lib/journal/lines.ts`): the time ("8:15 this morning" today, "8:15 am" before), then `ContextEntry.place` and `.into` once `resurface.contextFor` has read them (which now looks in `inOpenWalk` too). Unplaced, it says "No location" only when told why (`reasons`, from `onMoment`) or a minute after the entry began. A placed entry's dateline is a button: `chronicleSection.showMoment` sets Map and a focus the `ChronicleMap` takes on its read (`takeFocus`), framing 150 m around it instead of its usual fit.
- **A reference in an entry is a card that opens the moment it names** (`NoteText`, JN16), nested inside the entry's own button: a test that wants the entry itself clicks its first words (`position: { x: 12, y: 12 }`), and a `ref-card` locator must say which one (`:not([data-testid=journal-page] *)` for the viewer's).
- **The contents** (`MemoriesMenu`, `memories-menu`): Threads (`threads-screen`: the Chronicle's rail and the owner's threads), Hidden, the switch, Forget. The open line stays in all of them (HC7 carried). The e2e reaches the threads with `toThreads(pg)` and the page with `toJournal(pg)` (`scripts/e2e/harness.js`).
- **Before a read, or when it failed**, the page draws what was kept in this sitting (`session`), with the failed notice under today's date (JN9).

## After the audit (chronicle-journal audit 1-15, ui 2-10)

- **The line empties only once its words are known to be kept** (audit 4): Done, a kept capture or a closed entry sets `leaving` and emits one `save` with `now`; `saved` then gives `clear` (and `end` for Done); `saveFailed` keeps the words and says "Not kept yet" with Retry.
- **A begin reads `momentPill.target()` inside the queue** (audit 3), after any drop queued before it; `end` runs at once. A voice note that starts sends `kept`, so the words typed before it are their own piece and emptying the line can never remove the moment it records into.
- **The line stays mounted when it moves after a screen** (audit 10): `MemoriesScreen` renders the line and the body as keyed siblings, in the order the screen reader needs. Never put it in two conditional slots: it remounts and loses what is typed.
- **`onFoot` is the tap, `onSeen` is something kept** (audit 15): only `onSeen` leaves a thread, the threads or Hidden for the page. Leaving on the tap moves the focused field and drops the keyboard.
- **The line rides above the keyboard** (audit 1): `bottom` is `lineLift(keyboard, below)`, `below` measured while the keyboard is down. The journey stubs `visualViewport.height` to check it.
- **The page has its own clock** (audit 2, 11): `now` is the later of the read's and a 30 s tick, and `journalPage` takes the later of `now`'s day and the last entry's as today.
- **`session` is the page's copy of this sitting** (audit 6): `onWritten` and `onDropped` keep it whole while a read is loading or failed. The journey breaks only the listing's index (`__breakReads = 't'`): a delete reads other indexes.
- **No fix on a walk** (audit 7): `beginNote` stamps without locating when a walk is open, and `dateline` makes no place claim for an unplaced entry whose walk is not among the finished ones.

## Traps

- **A multiline `TextInput` is two rows tall on the web** unless `rows={1}`; the field's height follows `onContentSizeChange`, from 44 to 132.
- **`text=Connected` once passed off the threads listed behind the viewer.** They are off the page now; a check on what a screen says must scope to that screen.
- **A short walk's replay can reach its card before a `waitForSelector` begins**: `capturehome` watches for the note from before Stop.
- **Native** (never run on a device): the open line above the keyboard, the serif families, `maintainVisibleContentPosition` on prepend, the first scroll to the foot.
