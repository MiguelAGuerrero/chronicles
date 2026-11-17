<!-- Repo first: written from the owner's answer in person (Nov 17, 2026), "Ship fix 1, slice the rest", after the review of `tend captures` found holes in a first attempt. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Unsaved captures have one owner (UN)

Nov 17, 2026 · @Miguel Guerrero

A photo, video or voice memo whose save fails is held for Retry (SA8, decision 0107). Today each screen holds its own:
the walk screen, Navigate, ready, Memories' open line, the recording bar, Respond in the viewer and the planner each keep
what failed on them in their own state. So what one screen holds is gone when that screen goes (the chevron, Start,
Minimize, browser Back), a second failed memo replaces the first, the recording bar's Stop ends the walk without the
photo it holds, and Respond and the planner hold a memo where no Retry is ever shown. The first attempt (`tend captures
2`, unpushed) handed a memo from screen to screen; its review found eight ways that still lose a recording or offer a
Retry that cannot work. This slice gives every unsaved capture one holder, outside any screen, that both Stops ask.

The review's findings this slice answers (the review of `tend captures 1` and `2`, Nov 17, F1-F8):

- F1: a memo held for Retry is dropped by the chevron, Start or Minimize, and no Stop warns of it.
- F2: a second failed memo replaces the first.
- F3: a memo waiting for a walk that ends is never shown or warned of.
- F4: Respond and the planner hold a memo where no Retry is shown.
- F5: a memo handed to another screen loses its reason (SA9).
- F6: a screen that keeps its held memo never shows the next one waiting.
- F7: a Retry for a memo whose open moment was deleted fails every time, and leaves a file each time.
- F8: a memo lost at Stop is said on a screen that is replaced at once.

And `docs/DEFERRED.md`'s item "The recording bar's Stop ends the walk without a photo the bar holds, with no warning"
(`/tend tabs`, Nov 11), the same cause: both Stops must warn of every unsaved capture.

## Vision

```
Idea: "Ship fix 1, slice the rest" (the owner, Nov 17): one holder owns every unsaved photo, video and voice memo, so leaving a screen never drops one, both Stops warn of what is held, and each screen that shows one says why.
Verb: honour (a moment arrives whole: a capture that could not be saved is kept until it is saved or the walker knowingly lets it go).
Touches: Always, "Capture is one tap away" (nothing held disables or moves a capture button: UN14). Always, "Moments and the trace are truth" (a capture is never dropped without a word: UN1, UN8). Always, "Counts are words" (the pills and warnings name kinds, never a number: UN14). Never, "Nagging" (said at Stop and where the capture is shown, never as a notification or again for what was already said: UN5, UN9). Decision 0107 (SA8 "every failed capture is held", "Stop warns first"; SA9 "why, in words"): stands, and is extended to every screen and both Stops. Decision 0094.
Verdict: aligned
Shape: as asked. One reshaping in the details: a screen with no Retry of its own (the recording bar, Respond, the planner) never says "held here"; it says where the Retry is (UN10).
Criteria: UN5 (both Stops warn; a second hold ends without them), UN8 (what is let go is let go knowingly, and only by Stop), UN10 (no words promise a Retry that is not on the screen), UN14 (no count, no capture button moved or disabled).
Open: the vision is silent on how long a held capture lives (until the app closes, or across a reload) and on what happens to a walk's held captures once the walk is ended without them. Both are put to the owner in plan.md (Q2, Q3), with a recommendation.
```

## Decisions

- **Nov 17, the owner, in person:** "Ship fix 1, slice the rest." Fix 1 (`tend captures 1`, a memo whose stop timed out is
  said and let go) is on `main`. The rest is this slice; the review's F1-F8 are its starting criteria, and the recording
  bar's Stop item joins it.
- **Pending (plan.md, questions for the owner):** where held captures live (Q1), how long (Q2), what a walk ended without
  them does with them (Q3), the order of work beside the parallel `/tend chronicle` run (Q4), a way to let go outside
  a walk (Q5), one pill or two (Q6). The criteria below are
  written for the recommended answers; each one that depends on an answer says so.

## Criteria

### Nothing is dropped by leaving a screen

1. **UN1 · The task: a capture that didn't save is never lost by leaving the screen.** A photo, video or voice memo whose
   save failed is still held after the screen it failed on goes: the ready screen's chevron, Start, the walk screen's
   Minimize, a browser Back, a tab change, closing the viewer or the planner. It is held until Retry keeps it or the
   walker lets it go by holding Stop twice (UN5, UN8). A memo whose save fails as its screen goes (finished as the screen
   unmounts) is held the same way.
2. **UN2 · Found where you would look.** Every held capture shows in a pill with Retry on each screen that has capture
   pills: the walk screen, Navigate, ready and Memories' open line, whichever screen it failed on (the recording bar,
   Respond in the viewer, the planner included). The pills are today's: "Photo not saved", "Photos not saved", "Video
   not saved", "Videos not saved", "Photos and videos not saved", each with Retry; and "Voice memo not saved" ("Voice
   memos not saved" for several; on Memories "Voice note", the journal's noun), with Retry. Someone told only "a memo
   didn't save; save it again" finds the Retry from the screen they are on.

### Every one, kept once, where it belongs

3. **UN3 · Every one, none replacing another.** Two or more failures, of any kinds, on any screens, are all held. Retry
   saves each in the order taken, each with its own time and place; one that fails again stays held. One capture is
   never kept twice, even with Retry pressed on two screens at once.
4. **UN4 · Into the walk it was taken on.** Retry keeps a held capture into the walk it was taken on, or as a moment of
   its own if it was taken outside a walk, whichever screen's Retry is pressed: a memo held on Navigate, ready, then
   Start, then Retry on the walk screen, is kept as a moment of its own, not in the walk; a reply keeps its reply.
5. **UN5 · Both Stops warn.** Holding Stop on the walk screen, or on the recording bar, with any capture of that walk
   still held, from any screen (one that failed while Stop waited included), says so first, and the walk goes on. Holding
   Stop again ends the walk without them. A capture held after a warning is warned of again at the next hold. Captures
   taken outside a walk never hold up a walk's Stop.
6. **UN6 · The bar's warning fits and promises no Retry on the bar.** The recording bar's warning is whole on one line
   at 320 px wide and names no Retry on the bar: "Not saved yet. Hold Stop again to end without it." ("without them" for
   several).
7. **UN7 · A refused hold empties.** After a hold that is refused with a warning, the Stop button's fill goes back to
   empty, on the walk screen and on the recording bar.
8. **UN8 · Let go knowingly, and leaving nothing behind.** Ending a walk by the second hold lets that walk's held
   captures go: nothing of them shows afterwards and no file of theirs is left on the phone or in the browser's storage.
   Nothing else lets a held capture go (pending Q3). Captures held outside a walk stay held across a walk's end.

### Why, in words, where it is shown

9. **UN9 · Why, said where it is shown.** A failure on the screen in front says why there, in SA9's words, as today. A
   capture that failed on a screen no longer in front, or on a screen with no Retry, has its why said once more, by the
   first screen in front that shows its pill ("Not saved: there is no room left. It is held here for Retry." or
   "Couldn’t save this voice memo."). Nothing is said twice on one screen for one capture.
10. **UN10 · No promise of a Retry that isn't there.** On the recording bar, in Respond in the viewer and on the planner,
    a failed save never says "held here": lack of room reads "Not saved: there is no room left. It is held for Retry on
    the walk screen." during a walk, "… for Retry on Memories." outside one; any other failure "Couldn’t save this
    photo." ("video", "voice memo") as today.

### A Retry that can work

11. **UN11 · A moment deleted meanwhile.** A capture held for an open moment (Add to this moment) that has since been
    deleted is kept by Retry as a moment of its own, at the time it was taken. Retry never fails because the moment is
    gone.
12. **UN12 · One file each.** However many times Retry is pressed, a held capture leaves one file: once its file is
    kept, each later Retry uses the same kept file. A held capture let go (UN8) leaves none.
13. **UN13 · A memo with nothing to keep is said where it is seen.** A memo lost at the walk's Stop (its stop gave no
    file, `tend captures 1`) is said on the walk screen, and the walk ends only on a second hold, as for a held capture.
    One lost as its screen goes is said once by the next screen in front that has capture pills, with no Retry.

### Restraint

14. **UN14 · Nothing moves, nothing counts.** While anything is held, every capture button stays where it is and
    enabled, and the screens gain no control beyond the pills above. No pill or warning holds a digit. No notification is
    sent for a held capture.
15. **UN15 · Held while the app is open** (pending Q2). Held captures live in memory while the app is open: a reload or
    the app being closed drops them, as `docs/DEFERRED.md` records today ("Held captures live in memory"); nothing about
    them is written to storage.

## Routes and data

- No new route, no migration, no new dependency, no meta key (pending Q2).
- New: `src/lib/unsaved/` (core: the words and the decisions; shell: the one holder, a `Store`; the app's instance).

## Native (unverified on a device)

A held photo's picker file and a held memo's recorder file outliving the screen that took them (and, for a memo, the
next memo's prepare) on iOS and Android; a let-go capture's files removed. Never run on a phone.
