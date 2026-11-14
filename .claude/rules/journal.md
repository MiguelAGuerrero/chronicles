---
paths:
  - "src/lib/journal/**"
  - "src/components/journal/**"
  - "src/components/chronicle/MemoriesScreen.tsx"
  - "src/lib/__tests__/journal/**"
---
# The journal (Chronicle's Memories)

Memories is a journal page (decision 0155): one sheet in book order, opening at today, ending in an open line where writing, a photo or a voice note is the capture. The spec is `specs/chronicle-journal/spec.md` (JN1-JN24). The codemap is in `docs/ARCHITECTURE.md`. This is cut 1 of four: Walks, Days, Map and Media are as they were.

## What it must stay

- **Two voices.** The owner's words are in the platform's serif (`components/journal/type.ts`; no font is bundled); everything the app says is in its sans, muted. No sentence the app composed is ever set in the serif.
- **Typographic, never a costume.** No paper, binding, page turn or accent colour; no card around an entry.
- **The journal starts no walk and no trace.** An entry reads one fix when it begins (0036); with a walk open it reads none and is placed from the trace.
- **The past is fixed.** New entries land at the end; nothing inserts on a past page. A response is a new entry.
- **One hint, no other prompt.** The line's muted placeholder (`LINE_PLACEHOLDER`, decision 0171) is the only hint; no "nothing kept yet", no empty days, no count. The slip keeps its place while an entry is written: a card that leaves at the first character reads as a prompt (the steward's finding 7).

## How it works

- **The page** (`lib/journal/page.ts`, pure): `journalMoments` joins the feed's moments and an open walk's (`state.inOpenWalk`, JN8) and sorts them oldest first; `journalPage` takes the latest `limit` and adds a heading per day, today's always, and the slip under it. `JournalPage` is a plain `ScrollView`, not an inverted list (react-native-web flips an inverted list with a transform and reverses the wheel): it scrolls to its end while `pinned`, and asks for an older page near the top only once it has first reached the foot (`opened`), or a page opens with two. On the web it keeps what was on screen by adding the height that arrived to the offset; native uses `maintainVisibleContentPosition`.
- **The pen** (`lib/journal/pen.ts`, a reducer; `OpenLine` runs its effects): the first character is `begin` (`useCaptures.beginLine`, a new moment or a piece of the open one); each change after is `save` (`writeLine`, 400 ms after the last keystroke; at once, `now`, when the line lets go, on Retry and on `pagehide`); all words deleted is `drop` (`dropLine`: the piece, and the moment when it held nothing else). The state lives in a ref so each event is decided against the latest, and effects run through one promise chain.
- **One fix per kept entry** (JN12): `dropLine` leaves the moment's location read as `spare`; the next capture begun within two minutes takes it instead of reading again. A dropped moment is never placed (`dropped`).
- **One entry** (JN15) is moment stacks' open moment (`momentPill`, `lib/openMoment`), used without the Group captures setting: `onKept` opens it, a keystroke's `save` calls `momentPill.piece` (its two minutes start again), Done is `newMoment`, leaving Memories is `leave`, and on a walk the trace's distance feeds `walked`. When the store's open id is no longer the pen's moment, the pen gets `closed`.
- **The piece being written is drawn by the field, not as a piece of its entry** (`writing`): the entry shows its dateline and its other pieces, and the field under it, on the page since JN28, holds the words. After `clear` the page reads again and draws them.
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
- **No fix on a walk** (audit 7): `beginLine` stamps without locating when a walk is open (the note page's own `beginNote` still reads one when the walk's last fix is stale, as the pencil does everywhere), and `dateline` makes no place claim for an unplaced entry whose walk is not among the finished ones.

## The line and the page (JN25-JN27; note pages, decision 0151)

- **One note, two ways to write it.** The line stores a plain note (`beginLine`, `writeLine`, `dropLine` in `useCaptures`); the note's page (`components/notePage`) writes Markdown through `setNote` and marks it `body_format: 'md'`. A note the page did not write stays literal (NP7): a line that begins with `# ` shows as typed until it is opened as a page.
- **Open as a page** (`OpenLine.openPage`): with words in the line it writes them, resets the pen (the page holds the entry from there) and opens `NotePage` on that same piece; from an empty line it opens `NewNotePage`, which joins the open entry (`momentPill.target()`) as any piece does. Closing the page is `onSeen` only when it kept something. The hand-off waits for the line's write to land before the pen resets and the page opens; a failed write is said in the line. An entry emptied on its page ends the open entry (`momentPill.newMoment()`), so the next words never join a moment that is being deleted; the page's camera does the same, so they never join its photo.
- **Two camera rules, by the owner's call:** in the line a photo is a piece of the entry (JN15); on the page it is its own moment, mentioned in the note (NP14).
- **The sheet never holds the editor.** It is a web view on a phone. `lib/journal/blocks.ts` reads a page's Markdown with `marked` into blocks that `Entry`'s `Blocks` draws as native text; a mention's token is set aside while the note is lexed and put back in its block, so it is drawn as a card. A long entry is cut at twelve blocks with `ENTRY_GOES_ON`.
- **The line's height changes** (its status row): the sheet pads its foot by what `onHeight` reports, not a constant.
- **The row's controls outlive the field's blur by 200 ms** (`BLUR_HOLD_MS`): a tap on Open as a page blurs the field first, and a row that left at once would take the button with it.

## Writing on the page (JN28-JN30, Nov 13, from the owner's phone)

- **The field is the page's last line, not a box at the foot** (JN28). `OpenLine` owns the pen, the captures and the bar, and takes the screen's body as a render prop: it hands the body the field (`children(field)`), and `JournalPage` draws it after its rows. Where no page shows (`inBar`: a thread, the threads, Hidden) the field sits in the bar. The first build put the field in a row at the foot; on the owner's iPhone it read as a chat box, small and boxed, with the recording bar, the tab bar and a blank band between it and the keyboard.
- **One bar, one row** (JN29): while writing the status, Open as a page (an icon), the camera, the mic and Done. Its height never changes. At rest there is no bar (JN35, below).
- **The tabs fold away while the field has the keyboard** (JN30): `hideTabs()` (`lib/tabsHidden`) for as long as `typing`, which takes the recording bar with them; the walk goes on recording. The lift is then measured from nothing (`lineLift(keyboard, 0)`), and `below` is never measured while typing.
- **No focus frame on the field**: the app's `:focus-visible` ring is `!important`, so an inline `outlineStyle: 'none'` loses to it; the exception is in `webStyles.web.ts`, by test id.
- **Room is kept for the dateline** (`datelineRoom`) above the field while no entry is open, so the line being written does not jump when its first character brings the dateline.

## After the second audit (chronicle-journal audit 40-49, Nov 13)

- **The sheet pads its foot by the bar and the keyboard's lift together** (audit 40): `OpenLine` reports `barH + lift` through `onHeight`, so the empty page's room is what is left above the keyboard. Report only the bar and the line being written sits behind the keys.
- **Typing belongs to the slot it began in** (audit 41): the field is drawn in the bar or on the page, and moving between them while focused is a new field with no blur. `typing` is true only while `typedInBar` matches `inBar`, or the tabs stay folded.
- **A sitting ends when Memories is left** (audit 42): `JournalPage` takes `focused` and drops the anchor when it comes back, holding the end as it does for the keyboard.
- **The keyboard going never moves a reader who scrolled back** (audit 43); coming up, it always brings the line into view.
- **The tappable page lies under the whole empty page** (audit 45: `absoluteFill`, the field's dateline room lets taps through) **and is hidden from a screen reader** (audit 44): the field has the name. A journey clicks it with `force: true`, since the field can lie over the point.

## The owner's answers to the second audit (audit 50-54, Nov 13)

- **The bar holds a pen only while the empty page is out of view** (audit 50): `JournalPage` tells `onAway` from its scroll, `MemoriesScreen` passes `penInBar`. In view, the page is the pen.
- **Done's place is kept in the bar** (audit 51): an unseen, untappable Done of the same width. Its rule that the camera and the mic never move is reversed by decision 0172: they move from the row to the keyboard bar while typing (JN36).
- **The held date has an edge** (audit 52): four bands of the page's ground under it, none fainter than a fifth. A fainter band is drawn a shade off the ground it lies on and shows as a line under every date.
- **Writing on a walk, the bar keeps the recording's mark** (audit 53): the recording bar is folded with the tabs.
- **An entry draws its note's type** (audit 54, `NoteMark`): the journal replaced the moment card, which drew it. The Type tool is on the note's page only.

## A voice note plays in line (the owner, Nov 13; journal voice audit 1-19)

- **It never opens the viewer.** An entry's voice piece is `MemoLine` (`components/journal`): a 48 pt play control, a progress bar filling as it plays, and a clock that always reads "a / b" (`lib/journal/memoPlay`). It is drawn in ink (`theme.ink`, the track `theme.edge`): the voice purple is the line's own recording colour, never the page's. Its file is resolved and loaded only on the first press, and a file that does not resolve gives the row back after `MEMO_LOAD_WAIT_MS`.
- **One note plays at a time, and a recording stops it** (`lib/journal/nowPlaying`): a note claims the sound when it starts and lets go of its player when another claims it; `useCaptures.startVoice` claims it as `RECORDING`. A trimmed note plays its kept part through `lib/voiceTrim` and restarts as the viewer's player does (`isRestarting`).
- **Known gap:** the play control sits inside the entry's open button, so a screen reader on a phone may not reach it apart from the entry (the viewer still plays the note): `docs/DEFERRED.md`.

## Traps

- **An iPhone floats the keyboard's own row (previous, next, a tick) over the page** (fix keyboard-accessory, the owner's phone, Nov 13). A web page cannot turn it off or measure it, and `visualViewport` does not count it, so it sat on the bar's camera, mic and Done. The bar keeps `ACCESSORY_ROOM` empty under its controls while the keyboard is up (`accessoryRoom`, `floatsAccessory` in `lib/journal/keyboard.ts`: an iPhone or iPad whose engine has `anchor-name`, which arrived in the release that began floating the row; the Home Screen app's agent names no version). The 56 is read off a screenshot; never seen to work on a phone.

- **A multiline `TextInput` is two rows tall on the web** unless `rows={1}`; the field's height follows `onContentSizeChange`, from 44 to 132.
- **`text=Connected` once passed off the threads listed behind the viewer.** They are off the page now; a check on what a screen says must scope to that screen.
- **A short walk's replay can reach its card before a `waitForSelector` begins**: `capturehome` watches for the note from before Stop.
- **Native** (never run on a device): the open line above the keyboard, the serif families, `maintainVisibleContentPosition` on prepend, the first scroll to the foot.
