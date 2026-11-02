import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { db } from '../lib/db';
import { reminderText } from '../lib/discovery/recall';
import { onRecallFired, RECALL_OPEN_KEY } from '../lib/discovery/recallCheck';
import { feedback } from '../lib/motion';
import { perfCount } from '../lib/perfCount';
import { recordingLine } from '../lib/recordingBar';
import type { Capture, Pause, Walk } from '../lib/types';
import type { LiveTrace } from '../lib/useLiveTrace';
import { useCaptures } from '../lib/useCaptures';
import { Icon } from './icons';
import { useOpenWalk } from './OpenWalk';
import { Ticking } from './Ticking';
import { theme } from './ui';

/** How long a word from the bar (a photo kept, a refusal) stands in for its line. */
const SAID_MS = 3000;
/** A reminder fired while minimized stays on the bar this long (as the walk's card, R7). */
const REMINDER_MS = 30_000;

/**
 * The recording bar (NV9): while a walk is open and minimized, just above the
 * tab bar on every tab. Elapsed time and distance (Paused when paused); a tap
 * returns to the walk; no Stop. Its camera keeps a photo or video for the open
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
  const [said, setSaid] = useState<{ text: string; error?: boolean } | null>(null);
  const onError = useCallback((e: { message: string }) => setSaid({ text: e.message, error: true }), []);
  const cap = useCaptures(walk.id, live.here, live.lastFixAt, onError);
  // A photo still being kept: Return waits for it, so the walk screen opens with it (NV9).
  const keeping = useRef<Promise<unknown> | null>(null);
  const returning = useRef(false);
  const [reminder, setReminder] = useState<Capture[] | null>(null);

  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(null), said.error ? SAID_MS * 2 : SAID_MS);
    return () => clearTimeout(t);
  }, [said]);
  // Remind me here goes on while minimized (NV8): a fire with the page in front lands here, where
  // the walk's card would be; a tap opens it on the walk.
  useEffect(
    () =>
      onRecallFired((due) => {
        setReminder((r) => [...(r ?? []), ...due.filter((c) => !r?.some((x) => x.id === c.id))]);
        AccessibilityInfo.announceForAccessibility(due.length > 1 ? `${due.length} memories here` : 'A memory from here');
      }),
    [],
  );
  useEffect(() => {
    if (!reminder) return;
    const t = setTimeout(() => setReminder(null), REMINDER_MS);
    return () => clearTimeout(t);
  }, [reminder]);

  const startedAt = walk.started_at;
  const distanceM = live.distanceM;
  const paused = pauses.some((p) => p.ended_at == null);

  const back = async (open: Capture[] | null) => {
    if (returning.current) return;
    returning.current = true;
    try {
      await keeping.current?.catch(() => {});
      // The walk screen opens what a tapped reminder asks for as it mounts (R4).
      if (open) await db.setMeta(RECALL_OPEN_KEY, JSON.stringify(open.map((c) => c.id))).catch(() => {});
      feedback('tap');
      router.push('/walk');
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
    setSaid({ text: kept.kind === 'photo' ? 'Photo saved to your walk' : 'Video saved to your walk' });
  };

  const line = (now: number) => recordingLine({ startedAt, pauses, now, distanceM });
  return (
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
          <View style={[styles.dot, paused && styles.dotPaused]} />
          {said ? (
            <Text testID="recording-said" style={[styles.text, said.error && styles.error]} numberOfLines={2} accessibilityLiveRegion="polite">
              {said.text}
            </Text>
          ) : (
            <Ticking testID="recording-stats" style={styles.text} numberOfLines={1} text={(now) => line(now).text} label={(now) => line(now).label} />
          )}
          <Icon name="chevron-up" size={20} color="#ffffff" />
        </Pressable>
        <Pressable
          testID="bar-photo"
          accessibilityRole="button"
          accessibilityLabel="Take a photo or video for this walk"
          accessibilityState={{ busy: cap.busy === 'photo', disabled: cap.busy != null }}
          disabled={cap.busy != null}
          onPress={photo}
          hitSlop={4}
          style={({ pressed }) => [styles.camera, pressed && styles.pressed]}
        >
          {cap.busy === 'photo' ? <ActivityIndicator color={theme.ink} /> : <Icon name="camera" size={22} color={theme.ink} />}
        </Pressable>
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
  dotPaused: { backgroundColor: theme.muted },
  text: { flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  error: { fontSize: 14 },
  camera: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
