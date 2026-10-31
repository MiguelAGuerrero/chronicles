import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalkMap } from '../../components/map/WalkMap';
import { Icon, KIND_LABEL } from '../../components/icons';
import { exportWalk } from '../../lib/export';
import { CaptureContent, CaptureViewer } from '../../components/CaptureView';
import { planViews, type WalkMapHandle } from '../../components/map/types';
import { Button, theme } from '../../components/ui';
import { db } from '../../lib/db';
import { snapWalk } from '../../lib/finish';
import { ensureTileBuild } from '../../lib/tiles';
import { focusOn } from '../../lib/focus';
import { setAudioModeAsync } from 'expo-audio';
import { FOG_MS, nextStop, PATH_MS, schedule, timedRuns, traceUntil, walkerAt, walkTimeAt } from '../../lib/replay';
import { formatCaptures, formatDistance, formatDuration, loadReplay, suggestTitle, type ReplayData } from '../../lib/summary';
import type { Capture, LngLat } from '../../lib/types';
import { pausedMs } from '../../lib/geo';
import { capturesHere, type HereResult } from '../../lib/here';

type Beat = 'reading' | 'fog' | 'path' | 'card' | 'name';
const FRAME_MS = 66; // ~15 fps keeps the map responsive on a phone
/** Taps this soon after a capture appears are ignored, so a double tap skips nothing. */
const TAP_GUARD_MS = 600;
/** On a re-watch, how long a photo or note stays up before moving on. */
const AUTO_MS = 4000;
const BACKUP_BUSY = 'Preparing…';
/** The drawn trace is rebuilt at most this often; the walker dot moves every frame. */
const TRACE_STEP_MS = 200;

export default function Replay() {
  const { id, ceremony } = useLocalSearchParams<{ id: string; ceremony?: string }>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<WalkMapHandle>(null);
  const [data, setData] = useState<ReplayData | null>(null);
  const [status, setStatus] = useState<'loading' | 'missing' | 'ready'>('loading');
  // The beat and its start time change together, so no render ever sees one
  // beat with another beat's clock.
  const [phase, setPhase] = useState<{ beat: Beat; t0: number }>(() => ({ beat: 'reading', t0: Date.now() }));
  const [now, setNow] = useState(() => Date.now());
  const [fitKey, setFitKey] = useState(0);
  const [sheetH, setSheetH] = useState(0);
  const [title, setTitle] = useState('');
  const [epilogue, setEpilogue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  // At a capture the path waits for a tap: which group, which capture in it,
  // and the path time it stopped at. `shown` counts groups already visited.
  const [stop, setStop] = useState<{ group: number; item: number; atMs: number; shownAt: number } | null>(null);
  const shown = useRef(0);
  const [viewing, setViewing] = useState<Capture[] | null>(null);
  // What happened here: a tap on the card's map shows every capture near that spot, on any walk.
  const [here, setHere] = useState<HereResult | null>(null);
  const [backup, setBackup] = useState<string | null>(null);
  // A result shows for a few seconds, then the link reads as before.
  useEffect(() => {
    if (!backup || backup === BACKUP_BUSY) return;
    const t = setTimeout(() => setBackup(null), 4000);
    return () => clearTimeout(t);
  }, [backup]);
  const hereTaps = useRef(0);
  const [hereKey, setHereKey] = useState(0);
  const showHere = (at: LngLat, radiusM?: number) => {
    if (here || viewing) return;
    const tap = ++hereTaps.current;
    capturesHere(at, [], radiusM)
      .then((r) => {
        if (tap !== hereTaps.current || !r.captures.length) return;
        setHereKey(tap);
        setHere(r);
      })
      .catch(() => {});
  };
  // Opened from the log, or watched again: the stops move on by themselves.
  const rewatch = ceremony === '0';
  const [watched, setWatched] = useState(false);
  const auto = rewatch || watched;
  // A screen reader hears the captures, not the animation: no fog, no path.
  const [srMode, setSrMode] = useState(false);
  const continueRef = useRef<ComponentRef<typeof Pressable>>(null);
  const beat = phase.beat;
  const clock = now - phase.t0;

  const go = useCallback((b: Beat, skipPathMs = 0) => {
    const t = Date.now();
    setPhase({ beat: b, t0: t - skipPathMs });
    setNow(t);
    setStop(null);
    if (b === 'fog' || b === 'path') shown.current = 0;
    if (b === 'fog' || b === 'card') setFitKey((k) => k + 1);
  }, []);

  // Memos and videos play with the ringer switch off, as the voice is the point.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const a = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => a.remove();
  }, []);

  // Load, then snap behind the first beat if the walk has not been snapped
  // against the current tile build. The map is covered while its camera
  // steps through the area.
  useEffect(() => {
    let alive = true;
    (async () => {
      // A new tile build drops the street cache and marks walks for re-snapping.
      const build = await ensureTileBuild().catch(() => 'unknown');
      let d = await loadReplay(id).catch(() => null);
      if (!alive) return;
      if (!d) {
        setStatus('missing');
        return;
      }
      setData(d);
      setTitle(d.walk.title ?? suggestTitle(d.walk));
      setEpilogue(d.walk.epilogue ?? '');
      setStatus('ready');
      const stale = build !== 'unknown' && d.walk.snapped_build !== build;
      if (!d.summary || !d.walk.snapped_build || stale) {
        await snapWalk(d.walk, {
          plan: (bounds, trace) => {
            const { width, height } = mapRef.current?.size() ?? { width: 0, height: 0 };
            return planViews(bounds, width, height, trace);
          },
          collect: (centers) => mapRef.current!.collect(centers),
        }).catch(() => null);
        d = (await loadReplay(id).catch(() => null)) ?? d;
        if (!alive) return;
        setData(d);
        setTitle(d.walk.title ?? suggestTitle(d.walk));
      }
      // With a screen reader the animation says nothing: it goes straight to
      // the captures, one after another, then the card. (react-native-web
      // always answers yes, so the web keeps the animation and announces.)
      const sr = Platform.OS !== 'web' && (await AccessibilityInfo.isScreenReaderEnabled().catch(() => false));
      if (sr) {
        setSrMode(true);
        go('path', PATH_MS);
      } else go('fog');
    })();
    return () => {
      alive = false;
    };
  }, [id, go]);


  const sched = useMemo(() => (data ? schedule(data.fixes, data.captures, data.walk.started_at, data.pauses) : null), [data]);
  const runs = useMemo(() => (data ? timedRuns(data.fixes, data.pauses) : []), [data]);
  // One clock drives beats one to three. It stands still while a capture is
  // up, and moves on when a beat is over.
  useEffect(() => {
    if ((beat !== 'fog' && beat !== 'path') || stop) return;
    const timer = setInterval(() => {
      const t = Date.now();
      const elapsed = t - phase.t0;
      if (beat === 'fog') {
        if (elapsed >= FOG_MS) go('path');
        else setNow(t);
        return;
      }
      if (!sched) return;
      const g = nextStop(sched, elapsed, shown.current);
      if (g != null) {
        shown.current = g + 1;
        setStop({ group: g, item: 0, atMs: sched.groups[g].atMs, shownAt: t });
      } else if (elapsed >= sched.movingMs && shown.current >= sched.groups.length) go('card');
      else setNow(t);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [beat, phase.t0, sched, go, stop]);

  const stopGroup = stop && sched ? sched.groups[stop.group] : null;
  const stopCapture = stopGroup ? stopGroup.captures[stop!.item] : null;
  /**
   * Next capture in this stop, or back to the path where it stopped. Taps in
   * the first TAP_GUARD_MS after a capture appears are ignored, so a double
   * tap (a reflex on photos) never skips one unseen.
   */
  const advance = (fromAuto = false) => {
    if (!stop || !stopGroup) return;
    const t = Date.now();
    if (!fromAuto && t - stop.shownAt < TAP_GUARD_MS) return;
    if (stop.item < stopGroup.captures.length - 1) {
      setStop({ ...stop, item: stop.item + 1, shownAt: t });
      return;
    }
    setPhase({ beat: 'path', t0: t - stop.atMs });
    setNow(t);
    setStop(null);
  };

  // On a re-watch, a photo or note moves on after AUTO_MS, and a memo or
  // video when it ends (or a little after its length, if no end comes).
  const stopKey = stop ? `${stop.group}:${stop.item}` : null;
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });
  useEffect(() => {
    if (!auto || !stopCapture) return;
    const media = stopCapture.kind === 'voice' || stopCapture.kind === 'video';
    const ms = media ? (Number(stopCapture.body) || 0) + 2500 : AUTO_MS;
    const timer = setTimeout(() => advanceRef.current(true), ms);
    return () => clearTimeout(timer);
    // Once per capture shown; stopCapture changes with stopKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, stopKey]);

  // Focus moves to Continue when a capture comes up, so keyboard and screen
  // reader users land on the way forward.
  useEffect(() => {
    if (!stopKey) return;
    const t = setTimeout(() => {
      focusOn(continueRef);
    }, 250);
    return () => clearTimeout(t);
  }, [stopKey]);

  // Words for screen readers at each beat and each capture.
  useEffect(() => {
    if (!data) return;
    const s = data.summary;
    if (beat === 'reading') AccessibilityInfo.announceForAccessibility('Reading the streets you walked');
    if (beat === 'fog') AccessibilityInfo.announceForAccessibility(headline(s, data).spoken);
    if (beat === 'card') AccessibilityInfo.announceForAccessibility('Summary');
  }, [beat, data]);
  useEffect(() => {
    if (!stopCapture) return;
    const c = stopCapture;
    const what = c.kind === 'text' ? `Note: ${c.body ?? ''}` : `${KIND_LABEL[c.kind]}, ${timeOf(c)}`;
    AccessibilityInfo.announceForAccessibility(`${what}. ${auto ? '' : 'Continue when ready.'}`);
  }, [stopCapture, auto]);

  const pathMs = stop ? stop.atMs : clock;
  const walkT = !sched ? 0
    : beat === 'path' ? walkTimeAt(sched, pathMs)
    : beat === 'card' || beat === 'name' ? sched.toWalk(sched.end)
    : sched.toWalk(sched.start);
  const traceBucket = beat === 'path' ? Math.floor(pathMs / TRACE_STEP_MS) : -1;
  const trace = useMemo(
    () => {
      if (!data) return [];
      if (beat === 'reading' || beat === 'fog') return data.runs; // shown faintly
      if (beat === 'card' || beat === 'name') return data.runs;
      return traceUntil(runs, data.runs, walkT);
    },
    // Rebuilt on TRACE_STEP_MS buckets, not every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, beat, runs, traceBucket],
  );
  const walker = beat === 'path' ? walkerAt(runs, walkT) : null;

  // Beat one: the walked streets light up out of the grey, in the order walked.
  const lit = !data ? 0 : beat !== 'fog' || reduceMotion ? data.walked.length : Math.ceil(data.walked.length * Math.min(1, clock / (FOG_MS * 0.8)));
  const shownWalked = useMemo(() => (data ? (beat === 'reading' ? [] : data.walked.slice(0, lit)) : []), [data, beat, lit]);
  const fog = useMemo(() => {
    if (!data) return [];
    if (beat !== 'fog' && beat !== 'reading') return data.fog;
    return [...data.fog, ...data.walked.slice(lit)];
  }, [data, beat, lit]);

  // Captures are pinned where they were taken as the path reaches them; on
  // the card every pin opens its captures.
  const passedCount = data ? data.captures.filter((c) => beat === 'card' || beat === 'name' || (beat === 'path' && c.t <= walkT)).length : 0;
  const pinned = useMemo(
    () => (data?.captures ?? []).slice().sort((a, b) => a.t - b.t).slice(0, passedCount),
    [data, passedCount],
  );

  if (status !== 'ready' || !data || !sched) {
    return (
      <View style={[styles.screen, styles.center, { paddingHorizontal: 24 }]}>
        {status === 'missing' ? (
          <>
            <Text style={styles.missing}>This walk could not be found.</Text>
            <Button label="Back to walks" onPress={() => router.dismissTo('/')} />
          </>
        ) : (
          <Text style={styles.muted}>Opening your walk…</Text>
        )}
      </View>
    );
  }

  const s = data.summary;
  const head = headline(s, data);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await db.updateWalk(data.walk.id, { title: title.trim() || suggestTitle(data.walk), epilogue: epilogue.trim() || null });
      router.dismissTo('/');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };
  const close = () => (router.canGoBack() ? router.back() : router.dismissTo('/'));
  const sheetPad = { top: 48 + insets.top, right: 32, bottom: sheetH + 24, left: 32 };

  return (
    <View style={styles.screen}>
      <WalkMap
        ref={mapRef}
        trace={trace}
        traceOpacity={beat === 'fog' || beat === 'reading' ? 0.3 : 1}
        walked={shownWalked}
        fog={fog}
        captures={pinned}
        onPinPress={beat === 'card' || beat === 'name' ? setViewing : undefined}
        onPress={beat === 'card' || beat === 'name' ? showHere : undefined}
        walker={walker}
        follow={beat === 'path' && !reduceMotion ? walker : null}
        fitBounds={data.bounds}
        fitKey={fitKey}
        fitPadding={beat === 'card' || beat === 'name' ? sheetPad : undefined}
        animate={!reduceMotion}
        initialCenter={data.fixes[0] ? [data.fixes[0].lon, data.fixes[0].lat] : undefined}
        covered={beat === 'reading'}
        veil
      />

      {beat === 'reading' && (
        <View style={[styles.center, StyleSheet.absoluteFill]} pointerEvents="none">
          <View style={styles.headline}>
            <Text style={styles.reading}>Reading the streets you walked…</Text>
          </View>
        </View>
      )}

      {beat === 'fog' && (
        <View style={[styles.headline, { top: insets.top + 24 }]} pointerEvents="none">
          <Text style={styles.headlineNumber}>{head.big}</Text>
          <Text style={styles.headlineLabel}>{head.small}</Text>
          {head.note ? <Text style={styles.headlineNote}>{head.note}</Text> : null}
        </View>
      )}

      {stopCapture && stopGroup && (
        // A capture stays up, and a memo or video plays to its end, until
        // Continue (or, on a re-watch, until it moves on by itself). A photo
        // or note also moves on with a tap anywhere on it.
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
            footer={stopGroup.captures.length > 1 ? `${stop!.item + 1} of ${stopGroup.captures.length}` : undefined}
            action={{ label: 'Continue', hint: 'Shows the next capture, or carries on along the walk', onPress: () => advance(), testID: 'moment' }}
          />
        </View>
      )}

      <CaptureViewer
        key={viewing?.[0]?.id ?? 'none'}
        captures={viewing && viewing.map((v) => data.captures.find((c) => c.id === v.id) ?? v)}
        onClose={() => setViewing(null)}
        onSaveCaption={async (c, caption, y) => {
          // A failed write throws to the viewer, which says so; the screen only changes once it is stored.
          await db.updateCapture(c.id, { caption, caption_y: caption ? y : null });
          setData((d) => d && { ...d, captures: d.captures.map((x) => (x.id === c.id ? { ...x, caption, caption_y: caption ? y : null } : x)) });
        }}
      />
      <CaptureViewer
        key={`here:${hereKey}`}
        title="What happened here"
        captures={here?.captures ?? null}
        context={here?.context}
        onClose={() => setHere(null)}
      />

      {(beat === 'fog' || beat === 'path') && (
        <View style={[styles.skip, { top: insets.top + 12 }]}>
          <Button testID="skip" variant="secondary" label="Skip" onPress={() => go('card')} />
        </View>
      )}

      {(beat === 'card' || beat === 'name') && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (Math.abs(h - sheetH) > 8) {
              setSheetH(h);
              setFitKey((k) => k + 1);
            }
          }}
        >
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={[styles.sheetContent, { paddingBottom: 16 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {beat === 'card' ? (
              <>
                <Text style={styles.cardTitle} accessibilityRole="header">{data.walk.title ?? suggestTitle(data.walk)}</Text>
                <View style={styles.hero} accessible accessibilityLabel={head.spoken}>
                  <Text style={styles.heroNumber}>{head.big}</Text>
                  <Text style={styles.heroLabel}>{head.small}</Text>
                </View>
                <Text style={styles.cardLine}>
                  {formatDistance(s?.distance_m ?? 0)} · {formatDuration(s?.duration_ms ?? Math.max(0, (data.walk.ended_at ?? data.walk.started_at) - data.walk.started_at - pausedMs(data.pauses, data.walk.started_at, data.walk.ended_at ?? data.walk.started_at)))}
                  {s && s.streets_walked > 0 ? ` · ${s.streets_walked} ${s.streets_walked === 1 ? 'street' : 'streets'} walked` : ''}
                </Text>
                {s && formatCaptures(s) ? <Text style={styles.cardMuted}>{formatCaptures(s)} · tap a pin to open</Text> : null}
                {data.walk.epilogue ? <Text style={styles.epilogue}>“{data.walk.epilogue}”</Text> : null}
                <Pressable
                  testID="backup"
                  accessibilityRole="button"
                  accessibilityState={{ busy: backup === BACKUP_BUSY, disabled: backup === BACKUP_BUSY }}
                  disabled={backup === BACKUP_BUSY}
                  onPress={async () => {
                    setBackup(BACKUP_BUSY);
                    try {
                      const { missing } = await exportWalk(data.walk.id);
                      const done = Platform.OS === 'web' ? 'Downloaded' : 'Ready to save';
                      setBackup(missing ? `${done}, but ${missing} ${missing === 1 ? 'file was' : 'files were'} missing` : done);
                    } catch (e) {
                      setBackup(e instanceof Error ? e.message : 'Could not back up this walk');
                    }
                  }}
                  style={styles.backup}
                  hitSlop={6}
                >
                  <Icon name={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} size={18} color={theme.ink} />
                  {backup === BACKUP_BUSY ? <ActivityIndicator size="small" color={theme.ink} /> : null}
                  <Text style={styles.backupText} accessibilityLiveRegion="polite">{backup ?? 'Back up this walk'}</Text>
                </Pressable>
                <View style={styles.row}>
                  <Button
                    variant="secondary"
                    style={styles.flex}
                    label="Watch again"
                    onPress={() => {
                      setWatched(true);
                      if (srMode) go('path', PATH_MS);
                      else go('fog');
                    }}
                  />
                  {rewatch ? (
                    <Button testID="done" style={styles.flex} label="Done" onPress={close} />
                  ) : (
                    <Button testID="to-name" style={styles.flex} label="Name it" onPress={() => go('name')} />
                  )}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label} nativeID="title-label">Name this walk</Text>
                <TextInput
                  testID="title-input"
                  value={title}
                  onChangeText={setTitle}
                  accessibilityLabel="Name this walk"
                  accessibilityLabelledBy="title-label"
                  returnKeyType="next"
                  maxLength={60}
                  style={styles.input}
                />
                <Text style={styles.label} nativeID="epilogue-label">One line, while the feeling is fresh</Text>
                <TextInput
                  testID="epilogue-input"
                  value={epilogue}
                  onChangeText={setEpilogue}
                  accessibilityLabel="One line, while the feeling is fresh"
                  accessibilityLabelledBy="epilogue-label"
                  placeholder="e.g. The bakery was closed, the river was not."
                  placeholderTextColor={theme.muted}
                  returnKeyType="done"
                  onSubmitEditing={save}
                  maxLength={200}
                  style={styles.input}
                />
                {saveError ? <Text style={styles.error} accessibilityRole="alert">Could not save: {saveError}</Text> : null}
                <Button testID="save" label="Keep it" onPress={save} busy={saving} busyLabel="Saving…" />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

/** The fog beat's headline, honest about walks whose streets could not be read. */
function headline(s: ReplayData['summary'], d: ReplayData) {
  const distance = formatDistance(s?.distance_m ?? 0);
  if (!s || !s.streets_read) {
    return {
      big: distance,
      small: 'walked',
      note: 'Streets fill in when the map can load. Open this walk again when you are online.',
      spoken: `${distance} walked. The streets could not be read yet.`,
    };
  }
  if (s.new_streets === 0) {
    return { big: '0', small: 'new streets', note: d.walked.length ? 'Familiar ground.' : null, spoken: 'No new streets. Familiar ground.' };
  }
  const label = s.new_streets === 1 ? 'new street' : 'new streets';
  return { big: String(s.new_streets), small: label, note: null, spoken: `${s.new_streets} ${label}` };
}

const timeOf = (c: Capture) => new Date(c.t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  muted: { color: theme.muted, fontSize: 16 },
  missing: { color: theme.ink, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  reading: { color: theme.ink, fontSize: 17, fontWeight: '600' },
  headline: {
    position: 'absolute', alignSelf: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20, paddingVertical: 12, paddingHorizontal: 24, maxWidth: 340,
  },
  headlineNumber: { fontSize: 56, fontWeight: '800', color: theme.accent, fontVariant: ['tabular-nums'] },
  headlineLabel: { fontSize: 17, color: theme.ink, fontWeight: '600' },
  headlineNote: { fontSize: 14, color: theme.muted, textAlign: 'center', marginTop: 6 },
  skip: { position: 'absolute', right: 12 },
  moment: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,24,32,0.85)' },
  backup: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' },
  backupText: { color: theme.ink, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70%' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetContent: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  cardTitle: { fontSize: 22, fontWeight: '700', color: theme.ink },
  hero: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  heroNumber: { fontSize: 40, fontWeight: '800', color: theme.accent, fontVariant: ['tabular-nums'] },
  heroLabel: { fontSize: 18, fontWeight: '600', color: theme.ink },
  cardLine: { fontSize: 16, color: theme.ink, fontVariant: ['tabular-nums'] },
  cardMuted: { fontSize: 15, color: theme.muted },
  epilogue: { fontSize: 15, fontStyle: 'italic', color: theme.ink },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  flex: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: theme.muted },
  input: { borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 12, fontSize: 16, color: theme.ink },
  error: { color: theme.danger, fontSize: 14 },
});
