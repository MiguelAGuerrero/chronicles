import { router, useLocalSearchParams } from 'expo-router';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Animated, BackHandler, Easing, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text,
  TextInput, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalkMap } from '../components/map/WalkMap';
import { COLORS, type WalkMapHandle } from '../components/map/types';
import { CaptionEditor } from '../components/Caption';
import { CaptureViewer } from '../components/CaptureView';
import { Icon, KIND_LABEL, type IconName } from '../components/icons';
import { Banner, Button, HoldButton, theme } from '../components/ui';
import { DiscoveryPrefs } from '../components/DiscoveryPrefs';
import { categoryOf } from '../lib/discovery/categories';
import { savePrefs } from '../lib/discovery/runScan';
import { placesFromTilePois } from '../lib/discovery/tilePois';
import { useScan } from '../lib/discovery/useScan';
import { db } from '../lib/db';
import { focusOn } from '../lib/focus';
import { boundsOf, distanceM, distanceToLinesM, nearPoints, pausedMs } from '../lib/geo';
import { capturesHere, type HereResult } from '../lib/here';
import { deriveSegments, streetKey } from '../lib/streets';
import { successFeedback, tapFeedback } from '../lib/haptics';
import { recorder } from '../lib/recorder';
import { PAUSE_REMIND_MS } from '../lib/notify';
import { ensureTileBuild } from '../lib/tiles';
import type { RecorderStatus } from '../lib/recorder/types';
import { pauseWalk, resumeWalk, stopWalk } from '../lib/session';
import { formatDistance, formatDuration, formatElapsed } from '../lib/summary';
import type { Capture, LngLat, Pause, StreetSegment, Walk } from '../lib/types';
import { useCaptures } from '../lib/useCaptures';
import { useLiveTrace } from '../lib/useLiveTrace';
import { routeAhead } from '../lib/nav/navigator';
import { useNavigation } from '../lib/nav/useNavigation';

/** Streets around the walker: read from the map and shown as fog this far out. */
const NEAR_RADIUS_M = 1000;
/** The streets around the walker are read again after this far. */
const FOG_STEP_M = 100;
/** A street piece whose middle the live trace passed this close to counts as walked for now. */
const ON_TRACE_M = 20;

function midpointOf(s: StreetSegment): LngLat {
  const line = s.geometry[0] ?? [];
  return line[Math.floor(line.length / 2)] ?? [0, 0];
}
/** The edge buttons start above the capture row (bottom 92, 68 tall) and one pill. */
const EDGE_BOTTOM = 236;
/** No accepted fix for this long while recording reads as weak GPS. */
const WEAK_GPS_MS = 20_000;
const NOTICE_MS = 6000;
/** How long "Aa Caption" stays offered after a photo. */
const CAPTION_OFFER_MS = 6000;

type Notice = { message: string; tone?: 'info' | 'error'; openSettings?: boolean; sticky?: boolean };

export default function WalkScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const edgeRight = Math.max(12, (width - 640) / 2 + 12);
  /** The top column's side margin: centered in 640 on wide screens, like the rest. */
  const sideInset = Math.max(12, (width - 640) / 2);
  const params = useLocalSearchParams<{ warning?: string; started?: string }>();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [pauses, setPauses] = useState<Pause[]>([]);
  const [pausing, setPausing] = useState(false);
  // The map follows the walker until they pan or zoom it themselves.
  const [following, setFollowing] = useState(true);
  const [status, setStatus] = useState<RecorderStatus>({ kind: 'idle' });
  const [now, setNow] = useState(() => Date.now());
  // One-off notices: a start warning, or the web's visibility rule.
  const [notice, setNotice] = useState<Notice | null>(() =>
    params.warning
      ? { message: params.warning }
      : params.started
        ? { message: 'Walk started · recording' }
      : recorder.capabilities.background
        ? null
        : { message: 'Keep this page open and on screen while you walk.' },
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [fog, setFog] = useState<StreetSegment[]>([]);
  const [walked, setWalked] = useState<StreetSegment[]>([]);
  // The memo whose save failed at Stop; holding Stop again ends the walk without it.
  const giveUpMemo = useRef(false);
  const saveRef = useRef<PressableRef>(null);
  const mapRef = useRef<WalkMapHandle>(null);

  useEffect(() => {
    db.getOpenWalk().then(async (w) => {
      if (!w) {
        router.replace('/');
        return;
      }
      // Pauses first, so a paused walk never shows as running with paused time on the clock.
      setPauses(await db.getPauses(w.id));
      setWalk(w);
    });
  }, []);
  useEffect(
    () =>
      recorder.subscribeStatus((s) => {
        setStatus(s);
        if (s.kind === 'error') setNotice({ message: s.message, tone: 'error', openSettings: s.openSettings, sticky: true });
      }),
    [],
  );
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const onGap = useCallback((ms: number) => {
    if (!recorder.capabilities.background) {
      setNotice({ message: `Tracing paused for ${formatDuration(ms)} while this page was hidden.` });
    }
  }, []);
  const onCaptureError = useCallback((e: { message: string; openSettings?: boolean }) => {
    setNotice({ message: e.message, tone: 'error', openSettings: e.openSettings });
  }, []);
  const live = useLiveTrace(walk?.id ?? null, walk?.started_at ?? null, pauses, onGap);
  const cap = useCaptures(walk?.id ?? null, live.here, live.lastFixAt, onCaptureError);

  useEffect(() => {
    if (!notice || notice.sticky) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  // Streets around the walker, refreshed when they move 100 m: the map reads
  // the streets in its loaded z14 tiles, they join the cache tagged with the
  // build being served, and those no walk has credited show as fog. One run
  // at a time; a move during a run is picked up by the next refresh.
  const [build, setBuild] = useState<string | null>(null);
  useEffect(() => {
    ensureTileBuild().then(setBuild, () => setBuild('unknown'));
  }, []);
  const fogRun = useRef<{ busy: boolean; at: LngLat | null }>({ busy: false, at: null });
  const liveRuns = useRef(live.runs);
  useEffect(() => {
    liveRuns.current = live.runs;
  }, [live.runs]);
  useEffect(() => {
    const now = live.here;
    const run = fogRun.current;
    if (!now || build == null || run.busy || (run.at && distanceM(run.at, now) < FOG_STEP_M)) return;
    run.busy = true;
    run.at = now;
    let alive = true;
    (async () => {
      const features = await mapRef.current?.collectView().catch(() => null);
      if (features?.complete && features.roads.length && build !== 'unknown') {
        await db.putSegments(deriveSegments(features.roads, features.names, build)).catch(() => {});
        // Not awaited: the fog shouldn't wait on the place cache.
        db.putPlaces(placesFromTilePois(features.pois, build, { complete: features.complete })).catch(() => {});
      } else if (!features?.complete) {
        run.at = null; // zoomed out or not loaded yet: read the streets again on the next fix
      }
      const segs = (await db.getSegmentsIn(boundsOf([now], NEAR_RADIUS_M)!)).filter(
        (x) => distanceToLinesM(now, x.geometry) <= NEAR_RADIUS_M,
      );
      const visited = await db.visitedSegmentIds();
      if (!alive) return;
      // Streets this walk has already gone down are only credited at stop;
      // until then, those along the trace are left out of the fog.
      const walkedNow = nearPoints(liveRuns.current.flat(), ON_TRACE_M);
      setFog(segs.filter((x) => !visited.has(x.id) && !walkedNow(midpointOf(x))));
      setWalked(segs.filter((x) => visited.has(x.id)));
    })()
      .catch(() => {})
      .finally(() => {
        run.busy = false;
      });
    return () => {
      alive = false;
    };
  }, [live.here, build]);
  // Unwalked streets near me: a count, and the fog drawn boldly over a veiled map.
  const [showUnwalked, setShowUnwalked] = useState(false);
  // Named streets only (the owner's call): unnamed paths are fog, not a count.
  const unwalkedCount = useMemo(() => new Set(fog.filter((x) => x.name).map(streetKey)).size, [fog]);

  // A long press on the map opens a small sheet for that spot: Go here, and
  // what happened here (every capture near it, on any walk) when there is any.
  const [here, setHere] = useState<HereResult | null>(null);
  const [spot, setSpot] = useState<{ at: LngLat; here: HereResult | null; from: LngLat | null } | null>(null);
  const hereTaps = useRef(0);
  const [hereKey, setHereKey] = useState(0);
  async function pressMap(at: LngLat, radiusM?: number) {
    if (cap.voiceStartedAt != null || stopping || viewing || here || scan.scanning) return;
    setMarkOpen(null);
    tapFeedback();
    const tap = ++hereTaps.current;
    const r = await capturesHere(at, cap.captures, radiusM).catch(() => null);
    if (tap !== hereTaps.current) return; // a newer press won
    setSpot({ at, here: r && r.captures.length ? r : null, from: live.here });
  }
  // The spot card goes once you walk on, or with Back (Android) and Escape (web).
  useEffect(() => {
    if (!spot) return;
    const close = () => setSpot(null);
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, [spot]);
  useEffect(() => {
    if (!spot?.from || !live.here || distanceM(spot.from, live.here) < 30) return;
    const t = setTimeout(() => setSpot(null), 0);
    return () => clearTimeout(t);
  }, [spot, live.here]);

  // Navigating (slice 4): inside the walk, which keeps recording.
  const [arrived, setArrived] = useState<string | null>(null);
  useEffect(() => {
    if (!arrived) return;
    const t = setTimeout(() => setArrived(null), 4000);
    return () => clearTimeout(t);
  }, [arrived]);
  const navigation = useNavigation({
    walk,
    here: live.here,
    lastFixAt: live.lastFixAt,
    paused: pauses.some((p) => p.ended_at == null),
    map: () => mapRef.current,
    onArrive: (dest) => {
      successFeedback();
      // Said once: the line on screen is announced by the screen reader here, not by a live region.
      setArrived(`You’re here: ${dest.label}`);
      AccessibilityInfo.announceForAccessibility(`You're here: ${dest.label}`);
    },
    // Errors stay up long enough to read at a glance, and can be dismissed.
    onError: (m) => setNotice({ message: m, tone: 'error' }),
    onNotice: (m) => setArrived(m),
  });
  // Scan (v1 slice 2): marks to find within 500 m.
  const fixes = useMemo(() => live.runs.flat(), [live.runs]);
  const [markOpen, setMarkOpen] = useState<string | null>(null);
  const scan = useScan({
    walkId: walk?.id ?? null,
    here: live.here,
    fixes,
    captures: cap.captures,
    map: () => mapRef.current,
    onNotice: (message, tone) => setNotice({ message, tone }),
    onFound: (m) => {
      successFeedback();
      setArrived(`Found: ${m.name}`);
      AccessibilityInfo.announceForAccessibility(`Found: ${m.name}, ${categoryOf(m.category).label}`);
    },
  });
  const openMark = scan.open.find((m) => m.id === markOpen) ?? null;
  // Going to a mark: "Mark" until it is revealed, then its name (S12).
  const navMarkId = navigation.nav?.dest.kind === 'mark' ? navigation.nav.dest.markId : undefined;
  const navMark = navMarkId ? scan.marks.find((m) => m.id === navMarkId) : undefined;
  const relabel = navigation.relabel;
  useEffect(() => {
    if (navMark && scan.revealed.has(navMark.id)) relabel(navMark.name);
  }, [navMark, scan.revealed, relabel]);
  const walkStart: LngLat | null = live.runs[0]?.[0] ?? null;
  // Once, after the first 100 m of a first walk: how to go somewhere.
  const hinted = useRef(false);
  useEffect(() => {
    if (hinted.current || live.distanceM < 100) return;
    hinted.current = true;
    db.getMeta('hint_go')
      .then((v) => {
        if (v) return;
        setNotice({ message: 'Press and hold the map to go somewhere, or to see what happened there.' });
        return db.setMeta('hint_go', '1');
      })
      .catch(() => {});
  }, [live.distanceM]);
  // Walk me back once there is somewhere to walk back from.
  const awayFromStart = !!walkStart && !!live.here && distanceM(walkStart, live.here) > 50;
  // The route ahead of you only; what is behind is walked.
  const routeLine = useMemo(
    () => (navigation.nav ? (live.here ? routeAhead(navigation.nav.route.path, live.here) : navigation.nav.route.path) : null),
    [navigation.nav, live.here],
  );
  const marks = useMemo<LngLat[]>(
    () => [...(navigation.nav ? [navigation.nav.dest.at] : []), ...(spot ? [spot.at] : [])],
    [navigation.nav, spot],
  );

  const [viewing, setViewing] = useState<Capture[] | null>(null);

  async function stop() {
    if (!walk || stopping) return;
    setStopping(true);
    try {
      // Waits for any voice action in flight (a start, a save) before ending.
      const r = await cap.finishVoice();
      if ((r === 'failed' || cap.unsaved) && !giveUpMemo.current) {
        giveUpMemo.current = true;
        setNotice({ message: 'The voice memo could not be saved. Retry, or hold Stop again to end the walk without it.', tone: 'error', sticky: true });
        return;
      }
      await stopWalk(walk.id);
      successFeedback();
      router.replace(`/replay/${walk.id}`);
    } catch (e) {
      setNotice({ message: `The walk could not be stopped: ${e instanceof Error ? e.message : e}`, tone: 'error', sticky: true });
    } finally {
      setStopping(false);
    }
  }

  async function togglePause() {
    if (!walk || pausing) return;
    setPausing(true);
    try {
      if (paused) {
        await resumeWalk(walk.id);
        AccessibilityInfo.announceForAccessibility('Walk resumed');
      } else {
        // A memo in progress is saved first; a paused walk records nothing.
        await cap.finishVoice();
        await pauseWalk(walk.id);
        AccessibilityInfo.announceForAccessibility('Walk paused. Nothing is recorded until you resume.');
      }
      tapFeedback();
    } catch (e) {
      setNotice({ message: `Could not ${paused ? 'resume' : 'pause'}: ${e instanceof Error ? e.message : e}`, tone: 'error', sticky: true });
    } finally {
      // The screen shows whatever the database holds, even after a failure.
      setPauses(await db.getPauses(walk.id).catch(() => pauses));
      setPausing(false);
    }
  }

  async function saveNote() {
    const ok = await cap.saveNote(note);
    if (ok) {
      setNote('');
      setNoteOpen(false);
      tapFeedback();
      setToast('Note saved here');
    }
  }

  // After a photo, a caption is offered for a few seconds; it is opt-in.
  const [justTook, setJustTook] = useState<string | null>(null);
  const [captioning, setCaptioning] = useState<Capture | null>(null);
  useEffect(() => {
    if (!justTook) return;
    const t = setTimeout(() => setJustTook(null), CAPTION_OFFER_MS);
    return () => clearTimeout(t);
  }, [justTook]);

  async function photo() {
    const kept = await cap.takePhoto();
    if (!kept) return;
    tapFeedback();
    if (kept.kind === 'photo') setJustTook(kept.id);
    else setToast('Video saved here');
  }

  async function startVoice() {
    if (await cap.startVoice()) {
      tapFeedback();
      giveUpMemo.current = false;
      AccessibilityInfo.announceForAccessibility('Recording voice memo');
    }
  }

  async function saveVoice() {
    const r = await cap.finishVoice();
    if (r === 'saved') {
      tapFeedback();
      setToast('Voice memo saved here');
      AccessibilityInfo.announceForAccessibility('Voice memo saved');
    } else if (r === 'dropped') {
      setToast('Too short, not kept');
      AccessibilityInfo.announceForAccessibility('Too short, not kept');
    }
  }

  async function discardVoice() {
    if ((await cap.discardVoice()) === 'discarded') AccessibilityInfo.announceForAccessibility('Voice memo discarded. Undo is available.');
  }

  // While a memo records, Android's back button does nothing, and the web
  // warns before a reload or close; leaving would cut the memo short.
  const recordingNow = cap.voiceStartedAt != null;
  useEffect(() => {
    if (!recordingNow) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    if (Platform.OS === 'web') window.addEventListener('beforeunload', warn);
    // Focus moves to Save, which replaced the mic the person just tapped.
    const t = setTimeout(() => focusOn(saveRef), 300);
    return () => {
      sub.remove();
      clearTimeout(t);
      if (Platform.OS === 'web') window.removeEventListener('beforeunload', warn);
    };
  }, [recordingNow]);

  const paused = pauses.some((p) => p.ended_at == null);
  // Paused time does not count as walking.
  const elapsed = walk ? now - walk.started_at - pausedMs(pauses, walk.started_at, now) : 0;
  const weak = status.kind === 'recording' && live.lastFixAt != null && now - live.lastFixAt > WEAK_GPS_MS;
  // The growing trace says it is recording; the status only shows when it is not.
  const problem =
    paused ? { label: 'Paused', color: theme.muted }
    : status.kind === 'error' ? { label: 'Not recording', color: theme.danger }
    : status.kind === 'waiting' || status.kind === 'idle' ? { label: 'Waiting for GPS', color: theme.warn }
    : weak ? { label: 'Weak GPS', color: theme.warn }
    : null;
  // A forgotten pause loses the rest of the walk: after a while, say so once per pause.
  const openPause = pauses.find((p) => p.ended_at == null);
  const remindedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!openPause || remindedFor.current === openPause.started_at || now - openPause.started_at < PAUSE_REMIND_MS) return;
    remindedFor.current = openPause.started_at;
    setNotice({ message: `Paused for ${formatDuration(now - openPause.started_at)}. Nothing is recorded until you resume.`, sticky: true });
  }, [openPause, now]);
  const recordingVoice = cap.voiceStartedAt != null;
  const statsLabel = `${formatDuration(elapsed)} walked, ${formatDistance(live.distanceM)}`;

  return (
    <View style={styles.screen}>
      <WalkMap
        trace={live.runs}
        walked={walked}
        fog={fog}
        captures={cap.captures}
        // Opening a capture would hide a memo that is still recording.
        onPinPress={recordingVoice || stopping ? undefined : setViewing}
        walker={live.here}
        walkerHeading={live.heading}
        // Not while a route is found: the street read moves the camera itself.
        follow={following && !navigation.finding && !scan.scanning ? live.here : null}
        onPress={() => {
          setSpot(null);
          setMarkOpen(null);
        }}
        discoveries={scan.pins}
        onDiscoveryPress={recordingVoice || stopping ? undefined : (id) => {
          setSpot(null);
          setMarkOpen(id);
        }}
        marks={marks}
        onUserMove={() => setFollowing(false)}
        // A long press, so a stray tap while walking does nothing.
        onLongPress={pressMap}
        route={routeLine}
        covered={navigation.finding || scan.scanning}
        veil={showUnwalked}
        fogEmphasis={showUnwalked}
        ref={mapRef}
        initialCenter={live.here ?? undefined}
        initialZoom={16}
      />

      <View style={[styles.top, { top: insets.top + 12, left: sideInset, right: sideInset }]} pointerEvents="box-none">
        {navigation.nav && (
          // Not a live region: it changes with every fix. The distance is announced in steps instead.
          <View testID="nav-bar" style={styles.navBar}>
            <Icon name="navigate" size={20} color="#ffffff" />
            <Text
              testID="nav-left"
              style={styles.navText}
              numberOfLines={1}
              accessibilityLabel={`${formatDistance(navigation.nav.leftM)} left to ${navigation.nav.dest.label}`}
            >
              {formatDistance(navigation.nav.leftM)} · {navigation.nav.dest.label}
            </Text>
            <Pressable testID="nav-end" accessibilityRole="button" accessibilityLabel="End navigation" onPress={navigation.end} style={styles.navEnd} hitSlop={8}>
              <Text style={styles.navEndText}>End</Text>
            </Pressable>
          </View>
        )}
        {navigation.nav?.offRoute && (
          <View style={styles.chip} accessibilityLiveRegion="polite">
            <View style={[styles.statusDot, { backgroundColor: theme.warn }]} />
            <Text style={styles.chipText}>Off your route</Text>
          </View>
        )}
        {navigation.finding && (
          <View style={styles.finding} accessibilityLiveRegion="polite">
            <ActivityIndicator color={theme.ink} />
            <Text style={styles.findingText}>Finding a route</Text>
            <Pressable testID="nav-cancel" accessibilityRole="button" accessibilityLabel="Cancel finding a route" onPress={navigation.cancel} style={styles.findingCancel} hitSlop={8}>
              <Text style={styles.findingCancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
        {scan.scanning && (
          <View style={styles.finding} accessibilityLiveRegion="polite">
            <ActivityIndicator color={theme.ink} />
            <Text style={styles.findingText}>Scanning…</Text>
            <Pressable testID="scan-cancel" accessibilityRole="button" accessibilityLabel="Cancel the scan" onPress={scan.cancel} style={styles.findingCancel} hitSlop={8}>
              <Text style={styles.findingCancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
        {arrived && (
          <View style={styles.toast}>
            <Text style={[styles.toastText, styles.flashText]}>{arrived}</Text>
          </View>
        )}
        {problem && (
          <View style={styles.chip} accessible accessibilityLabel={problem.label} accessibilityLiveRegion="polite">
            <View style={[styles.statusDot, { backgroundColor: problem.color }]} />
            <Text style={styles.chipText}>{problem.label}</Text>
          </View>
        )}
        {notice && (
          <Banner
            tone={notice.tone}
            onDismiss={() => setNotice(null)}
            action={notice.openSettings && Platform.OS !== 'web' ? { label: 'Open Settings', onPress: () => Linking.openSettings() } : undefined}
          >
            {notice.message}
          </Banner>
        )}
        {toast && (
          <View style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        )}
      </View>

      {/* Captures float in the lower-middle of the screen, where either thumb
          reaches; the bottom edge is the least accurate place to tap. Pills
          (caption, undo, retry) sit above the row, so the row never moves. */}
      <View style={[styles.captures, { bottom: insets.bottom + 92 }]} pointerEvents="box-none">
        {recordingVoice && (
          <View style={styles.voiceLive} accessible accessibilityLabel="Recording voice memo">
            <PulseDot />
            <Text style={styles.voiceLiveText}>{formatElapsed(now - cap.voiceStartedAt!)}</Text>
          </View>
        )}
        {justTook && !recordingVoice && !spot && !openMark && (
          <View style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>Photo saved here</Text>
            <Pressable
              testID="add-caption"
              accessibilityRole="button"
              onPress={() => {
                setCaptioning(cap.captures.find((c) => c.id === justTook) ?? null);
                setJustTook(null);
              }}
              hitSlop={10}
              style={styles.undoBtn}
            >
              <Text style={styles.undoBtnText}>Aa Caption</Text>
            </Pressable>
          </View>
        )}
        {cap.discarded && !recordingVoice && !spot && !openMark && (
          <View style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>Voice memo discarded</Text>
            <Pressable testID="voice-undo" accessibilityRole="button" onPress={() => cap.undoDiscard()} hitSlop={10} style={styles.undoBtn}>
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          </View>
        )}
        {cap.unsaved && !recordingVoice && !spot && !openMark && (
          <View style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>Voice memo not saved</Text>
            <Pressable accessibilityRole="button" onPress={() => cap.retrySave()} hitSlop={10} style={styles.undoBtn}>
              <Text style={styles.undoBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {/* While recording, Save takes the mic's own place, so tapping the mic
            again saves; Discard is smaller and set apart from it. */}
        <View style={styles.captureRow}>
          <View style={styles.slot}>
            {recordingVoice ? (
              <RoundButton
                testID="voice-discard"
                icon="trash-outline"
                label="Discard voice memo"
                hint="Throws this recording away. You can undo for a few seconds."
                onPress={discardVoice}
                small
              />
            ) : (
              <RoundButton testID="cap-photo" icon="camera" label="Take a photo or video" onPress={photo} busy={cap.busy === 'photo'} disabled={stopping || cap.busy === 'voice'} />
            )}
          </View>
          <View style={styles.slot}>
            {recordingVoice ? (
              <RoundButton
                ref={saveRef}
                testID="voice-save"
                icon="stop"
                label="Stop and save voice memo"
                onPress={saveVoice}
                tone="voice"
                busy={cap.busy === 'voice'}
              />
            ) : (
              <RoundButton
                testID="cap-voice"
                icon="mic"
                label="Record a voice memo"
                onPress={startVoice}
                busy={cap.busy === 'voice'}
                disabled={stopping}
              />
            )}
          </View>
          <View style={styles.slot}>
            {!recordingVoice && (
              <RoundButton testID="cap-note" icon="document-text" label="Write a note" onPress={() => setNoteOpen(true)} disabled={stopping} />
            )}
          </View>
        </View>
      </View>

      <View style={[styles.bar, { paddingBottom: 10 + insets.bottom }]}>
        <View style={styles.barInner}>
          <Text style={styles.stats} accessibilityLabel={statsLabel}>
            {formatElapsed(elapsed)} · {formatDistance(live.distanceM)}
          </Text>
          <View style={styles.barActions}>
          <Pressable
            testID={paused ? 'resume-walk' : 'pause-walk'}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume the walk' : 'Pause the walk'}
            accessibilityHint={paused ? undefined : 'Stops recording until you resume'}
            onPress={togglePause}
            disabled={pausing || stopping || !walk}
            style={({ pressed }) => [styles.pauseBtn, paused && styles.pauseBtnOn, pressed && styles.pressed]}
          >
            <Icon name={paused ? 'play' : 'pause'} size={20} color={paused ? '#ffffff' : theme.ink} />
          </Pressable>
          <HoldButton
            testID="stop"
            label="Hold to stop"
            busyLabel="Stopping…"
            onHold={stop}
            onTap={() => setToast('Hold to stop the walk')}
            busy={stopping}
            disabled={!walk || pausing}
          >
            <View style={styles.stopInner}>
              <Icon name="stop" size={18} color={theme.ink} />
              <Text style={styles.stopText} selectable={false}>Hold</Text>
            </View>
          </HoldButton>
          </View>
        </View>
      </View>

      {/* Small round controls stacked at the right edge, above the capture
          row and its pills (as in AllTrails), and inside the 640 column on
          wide screens. */}
      <Pressable
        testID="unwalked"
        accessibilityRole="switch"
        accessibilityState={{ checked: showUnwalked }}
        aria-checked={showUnwalked}
        accessibilityLabel="Show unwalked streets near me"
        onPress={() => setShowUnwalked((v) => !v)}
        style={({ pressed }) => [styles.edgeBtn, { right: edgeRight, bottom: insets.bottom + EDGE_BOTTOM + 56 }, showUnwalked && styles.edgeBtnOn, pressed && styles.pressed]}
      >
        <Icon name="footsteps-outline" size={22} color={showUnwalked ? '#ffffff' : theme.ink} />
      </Pressable>
      {showUnwalked && (
        <View
          style={[styles.unwalked, { right: edgeRight + 52, bottom: insets.bottom + EDGE_BOTTOM + 56 + 7 }]}
          accessibilityLiveRegion="polite"
          pointerEvents="none"
        >
          <Text style={styles.unwalkedText}>{unwalkedCount} unwalked nearby</Text>
        </View>
      )}

      {awayFromStart && walkStart && !navigation.nav && (
        // Walk me back: the way back to where this walk began (N1, N11).
        <Pressable
          testID="walk-back"
          accessibilityRole="button"
          accessibilityLabel="Walk me back to the start"
          disabled={navigation.finding}
          onPress={() => navigation.goTo({ at: walkStart, label: 'Start', kind: 'start' })}
          style={({ pressed }) => [styles.edgeBtn, { right: edgeRight, bottom: insets.bottom + EDGE_BOTTOM + 168 }, pressed && styles.pressed]}
        >
          <Icon name="arrow-undo" size={22} color={theme.ink} />
        </Pressable>
      )}

      {/* Scan: about six marks to find within 500 m (S1). */}
      <Pressable
        testID="scan"
        accessibilityRole="button"
        accessibilityLabel="Scan for places to find nearby"
        disabled={scan.scanning || navigation.finding || !live.here || recordingVoice || stopping}
        onPress={() => {
          setSpot(null);
          setMarkOpen(null);
          scan.scan();
        }}
        style={({ pressed }) => [styles.edgeBtn, { right: edgeRight, bottom: insets.bottom + EDGE_BOTTOM + 112 }, (!live.here || scan.scanning) && styles.edgeBtnOff, pressed && styles.pressed]}
      >
        <Icon name="scan-outline" size={22} color={theme.ink} />
      </Pressable>

      {!following && live.here && (
        // Back to following the walker, after looking around the map.
        <Pressable
          testID="recenter"
          accessibilityRole="button"
          accessibilityLabel="Recenter on your position"
          onPress={() => setFollowing(true)}
          style={({ pressed }) => [styles.edgeBtn, { right: edgeRight, bottom: insets.bottom + EDGE_BOTTOM }, pressed && styles.pressed]}
        >
          <Icon name="locate" size={22} color={theme.ink} />
        </Pressable>
      )}

      {openMark && !spot && (
        // A mark's card, in the spot card's place (S7, S9, S12).
        <View style={[styles.spotRow, { bottom: insets.bottom + 92 + 68 + 12 }]} pointerEvents="box-none">
          <View testID="mark-card" style={styles.spot} accessibilityViewIsModal>
            {scan.revealed.has(openMark.id) ? (
              <Text style={styles.spotTitle} accessibilityRole="header">
                {openMark.name} · {categoryOf(openMark.category).label}
              </Text>
            ) : (
              <Text style={styles.spotTitle} accessibilityRole="header">A mark to find</Text>
            )}
            <Text style={styles.markSub}>
              {live.here ? `${formatDistance(distanceM(live.here, openMark.at))} away. ` : ''}
              {scan.revealed.has(openMark.id) ? 'Take a photo, a memo or a note here to find it.' : 'Walk within 60 m to see what it is.'}
            </Text>
            <View style={styles.spotActions}>
              <Button
                testID="mark-go"
                label="Go here"
                onPress={() => {
                  const m = openMark;
                  setMarkOpen(null);
                  navigation.goTo({ at: m.at, label: scan.revealed.has(m.id) ? m.name : 'Mark', kind: 'mark', markId: m.id });
                }}
                disabled={navigation.finding}
              />
              <Button
                testID="mark-dismiss"
                variant="secondary"
                label="Dismiss"
                onPress={() => {
                  const id = openMark.id;
                  setMarkOpen(null);
                  if (navMarkId === id) navigation.end();
                  scan.dismiss(id);
                  setToast('Passed on');
                }}
              />
              <Pressable testID="mark-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => setMarkOpen(null)} style={styles.spotClose} hitSlop={8}>
                <Icon name="close" size={22} color={theme.ink} />
              </Pressable>
            </View>
          </View>
        </View>
      )}
      <DiscoveryPrefs
        key={scan.asking ? 'asking' : 'idle'}
        visible={scan.asking}
        initial={null}
        actionLabel="Scan"
        onClose={() => scan.setAsking(false)}
        onDone={async (prefs) => {
          scan.setAsking(false);
          await savePrefs(prefs).catch(() => {});
          scan.scan(true);
        }}
      />

      <CaptureViewer
        key={viewing?.[0]?.id ?? 'none'}
        captures={viewing && viewing.map((v) => cap.captures.find((c) => c.id === v.id) ?? v)}
        onClose={() => setViewing(null)}
        onSaveCaption={(c, caption, y) => cap.setCaption(c.id, caption, y)}
        onGoHere={navigation.finding ? undefined : (c) => {
          setViewing(null);
          if (c.lat != null && c.lon != null) navigation.goTo({ at: [c.lon, c.lat], label: KIND_LABEL[c.kind], kind: 'capture' });
        }}
      />
      <CaptionEditor
        key={captioning?.id ?? 'none'}
        capture={captioning}
        onClose={() => setCaptioning(null)}
        onSave={async (caption, y) => {
          if (captioning) await cap.setCaption(captioning.id, caption, y).catch(() => setToast('The caption could not be saved'));
          setCaptioning(null);
        }}
      />
      {spot && (
        // Above the capture row (bottom 92, 68 tall), in the pills' place, so the row never moves or hides.
        <View style={[styles.spotRow, { bottom: insets.bottom + 92 + 68 + 12 }]} pointerEvents="box-none">
          <View style={styles.spot} accessibilityViewIsModal>
            <Text style={styles.spotTitle} accessibilityRole="header">This spot</Text>
            <View style={styles.spotActions}>
              <Button
                testID="go-here"
                label="Go here"
                onPress={() => {
                  const at = spot.at;
                  setSpot(null);
                  navigation.goTo({ at, label: 'Your spot', kind: 'point' });
                }}
                disabled={navigation.finding}
              />
              {spot.here && (
                <Button
                  testID="here-open"
                  variant="secondary"
                  label={`What happened here (${spot.here.captures.length})`}
                  onPress={() => {
                    const r = spot.here!;
                    setSpot(null);
                    setHereKey((k) => k + 1);
                    setHere(r);
                  }}
                />
              )}
              <Pressable testID="spot-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSpot(null)} style={styles.spotClose} hitSlop={8}>
                <Icon name="close" size={22} color={theme.ink} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <CaptureViewer
        key={`here:${hereKey}`}
        title="What happened here"
        captures={here?.captures ?? null}
        context={here?.context}
        onClose={() => setHere(null)}
      />

      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        {/* Every way out keeps the draft; only Save clears it. */}
        <Pressable style={styles.modalBack} onPress={() => setNoteOpen(false)} accessibilityLabel="Close note">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalWrap, { paddingTop: insets.top + 56 }]}>
            <Pressable style={styles.modal} onPress={() => {}} accessible={false}>
              <Text style={styles.modalTitle} accessibilityRole="header">A line about here</Text>
              <TextInput
                testID="note-input"
                autoFocus
                multiline
                value={note}
                onChangeText={setNote}
                placeholder="What caught your eye?"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Note"
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={saveNote}
                maxLength={500}
                style={styles.input}
              />
              <View style={styles.modalRow}>
                <Button variant="ghost" label="Close" onPress={() => setNoteOpen(false)} />
                <Button testID="note-save" label="Save" onPress={saveNote} busy={cap.busy === 'text'} disabled={!note.trim()} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

/** A large round icon button; the label is what screen readers say. */
type PressableRef = ComponentRef<typeof Pressable>;

const RoundButton = forwardRef<PressableRef, {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  tone?: 'light' | 'voice';
  small?: boolean;
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
}>(function RoundButton(props, ref) {
  const voice = props.tone === 'voice';
  const inactive = props.disabled || props.busy;
  return (
    <Pressable
      ref={ref}
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint={props.hint}
      accessibilityState={{ disabled: !!inactive, busy: !!props.busy }}
      disabled={inactive}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.round,
        props.small && styles.roundSmall,
        voice && styles.roundVoice,
        inactive && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={props.icon} size={props.small ? 24 : 30} color={voice ? '#ffffff' : theme.ink} />
    </Pressable>
  );
});

/** The recording light: pulses, unless reduced motion is on. */
function PulseDot() {
  const [o] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(o, { toValue: 0.3, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(o, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        ]),
      );
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, [o]);
  return <Animated.View style={[styles.recDot, { opacity: o }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { position: 'absolute', left: 12, right: 12, gap: 8, alignItems: 'center', maxWidth: 640, alignSelf: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: theme.ink, fontWeight: '600', fontSize: 14 },
  // Navigating: what is left and where to, as on a maps app's top bar, with End.
  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', backgroundColor: COLORS.route, borderRadius: 14,
    paddingLeft: 14, paddingRight: 6, minHeight: 56,
  },
  navText: { flex: 1, color: '#ffffff', fontSize: 18, fontWeight: '700' },
  // A white pill: 5.2:1 for its blue text.
  navEnd: { minHeight: 44, minWidth: 64, paddingHorizontal: 14, borderRadius: 22, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  navEndText: { color: COLORS.route, fontSize: 16, fontWeight: '700' },
  finding: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: 999, paddingLeft: 14, paddingRight: 4,
    minHeight: 52, borderWidth: 1, borderColor: theme.line,
  },
  findingText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  findingCancel: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 22 },
  findingCancelText: { color: theme.ink, fontSize: 16, fontWeight: '700', textDecorationLine: 'underline' },
  flashText: { fontSize: 16 },
  spotRow: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  spot: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 10, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  spotTitle: { fontSize: 16, fontWeight: '700', color: theme.ink },
  markSub: { fontSize: 14, color: theme.muted },
  edgeBtnOff: { opacity: 0.5 },
  spotActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  spotClose: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toast: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, alignSelf: 'center' },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  captures: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 12 },
  captureRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  slot: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
  round: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  roundSmall: { width: 52, height: 52, borderRadius: 26 },
  roundVoice: { backgroundColor: '#6b21a8', borderColor: '#6b21a8' },
  undo: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.ink, borderRadius: 999,
    paddingVertical: 8, paddingLeft: 16, paddingRight: 8,
  },
  undoText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  undoBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  undoBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  voiceLive: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.line,
  },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.danger },
  voiceLiveText: { color: theme.ink, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bar: { backgroundColor: theme.bg, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderColor: theme.line },
  barInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 640, width: '100%', alignSelf: 'center' },
  stats: { color: theme.ink, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  stopInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  pauseBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.ink, backgroundColor: theme.surface,
  },
  // Resume is the one thing to do while paused.
  pauseBtnOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  edgeBtnOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  unwalked: { position: 'absolute', backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  unwalkedText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  // Small round controls at the map's edges, as in AllTrails.
  edgeBtn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  stopText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalWrap: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 16 },
  modal: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: { minHeight: 90, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 10, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
