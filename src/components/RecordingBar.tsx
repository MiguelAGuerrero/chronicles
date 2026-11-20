import type { Faced } from '../lib/moment';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { barCamera } from '../lib/captureBand';
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
import { BAR_WAIT_MS, barGoesBack, barStopping, recordingLine } from '../lib/recordingBar';
import type { Pause, Walk } from '../lib/types';
import type { LiveTrace } from '../lib/useLiveTrace';
import { useCaptures } from '../lib/useCaptures';
import { settleWithin } from '../lib/settleWithin';
import { barReminderUp, barStop, modalsUp, tabsHidden } from '../lib/tabsHidden';
import { showWalk } from '../lib/walkNav';
import { Icon } from './icons';
import { useEditAfterCapture } from './edit/EditOffer';
import { MediaEditor } from './edit/MediaEditor';
import { useOpenWalk } from './OpenWalk';
import { Ticking } from './Ticking';
import { HoldButton, theme } from './ui';

/** The bar's return waits this long at most for its photo to be kept. */
const RETURN_WAIT_MS = BAR_WAIT_MS;

/** How long a word from the bar (a photo kept, a refusal) stands in for its line. */
const SAID_MS = 3000;

/**
 * The recording bar (NV9): while a walk is open and minimized, just above the
 * tab bar on every tab. Elapsed time and distance (Paused when paused); a tap
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
  // On Memories the band's camera files into the walk: the bar shows none there (decision 0112).
  const path = usePathname();
  const section = useStore(chronicleSection.store, (x) => x);
  const showCamera = barCamera(path, section);
  // Once its photo or video is kept, the editor opens by itself (ME23 as decision 0240 amends it; it was 0149's pill).
  const editAfter = useEditAfterCapture(cap.captures);
  const editing = editAfter.editing;
  // Held to stop, the walk is going. Shared, not this bar's own: the bar unmounts as its tab loses focus while the stop
  // goes on (tend tabs audit 26).
  const stopping = useStore(barStop, (s) => s?.walkId === walk.id);
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
  const paused = pauses.some((p) => p.ended_at == null);

  // Asked now, of the stop under way from any bar of the walk, within its bound (tend tabs 12, audits 26, 28).
  const goesBack = (returningNow: boolean) => barGoesBack({ returning: returningNow, stop: barStop.get(), walkId: walk.id, now: Date.now() });
  const back = async (open: Faced[] | null) => {
    if (!goesBack(returning.current)) return;
    returning.current = true;
    try {
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
    // Not while the walk is stopping from the bar, nor while the bar goes back to the walk: the replay or the walk screen
    // would take the editor with the bar (tend tabs audit 19; fix edit-after-capture audit 3).
    if (!returning.current && !barStopping(barStop.get(), walk.id, Date.now())) editAfter.open(kept);
  };

  const stop = async () => {
    if (barStopping(barStop.get(), walk.id, Date.now())) return;
    const mine = { walkId: walk.id, since: Date.now() };
    barStop.set(mine);
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
    } finally {
      barStop.set((s) => (s === mine ? null : s));
    }
  };

  const line = (now: number) => recordingLine({ startedAt, pauses, now, distanceM });
  return (
    <View>
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
      <View style={styles.row}>
        <Pressable
          testID="recording-return"
          accessibilityRole="button"
          accessibilityHint="Returns to the walk"
          onPress={() => back(null)}
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        >
          {/* Paused is a glyph, not only a grey dot (tabs audit U10). */}
          {paused ? (
            <View testID="recording-paused" style={styles.glyph}>
              <Icon name="pause" size={16} color="#ffffff" />
            </View>
          ) : (
            <View style={styles.dot} />
          )}
          {said ? (
            // A failure's or a refusal's words are whole at 320 px, unclamped, beside the camera too: the room line names
            // where its Retry is (unsaved captures UN10), the saving line what to do (tend tabs audit 46).
            <Text testID="recording-said" style={[styles.text, said.error && styles.error]} numberOfLines={said.error ? undefined : 2} accessibilityLiveRegion="polite">
              {said.text}
            </Text>
          ) : (
            <Ticking testID="recording-stats" style={styles.text} numberOfLines={1} text={(now) => line(now).text} label={(now) => line(now).label} />
          )}
          {/* Back into the walk, not "expand" (tabs audit U10): the label stays "Return to the walk". */}
          <View testID="recording-go" style={styles.glyph}>
            <Icon name="chevron-forward" size={20} color="#ffffff" />
          </View>
        </Pressable>
        {(showCamera || cap.busy === 'photo') && <Pressable
          testID="bar-photo"
          accessibilityRole="button"
          // Named as Memories' band names its camera with a walk open: the same job, the same name (tend tabs 3).
          accessibilityLabel="Add to your walk: take a photo or video"
          accessibilityState={{ busy: cap.busy === 'photo', disabled: cap.busy != null }}
          disabled={cap.busy != null}
          onPress={photo}
          hitSlop={4}
          style={({ pressed }) => [styles.camera, pressed && styles.pressed]}
        >
          {cap.busy === 'photo' ? <ActivityIndicator color={theme.ink} /> : <Icon name="camera" size={22} color={theme.ink} />}
        </Pressable>}
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
        <MediaEditor key={editing.id} capture={editing} justKept initialTool="crop" onClose={() => editAfter.close()} onSave={(patch) => cap.setEdit(editing, patch)} />
      )}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: theme.ink, paddingVertical: 6, paddingLeft: 6, paddingRight: 10, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  reminder: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.surface,
    maxWidth: 640, width: '100%', alignSelf: 'center',
  },
  reminderText: { flex: 1, color: theme.ink, fontSize: 15, fontWeight: '600' },
  reminderSee: { color: theme.ink, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 10, borderRadius: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.danger, borderWidth: 1.5, borderColor: '#ffffff' },
  glyph: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  error: { fontSize: 14 },
  stop: { width: 44, height: 44, minHeight: 44, paddingHorizontal: 0, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  camera: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
