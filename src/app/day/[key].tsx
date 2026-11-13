import { type Faced, facedAll, patchFaced } from '../../lib/moment';
import { notePatch } from '../../lib/noteEdit';
import { router, useLocalSearchParams } from 'expo-router';
import { useWalkBorders } from '../../lib/areas/useOutlineSet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaptureViewer } from '../../components/CaptureView';
import { Stage } from '../../components/ceremony/Stage';
import { StepThrough } from '../../components/ceremony/StepThrough';
import { useAwakeWhile } from '../../components/ceremony/useAwakeWhile';
import { useCeremonyClock } from '../../components/ceremony/useCeremonyClock';
import { useRevealed } from '../../components/ceremony/useRevealed';
import type { StageCtx } from '../../components/ceremony/layout';
import { WalkMap } from '../../components/map/WalkMap';
import { Button, theme } from '../../components/ui';
import { setAudioMode } from '../../lib/audioMode';
import { db } from '../../lib/db';
import { applyPatch, captureBus } from '../../lib/captureBus';
import { ceremonyFor } from '../../lib/ceremony/registry';
import { dayStory, pathDrawnAt, storySteps } from '../../lib/ceremony/story';
import { buildDays, dayCaptures, dayCard, dayFrame, dayStart, dayWithout, nextDayStart, watchedKey, type Day } from '../../lib/days';
import { launchRoute } from '../../lib/launchRoute';
import type { Bounds } from '../../lib/geo';
import { beatWords } from '../../lib/replay';
import { loadReplay, type ReplayData } from '../../lib/summary';
import { useHidden } from '../../lib/deletion/useDeletions';
import { useUnits } from '../../lib/useUnits';
import { UndoToast } from '../../components/UndoToast';
import type { LngLat } from '../../lib/types';

/** The drawn trace is rebuilt at most this often; the walker moves every frame. */
const TRACE_STEP_MS = 66;

export { ScreenError as ErrorBoundary } from '../../components/ScreenError';

interface Loaded {
  day: Day;
  walks: Map<string, ReplayData>;
  distance: Map<string, number>;
  bounds: Bounds | null;
  /** Watched to the end before: the screen reader's steps move on by themselves (RR17). */
  watched: boolean;
}

/**
 * The day's replay (RR16): the day's story, its loose moments and its walks
 * in time order, told by the same ceremony as a walk's replay, ending on a
 * quiet card (M13). With a screen reader, its moments one at a time (RR17).
 */
export default function DayReplay() {
  // `style` names the ceremony that tells it (RR21, audit 25).
  const { key, style } = useLocalSearchParams<{ key: string; style?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [data, setData] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<'loading' | 'missing' | 'ready'>('loading');
  // A load that threw is shown by the screen's error boundary, never as an empty day (NV2).
  const [failure, setFailure] = useState<unknown>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [srMode, setSrMode] = useState(false);
  // The beat and its start time change together, as the walk replay's do.
  const [phase, setPhase] = useState<{ beat: 'loading' | 'path' | 'card'; t0: number }>(() => ({ beat: 'loading', t0: Date.now() }));
  const [fitKey, setFitKey] = useState(0);
  const [sheetH, setSheetH] = useState(0);
  const [rewatched, setRewatched] = useState(false);
  // Reached by Skip: the day was not seen, so it isn't marked watched (audit).
  const [skipped, setSkipped] = useState(false);
  const [viewing, setViewing] = useState<Faced[] | null>(null);
  const hidden = useHidden();

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
        db.momentsBetween(dayStart(key), nextDayStart(key)).then(facedAll),
        db.listSummaries().catch(() => []),
      ]);
      const from = dayStart(key);
      const to = nextDayStart(key);
      const started = walks.filter((w) => w.started_at >= from && w.started_at < to);
      const ofWalks = (await Promise.all(started.map((w) => db.getMoments(w.id).then(facedAll)))).flat();
      const seenIds = new Set(inDay.map((c) => c.id));
      const captures = [...inDay, ...ofWalks.filter((c) => !seenIds.has(c.id))];
      const day = buildDays(started.concat(walks.filter((w) => !started.includes(w))), captures).find((d) => d.key === key) ?? null;
      if (!alive) return;
      if (!day) {
        // Opened on a day with nothing kept (a Home Screen app reopening on a stale link): to Chronicle (NV2, HC5).
        if (launchRoute.isLaunch(`/day/${key}`)) {
          router.dismissTo('/');
          return;
        }
        setStatus('missing');
        return;
      }
      const plays = new Map<string, ReplayData>();
      for (const e of day.entries) {
        if (e.kind !== 'walk') continue;
        const r = await loadReplay(e.walk.id).catch(() => null);
        if (!r) continue;
        plays.set(e.walk.id, r);
      }
      const watched = (await db.getMeta(watchedKey(day.key)).catch(() => null)) != null;
      if (!alive) return;
      setData({
        day,
        walks: plays,
        distance: new Map(summaries.map((s) => [s.walk_id, s.distance_m])),
        // Rides included, as a walk's replay frames them (tend replay 10).
        bounds: dayFrame(dayCaptures(day), [...plays.values()]),
        watched,
      });
      setStatus('ready');
      const sr = Platform.OS !== 'web' && (await AccessibilityInfo.isScreenReaderEnabled().catch(() => false));
      setSrMode(sr);
      setFitKey((k) => k + 1);
      setPhase({ beat: 'path', t0: Date.now() });
    })().catch((e) => alive && setFailure(e ?? new Error('This day could not be opened.')));
    return () => {
      alive = false;
    };
  }, [key]);

  // Escape on the web leaves the day's replay as Done does (tend replay 5), the sibling of Android's Back; not while
  // the viewer holds the key.
  const viewerOpen = viewing != null;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // A held key's repeats are not more presses: the name step's Escape stops at the card (tend replay audit 4).
      if (e.key !== 'Escape' || e.repeat) return;
      if (router.canGoBack()) router.back();
      else router.dismissTo('/');
    };
    // In the capture phase: react-native-web's TextInput stops a key's propagation (the name step's fields).
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [viewerOpen]);

  // What happened that day, less any moment just deleted (D3), read once; the ceremony tells it (RR20, RR21).
  // The story and the card read the same day, less what was deleted (audit 26).
  const day = useMemo(() => (data ? dayWithout(data.day, hidden) : null), [data, hidden]);
  // Town borders (TB5): the towns the day's walks were in tinted.
  const dayWalks = useMemo(() => (data ? [...data.walks.keys()] : []), [data]);
  const borders = useWalkBorders(dayWalks);
  const story = useMemo(() => {
    if (!data || !day) return null;
    const walks = new Map([...data.walks].map(([id, r]) => [id, { ...r, captures: r.captures.filter((c) => !hidden.has(c.id)) }]));
    return dayStory(day, walks);
  }, [data, day, hidden]);
  const showing = useMemo(() => (story ? ceremonyFor(style).show(story, { reduceMotion }) : null), [story, reduceMotion, style]);
  const onCard = phase.beat === 'card';
  const toCard = () => {
    setPhase({ beat: 'card', t0: Date.now() });
    // Reaching the card frames the whole day above it.
    setFitKey((k) => k + 1);
  };
  const telling = phase.beat === 'path' && !srMode && showing != null;
  // A memo or video catching up holds the clock (not the medium itself, audit 20).
  const [waits, setWaits] = useState<ReadonlySet<string>>(() => new Set());
  const wait = useCallback((k: string, on: boolean) => {
    setWaits((w) => {
      if (w.has(k) === on) return w;
      const next = new Set(w);
      if (on) next.add(k);
      else next.delete(k);
      return next;
    });
  }, []);
  const play = useCeremonyClock({ epoch: phase.t0, running: telling, paused: viewing != null || waits.size > 0, showing, onEnd: toCard });
  const frame = telling ? showing.frame(play.ms) : null;
  // The screen stays awake while the replay plays, until the card (RR24).
  useAwakeWhile(phase.beat === 'path');

  // The card: said once as it comes, however it was reached (tend replay 9, Skip included); the day marked watched,
  // unless Skip reached it (M12, audit).
  const saidAt = useRef<number | null>(null);
  useEffect(() => {
    if (!onCard || !data) return;
    const words = beatWords('day-card', phase.t0, saidAt.current, '');
    if (!words) return;
    saidAt.current = phase.t0;
    AccessibilityInfo.announceForAccessibility(words);
    if (!skipped) db.setMeta(watchedKey(data.day.key), String(Date.now())).catch(() => {});
  }, [onCard, data, skipped, phase.t0]);

  // Each walk's trace as far as the ceremony has drawn it; every walk whole on the card.
  const bucket = telling ? Math.floor(play.ms / TRACE_STEP_MS) : -1;
  // The trace is rebuilt on TRACE_STEP_MS buckets, not every frame: from the frame at the bucket's time.
  const traceFrame = useMemo(() => (telling && bucket >= 0 ? showing.frame(bucket * TRACE_STEP_MS) : null), [telling, showing, bucket]);
  const drawn = useMemo(
    () => {
      const trace: LngLat[][] = [];
      const rides: LngLat[][] = [];
      if (!story) return { trace, rides };
      const upTo: Record<string, number> = traceFrame ? traceFrame.drawn : onCard || srMode ? Object.fromEntries(Object.keys(story.paths).map((id) => [id, Infinity])) : {};
      for (const [id, t] of Object.entries(upTo)) {
        const p = story.paths[id];
        if (!p) continue;
        const d = pathDrawnAt(p, t);
        trace.push(...d.trace);
        rides.push(...d.rides);
      }
      return { trace, rides };
    },
    [story, traceFrame, onCard, srMode],
  );

  // Every walk of the day whole: where the end marker sits in every beat, never at the tip being told (tend replay 2).
  const whole = useMemo(() => (story ? Object.values(story.paths).flatMap((p) => pathDrawnAt(p, Infinity).trace) : []), [story]);

  // Pins appear as their moments are reached; on the card every pin opens its moments.
  // The story already leaves out a moment deleted from its viewer (D3).
  const pinned = useRevealed(story, frame ? frame.pins : onCard || srMode ? 'all' : 'none');

  // The camera is the ceremony's to say (audit 10).
  const follow = frame?.camera.center ?? null;
  const followZoom = follow ? frame?.camera.zoom ?? null : null;
  const ctx: StageCtx = {
    width, height, insets, center: follow, zoom: followZoom ?? 0,
    held: play.held, paused: viewing != null, reduceMotion, open: setViewing, wait,
  };
  // The card is computed once it is reached, not every frame (audit).
  const cardAt = onCard ? phase.t0 : 0;
  // In the units setting, redrawn when it changes (tend replay 3).
  const units = useUnits();
  const card = useMemo(() => (data && day && cardAt ? dayCard(day, cardAt, data.distance, units) : null), [data, day, cardAt, units]);
  // Each walk's clock, so a pin of several from one walk says how far in it was (tend map T14).
  const clocks = useMemo(() => (data ? [...data.walks.values()].map((r) => ({ id: r.walk.id, started_at: r.walk.started_at, pauses: r.pauses })) : undefined), [data]);

  if (failure) throw failure;
  if (status !== 'ready' || !data || !story) {
    return (
      <View style={[styles.screen, styles.center, { paddingHorizontal: 24 }]}>
        {status === 'missing' ? (
          <>
            <Text style={styles.missing}>Nothing was kept on this day.</Text>
            <Button label="Back to the map" onPress={() => router.dismissTo('/')} />
          </>
        ) : (
          <Text style={styles.muted}>Opening your day…</Text>
        )}
      </View>
    );
  }

  const close = () => (router.canGoBack() ? router.back() : router.dismissTo('/'));

  return (
    <View style={styles.screen}>
      <WalkMap
        borders={borders}
        trace={drawn.trace}
        rides={drawn.rides}
        walked={[]}
        fog={[]}
        captures={pinned}
        clocks={clocks}
        onPinPress={onCard ? setViewing : undefined}
        walker={frame?.walker ?? null}
        follow={follow}
        followZoom={followZoom}
        fitBounds={data.bounds}
        fitKey={fitKey}
        fitPadding={onCard ? { top: 48 + insets.top, right: 32, bottom: sheetH + 24, left: 32 } : undefined}
        animate={!reduceMotion}
        initialCenter={data.bounds ? [(data.bounds[0] + data.bounds[2]) / 2, (data.bounds[1] + data.bounds[3]) / 2] : undefined}
        initialZoom={data.bounds ? undefined : 2}
        veil
        // The day's walks have ended: the day's first start and its last end are marked (QL2), from the whole traces.
        ended={whole}
        // Above the card once it is up; before that nothing sits at the bottom (Skip is at the top) (QL8).
        scaleInset={onCard ? { bottom: sheetH + 12, left: 12 } : { bottom: insets.bottom + 12, left: 12 }}
      />

      {frame && (
        <>
          {/* A tap anywhere holds the replay, and another goes on (RR7). */}
          <Pressable testID="replay-stage" style={StyleSheet.absoluteFill} onPress={play.toggleHold} accessible={false} />
          <Stage frame={frame} ctx={ctx} />
        </>
      )}
      {phase.beat === 'path' && srMode && (
        <StepThrough
          key={phase.t0}
          steps={storySteps(story)}
          auto={data.watched || rewatched}
          onDone={toCard}
          footer={(c) => (c.lat == null ? 'No location' : null)}
          hint="Shows the next moment of the day"
          testID="day-moment"
          topInset={insets.top}
        />
      )}

      {phase.beat === 'path' && (
        <View style={[styles.skip, { top: insets.top + 12 }]}>
          <Button
            testID="day-skip"
            variant="secondary"
            label="Skip"
            onPress={() => {
              setSkipped(true);
              toCard();
            }}
          />
        </View>
      )}
      {frame && (
        <View style={[styles.hold, { top: insets.top + 12 }]}>
          <Button
            testID="hold"
            variant="secondary"
            label={play.held ? 'Play' : 'Hold'}
            accessibilityHint={play.held ? 'Goes on with the replay' : 'Holds the replay where it is'}
            onPress={play.toggleHold}
          />
        </View>
      )}

      <CaptureViewer
        key={viewing?.[0]?.id ?? 'none'}
        captures={viewing}
        onClose={() => setViewing(null)}
        remind
        onSaveNote={async (c, body, type, only) => {
          // Stored first; the day's moments (Watch again) and any open view of the walk then show it (QL25).
          const change = notePatch(body, type, only);
          await db.updatePiece(c.piece_id, change);
          setData((d) => d && withNote(d, c.id, change, c.piece_id));
          captureBus.patch(c.walk_id, c.id, change, null, c.piece_id);
        }}
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
                  setPhase({ beat: 'path', t0: Date.now() });
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

/** The day with one note's new text, in its loose moments and its walks' captures (QL25). */
function withNote(d: Loaded, id: string, change: ReturnType<typeof notePatch>, pieceId: string): Loaded {
  const entries = d.day.entries.map((e) =>
    e.kind === 'walk'
      ? { ...e, captures: applyPatch(e.captures, id, change, pieceId) }
      : e.capture.id === id ? { ...e, capture: patchFaced(e.capture, change, pieceId) } : e,
  );
  const walks = new Map([...d.walks].map(([wid, r]) => [wid, { ...r, captures: applyPatch(r.captures, id, change, pieceId) }]));
  return { ...d, day: { ...d.day, entries }, walks };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  muted: { color: theme.muted, fontSize: 16 },
  missing: { color: theme.ink, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  skip: { position: 'absolute', right: 12 },
  hold: { position: 'absolute', left: 12 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  sheetContent: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  cardTitle: { fontSize: 22, fontWeight: '700', color: theme.ink },
  // The walk card's line, never louder (tend replay 12; the replay rule's "No accent colour or large number on the card").
  cardLine: { fontSize: 16, color: theme.ink },
  cardMuted: { fontSize: 15, color: theme.muted },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  flex: { flex: 1 },
});
