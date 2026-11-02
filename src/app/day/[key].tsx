import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaptureContent, CaptureViewer } from '../../components/CaptureView';
import { KIND_LABEL } from '../../components/icons';
import { WalkMap } from '../../components/map/WalkMap';
import { Button, theme } from '../../components/ui';
import { setAudioMode } from '../../lib/audioMode';
import { db } from '../../lib/db';
import { buildDays, dayCaptures, dayCard, dayPlan, dayStart, nextDayStart, stepFrames, watchedKey, type Day, type DayStep } from '../../lib/days';
import { focusOn } from '../../lib/focus';
import { boundsOf, type Bounds } from '../../lib/geo';
import { schedule, timedRuns, traceUntil, walkerAt, walkTimeAt, type Schedule, type TimedRun } from '../../lib/replay';
import { loadReplay } from '../../lib/summary';
import { useVisible } from '../../lib/deletion/useDeletions';
import { UndoToast } from '../../components/UndoToast';
import type { Capture, LngLat } from '../../lib/types';

const FRAME_MS = 33;
/** Taps this soon after a moment appears are ignored, so a double tap skips nothing. */
const TAP_GUARD_MS = 600;
/** On a re-watch, how long a photo or note stays up before moving on (M12). */
const AUTO_MS = 4000;
const TRACE_STEP_MS = 100;

export { ScreenError as ErrorBoundary } from '../../components/ScreenError';

interface WalkPlay {
  sched: Schedule;
  runs: TimedRun[];
  full: LngLat[][];
  start: LngLat | null;
}

interface Loaded {
  day: Day;
  walks: Map<string, WalkPlay>;
  distance: Map<string, number>;
  bounds: Bounds | null;
  /** Watched to the end before: the stops move on by themselves (M12). */
  watched: boolean;
}

/**
 * The day's replay (M10-M15): the map moves from moment to moment in time
 * order, and a walk inside the day plays its path and its moments, without
 * its fog beat, before the day carries on. It ends on a quiet card. The first
 * watch waits at each moment; a later one moves on by itself.
 */
export default function DayReplay() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<'loading' | 'missing' | 'ready'>('loading');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [srMode, setSrMode] = useState(false);
  // The step and its start time change together, as the walk replay's beat does.
  const [phase, setPhase] = useState<{ i: number; t0: number; item: number }>(() => ({ i: -1, t0: Date.now(), item: 0 }));
  const [now, setNow] = useState(() => Date.now());
  const [fitKey, setFitKey] = useState(0);
  const [sheetH, setSheetH] = useState(0);
  const [rewatched, setRewatched] = useState(false);
  // Reached by Skip: the day was not seen, so it isn't marked watched (audit).
  const [skipped, setSkipped] = useState(false);
  const [viewing, setViewing] = useState<Capture[] | null>(null);
  const continueRef = useRef<ComponentRef<typeof Pressable>>(null);

  useEffect(() => {
    setAudioMode({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const a = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => a.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Only this day's captures, plus every capture of the walks it started (some may be past midnight).
      const [walks, inDay, summaries] = await Promise.all([
        db.listWalks(),
        db.capturesBetween(dayStart(key), nextDayStart(key)),
        db.listSummaries().catch(() => []),
      ]);
      const from = dayStart(key);
      const to = nextDayStart(key);
      const started = walks.filter((w) => w.started_at >= from && w.started_at < to);
      const ofWalks = (await Promise.all(started.map((w) => db.getCaptures(w.id)))).flat();
      const seenIds = new Set(inDay.map((c) => c.id));
      const captures = [...inDay, ...ofWalks.filter((c) => !seenIds.has(c.id))];
      const day = buildDays(started.concat(walks.filter((w) => !started.includes(w))), captures).find((d) => d.key === key) ?? null;
      if (!alive) return;
      if (!day) {
        setStatus('missing');
        return;
      }
      const plays = new Map<string, WalkPlay>();
      for (const e of day.entries) {
        if (e.kind !== 'walk') continue;
        const r = await loadReplay(e.walk.id).catch(() => null);
        if (!r) continue;
        plays.set(e.walk.id, {
          sched: schedule(r.fixes, r.captures, r.walk.started_at, r.pauses),
          runs: timedRuns(r.fixes, r.pauses),
          full: r.runs,
          start: r.fixes[0] ? [r.fixes[0].lon, r.fixes[0].lat] : null,
        });
      }
      const points: LngLat[] = [
        ...dayCaptures(day).filter((c) => c.lat != null && c.lon != null).map((c) => [c.lon!, c.lat!] as LngLat),
        ...[...plays.values()].flatMap((p) => p.full.flat()),
      ];
      const watched = (await db.getMeta(watchedKey(day.key)).catch(() => null)) != null;
      if (!alive) return;
      setData({
        day,
        walks: plays,
        distance: new Map(summaries.map((s) => [s.walk_id, s.distance_m])),
        bounds: boundsOf(points, 150),
        watched,
      });
      setStatus('ready');
      const sr = Platform.OS !== 'web' && (await AccessibilityInfo.isScreenReaderEnabled().catch(() => false));
      setSrMode(sr);
      setFitKey((k) => k + 1);
      const t = Date.now();
      setPhase({ i: 0, t0: t, item: 0 });
      setNow(t);
    })().catch(() => alive && setStatus('missing'));
    return () => {
      alive = false;
    };
  }, [key]);

  // With a screen reader, the moments one after another, then the card: no flying, no path.
  const plan = useMemo<DayStep[]>(() => {
    if (!data) return [];
    const p = dayPlan(data.day, new Map([...data.walks].map(([id, w]) => [id, { sched: w.sched, start: w.start }])));
    return srMode ? p.filter((s) => s.kind === 'stop') : p;
  }, [data, srMode]);
  const frames = useMemo(
    () => (data ? stepFrames(plan, new Map([...data.walks].map(([id, w]) => [id, w.full.flat()]))) : []),
    [data, plan],
  );
  const onCard = data != null && phase.i >= plan.length;
  const step = !onCard && phase.i >= 0 ? plan[phase.i] : null;
  const auto = !!data?.watched || rewatched;

  const planLen = useRef(0);
  useEffect(() => {
    planLen.current = plan.length;
  }, [plan]);
  const next = useCallback((from: number) => {
    const t = Date.now();
    setPhase({ i: from + 1, t0: t, item: 0 });
    setNow(t);
    // Reaching the card frames the whole day above it.
    if (from + 1 >= planLen.current) setFitKey((k) => k + 1);
  }, []);

  // Fly and path steps run on the clock; a stop stands still until Continue.
  useEffect(() => {
    if (!step || step.kind === 'stop') return;
    const timer = setInterval(() => {
      const t = Date.now();
      const elapsed = t - phase.t0;
      const len = step.kind === 'fly' ? (reduceMotion ? 0 : step.ms) : step.toMs - step.fromMs;
      if (elapsed >= len) next(phase.i);
      else setNow(t);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [step, phase.t0, phase.i, next, reduceMotion]);

  // The card: framed above the sheet, and the day marked watched (M12).
  useEffect(() => {
    if (!onCard || !data || skipped) return;
    db.setMeta(watchedKey(data.day.key), String(Date.now())).catch(() => {});
    AccessibilityInfo.announceForAccessibility('Summary of the day');
  }, [onCard, data, skipped]);

  const stopCapture = step?.kind === 'stop' ? step.captures[phase.item] ?? null : null;
  const advance = (fromAuto = false) => {
    if (!step || step.kind !== 'stop') return;
    const t = Date.now();
    if (!fromAuto && t - phase.t0 < TAP_GUARD_MS) return;
    if (phase.item < step.captures.length - 1) {
      setPhase({ i: phase.i, t0: t, item: phase.item + 1 });
      return;
    }
    next(phase.i);
  };
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });
  const stopKey = stopCapture ? `${phase.i}:${phase.item}` : null;
  // A re-watch moves on by itself: a photo or note after AUTO_MS, a memo or video when it ends (M12).
  useEffect(() => {
    if (!auto || !stopCapture) return;
    const media = stopCapture.kind === 'voice' || stopCapture.kind === 'video';
    const ms = media ? (Number(stopCapture.body) || 0) + 2500 : AUTO_MS;
    const timer = setTimeout(() => advanceRef.current(true), ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, stopKey]);
  useEffect(() => {
    if (!stopKey) return;
    const t = setTimeout(() => focusOn(continueRef), 250);
    return () => clearTimeout(t);
  }, [stopKey]);
  useEffect(() => {
    if (!stopCapture) return;
    const c = stopCapture;
    const what = c.kind === 'text' ? `Note: ${c.body ?? ''}` : KIND_LABEL[c.kind];
    AccessibilityInfo.announceForAccessibility(`${what}. ${auto ? '' : 'Continue when ready.'}`);
  }, [stopCapture, auto]);

  // Which walk is playing, and how far along its path.
  const clock = now - phase.t0;
  const pathWalk = step?.kind === 'path' ? data?.walks.get(step.walkId) ?? null : null;
  const pathMs = step?.kind === 'path' ? Math.min(step.toMs, step.fromMs + clock) : 0;
  const walkT = pathWalk ? walkTimeAt(pathWalk.sched, pathMs) : 0;
  const bucket = step?.kind === 'path' ? Math.floor(pathMs / TRACE_STEP_MS) : -1;

  // Walks already played are drawn whole; the playing one up to now; later ones not yet.
  const played = useMemo(() => {
    const done = new Set<string>();
    const current = step?.kind === 'path' || step?.kind === 'stop' ? (step as { walkId: string | null }).walkId : null;
    const until = onCard ? plan.length : Math.max(0, phase.i);
    for (let i = 0; i < until; i++) {
      const s = plan[i];
      if (s.kind === 'path' && s.walkId !== current) done.add(s.walkId);
    }
    return done;
  }, [plan, phase.i, onCard, step]);
  const trace = useMemo(() => {
    if (!data) return [];
    const out: LngLat[][] = [];
    for (const [id, w] of data.walks) {
      if (onCard || played.has(id)) out.push(...w.full);
    }
    if (pathWalk) out.push(...traceUntil(pathWalk.runs, pathWalk.full, walkT));
    else if (step?.kind === 'stop' && step.walkId && !played.has(step.walkId)) {
      // Stopped mid-walk: the path so far stays drawn.
      const w = data.walks.get(step.walkId);
      const before = plan.slice(0, phase.i).reverse().find((s) => s.kind === 'path' && s.walkId === step.walkId);
      if (w && before?.kind === 'path') out.push(...traceUntil(w.runs, w.full, walkTimeAt(w.sched, before.toMs)));
    }
    return out;
    // Rebuilt on TRACE_STEP_MS buckets, not every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, played, onCard, phase.i, bucket, step]);
  const walker = pathWalk ? walkerAt(pathWalk.runs, walkT) : null;

  // Pins appear as their moments are reached; on the card every pin opens its moments.
  const pinnedAll = useMemo(() => {
    if (!data) return [];
    if (onCard) return dayCaptures(data.day);
    const shown: Capture[] = [];
    for (let i = 0; i <= phase.i && i < plan.length; i++) {
      const s = plan[i];
      if (s.kind === 'stop') shown.push(...(i < phase.i ? s.captures : s.captures.slice(0, phase.item + 1)));
    }
    return shown;
  }, [data, plan, phase.i, phase.item, onCard]);
  // A moment deleted from its viewer leaves its pin (D3).
  const pinned = useVisible(pinnedAll);

  // A fly step is a fit to its frame; the path follows the walker at that zoom.
  const follow = reduceMotion ? null : walker;
  let flyIdx = -1;
  for (let i = Math.min(phase.i, plan.length - 1); i >= 0; i--) {
    if (plan[i].kind === 'fly') {
      flyIdx = i;
      break;
    }
  }
  const frame = onCard || flyIdx < 0 ? data?.bounds ?? null : frames[flyIdx] ?? data?.bounds ?? null;
  // The card is computed once it is reached, not every frame (audit).
  const cardAt = onCard ? phase.t0 : 0;
  const card = useMemo(() => (data && cardAt ? dayCard(data.day, cardAt, data.distance) : null), [data, cardAt]);

  if (status !== 'ready' || !data) {
    return (
      <View style={[styles.screen, styles.center, { paddingHorizontal: 24 }]}>
        {status === 'missing' ? (
          <>
            <Text style={styles.missing}>Nothing was kept on this day.</Text>
            <Button label="Back to the map" onPress={() => router.dismissTo('/chronicle')} />
          </>
        ) : (
          <Text style={styles.muted}>Opening your day…</Text>
        )}
      </View>
    );
  }

  const close = () => (router.canGoBack() ? router.back() : router.dismissTo('/chronicle'));

  return (
    <View style={styles.screen}>
      <WalkMap
        trace={trace}
        walked={[]}
        fog={[]}
        captures={pinned}
        onPinPress={onCard ? setViewing : undefined}
        walker={walker}
        follow={follow}
        fitBounds={frame}
        fitKey={fitKey * 1000 + flyIdx + 1}
        fitPadding={onCard ? { top: 48 + insets.top, right: 32, bottom: sheetH + 24, left: 32 } : undefined}
        animate={!reduceMotion}
        initialCenter={data.bounds ? [(data.bounds[0] + data.bounds[2]) / 2, (data.bounds[1] + data.bounds[3]) / 2] : undefined}
        initialZoom={data.bounds ? undefined : 2}
        veil
      />

      {stopCapture && step?.kind === 'stop' && (
        <View style={styles.moment}>
          {stopCapture.kind !== 'voice' && stopCapture.kind !== 'video' && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => advance()} accessible={false} />
          )}
          <CaptureContent
            key={stopCapture.id}
            ref={continueRef}
            capture={stopCapture}
            autoPlay
            topInset={insets.top}
            onVoiceFinished={auto ? () => advance(true) : undefined}
            footer={[
              stopCapture.lat == null ? 'No location' : null,
              step.captures.length > 1 ? `${phase.item + 1} of ${step.captures.length}` : null,
            ].filter(Boolean).join(' · ') || undefined}
            action={{ label: 'Continue', hint: 'Shows the next moment of the day', onPress: () => advance(), testID: 'day-moment' }}
          />
        </View>
      )}

      {!onCard && (
        <View style={[styles.skip, { top: insets.top + 12 }]}>
          <Button
            testID="day-skip"
            variant="secondary"
            label="Skip"
            onPress={() => {
              setSkipped(true);
              next(plan.length - 1);
            }}
          />
        </View>
      )}

      <CaptureViewer
        key={viewing?.[0]?.id ?? 'none'}
        captures={viewing}
        onClose={() => setViewing(null)}
        remind
      />

      {onCard && card && (
        // Quiet (M13): the day, its moments and places, and any distance walked. No streaks or badges.
        <View
          testID="day-card"
          style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (Math.abs(h - sheetH) > 8) {
              setSheetH(h);
              setFitKey((k) => k + 1);
            }
          }}
        >
          <View style={styles.sheetContent}>
            <Text style={styles.cardTitle} accessibilityRole="header">{card.title}</Text>
            <Text testID="day-card-line" style={styles.cardLine}>{card.line}</Text>
            {card.walked ? <Text style={styles.cardMuted}>{card.walked}</Text> : null}
            <Text style={styles.cardMuted}>Tap a pin to open it</Text>
            <View style={styles.row}>
              <Button
                testID="day-again"
                variant="secondary"
                style={styles.flex}
                label="Watch again"
                onPress={() => {
                  setRewatched(true);
                  setSkipped(false);
                  setFitKey((k) => k + 1);
                  const t = Date.now();
                  setPhase({ i: 0, t0: t, item: 0 });
                  setNow(t);
                }}
              />
              <Button testID="day-done" style={styles.flex} label="Done" onPress={close} />
            </View>
          </View>
        </View>
      )}
      <UndoToast style={{ top: insets.top + 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  muted: { color: theme.muted, fontSize: 16 },
  missing: { color: theme.ink, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  skip: { position: 'absolute', right: 12 },
  moment: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,24,32,0.85)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  sheetContent: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  cardTitle: { fontSize: 22, fontWeight: '700', color: theme.ink },
  cardLine: { fontSize: 18, color: theme.ink, fontWeight: '600' },
  cardMuted: { fontSize: 15, color: theme.muted },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  flex: { flex: 1 },
});
