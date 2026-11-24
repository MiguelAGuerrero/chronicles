import type { Faced } from '../lib/moment';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { barCaptures } from '../lib/captureBand';
import { chronicleSection } from '../lib/resurface/sectionStore';
import { useStore } from '../lib/useStore';
import { useKeyboardHeight } from '../lib/threads/useKeyboardHeight';
import { useUnits } from '../lib/useUnits';
import { db } from '../lib/db';
import { memoGate } from '../lib/memoGate';
import { unsaved } from '../lib/unsaved';
import { barWarning } from '../lib/unsaved/core';
import { stopEnd } from '../lib/unsaved/stopEnd';
import { barInSight, reminderHeld, reminderSeen, reminderSight, reminderText, UNSEEN, type ReminderSight } from '../lib/discovery/recall';
import { handOnRecall, onRecallFired, RECALL_OPEN_KEY } from '../lib/discovery/recallCheck';
import { feedback } from '../lib/motion';
import { MOTION } from '../lib/motionTokens';
import { perfCount } from '../lib/perfCount';
import { BAR_WAIT_MS, barCapturesOff, barChevron, barDot, barGoesBack, barLineGaps, barMemoLine, barMemoSaves, barStopLeftMs, barStopping, memoLine, recordingLine } from '../lib/recordingBar';
import type { Pause, Walk } from '../lib/types';
import type { LiveTrace } from '../lib/useLiveTrace';
import { useCaptures } from '../lib/useCaptures';
import { settleWithin } from '../lib/settleWithin';
import { barReminderUp, barStop, barStops, modalsUp, tabsHidden } from '../lib/tabsHidden';
import { showWalk } from '../lib/walkNav';
import { Icon, type IconName } from './icons';
import { useEditAfterCapture } from './edit/EditOffer';
import { MediaEditor } from './edit/MediaEditor';
import { Modal } from './Modal';
import { NewNotePage } from './notePage/NewNotePage';
import type { NotePageHandle } from './notePage/NotePage';
import { useOpenWalk } from './OpenWalk';
import { Ticking } from './Ticking';
import { HoldButton, theme } from './ui';

/** The bar's return waits this long at most for its photo to be kept. */
const RETURN_WAIT_MS = BAR_WAIT_MS;

/** How long a word from the bar (a photo kept, a refusal) stands in for its line. */
const SAID_MS = 3000;

/**
 * The recording bar (NV9): while a walk is open and minimized, just above the
 * tab bar on every tab. The time walked, the distance in its spoken name (BC6), the pause glyph when paused (T59); a tap
 * returns to the walk; a held Stop (decision 0048) ends it. Its camera keeps a photo or video for the open
 * walk, placed as the walk's own captures are (the latest fix, else at stop),
 * paused or not, without opening the walk screen.
 *
 * Only this component re-renders as the trace grows or the clock ticks: the
 * time ticks in its own small component, never in the tabs (perf).
 */
export function RecordingBar() {
  const open = useOpenWalk();
  // Nothing at all with no walk open: no capture path, no clock.
  return open.walk ? <Bar walk={open.walk} pauses={open.pauses} live={open.live} /> : null;
}

function Bar({ walk, pauses, live }: { walk: Walk; pauses: Pause[]; live: LiveTrace }) {
  perfCount('render:bar');
  // The bar stays mounted across a change of units under a minimized walk (QL16).
  useUnits();
  const [said, setSaid] = useState<{ text: string; error?: boolean } | null>(null);
  const onError = useCallback((e: { message: string }) => {
    setSaid({ text: e.message, error: true });
  }, []);
  // No Retry on the bar: a failure says where it is held (unsaved captures UN10).
  const cap = useCaptures(walk.id, live.here, live.lastFixAt, onError, { retryShown: false, shortWords: true });
  // On Memories the journal's open line files into the walk: the bar shows no capture there (decision 0112); on every
  // other tab the camera, the mic and the pencil (BC1, from T11).
  const path = usePathname();
  const section = useStore(chronicleSection.store, (x) => x);
  const showCaptures = barCaptures(path, section).length > 0;
  // The memo records in place (BC2 as T60 amends it): the line shows its time with Discard before it, the camera keeps its
  // place (a photo then joins the memo's moment, `photoMidMemo` in `useCaptures`), Save takes the mic's.
  const memoOn = cap.voiceStartedAt != null;
  const memoStartedAt = cap.voiceStartedAt;
  // The chevron at every width, never mid-memo (BC6, T58).
  const { width } = useWindowDimensions();
  // Whether the walk is paused, read once for the chevron, the gaps and the glyph (tend tabs audit 65).
  const paused = pauses.some((p) => p.ended_at == null);
  const chevron = barChevron(width, memoOn, paused);
  // The red dot from 360 px; at 320 px it gives way to the chevron (T58).
  const dot = barDot(width);
  // The line's gaps as the drawings have them, by width and state (tend tabs audit 63).
  const gaps = barLineGaps(width, memoOn, paused);
  // Mid-memo, the line with Discard on it: its dot and paddings by width, so the time stays whole at 320 px (T60).
  const memoRow = barMemoLine(width);
  // The pencil's page (BC4), the one the walk screen's pencil opens, over this tab.
  const [page, setPage] = useState<{ key: number } | null>(null);
  const pageRef = useRef<NotePageHandle>(null);
  // Once its photo or video is kept, the editor opens by itself (ME23 as decision 0240 amends it; it was 0149's pill).
  const editAfter = useEditAfterCapture(cap.captures);
  // While the memo records, a photo taken then waits for its editor until the memo is saved or discarded, as on the walk
  // screen (the owner's "Editor waits", decision 0261; tend tabs T60).
  const editing = memoOn ? null : editAfter.editing;
  // Held to stop, the walk is going. Shared, not this bar's own: the bar unmounts as its tab loses focus while the stop
  // goes on (tend tabs audit 26).
  // Within the stop's own bound, as the way back is: a stop that hangs lets the Stop's spinner go after it (tend tabs 19).
  const stopSince = useStore(barStop, (s) => (s?.walkId === walk.id ? s.since : null));
  // Mounted after the bound (its tab back in front), the stop is over from the first render (tend tabs audit 54).
  const [stopOver, setStopOver] = useState<number | null>(() => {
    const s = barStop.get();
    return s && s.walkId === walk.id && !barStopping(s, walk.id, Date.now()) ? s.since : null;
  });
  useEffect(() => {
    if (stopSince == null) return;
    const t = setTimeout(() => setStopOver(stopSince), barStopLeftMs({ walkId: walk.id, since: stopSince }, walk.id, Date.now()));
    return () => clearTimeout(t);
  }, [stopSince, walk.id]);
  const stopping = stopSince != null && stopOver !== stopSince;
  // The held captures of the walk this Stop has warned of; one held beyond them is warned of too (unsaved captures UN5).
  const warnedHeld = useRef<string[]>([]);
  // The memo saves this Stop has said are still being saved; the next hold goes through them (T35).
  const warnedSaves = useRef<number[]>([]);
  // The bar's words (a refusal, a warning, a failure) are announced too: iOS reads no live regions, and a refused hold
  // says why only here (tend tabs audit 45).
  useEffect(() => {
    if (said && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(said.text);
  }, [said]);
  // A photo still being kept: Return waits for it, so the walk screen opens with it (NV9).
  const keeping = useRef<Promise<unknown> | null>(null);
  const returning = useRef(false);
  // Up once the way back has asked for the walk screen, and never lowered: the bar is going (audit 5).
  const wentBack = useRef(false);
  const [reminder, setReminder] = useState<Faced[] | null>(null);

  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(null), said.error ? SAID_MS * 2 : SAID_MS);
    return () => clearTimeout(t);
  }, [said]);
  // Remind me here goes on while minimized (NV8): a fire with the page in front lands here, where
  // the walk's card would be; a tap opens it on the walk.
  // What the bar holds, read by the listener below, so it announces the bar's own title (tend explore audit 6).
  // Told to the tabs, so Explore's press hint steps aside while the card lifts its map (tend tabs audit 51).
  const reminderUp = !!reminder;
  useEffect(() => {
    barReminderUp.set(reminderUp);
    return () => barReminderUp.set(false);
  }, [reminderUp]);
  const reminderRef = useRef(reminder);
  useEffect(() => {
    reminderRef.current = reminder;
  }, [reminder]);
  // How long what the bar holds has been in sight; a fire merging into it is new, unseen.
  const seenTime = useRef<ReminderSight>(UNSEEN);
  useEffect(
    () =>
      onRecallFired((due) => {
        const all = reminderHeld(reminderRef.current, due);
        reminderRef.current = all;
        seenTime.current = UNSEEN;
        setReminder(all);
      }),
    [],
  );
  // Going (Walk here from the area card, a replay over the tabs) with a reminder nobody has seen: it is handed on, to
  // the walk screen's card or the bar again, whichever comes to the front next (tend explore audit 23).
  const walkId = walk.id;
  useEffect(() => {
    const held = reminderRef;
    const seen = seenTime;
    return () => {
      if (held.current && !reminderSeen(seen.current, Date.now())) handOnRecall(walkId, held.current);
    };
  }, [walkId]);
  // In sight only unfolded, with nothing over it, the keys down and the app in front: folded under a full-screen card
  // (the area card, the planner, the journal's keys), under a viewer, under Explore's search keyboard or in a pocket,
  // the bar holds a reminder, and its half-minute is time in sight (tend explore 22, audits 24, 27). It was marked
  // fired as it came, so dropping it unseen would lose it.
  const folded = useStore(tabsHidden, (h) => h);
  const covered = useStore(modalsUp, (n) => n > 0);
  // Folded away by a card or covered by a Modal: the bar's captures are out of sight (a memo is saved, audit 1).
  const hidden = folded || covered;
  const keyboard = useKeyboardHeight() > 0;
  const [active, setActive] = useState(() => AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  const inSight = barInSight({ folded, covered, keyboard, active });
  useEffect(() => {
    if (!reminder) {
      seenTime.current = UNSEEN;
      return;
    }
    const was = seenTime.current;
    const sight = reminderSight({ sight: was, inSight, now: Date.now(), showMs: MOTION.reminder });
    // Announced as it first comes into sight, by the bar's own title (tend explore audit 6).
    if (was.shownMs === 0 && was.since == null && sight.sight.since != null) AccessibilityInfo.announceForAccessibility(reminderText(reminder).title);
    seenTime.current = sight.sight;
    if (sight.goesInMs == null) return;
    const t = setTimeout(() => setReminder(null), sight.goesInMs);
    return () => clearTimeout(t);
  }, [reminder, inSight]);

  const startedAt = walk.started_at;
  const distanceM = live.distanceM;

  // Asked now, of the stop under way from any bar of the walk, within its bound (tend tabs 12, audits 26, 28).
  const goesBack = (returningNow: boolean) => barGoesBack({ returning: returningNow, stop: barStop.get(), walkId: walk.id, now: Date.now() });
  const back = async (open: Faced[] | null) => {
    if (!goesBack(returning.current)) return;
    returning.current = true;
    try {
      // A memo recording is saved first (BC3): the line, the reminder's See. A photo's editor waiting on it opens no
      // more: the walk screen comes, and it would open on the tab being left (T60).
      if (cap.voiceStartedAt != null) {
        editAfter.close();
        await cap.finishVoice();
      }
      // The photo is kept first, so the walk screen shows it; never held for ever by a save that hangs.
      await settleWithin(keeping.current, RETURN_WAIT_MS);
      // Held to stop meanwhile: the stop goes alone, its replay over the tabs, not over a walk screen (tend tabs 12).
      if (!goesBack(false)) return;
      // The walk screen opens what a tapped reminder asks for as it mounts (R4).
      if (open) await db.setMeta(RECALL_OPEN_KEY, JSON.stringify(open.map((c) => c.id))).catch(() => {});
      // And again after that write, which can wait in the device's write queue (tend tabs audit 27).
      if (!goesBack(false)) return;
      feedback('tap');
      showWalk();
      wentBack.current = true;
    } finally {
      returning.current = false;
    }
  };
  const photo = async () => {
    const run = cap.takePhoto();
    keeping.current = run;
    const kept = await run.finally(() => {
      if (keeping.current === run) keeping.current = null;
    });
    if (!kept) return;
    feedback('tap');
    setSaid(null);
    // Not while the walk is stopping or has ended, nor once the bar goes back to the walk: the replay or the walk screen
    // would take the editor with the bar (tend tabs audit 19; fix edit-after-capture audits 3, 5, 6).
    if (!returning.current && !wentBack.current && !barStopping(barStop.get(), walk.id, Date.now()) && !unsaved.hasEnded(walk.id)) editAfter.open(kept);
  };

  const startMemo = async () => {
    if (await cap.startVoice()) feedback('tap');
  };
  // Kept, it says nothing (BC7, matrix 20); under a second it is not kept, and the bar says so (BC2).
  const saveMemo = async () => {
    const r = await cap.finishVoice();
    if (r === 'saved') feedback('tap');
    else if (r === 'dropped') setSaid({ text: 'Too short, not kept' });
  };
  const discardMemo = async () => {
    if ((await cap.discardVoice()) === 'discarded' && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility('Voice memo discarded. Undo is available.');
  };
  // A memo is saved first when the bar's captures leave sight (BC3; `barMemoSaves`): another tab, Memories, a card or
  // sheet that folds the bar away, or a Modal over the tabs. A change of Chronicle's section keeps it (audit 2). A screen
  // over the tabs unmounts the bar, and `useCaptures` saves it then. A photo's editor waiting on the memo opens no more
  // (T60): it would come on another tab, or over the card or the Modal that took the bar's place (iOS cannot present a
  // Modal over a Modal).
  const leaveMemo = async () => {
    editAfter.close();
    await saveMemo();
  };
  const saveRef = useRef(leaveMemo);
  useEffect(() => {
    saveRef.current = leaveMemo;
  });
  const lastPath = useRef(path);
  useEffect(() => {
    const moved = lastPath.current !== path;
    lastPath.current = path;
    if (barMemoSaves({ memoOn, moved, captures: showCaptures, covered: hidden })) void saveRef.current();
  }, [path, memoOn, showCaptures, hidden]);
  // A reload or close of the web page mid-memo is warned of, as on Navigate's ready screen (BC3).
  useEffect(() => {
    if (!memoOn || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [memoOn]);

  // The bar's end of the walk: run once per walk, however many holds ask for it (tend tabs audit 53).
  const endWalk = async () => {
    try {
      // Never under a memo recording, as Start (tabs audit 3); a memo still being saved after the wait is said once, and
      // the next hold goes through it, the memo saving into the ended walk (T35). The bar's photo is kept first, as on
      // its return.
      await Promise.race([memoGate.readyToStart(), new Promise<boolean>((r) => setTimeout(() => r(false), RETURN_WAIT_MS))]);
      const memo = memoGate.stopUnder(warnedSaves.current);
      if (!memo.go) {
        if ('saving' in memo) warnedSaves.current = memo.saving;
        setSaid({ text: 'saving' in memo ? 'The voice memo is still being saved. Hold Stop again in a moment.' : 'A voice memo is recording. Save it first.', error: true });
        return;
      }
      // The bar's photo, and one still being kept from Memories' band (capture-from-chronicle audit 6).
      await settleWithin(Promise.all([keeping.current, memoGate.kept(), unsaved.settled()]), RETURN_WAIT_MS);
      // Whatever of the walk is held, from any screen, read now, is said first; the bar has no Retry, so its words
      // promise none (UN5, UN6). The next hold lets go only what it warned of, files and all (UN8), and nothing still
      // being saved lets the walk be dropped as empty: the end both Stops share (tend tabs audit 42, decision 0227).
      const r = await stopEnd(walk.id, { leaves: false, warned: warnedHeld.current });
      if ('warn' in r) {
        warnedHeld.current = r.warn.map((x) => x.id);
        setSaid({ text: barWarning(r.warn.length > 1), error: true });
        return;
      }
      const { dropped } = r;
      feedback('success');
      // A walk with nothing in it has no replay: the bar goes, and the pill offers Undo on this screen (EW1).
      if (!dropped) router.push(`/replay/${walk.id}`);
    } catch (e) {
      setSaid({ text: `The walk could not be stopped: ${e instanceof Error ? e.message : e}`, error: true });
    }
  };

  const stop = async () => {
    if (barStopping(barStop.get(), walk.id, Date.now())) return;
    const mine = { walkId: walk.id, since: Date.now() };
    barStop.set(mine);
    try {
      // A hold past the bound, the Stop back, joins the end under way: its spinner again, its replay pushed once.
      await barStops.run(walk.id, endWalk);
    } catch {
      // The end says its own failure on the bar.
    } finally {
      barStop.set((s) => (s === mine ? null : s));
    }
  };

  const line = (now: number) => recordingLine({ startedAt, pauses, now, distanceM });
  const memo = (now: number) => memoLine({ startedAt: memoStartedAt ?? now, now, paused });
  const capturing = barCapturesOff({ capturing: cap.busy != null, stopping });
  return (
    <View>
    {cap.discarded && !memoOn && (
      // The walk screen's pill, on the page's ground just above the bar, in flow so it covers no control (BC9).
      <View style={styles.pillRow}>
        <View testID="bar-discarded" style={styles.pill} accessibilityLiveRegion="polite">
          <Text style={styles.pillText}>Voice memo discarded</Text>
          <Pressable testID="bar-voice-undo" accessibilityRole="button" onPress={() => void cap.undoDiscard()} style={({ pressed }) => [styles.pillBtn, pressed && styles.pressed]}>
            <Text style={styles.pillBtnText}>Undo</Text>
          </Pressable>
        </View>
      </View>
    )}
    <View testID="recording-bar" style={styles.bar}>
      {reminder && (
        // Above the line, which keeps its time and distance: the walk's reminder card, in the bar.
        <Pressable
          testID="recording-reminder"
          accessibilityRole="button"
          accessibilityLabel={`${reminderText(reminder).title}. Return to the walk to see it`}
          onPress={() => back(reminder)}
          style={({ pressed }) => [styles.reminder, pressed && styles.pressed]}
        >
          <Icon name="time-outline" size={18} color={theme.ink} />
          <Text style={styles.reminderText} numberOfLines={1}>{reminderText(reminder).title}</Text>
          <Text style={styles.reminderSee}>See</Text>
        </Pressable>
      )}
      {said && (
        // The bar's words on a line of their own, whole at 320 px, so the buttons never move (BC10, the owner, Nov 22):
        // a refusal, "Hold to stop", "Too short, not kept", or where a failed capture is held (unsaved captures UN10).
        <View style={styles.saidRow}>
          <Text testID="recording-said" style={[styles.said, said.error && styles.error]} accessibilityLiveRegion="polite">
            {said.text}
          </Text>
        </View>
      )}
      <View style={styles.row}>
        {memoOn && (
          // Discard on the line, before the memo's time, the farther from Save, as the walk screen's row (T44, T60).
          <BarRound
            id="bar-voice-discard"
            icon="trash-outline"
            label="Discard voice memo"
            hint="Throws this recording away. You can undo for a few seconds."
            onPress={() => void discardMemo()}
            disabled={cap.busy === 'voice'}
          />
        )}
        <Pressable
          testID="recording-return"
          accessibilityRole="button"
          accessibilityHint={memoOn ? undefined : 'Returns to the walk'}
          onPress={() => back(null)}
          style={({ pressed }) => [
            styles.main,
            memoOn ? { gap: gaps.gap, paddingLeft: memoRow.left, paddingRight: memoRow.right } : { gap: gaps.gap, paddingRight: gaps.right },
            pressed && styles.pressed,
          ]}
        >
          {memoOn ? (
            // The memo's time beside a red dot (BC2), the dot from 360 px (T60); its name says it records, the walk's pause,
            // and what a tap does (BC6).
            <>
              {memoRow.dot && <View testID="bar-voice-dot" style={styles.memoDot} />}
              <Ticking testID="bar-voice-timer" style={[styles.text, styles.numbers]} numberOfLines={1} text={(now) => memo(now).time} label={(now) => memo(now).label} />
            </>
          ) : (
            <>
              {/* Paused is a glyph, not only a grey dot (tabs audit U10). */}
              {paused ? (
                <View testID="recording-paused" style={styles.glyph}>
                  <Icon name="pause" size={16} color="#ffffff" />
                </View>
              ) : (
                dot && <View testID="recording-dot" style={styles.dot} />
              )}
              {/* The time alone, drawn whole (tend tabs audit 57); the distance is in the label (BC6). Paused, no word
                  beside it: the glyph shows it and the label says it (T59, the owner's Paused390). */}
              <View testID="recording-stats" style={styles.line}>
                <Ticking testID="recording-numbers" style={[styles.text, styles.numbers]} numberOfLines={1} text={(now) => line(now).time} label={(now) => line(now).label} />
              </View>
              {/* Back into the walk, not "expand" (tabs audit U10), at every width (T58); never mid-memo (BC6). */}
              {chevron && (
                <View testID="recording-go" style={styles.glyph}>
                  <Icon name="chevron-forward" size={20} color="#ffffff" />
                </View>
              )}
            </>
          )}
        </Pressable>
        {(showCaptures || cap.busy === 'photo') &&
          // Named as Memories' band names its camera with a walk open: the same job, the same name (tend tabs 3). Mid-memo it
          // keeps its place and says where the photo goes; off while the memo is being saved (T60).
          <BarRound
            id="bar-photo"
            icon="camera"
            label={memoOn ? 'Add a photo to this memo' : 'Add to your walk: take a photo or video'}
            onPress={() => void photo()}
            spinning={cap.busy === 'photo'}
            disabled={capturing || cap.busy === 'voice'}
          />}
        {memoOn ? (
          // Save in the mic's place, the pencil's left empty, so Stop never moves (BC2).
          <>
            <BarRound id="bar-voice-save" icon="stop" label="Stop and save voice memo" onPress={() => void saveMemo()} voice spinning={cap.busy === 'voice'} disabled={cap.busy === 'voice'} />
            <View style={styles.slot} pointerEvents="none" aria-hidden />
          </>
        ) : (
          <>
            {(showCaptures || cap.busy === 'voice') &&
              <BarRound id="bar-voice" icon="mic" label="Add to your walk: record a voice memo" onPress={() => void startMemo()} spinning={cap.busy === 'voice'} disabled={capturing} />}
            {showCaptures && <BarRound id="bar-note" icon="document-text" label="Add to your walk: write a note" onPress={() => setPage((p) => ({ key: (p?.key ?? 0) + 1 }))} disabled={capturing} />}
          </>
        )}
        {/* Stop from the bar itself, held as on the walk screen: a way out even when the walk screen
            can't be reached (the owner, Nov 2). */}
        <HoldButton
          testID="bar-stop"
          label="Hold to stop the walk"
          busyLabel="Stopping…"
          // Its 44 px circle holds the spinner alone; "Stopping…" stays its spoken name (fix walk-strip-buttons audit 6).
          quietWhilePending
          onHold={stop}
          onTap={() => setSaid({ text: 'Hold to stop' })}
          busy={stopping}
          disabled={stopping}
          style={styles.stop}
        >
          <Icon name="stop" size={18} color={theme.ink} />
        </HoldButton>
      </View>
      {editing && (
        <MediaEditor key={editing.piece_id} capture={editing} justKept initialTool="crop" onClose={() => editAfter.close()} onSave={(patch) => cap.setEdit(editing, patch)} />
      )}
      {/* The note's page the walk screen's pencil opens, over this tab; kept, it joins the walk (BC4). Nothing is said
          when it is kept (BC7). */}
      <Modal visible={!!page} animationType="slide" onRequestClose={() => pageRef.current?.requestClose()}>
        {page && <NewNotePage key={page.key} reactable ref={pageRef} cap={cap} into={null} onWalk camera onClose={() => setPage(null)} />}
      </Modal>
    </View>
    </View>
  );
}

/** A round 44 pt button of the bar, ink on white (BC1), or purple for the memo's Save, as on the walk screen (BC2). */
function BarRound(o: { id: string; icon: IconName; label: string; hint?: string; onPress: () => void; spinning?: boolean; disabled?: boolean; voice?: boolean }) {
  return (
    <Pressable
      testID={o.id}
      accessibilityRole="button"
      accessibilityLabel={o.label}
      accessibilityHint={o.hint}
      accessibilityState={{ busy: !!o.spinning, disabled: !!o.disabled }}
      disabled={o.disabled}
      onPress={o.onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.camera, o.voice && styles.voice, pressed && styles.pressed]}
    >
      {o.spinning ? <ActivityIndicator color={o.voice ? '#ffffff' : theme.ink} /> : <Icon name={o.icon} size={22} color={o.voice ? '#ffffff' : theme.ink} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: theme.ink, paddingVertical: 6, paddingLeft: 6, paddingRight: 10, gap: 6 },
  // Four buttons beside the line: 6 between them, as drawn (BC6).
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 640, width: '100%', alignSelf: 'center' },
  saidRow: { maxWidth: 640, width: '100%', alignSelf: 'center', paddingHorizontal: 10, paddingTop: 4 },
  said: { color: '#ffffff', fontSize: 14, fontWeight: '600', lineHeight: 19 },
  pillRow: { flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: theme.bg, paddingVertical: 6, paddingHorizontal: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingLeft: 14, paddingRight: 6 },
  pillText: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  pillBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  pillBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  reminder: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.surface,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  reminderText: { flex: 1, color: theme.ink, fontSize: 15, fontWeight: '600' },
  reminderSee: { color: theme.ink, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 10, borderRadius: 12 },
  // The idle dot's white ring, so the red reads 3:1 on the bar's ink (recording-bar-captures ui 2; X1).
  memoDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.danger, borderWidth: 1.5, borderColor: '#ffffff' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.danger, borderWidth: 1.5, borderColor: '#ffffff' },
  glyph: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  line: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  numbers: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  error: { fontSize: 14 },
  stop: { width: 44, height: 44, minHeight: 44, paddingHorizontal: 0, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  camera: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  voice: { backgroundColor: '#6b21a8' },
  slot: { width: 44, height: 44 },
  pressed: { opacity: 0.8 },
});
