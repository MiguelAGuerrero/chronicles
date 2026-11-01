import { router, useLocalSearchParams } from 'expo-router';
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, AppState, BackHandler, Share, Switch, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Modal } from '../components/Modal';
import { onWalkGap, useOpenWalk } from '../components/OpenWalk';
import { Ticking } from '../components/Ticking';
import { perfCount } from '../lib/perfCount';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalkMap } from '../components/map/WalkMap';
import { COLORS, HOTSPOT, type WalkMapHandle } from '../components/map/types';
import { CaptionEditor } from '../components/Caption';
import { CaptureViewer } from '../components/CaptureView';
import { Icon, KIND_LABEL, type IconName } from '../components/icons';
import { Banner, Button, HoldButton, LiftIn, theme } from '../components/ui';
import { ExploreSettings } from '../components/ExploreSettings';
import { ReminderCard } from '../components/ReminderCard';
import { onRecallFired, onRecallOpen, takeRecallOpen } from '../lib/discovery/recallCheck';
import { categoryOf } from '../lib/discovery/categories';
import { deadZoneDue, deadZoneNudge, inDeadZone, stripAt } from '../lib/landing/walk';
import { landingView, LANDING_VERSION, nearAreas, type LandingRow } from '../lib/landing/view';
import { placesFromTilePois } from '../lib/discovery/tilePois';
import { EXPLORE_KEY, exploredKey, kindOf } from '../lib/explore/explore';
import { useExplore } from '../lib/explore/useExplore';
import { db } from '../lib/db';
import { focusOn } from '../lib/focus';
import { boundsOf, distanceM, distanceToLinesM, nearPoints, pausedMs } from '../lib/geo';
import { capturesHere, type HereResult } from '../lib/here';
import { groupFirst, groupRadiusM, MEMORY_RULES, memoriesNear, memoryReader } from '../lib/memories';
import { MemoryPreview } from '../components/MemoryPreview';
import { deriveSegments, streetKey } from '../lib/streets';
import { feedback, MOTION } from '../lib/motion';
import { recorder } from '../lib/recorder';
import { PAUSE_REMIND_MS } from '../lib/notify';
import { ensureTileBuild } from '../lib/tiles';
import type { RecorderStatus } from '../lib/recorder/types';
import { pauseWalk, resumeWalk, stopWalk } from '../lib/session';
import { formatDistance, formatDuration, formatElapsed } from '../lib/summary';
import type { Capture, LngLat, Pause, StreetSegment, Walk } from '../lib/types';
import { useCaptures } from '../lib/useCaptures';
import { gpsLog } from '../lib/gpsLog';
import { notifyWalkChanged } from '../lib/walkEvents';
import { routeAhead } from '../lib/nav/navigator';
import { useNavigation } from '../lib/nav/useNavigation';
import { useVisible } from '../lib/deletion/useDeletions';
import { deletions } from '../lib/deletion';
import { UndoToast } from '../components/UndoToast';

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
/** The screen's own clock: weak GPS (20 s) and the pause reminder (10 min) need no finer. */
const SLOW_TICK_MS = 5000;

/** Time walked (paused time left out) and distance, in the bottom strip; a ride's distance after it (R6). */
function WalkStats(props: { startedAt: number | null; pauses: Pause[]; distanceM: number; rideM: number }) {
  const { startedAt, pauses, distanceM, rideM } = props;
  const elapsed = (now: number) => (startedAt == null ? 0 : now - startedAt - pausedMs(pauses, startedAt, now));
  // The ride on a second, smaller line, so the strip keeps its width at 390 px (rides audit, UI).
  const ride = rideM >= 1 ? `\n+ ${formatDistance(rideM)} ride` : '';
  return (
    <Ticking
      testID="walk-stats"
      style={styles.stats}
      numberOfLines={ride ? 2 : 1}
      text={(now) => `${formatElapsed(elapsed(now))} · ${formatDistance(distanceM)}${ride}`}
      label={(now) => `${formatDistance(distanceM)} walked in ${formatDuration(elapsed(now))}${rideM >= 1 ? `, plus ${formatDistance(rideM)} by ride` : ''}`}
    />
  );
}

/** The walk that has had its dead-zone nudge (L15): once a walk. */
const NUDGED_KEY = 'deadzone_walk';

/** A reminder's card goes after this long, or this far walked on. */
const REMINDER_MS = 30_000;
const REMINDER_AWAY_M = 100;
/** How long "Aa Caption" stays offered after a photo. */
const CAPTION_OFFER_MS = 6000;

type Notice = { message: string; tone?: 'info' | 'error'; openSettings?: boolean; sticky?: boolean };

// A screen that throws shows what broke, with Try again, never a blank page (bug, Nov 1).
export { ScreenError as ErrorBoundary } from '../components/ScreenError';

/** The walk's settings panel sits this far up, clear of the capture row (bottom + 92, 68 tall) and its gap. */
const SETTINGS_FOOT = 92 + 68 + 12;

export default function WalkScreen() {
  perfCount('render:walk');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const edgeRight = Math.max(12, (width - 640) / 2 + 12);
  /** The top column's side margin: centered in 640 on wide screens, like the rest. */
  const sideInset = Math.max(12, (width - 640) / 2);
  const params = useLocalSearchParams<{ warning?: string; started?: string; recall?: string }>();
  const [walk, setWalk] = useState<Walk | null>(null);
  // The open walk's pauses and live trace are kept above this screen, so they go on while it is
  // minimized (NV8); this screen shows them.
  const openWalk = useOpenWalk();
  const pauses = openWalk.pauses;
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
  const [viewing, setViewing] = useState<Capture[] | null>(null);
  // The walk's options card (A2).
  const [options, setOptions] = useState(false);
  // The GPS log, read when the card opens, so a tap can share it at once (a browser
  // only opens the share sheet straight from a tap, not after a wait).
  const logText = useRef<string | null>(null);
  // Counts returns to the front, so a hint or reminder tapped in the background is picked up.
  const [resumed, setResumed] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setResumed((n) => n + 1));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    db.getOpenWalk().then(async (w) => {
      if (!w) {
        router.replace('/');
        return;
      }
      setWalk(w);
    });
  }, []);
  useEffect(
    () =>
      recorder.subscribeStatus((s) => {
        // The recorder reports "recording" with every fix: only a change re-renders the screen (perf).
        setStatus((prev) => (prev.kind === s.kind && JSON.stringify(prev) === JSON.stringify(s) ? prev : s));
        if (s.kind === 'error') setNotice({ message: s.message, tone: 'error', openSettings: s.openSettings, sticky: true });
      }),
    [],
  );
  useEffect(() => {
    // Slow on purpose: only weak GPS and the pause reminder read it. The clock and the memo
    // timer tick in their own small components, so the screen isn't re-rendered each second (perf).
    const t = setInterval(() => setNow(Date.now()), SLOW_TICK_MS);
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
  useEffect(() => onWalkGap(onGap), [onGap]);
  // The keeper's trace, once it holds this walk.
  const live = openWalk.live;
  const cap = useCaptures(walk?.id ?? null, live.here, live.lastFixAt, onCaptureError);
  // A deleted moment leaves the pins, Explore and the viewer at once (D3, D5).
  const captures = useVisible(cap.captures);

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
  const visitedRef = useRef<Set<string> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const liveRuns = useRef(live.runs);
  useEffect(() => {
    liveRuns.current = live.runs;
  }, [live.runs]);
  useEffect(() => {
    const now = live.here;
    const run = fogRun.current;
    // Not on a ride: its streets aren't walked, and a bus would read the map every few seconds (rides audit 13).
    if (!now || build == null || live.riding || run.busy || (run.at && distanceM(run.at, now) < FOG_STEP_M)) return;
    run.busy = true;
    run.at = now;
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
      // Credited streets change only at a stop: read once per walk screen.
      visitedRef.current ??= await db.visitedSegmentIds();
      const visited = visitedRef.current;
      // The screen may have gone; a newer fix never cancels a run already under way (perf: a slow
      // read on a phone was always thrown away by the next fix, 2 s later).
      if (!mountedRef.current) return;
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
  }, [live.here, live.riding, build]);
  // Unwalked streets near me: a count, and the fog drawn boldly over a veiled map.
  const [showUnwalked, setShowUnwalked] = useState(false);
  // Named streets only (the owner's call): unnamed paths are fog, not a count.
  const unwalkedCount = useMemo(() => new Set(fog.filter((x) => x.name).map(streetKey)).size, [fog]);

  // A long press on the map opens a small sheet for that spot: Go here, and
  // what happened here (every capture near it, on any walk) when there is any.
  const [here, setHere] = useState<HereResult | null>(null);
  // A memory pin's preview (MR4).
  const [memory, setMemory] = useState<{ result: HereResult; from: LngLat | null } | null>(null);
  const [spot, setSpot] = useState<{ at: LngLat; here: HereResult | null; from: LngLat | null } | null>(null);
  const hereTaps = useRef(0);
  const [hereKey, setHereKey] = useState(0);
  // Settings (E16-E21), opened from the walk's options; the range is previewed as a ring on this map.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [panelH, setPanelH] = useState(0);
  async function pressMap(at: LngLat, radiusM?: number) {
    if (cap.voiceStartedAt != null || stopping || viewing || here || settingsOpen) return;
    setMarkOpen(null);
    setOptions(false);
    setMemory(null);
    feedback('tap');
    const tap = ++hereTaps.current;
    const found = await capturesHere(at, captures, radiusM).catch(() => null);
    if (tap !== hereTaps.current) return; // a newer press won
    // Storage still holds what waits in Undo: it isn't counted here (deletion audit 7).
    const r = found && { ...found, captures: found.captures.filter((c) => !deletions.hidden().has(c.id)) };
    setSpot({ at, here: r && r.captures.length ? r : null, from: live.here });
  }
  useEffect(() => {
    logText.current = null;
    if (!options || !walk) return;
    let live = true;
    void Promise.all([db.getPoints(walk.id), db.getCaptures(walk.id)]).then(([points, captures]) => {
      if (!live) return;
      const device = Platform.OS === 'web' ? navigator.userAgent : `${Platform.OS} ${Platform.Version}`;
      logText.current = gpsLog({ startedAt: walk.started_at, points, captures, userAgent: device });
    });
    return () => {
      live = false;
    };
  }, [options, walk]);
  const shareLog = useCallback(() => {
    const text = logText.current;
    if (!text) {
      setNotice({ message: 'The GPS log is still being read. Try again in a moment.' });
      return;
    }
    Share.share({ message: text, title: 'Chronicles GPS log' }).catch(async () => {
      // A browser without a share sheet (a desktop): copy it instead.
      const clip = Platform.OS === 'web' ? navigator.clipboard : undefined;
      if (clip) {
        await clip.writeText(text).then(
          () => setNotice({ message: 'GPS log copied. Paste it in a message.' }),
          () => setNotice({ message: 'Couldn’t share or copy the GPS log.', tone: 'error' }),
        );
      }
    });
  }, []);
  // The spot card (and the options card) goes once you walk on, or with Back (Android) and Escape (web).
  useEffect(() => {
    if (!spot && !options && !settingsOpen && !memory) return;
    const close = () => {
      setSpot(null);
      setMemory(null);
      setOptions(false);
      // Settings close as Cancel does (audit, UI).
      setSettingsOpen(false);
      setPreview(null);
      setFollowing(true);
    };
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
  }, [spot, options, settingsOpen, memory]);
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
    riding: live.riding,
    map: () => mapRef.current,
    onArrive: (dest) => {
      feedback('success');
      // Said once: the line on screen is announced by the screen reader here, not by a live region.
      setArrived(`You’re here: ${dest.label}`);
      AccessibilityInfo.announceForAccessibility(`You're here: ${dest.label}`);
    },
    // Errors stay up long enough to read at a glance, and can be dismissed.
    onError: (m) => setNotice({ message: m, tone: 'error' }),
    onNotice: (m) => setArrived(m),
  });
  // The route ahead of you only; what is behind is walked.
  const routeLine = useMemo(
    () => (navigation.nav ? (live.here ? routeAhead(navigation.nav.route.path, live.here) : navigation.nav.route.path) : null),
    [navigation.nav, live.here],
  );
  // Explore (v1 slice 5): checklists are built quietly on every walk (E2); the layers show only
  // on an exploring walk (E1, E9), and a capture finds a place on any walk.
  const fixes = useMemo(() => live.runs.flat(), [live.runs]);
  const [markOpen, setMarkOpen] = useState<string | null>(null);
  const [landings, setLandings] = useState<LandingRow[]>([]);
  const [exploring, setExploring] = useState(false);
  const quiet = !exploring;
  const reloadLandings = useCallback(() => {
    db.listLandings().then((r) => setLandings(r.filter((x) => x.rules === LANDING_VERSION)), () => {});
  }, []);
  const explore = useExplore({
    walkId: walk?.id ?? null,
    exploring,
    here: live.here,
    riding: live.riding,
    fixes,
    captures: captures,
    route: routeLine,
    routePath: navigation.nav?.route.path ?? null,
    previewRangeM: preview,
    onAreas: reloadLandings,
    onFound: (item) => {
      // Quietly on a quiet walk (E9): kept, shown in the replay, nothing on screen.
      if (!exploring) return;
      feedback('success');
      setArrived(`Found: ${item.name}`);
      AccessibilityInfo.announceForAccessibility(`Found: ${item.name}, ${categoryOf(item.category).label}`);
    },
  });
  const openMark = markOpen ? explore.itemOf(markOpen) : null;
  const openMarkNamed = !!openMark && (explore.revealed.has(openMark.key) || explore.found.has(openMark.key));
  // Going to a place: "A place to find" until it is revealed, then its name (E12).
  const navKey = navigation.nav?.dest.kind === 'find' ? navigation.nav.dest.placeKey : undefined;
  const navItem = navKey ? explore.itemOf(navKey) : null;
  const relabel = navigation.relabel;
  useEffect(() => {
    if (navItem && (explore.revealed.has(navItem.key) || explore.found.has(navItem.key))) relabel(navItem.name);
  }, [navItem, explore.revealed, explore.found, relabel]);
  // The range preview (E21): the ring is drawn on this map, around you, only while settings are open.
  const ring = useMemo(() => (preview != null && live.here ? { center: live.here, radiusM: preview } : null), [preview, live.here]);
  const ringFit = useMemo(() => (ring ? boundsOf([ring.center], ring.radiusM * 1.15) : null), [ring]);
  const [ringKey, setRingKey] = useState(0);
  // Each new range refits the map to the ring, above the panel.
  const onPreview = useCallback((m: number | null) => {
    setPreview(m);
    if (m != null) setRingKey((k) => k + 1);
    // Closed: back to following you, out of the ring's zoom (audit, UI).
    else setFollowing(true);
  }, []);
  // Remind me here (v1 slice 4): a flagged capture comes back when this walk
  // passes it (R2, R3). The web checks on each accepted fix in the open walk's
  // keeper, minimized or not (NV8); on a phone the location task checks every
  // batch. Fires reach this card while the screen is in front. A second fire
  // joins the open card (R7).
  const [reminder, setReminder] = useState<{ captures: Capture[]; at: LngLat | null; shownAt: number } | null>(null);
  // Memories on revisit: earlier walks' captures within 100 m, as faint pins, on every walk (the
  // owner's call), never a buzz or a notification (MR1, MR6). The area is read once per 50 m (MR8).
  const [memoryStore, setMemoryPool] = useState<Capture[]>([]);
  // A memory deleted from its viewer leaves its pin (D3).
  const memoryPool = useVisible(memoryStore);
  // The memory card drops what was deleted from its viewer (deletion audit 7).
  const memoryShown = useVisible(memory?.result.captures);
  // One reader per walk: a slow read lands even as fixes come in, a failed one is tried again, and
  // it sends only a changed set (audit 1, 10).
  const [memoryReads] = useState(() => memoryReader((at) => db.capturesIn(boundsOf([at], MEMORY_RULES.readBoxM)!), setMemoryPool));
  useEffect(() => () => memoryReads.stop(), [memoryReads]);
  useEffect(() => {
    if (live.here) memoryReads.poll(live.here);
  }, [live.here, memoryReads]);
  // A capture whose reminder card is up has no pin meanwhile (MR7); the pins change only with the set (MR8).
  const memoryIds = memoriesNear({ pool: memoryPool, here: live.here, walkId: walk?.id ?? null, hidden: new Set(reminder?.captures.map((c) => c.id) ?? []) })
    .map((c) => c.id)
    .join(',');
  const memories = useMemo(() => {
    const ids = new Set(memoryIds.split(','));
    return memoryPool.filter((c) => ids.has(c.id));
  }, [memoryIds, memoryPool]);
  const [memoryView, setMemoryView] = useState<HereResult | null>(null);
  const memoryTaps = useRef(0);
  const openMemory = async (group: Capture[], at: LngLat) => {
    const tap = ++memoryTaps.current;
    // The tapped pin's own captures first, then every other memory from that spot, reaching the
    // group's farthest member (MR5, audit 3); this walk's own captures aren't memories.
    const r = await capturesHere(at, [], groupRadiusM(at, group)).catch(() => null);
    if (tap !== memoryTaps.current) return;
    const captures = groupFirst(group, r?.captures ?? [], walk?.id ?? null).filter((c) => !deletions.hidden().has(c.id));
    if (!captures.length) return;
    // One card at a time (audit 5).
    setSpot(null);
    setMarkOpen(null);
    setOptions(false);
    setMemory({ result: { captures, context: r?.context ?? new Map() }, from: live.here });
  };
  // The preview goes once you walk 30 m on (MR4).
  useEffect(() => {
    if (!memory?.from || !live.here || distanceM(memory.from, live.here) < MEMORY_RULES.closeM) return;
    const t = setTimeout(() => setMemory(null), 0);
    return () => clearTimeout(t);
  }, [memory, live.here]);
  const hereRef = useRef(live.here);
  useEffect(() => {
    hereRef.current = live.here;
  }, [live.here]);
  useEffect(
    () =>
      onRecallFired((due) => {
        setReminder((r) => {
          const all = [...(r?.captures ?? []), ...due.filter((c) => !r?.captures.some((x) => x.id === c.id))];
          return { captures: all, at: hereRef.current, shownAt: Date.now() };
        });
        AccessibilityInfo.announceForAccessibility(due.length > 1 ? `${due.length} memories here` : 'A memory from here');
      }),
    [],
  );
  // The card goes by itself after half a minute or 100 m walked on (it stays fired).
  useEffect(() => {
    if (!reminder) return;
    const walkedOn = reminder.at && live.here && distanceM(reminder.at, live.here) > REMINDER_AWAY_M;
    const t = setTimeout(() => setReminder(null), walkedOn ? 0 : Math.max(0, reminder.shownAt + REMINDER_MS - Date.now()));
    return () => clearTimeout(t);
  }, [reminder, live.here]);
  // A tapped reminder notification opens its captures, playing (R4).
  const [autoPlay, setAutoPlay] = useState(false);
  useEffect(() => {
    if (!walk) return;
    let alive = true;
    // A reminder tapped while this screen is in front opens here at once (audit 1).
    const off = onRecallOpen((found) => {
      setAutoPlay(true);
      setViewing(found);
      return true;
    });
    takeRecallOpen()
      .then((found) => {
        if (!alive || !found.length) return;
        setAutoPlay(true);
        setViewing(found);
      })
      .catch(() => {});
    return () => {
      alive = false;
      off();
    };
  }, [walk, params.recall, resumed]);
  // This walk explores only once switched on (E1); otherwise it is quiet: navigation and captures (E9).
  useEffect(() => {
    if (!walk) return;
    let alive = true;
    db.getMeta(EXPLORE_KEY).then((v) => alive && setExploring(v === walk.id), () => {});
    return () => {
      alive = false;
    };
  }, [walk]);
  const setExplore = (on: boolean) => {
    if (!walk) return;
    setExploring(on);
    if (!on) setMarkOpen(null);
    db.setMeta(EXPLORE_KEY, on ? walk.id : '').catch(() => {});
    // Its replay counts what it passed from here on (E11, audit 9): the first time it was switched on.
    if (on) {
      const key = exploredKey(walk.id);
      db.getMeta(key).then((v) => (v ? undefined : db.setMeta(key, String(Date.now()))), () => {}).catch(() => {});
    }
  };
  // Hotspots on the walk (v1.5 slice 3): the remembered areas' strips and pockets, current rules
  // only, read again on returning to the front (an area looked at meanwhile, audit).
  useEffect(() => {
    reloadLandings();
  }, [resumed, reloadLandings]);
  const hotStrips = useMemo(() => landings.flatMap((r) => r.analysis.strips), [landings]);
  // Drawn on an exploring walk only (E9), as information: pockets, strips and their names.
  // Only areas within 3 km (audit), keyed so a new fix doesn't rebuild the labels.
  const nearKeys = nearAreas(landings, live.here).map((r) => r.key).join('|');
  const hotView = useMemo(() => {
    const keys = new Set(nearKeys.split('|'));
    const near = landings.filter((r) => keys.has(r.key));
    return near.length && exploring ? landingView(near, build) : null;
  }, [landings, build, nearKeys, exploring]);
  const hotPockets = useMemo(
    () => landings.flatMap((r) => r.analysis.pockets.map((p) => ({ name: p.name, centre: p.centre, strip: p.strips.length > 0 }))),
    [landings],
  );
  // On a strip: on within 30 m, off past 45 m, so jitter at the edge doesn't blink it (audit).
  const [onStrip, setOnStrip] = useState<string | null>(null);
  useEffect(() => {
    const at = live.here;
    const t = setTimeout(() => setOnStrip((cur) => (at && hotStrips.length && exploring ? stripAt(at, hotStrips, cur) : null)), 0);
    return () => clearTimeout(t);
  }, [live.here, hotStrips, exploring]);
  // A dead zone, 10 min (walking, not paused) from every pocket: once a walk, a pill toward the
  // nearest (L15). Nothing is read from storage until it could fire (audit).
  const farSince = useRef<number | null>(null);
  const nudgedRef = useRef<boolean | null>(null);
  const [nudge, setNudge] = useState<{ text: string; at: LngLat; name: string } | null>(null);
  const pausedNow = pauses.some((p) => p.ended_at == null);
  useEffect(() => {
    const at = live.here;
    if (!walk || !at || !hotPockets.length) return;
    const now = Date.now();
    // Riding is not walking far from everything (rides audit 13).
    if (pausedNow || live.riding || !inDeadZone(at, hotPockets)) {
      farSince.current = null;
      return;
    }
    farSince.current ??= now;
    const far = now - farSince.current;
    if (nudgedRef.current || !deadZoneDue({ here: at, pockets: hotPockets, farSinceMs: far })) return;
    let alive = true;
    (async () => {
      nudgedRef.current ??= (await db.getMeta(NUDGED_KEY)) === walk.id;
      const got = deadZoneNudge({ here: at, pockets: hotPockets, farSinceMs: far, quiet, nudged: nudgedRef.current });
      if (alive && got) setNudge(got);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [walk, live.here, live.riding, hotPockets, quiet, pausedNow]);
  // Spent only once it has been seen: not under a card, a route or settings, never on a quiet walk (audit).
  const nudgeShown = !!nudge && !quiet && !spot && !openMark && !options && !memory && !settingsOpen && !navigation.nav && !navigation.finding;
  useEffect(() => {
    if (!nudgeShown || !walk) return;
    if (!nudgedRef.current) {
      nudgedRef.current = true;
      db.setMeta(NUDGED_KEY, walk.id).catch(() => {});
      AccessibilityInfo.announceForAccessibility(nudge!.text);
    }
    const t = setTimeout(() => setNudge(null), 20_000);
    return () => clearTimeout(t);
  }, [nudgeShown, walk, nudge]);
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
  const marks = useMemo<LngLat[]>(
    () => [...(navigation.nav ? [navigation.nav.dest.at] : []), ...(spot ? [spot.at] : [])],
    [navigation.nav, spot],
  );


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
      feedback('success');
      router.replace(`/replay/${walk.id}`);
    } catch (e) {
      setNotice({ message: `The walk could not be stopped: ${e instanceof Error ? e.message : e}`, tone: 'error', sticky: true });
    } finally {
      setStopping(false);
    }
  }

  // The walk goes on beneath the tabs: the recorder, the trace and the reminders are kept above
  // this screen (NV8). Never mid-memo: leaving would cut it short.
  function minimize() {
    if (recordingVoice || stopping) return;
    feedback('tap');
    AccessibilityInfo.announceForAccessibility('Walk minimized. Still recording.');
    if (router.canGoBack()) router.back();
    else router.replace('/');
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
      feedback('tap');
    } catch (e) {
      setNotice({ message: `Could not ${paused ? 'resume' : 'pause'}: ${e instanceof Error ? e.message : e}`, tone: 'error', sticky: true });
    } finally {
      // The screen shows whatever the database holds, even after a failure.
      await notifyWalkChanged();
      setPausing(false);
    }
  }

  async function saveNote() {
    const ok = await cap.saveNote(note);
    if (ok) {
      setNote('');
      setNoteOpen(false);
      feedback('tap');
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
    feedback('tap');
    if (kept.kind === 'photo') setJustTook(kept.id);
    else setToast('Video saved here');
  }

  async function startVoice() {
    if (await cap.startVoice()) {
      feedback('tap');
      giveUpMemo.current = false;
      AccessibilityInfo.announceForAccessibility('Recording voice memo');
    }
  }

  async function saveVoice() {
    const r = await cap.finishVoice();
    if (r === 'saved') {
      feedback('tap');
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
  // Weak GPS is no usable fix for a while, judged before the speed gate: a bus's fixes are good ones (R11).
  const weak = status.kind === 'recording' && live.lastGoodAt != null && now - live.lastGoodAt > WEAK_GPS_MS;
  // The growing trace says it is recording; the status only shows when it is not.
  const problem =
    paused ? { label: 'Paused', color: theme.muted }
    : status.kind === 'error' ? { label: 'Not recording', color: theme.danger }
    : status.kind === 'waiting' || status.kind === 'idle' ? { label: 'Waiting for GPS', color: theme.warn }
    : weak ? { label: 'Weak GPS', color: theme.warn }
    : live.riding ? { label: 'On a ride', color: theme.muted }
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

  return (
    <View style={styles.screen}>
      <WalkMap
        landing={hotView}
        trace={live.runs}
        rides={live.rides}
        walked={walked}
        fog={fog}
        captures={captures}
        // Opening a capture would hide a memo that is still recording.
        onPinPress={recordingVoice || stopping || settingsOpen ? undefined : setViewing}
        walker={live.here}
        glideWalker
        walkerHeading={live.heading}
        // Not while a route is found: the street read moves the camera itself.
        follow={following && !navigation.finding && !ring ? live.here : null}
        onPress={() => {
          setSpot(null);
          setMarkOpen(null);
          setMemory(null);
        }}
        memories={memories}
        onMemoryPress={recordingVoice || stopping || settingsOpen ? undefined : (group, at) => void openMemory(group, at)}
        discoveries={explore.pins}
        onDiscoveryPress={recordingVoice || stopping || settingsOpen ? undefined : (id) => {
          // A found place is shown, not a card to open: its capture's pin is the thing to tap (audit, UI).
          if (explore.found.has(id)) return;
          setSpot(null);
          setMemory(null);
          setMarkOpen(id);
        }}
        marks={marks}
        ring={ring}
        fitBounds={ringFit}
        fitKey={ringKey}
        fitPadding={{ top: insets.top + 24, bottom: panelH + 24, left: 24, right: 24 }}
        onUserMove={() => setFollowing(false)}
        // A long press, so a stray tap while walking does nothing.
        onLongPress={pressMap}
        route={routeLine}
        // While navigating the trace steps aside, so the route reads; it is still recorded (the owner's call, Nov 2).
        traceOpacity={navigation.nav ? 0 : 1}
        covered={navigation.finding}
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
        {/* Minimize (NV7): down to the recording bar above the tabs, still recording. At the top-left
            edge, under the navigation bar when one shows, away from the capture row and Stop. */}
        <View style={styles.minRow} pointerEvents="box-none">
          <Pressable
            testID="walk-minimize"
            accessibilityRole="button"
            accessibilityLabel="Minimize the walk"
            accessibilityHint="It keeps recording. The bar above the tabs brings it back."
            onPress={minimize}
            disabled={recordingVoice || stopping}
            hitSlop={6}
            style={({ pressed }) => [styles.edgeBtn, styles.minBtn, (recordingVoice || stopping) && styles.disabled, pressed && styles.pressed]}
          >
            <Icon name="chevron-down" size={24} color={theme.ink} />
          </Pressable>
        </View>
        {navigation.nav?.offRoute && (
          <LiftIn style={styles.chip} accessibilityLiveRegion="polite">
            <View style={[styles.statusDot, { backgroundColor: theme.warn }]} />
            <Text style={styles.chipText}>Off your route</Text>
          </LiftIn>
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
        {arrived && (
          <LiftIn style={styles.toast}>
            <Text style={[styles.toastText, styles.flashText]}>{arrived}</Text>
          </LiftIn>
        )}
        {onStrip && !problem && (
          // Quiet: a chip, not a notification or a hint (L14).
          <LiftIn testID="on-strip" style={styles.chip}>
            <View style={[styles.statusDot, { backgroundColor: HOTSPOT }]} />
            <Text style={styles.chipText}>On {onStrip}</Text>
          </LiftIn>
        )}
        {problem && (
          <View style={styles.chip} accessible accessibilityLabel={problem.label} accessibilityLiveRegion="polite">
            <View style={[styles.statusDot, { backgroundColor: problem.color }]} />
            <Text style={styles.chipText}>{problem.label}</Text>
          </View>
        )}
        {nudgeShown && nudge && (
          <View testID="dead-zone" style={styles.undo}>
            <Text style={[styles.undoText, { flexShrink: 1 }]} numberOfLines={2}>{nudge.text}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Go to ${nudge.name}`}
              onPress={() => {
                const n = nudge;
                setNudge(null);
                navigation.goTo({ at: n.at, label: n.name, kind: 'place' });
              }}
              hitSlop={10}
              style={styles.undoBtn}
            >
              <Text style={styles.undoBtnText}>Go here</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => setNudge(null)} hitSlop={10}>
              <Icon name="close" size={18} color="#ffffff" />
            </Pressable>
          </View>
        )}
        {reminder && (
          <ReminderCard
            captures={reminder.captures}
            onOpen={() => {
              setAutoPlay(true);
              setViewing(reminder.captures);
              setReminder(null);
            }}
            onDismiss={() => setReminder(null)}
          />
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
          <LiftIn style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.toastText}>{toast}</Text>
          </LiftIn>
        )}
      </View>

      {/* Captures float in the lower-middle of the screen, where either thumb
          reaches; the bottom edge is the least accurate place to tap. Pills
          (caption, undo, retry) sit above the row, so the row never moves. */}
      <View style={[styles.captures, { bottom: insets.bottom + 92 }]} pointerEvents="box-none">
        {recordingVoice && (
          <View style={styles.voiceLive} accessible accessibilityLabel="Recording voice memo">
            <PulseDot />
            <Ticking style={styles.voiceLiveText} text={(t) => formatElapsed(t - cap.voiceStartedAt!)} />
          </View>
        )}
        {justTook && !recordingVoice && !spot && !openMark && !options && !memory && (
          <View style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>Photo saved here</Text>
            <Pressable
              testID="add-caption"
              accessibilityRole="button"
              onPress={() => {
                setCaptioning(captures.find((c) => c.id === justTook) ?? null);
                setJustTook(null);
              }}
              hitSlop={10}
              style={styles.undoBtn}
            >
              <Text style={styles.undoBtnText}>Aa Caption</Text>
            </Pressable>
          </View>
        )}
        {cap.discarded && !recordingVoice && !spot && !openMark && !options && !memory && (
          <View style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>Voice memo discarded</Text>
            <Pressable testID="voice-undo" accessibilityRole="button" onPress={() => cap.undoDiscard()} hitSlop={10} style={styles.undoBtn}>
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          </View>
        )}
        {cap.unsaved && !recordingVoice && !spot && !openMark && !options && !memory && (
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
          <WalkStats startedAt={walk?.started_at ?? null} pauses={pauses} distanceM={live.distanceM} rideM={live.rideM} />
          <View style={styles.barActions}>
          <Pressable
            testID="walk-options"
            accessibilityRole="button"
            accessibilityLabel={exploring ? 'Walk options, exploring' : 'Walk options'}
            accessibilityState={{ expanded: options }}
            onPress={() => {
              setSpot(null);
              setMarkOpen(null);
              setMemory(null);
              setOptions((v) => !v);
            }}
            style={({ pressed }) => [styles.pauseBtn, options && styles.optionsOn, pressed && styles.pressed]}
          >
            <Icon name={exploring ? 'compass-outline' : 'options-outline'} size={20} color={options ? '#ffffff' : theme.ink} />
          </Pressable>
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

      {options && (
        <View style={[styles.spotRow, { bottom: insets.bottom + 92 + 68 + 12 }]} pointerEvents="box-none">
          <View testID="options-card" style={styles.spot} accessibilityViewIsModal>
            <Text style={styles.spotTitle} accessibilityRole="header">This walk</Text>
            <View style={styles.optionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>Explore</Text>
                <Text style={styles.markSub}>
                  {exploring
                    ? 'Places to find show as “?” when they’re close, with busy streets and reminders.'
                    : 'Off: a quiet walk, just navigation and your captures. Captures still find places.'}
                </Text>
              </View>
              <Switch testID="explore-walk" accessibilityLabel="Explore" value={exploring} onValueChange={setExplore} />
            </View>
            <Pressable
              testID="open-settings"
              accessibilityRole="button"
              accessibilityLabel="Settings: what I’m into and the question mark range"
              onPress={() => {
                setOptions(false);
                setMarkOpen(null);
                setSpot(null);
                setSettingsOpen(true);
              }}
              style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
            >
              <Icon name="settings-outline" size={20} color={theme.ink} />
              <Text style={[styles.optionLabel, { flex: 1 }]}>What I’m into, and the “?” range</Text>
              <Icon name="chevron-forward" size={18} color={theme.muted} />
            </Pressable>
            <Pressable
              testID="share-gps-log"
              accessibilityRole="button"
              accessibilityLabel="Share this walk’s GPS log, to help fix location problems"
              onPress={shareLog}
              style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
            >
              <Icon name="share-outline" size={20} color={theme.ink} />
              <Text style={[styles.optionLabel, { flex: 1 }]}>Share GPS log</Text>
            </Pressable>
            <Pressable testID="options-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOptions(false)} style={[styles.spotClose, { position: 'absolute', top: 4, right: 4 }]} hitSlop={8}>
              <Icon name="close" size={22} color={theme.ink} />
            </Pressable>
          </View>
        </View>
      )}
      {openMark && !spot && !quiet && (
        // A place's card, in the spot card's place (E7, E8, E12).
        <View style={[styles.spotRow, { bottom: insets.bottom + 92 + 68 + 12 }]} pointerEvents="box-none">
          <View testID="mark-card" style={styles.spot} accessibilityViewIsModal>
            <Text style={styles.spotTitle} accessibilityRole="header">
              {openMarkNamed ? `${openMark.name} · ${kindOf(openMark.kind).label}` : 'A place to find'}
            </Text>
            <Text style={styles.markSub}>
              {live.here ? `${formatDistance(distanceM(live.here, openMark.at))} away. ` : ''}
              {explore.found.has(openMark.key)
                ? 'Found.'
                : openMarkNamed
                  ? 'Take a photo, a memo or a note here to find it.'
                  : 'Walk within 60 m to see what it is.'}
            </Text>
            <View style={styles.spotActions}>
              <Button
                testID="mark-go"
                label="Go here"
                onPress={() => {
                  const m = openMark;
                  setMarkOpen(null);
                  navigation.goTo({ at: m.at, label: openMarkNamed ? m.name : 'A place to find', kind: 'find', placeKey: m.key });
                }}
                disabled={navigation.finding}
              />
              <Pressable testID="mark-close" accessibilityRole="button" accessibilityLabel="Close" onPress={() => setMarkOpen(null)} style={styles.spotClose} hitSlop={8}>
                <Icon name="close" size={22} color={theme.ink} />
              </Pressable>
            </View>
          </View>
        </View>
      )}
      <ExploreSettings
        visible={settingsOpen}
        hasRing={!!live.here}
        // Above the capture row and the strip: capture stays one tap away while settings are open (rev 34).
        bottomInset={0}
        bottom={insets.bottom + SETTINGS_FOOT}
        onHeight={setPanelH}
        onClose={() => setSettingsOpen(false)}
        onPreview={onPreview}
      />

      <CaptureViewer
        key={viewing?.[0]?.id ?? 'none'}
        captures={viewing && viewing.map((v) => captures.find((c) => c.id === v.id) ?? v)}
        onClose={() => {
          setViewing(null);
          setAutoPlay(false);
        }}
        autoPlay={autoPlay}
        remind
        walkId={walk?.id ?? null}
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
      {memory && memoryShown.length > 0 && !spot && !recordingVoice && (
        <View style={[styles.spotRow, { bottom: insets.bottom + 92 + 68 + 12 }]} pointerEvents="box-none">
          <MemoryPreview
            // A new pin's preview starts fresh: never the last pin's photo (audit 1).
            key={memoryShown[0].id}
            captures={memoryShown}
            walkLine={memory.result.context.get(memoryShown[0].id) ?? null}
            onOpen={() => {
              const r = { ...memory.result, captures: memoryShown };
              setMemory(null);
              setMemoryView(r);
            }}
            onClose={() => setMemory(null)}
          />
        </View>
      )}
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
        title="Memories here"
        remind
        walkId={walk?.id ?? null}
        captures={memoryView?.captures ?? null}
        context={memoryView?.context}
        onClose={() => setMemoryView(null)}
      />
      <CaptureViewer
        key={`here:${hereKey}`}
        title="What happened here"
        remind
        walkId={walk?.id ?? null}
        captures={here?.captures ?? null}
        context={here?.context}
        onClose={() => setHere(null)}
      />

      {/* At the top, clear of the voice memo's own Undo and the caption pill above the capture row (UI review). */}
      <UndoToast style={{ top: insets.top + 64 }} />

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
          Animated.timing(o, { toValue: 0.3, duration: MOTION.pulse, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(o, { toValue: 1, duration: MOTION.pulse, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
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
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: theme.ink },
  optionsOn: { backgroundColor: theme.ink, borderColor: theme.ink },
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
  stats: { color: theme.ink, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], flexShrink: 1 },
  stopInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  pauseBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.ink, backgroundColor: theme.surface,
  },
  // Resume is the one thing to do while paused.
  pauseBtnOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  edgeBtnOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  minRow: { alignSelf: 'stretch', flexDirection: 'row' },
  minBtn: { position: 'relative' },
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
