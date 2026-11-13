import { type Faced, facedAll } from '../lib/moment';
import { NewNotePage } from '../components/notePage/NewNotePage';
import type { NotePageHandle } from '../components/notePage/NotePage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, BackHandler, Switch, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Modal } from '../components/Modal';
import { onWalkGap, useOpenWalk, useOpenWalkInfo } from '../components/OpenWalk';
import { Ticking } from '../components/Ticking';
import { perfCount } from '../lib/perfCount';
import { createStore } from '../lib/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalkMap } from '../components/map/WalkMap';
import { CompassButton } from '../components/CompassButton';
import { WalkBandIcon } from '../components/WalkBandIcon';
import { LayersControl, LayersKey } from '../components/LayersControl';
import { COLORS, HOTSPOT, namesNearYou, type WalkMapHandle } from '../components/map/types';
import { EditOfferPill, useEditOffer } from '../components/edit/EditOffer';
import { MediaEditor } from '../components/edit/MediaEditor';
import { CaptureViewer } from '../components/CaptureView';
import { Icon, KIND_LABEL } from '../components/icons';
import { Banner, Button, HoldButton, LiftIn, theme } from '../components/ui';
import { GapCard } from '../components/GapCard';
import { emptyGapAt, gapKey, stretchAt, type Gap } from '../lib/gaps/infer';
import type { DrawnLine } from '../lib/gaps/draw';
import { useGapDraw } from '../lib/gaps/useGapDraw';
import { GapDraw } from '../components/GapDraw';
import { ComplexKindSwitches, KindSwitches, RangeSlider, walkNote } from '../components/ExploreSettings';
import { NotificationSettings } from '../components/NotificationSettings';
import { RouteLeaningSettings } from '../components/RouteLeaningSettings';
import { RoutePreview } from '../components/RoutePreview';
import { forPreview } from '../lib/nav/previewView';
import { SwitchRow } from '../components/SwitchRow';
import { ReminderCard } from '../components/ReminderCard';
import { onRecallFired, onRecallOpen, onRecallWaiting, takeRecallOpen } from '../lib/discovery/recallCheck';
import { categoryOf } from '../lib/discovery/categories';
import { deadZoneDue, deadZoneNudge, inDeadZone, stripAt } from '../lib/landing/walk';
import { rulesCurrent, type LandingRow } from '../lib/landing/view';
import { placesFromTilePois } from '../lib/discovery/tilePois';
import { canBuzz } from '../lib/canBuzz';
import { clampRange, EXPLORE_KEY, exploredKey, kindOf, POCKET_ALERT_NOTE, type Kind } from '../lib/explore/explore';
import { DEFAULT_SETTINGS, loadSettings, onSettings, saveSettings, type ExploreSettings } from '../lib/explore/settings';
import { useExplore } from '../lib/explore/useExplore';
import { reach } from '../lib/explore/reach';
import { reachLine } from '../lib/explore/reach/rule';
import { db } from '../lib/db';
import { focusOn } from '../lib/focus';
import { boundsOf, distanceM, distanceToLinesM, nearPoints, pausedMs } from '../lib/geo';
import { capturesHere, type HereResult } from '../lib/here';
import { groupFirst, groupRadiusM, MEMORY_RULES, memoriesNear, memoryReader } from '../lib/memories';
import { MemoryPreview } from '../components/MemoryPreview';
import { deriveSegments, streetKey } from '../lib/streets';
import { feedback } from '../lib/motion';
import { recorder } from '../lib/recorder';
import { PAUSE_REMIND_MS } from '../lib/notify';
import { ensureTileBuild } from '../lib/tiles';
import { startErrorFrom, type RecorderStatus } from '../lib/recorder/types';
import { retryRecorder } from '../lib/recorderRetry';
import { useUnits } from '../lib/useUnits';
import { formatRange } from '../lib/format';
import { pauseWalk, restartRecording, resumeWalk, stopWalk } from '../lib/session';
import { formatDistance, formatDuration, formatElapsed } from '../lib/summary';
import type { LngLat, Pause, StreetSegment, Walk } from '../lib/types';
import { useCaptures } from '../lib/useCaptures';
import { momentPill } from '../lib/momentPill';
import { useStore } from '../lib/useStore';
import { AddToMomentPill } from '../components/walk/AddToMomentPill';
import { walkScreenShown } from '../lib/walkNav';
import { askMotion, useMotionAccess } from '../lib/walkMotion';
import { shareLogText, walkLogText } from '../lib/shareLog';
import { notifyWalkChanged } from '../lib/walkEvents';
import { routeAhead } from '../lib/nav/navigator';
import { HANDOFF_HINT, openInMaps } from '../lib/nav/openInMaps';
import { useNavigation } from '../lib/nav/useNavigation';
import { loadWayBack, saveWayBack } from '../lib/nav/store';
import { CHOSEN_NOTICE, showsWayBack, wayBackTarget } from '../lib/nav/wayBack';
import { layerNotes } from '../lib/layers/notes';
import { useBusyLayer } from '../lib/layers/useBusyLayer';
import { useLayers } from '../lib/layers/useLayers';
import { useRouteWarning } from '../lib/walk/useRouteWarning';
import { useWalkability } from '../lib/walk/useWalkability';
import { arrivalNotice, exitPlan, screenState, startNotice } from '../lib/readyNav';
import { noticeShown } from '../lib/pauseReminder';
import { getLastFix } from '../lib/lastFix';
import { CaptureStack } from '../components/walk/CaptureStack';
import { ReadyBar } from '../components/walk/ReadyBar';
import { scaleInsetBottom } from '../lib/stackSlots';
import { BAR_H, CAP, EDGE, GUTTER, raisedHeight, SCALE_BOTTOM, STACK_GAP, useStackLayout } from '../components/walk/layout';
import { useReady } from '../components/walk/useReady';
import { aboutTimeLeft, formatTimeLeft, paceMps, timeLeftMs } from '../lib/nav/eta';
import { optionAt } from '../lib/nav/scenic';
import { useVisible } from '../lib/deletion/useDeletions';
import { deletions } from '../lib/deletion';
import { UndoToast } from '../components/UndoToast';
import { bordersFor, outlineIdAt } from '../lib/areas/borders';
import { BORDER_ZOOM, OUTLINE_ZOOM } from '../lib/areas/outlines';
import { useOutlineSet } from '../lib/areas/useOutlineSet';
import { SpaceLine } from '../components/SpaceLine';
import { space } from '../lib/space';
import { heldLabel } from '../lib/space/core';

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

type Notice = {
  message: string;
  tone?: 'info' | 'error';
  openSettings?: boolean;
  sticky?: boolean;
  /** The paused reminder: the `started_at` of its pause; it goes when that pause ends (fix pause-banner). */
  forPause?: number;
  /** A route that couldn't be found offers the destination to the phone's maps app (NH5). */
  maps?: { at: LngLat; label: string };
  /**
   * A quiet refusal (T26): no alert, so the walk's live region says it to a screen reader. A count, so a raise of the
   * same words while they show still changes the region and is said again (tend recording audit 4).
   */
  said?: number;
};


// A screen that throws shows what broke, with Try again, never a blank page (bug, Nov 1).
export { ScreenError as ErrorBoundary } from '../components/ScreenError';

/**
 * The walk screen, and Navigate itself (NR1-NR6): ready with no walk open,
 * the walk with one. Start on the ready screen records in place: the walk
 * takes the screen once its plan is written, with no route change, so nothing
 * animates and every button stays where it was.
 */
export default function WalkRoute() {
  // In front: another ask to show the walk does nothing (tabs audit 1). Only while in front, not
  // while mounted: a walk screen left mounted behind the tabs once left the bar's › dead (Nov 2).
  useFocusEffect(useCallback(() => walkScreenShown(), []));
  // Leaving the walk screen (a tab, minimize) closes the Add to this moment pill (MS4).
  useFocusEffect(useCallback(() => () => momentPill.leave(), []));
  const info = useOpenWalkInfo();
  const close = useCallback(() => {
    feedback('tap');
    const to = exitPlan(router.canGoBack());
    if (to.kind === 'back') router.back();
    else router.replace(to.to);
  }, []);
  // Storage not read yet (or never, if it keeps failing): still a way back to the tabs (audit 8).
  if (screenState({ known: info.known, walkId: info.walk?.id ?? null }) === 'loading') return <WalkLoading onClose={close} />;
  return <WalkScreen onMinimize={close} />;
}

function WalkLoading(props: { onClose: () => void }) {
  const at = useStackLayout();
  return (
    <View style={styles.screen}>
      <View style={[styles.top, { top: at.insets.top + 4, left: at.sideInset, right: at.sideInset }]} pointerEvents="box-none">
        <View style={styles.minRow} pointerEvents="box-none">
          <Pressable
            testID="ready-close"
            accessibilityRole="button"
            accessibilityLabel="Close Navigate"
            onPress={props.onClose}
            style={({ pressed }) => [styles.edgeBtn, styles.minBtn, pressed && styles.pressed]}
          >
            <Icon name="chevron-down" size={24} color={theme.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function WalkScreen(props: { onMinimize: () => void }) {
  perfCount('render:walk');
  // Every distance on this screen follows the units setting (QL16).
  useUnits();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  /** The top column's side margin: centered in 640 on wide screens, like the rest. */
  const sideInset = Math.max(GUTTER, (width - 640) / 2);
  const params = useLocalSearchParams<{ warning?: string; started?: string; recall?: string }>();
  const at = useStackLayout();
  // The walk's cards sit above the strip, left of the stack's column, so they never cover it (audit 5).
  // zIndex 2: over the Layers button in the corner (1), under the drawer (3) (fix layers-corner audit 2).
  const cardAt = { bottom: at.barTop + 12, right: at.right + CAP + STACK_GAP, zIndex: 2 };
  // One screen, ready or walking (NR1, NR6): the walk is the keeper's open walk. While Start writes the
  // walk's plan the screen stays ready (the walk reads its mode as it shows); once stopped, the walk stays
  // on screen until the replay replaces it, never flashing the ready state.
  const info = useOpenWalkInfo();
  const [holding, setHolding] = useState(false);
  const [ended, setEnded] = useState<Walk | null>(null);
  const shownWalk = holding ? null : info.walk ?? ended;
  // Kept by id: the keeper's row is re-read with each pause, and the walk's effects key on it.
  const [walk, setWalkShown] = useState<Walk | null>(shownWalk);
  if ((walk?.id ?? null) !== (shownWalk?.id ?? null)) setWalkShown(shownWalk);
  // The open walk's pauses and live trace are kept above this screen, so they go on while it is
  // minimized (NV8); this screen shows them.
  const openWalk = useOpenWalk();
  const pauses = openWalk.pauses;
  // Stretches across gaps (Filling gaps, G9, G12): a tapped one's card, by gap.
  const gapView = openWalk.gaps;
  const liveHereRef = useRef<LngLat | null>(null);
  // Which gap, and where the walker was when it opened: walking 30 m on closes it, as the spot card (audit 7).
  const [gapOpenAt, setGapOpenAt] = useState<{ key: string; from: LngLat | null } | null>(null);
  const gapOpen = gapOpenAt?.key ?? null;
  const setGapOpen = useCallback((key: string | null) => setGapOpenAt(key ? { key, from: liveHereRef.current } : null), []);
  const [gapBusy, setGapBusy] = useState(false);
  // The tapped gap and its stretch, if it has one (a gap with no line has none: GW2).
  const openGapOf = gapOpen ? gapView.gaps.find((g) => gapKey(g) === gapOpen) ?? null : null;
  const openGap = gapOpen ? gapView.stretches.find((s) => gapKey(s) === gapOpen) ?? null : null;
  // The map follows the walker until they pan or zoom it themselves.
  const [following, setFollowing] = useState(true);
  // Drawing a gap's way (GW3-GW8): kept like Keep, as the line drawn. Following comes back after (audit, UI).
  const drawing = useGapDraw(
    useCallback(
      (gap: Gap, line: DrawnLine) => gapView.decide({ t0: gap.t0, t1: gap.t1, path: line.path, lengthM: line.lengthM, street: null, how: 'kept' }, 'kept'),
      [gapView],
    ),
    useCallback(() => setFollowing(true), []),
  );
  const isDrawing = drawing.gap != null;
  const [pausing, setPausing] = useState(false);
  const [status, setStatus] = useState<RecorderStatus>({ kind: 'idle' });
  const [now, setNow] = useState(() => Date.now());
  // One-off notices: a start warning or "started". The web's "keep this page open" note is said
  // once on first launch (Navigate), not on every walk (the owner's call, Nov 4).
  const [rawNotice, setNotice] = useState<Notice | null>(() =>
    !shownWalk
      ? null
      : params.warning
        ? { message: params.warning }
        : params.started
          ? { message: 'Walk started · recording' }
          : null,
  );
  // Walk here or Start can bring this screen up before the keeper has read the new walk: the notice follows
  // the walk's arrival, not the screen's mount (capture-from-chronicle audit 1).
  const [noticedWalk, setNoticedWalk] = useState<string | null>(shownWalk?.id ?? null);
  if (shownWalk && noticedWalk !== shownWalk.id) {
    setNoticedWalk(shownWalk.id);
    const message = rawNotice ? null : arrivalNotice(params);
    if (message) setNotice({ message });
  }
  // The note's page, begun at the pencil's tap (NP1), keyed so each opens fresh; `into` the open moment it joins (MS2, MS4).
  const [page, setPage] = useState<{ key: number; into: string | null } | null>(null);
  const noteOpen = page != null;
  const openNote = (into: string | null) => setPage((p) => ({ key: (p?.key ?? 0) + 1, into }));
  const pageRef = useRef<NotePageHandle>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [fog, setFog] = useState<StreetSegment[]>([]);
  const [walked, setWalked] = useState<StreetSegment[]>([]);
  // The memo whose save failed at Stop; holding Stop again ends the walk without it.
  const giveUpMemo = useRef(false);
  // How many held shots Stop has already warned about; a photo held beyond that is warned about too (SA8).
  const giveUpHeld = useRef(0);
  const saveRef = useRef<PressableRef>(null);
  const mapRef = useRef<WalkMapHandle>(null);
  // The map's turn, for the compass (CP2): the map opens north-up and keeps no bearing (CP8).
  // A store the compass reads, so a turn re-renders the compass alone (tend map 8).
  const [bearing] = useState(() => createStore(0));
  const [viewing, setViewing] = useState<Faced[] | null>(null);
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

  // The ready state (NR1, NR5-NR13): with no walk open, the map and the overlay are its.
  // The buttons the compass hands the focus to as it leaves (tend map 6): Locate on the ready screen; on the walk,
  // the one below it in the column, Walk me back while that shows, else the unwalked streets.
  const readyLocateRef = useRef<PressableRef>(null);
  const backRef = useRef<PressableRef>(null);
  const unwalkedRef = useRef<PressableRef>(null);
  const ready = useReady({
    locateRef: readyLocateRef,
    active: !walk,
    onClose: props.onMinimize,
    onStarting: () => setHolding(true),
    onStarted: (p) => {
      setHolding(false);
      // Recording in place (NR6): it says so, or the recorder's warning, or why its plan failed (audit 9, 10).
      if (p?.error) setNotice({ message: p.error, tone: 'error', sticky: true });
      else if (p) setNotice({ message: startNotice(p) });
    },
  });
  // The error notice is raised once per error: when the status first turns to error, or for a new
  // message. A retry's own pass through "waiting" doesn't count as leaving it, so a failed retry
  // keeps the chip and says nothing again (QL20); the chip's tap brings the notice back (QL19).
  const raisedError = useRef<string | null>(null);
  // Each quiet refusal raised, for the live region's repeat (tend recording audit 4).
  const saidCount = useRef(0);
  const retrying = useRef(false);
  useEffect(
    () =>
      recorder.subscribeStatus((s) => {
        // The recorder reports "recording" with every fix: only a change re-renders the screen (perf).
        setStatus((prev) => (prev.kind === s.kind && JSON.stringify(prev) === JSON.stringify(s) ? prev : s));
        if (s.kind !== 'error') {
          if (!retrying.current) raisedError.current = null;
          return;
        }
        if (raisedError.current === s.message) return;
        raisedError.current = s.message;
        // Location refused is a quiet notice (T26), said as Navigate's is (tend map audit 12): the live region below on
        // web, the call on a phone.
        const quiet = s.tone === 'info';
        setNotice({ message: s.message, tone: s.tone ?? 'error', openSettings: s.openSettings, sticky: true, said: quiet ? ++saidCount.current : undefined });
        if (quiet) AccessibilityInfo.announceForAccessibility(s.message);
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
  // The keeper's trace, once it holds this walk; motion runs in the keeper too (Motion).
  const live = openWalk.live;
  // Town borders (TB4): thin lines around you, the town you're in firmer, no fill, so the trace and fog read as before.
  const borderAt = walk ? live.here : ready.mapProps.walker ?? null;
  const drawnBorders = useOutlineSet([borderAt], BORDER_ZOOM);
  const decidedBorders = useOutlineSet([borderAt], OUTLINE_ZOOM);
  const hereTown = borderAt ? outlineIdAt(borderAt, decidedBorders) : null;
  // Ordered by distance from where you are to a few hundred metres, so the shapes aren't rebuilt per fix (TB9).
  const nearKey = borderAt ? `${borderAt[0].toFixed(2)},${borderAt[1].toFixed(2)}` : '';
  const borders = useMemo(() => {
    const near = nearKey ? (nearKey.split(',').map(Number) as LngLat) : null;
    return bordersFor(drawnBorders, { firm: hereTown ? [hereTown] : [], near });
  }, [drawnBorders, hereTown, nearKey]);
  const motionAccess = useMotionAccess();
  const cap = useCaptures(walk?.id ?? null, live.here, live.lastFixAt, onCaptureError, {
    // The pill (moment stacks MS2, MS5): a new moment opens it; a piece keeps it.
    onKept: (id, piece) => (piece ? momentPill.piece(id) : momentPill.kept(id, true)),
  });
  // Nothing held any more: a photo that fails later is warned about again at Stop, not ended without (SA8).
  const heldCount = cap.held.length;
  useEffect(() => {
    if (heldCount === 0) giveUpHeld.current = 0;
  }, [heldCount]);
  // A walk started or stopped closes the pill (MS4); on a walk, the trace walked counts toward its 100 m.
  const pillWalkId = walk?.id ?? null;
  useEffect(() => {
    momentPill.walk();
  }, [pillWalkId]);
  const lastHere = useRef<LngLat | null>(null);
  useEffect(() => {
    const h = live.here;
    if (h && lastHere.current && pillWalkId) momentPill.walked(distanceM(lastHere.current, h));
    lastHere.current = h;
  }, [live.here, pillWalkId]);
  // The viewer's Add to this moment (MS12), run here where the camera, the mic and the note are; on a walk only
  // (the ready screen's capture row runs its own).
  const asked = useStore(momentPill.store, (st) => st.ask?.seq ?? 0);
  const onAsk = useRef<(kind: 'photo' | 'voice' | 'text') => void>(() => {});
  useEffect(() => {
    onAsk.current = (kind) => {
      const into = momentPill.target();
      if (kind === 'photo') void photo(into);
      else if (kind === 'voice') void startVoice(into);
      else {
        openNote(into);
      }
    };
  });
  useEffect(() => {
    const ask = momentPill.store.get().ask;
    if (!asked || !ask || !pillWalkId) return;
    momentPill.asked();
    onAsk.current(ask.kind);
  }, [asked, pillWalkId]);
  // A walk shown: the room left, said beside the captures (SA3, SA4); nothing is asked mid-walk (SA10).
  const shownWalkId = walk?.id ?? null;
  useEffect(() => {
    if (shownWalkId) void space.check({ recording: true });
  }, [shownWalkId]);
  // A deleted moment leaves the pins, Explore and the viewer at once (D3, D5).
  const captures = useVisible(cap.captures);

  useEffect(() => {
    if (!rawNotice || rawNotice.sticky) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [rawNotice]);
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
  // Explore's settings (E16-E21) live in the walk's drawer, saved as they change; the range is a ring on this map while it is up.
  // Nothing is saved before they have loaded (fix walk-drawer-settings audit 2), and a save from the ready
  // screen's bar reaches this copy at once (audit 1): both screens are one instance.
  const [loaded, setLoaded] = useState<ExploreSettings | null>(null);
  const settings = loaded ?? DEFAULT_SETTINGS;
  useEffect(() => {
    let alive = true;
    loadSettings().then((v) => alive && setLoaded((cur) => cur ?? v), () => {});
    const off = onSettings((v) => setLoaded(v));
    return () => {
      alive = false;
      off();
    };
  }, []);
  const changeSettings = (next: ExploreSettings) => {
    if (!loaded) return;
    setLoaded(next);
    saveSettings(next).catch(() => {});
  };
  const toggleKind = (k: Kind, on: boolean) => {
    const hidden = new Set(settings.hidden);
    if (on) hidden.delete(k);
    else hidden.add(k);
    changeSettings({ ...settings, hidden });
  };
  async function pressMap(at: LngLat, radiusM?: number) {
    if (cap.voiceStartedAt != null || stopping || viewing || here) return;
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
    void walkLogText(walk.id, walk.started_at).then((text) => {
      if (live) logText.current = text;
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
    void shareLogText(text).then((how) => {
      // A browser without a share sheet (a desktop) copies it instead.
      if (how === 'copied') setNotice({ message: 'GPS log copied. Paste it in a message.' });
      else if (how === 'failed' && Platform.OS === 'web') setNotice({ message: 'Couldn’t share or copy the GPS log.', tone: 'error' });
    });
  }, []);
  // The spot card (and the options card) goes once you walk on, or with Back (Android) and Escape (web).
  useEffect(() => {
    if (!spot && !memory) return;
    const close = () => {
      setSpot(null);
      setMemory(null);
      setOptions(false);
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
  }, [spot, memory]);
  useEffect(() => {
    if (!spot?.from || !live.here || distanceM(spot.from, live.here) < 30) return;
    const t = setTimeout(() => setSpot(null), 0);
    return () => clearTimeout(t);
  }, [spot, live.here]);
  useEffect(() => {
    liveHereRef.current = live.here;
    if (!gapOpenAt?.from || !live.here || distanceM(gapOpenAt.from, live.here) < 30) return;
    const t = setTimeout(() => setGapOpenAt(null), 0);
    return () => clearTimeout(t);
  }, [gapOpenAt, live.here]);

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
    heading: live.heading,
    riding: live.riding,
    map: () => mapRef.current,
    onArrive: (dest) => {
      feedback('success');
      // Said once: the line on screen is announced by the screen reader here, not by a live region.
      setArrived(`You’re here: ${dest.label}`);
      AccessibilityInfo.announceForAccessibility(`You're here: ${dest.label}`);
    },
    // Errors stay up long enough to read at a glance, and can be dismissed. A route that
    // can't be found offers the phone's maps app (NH5).
    // It stays until dismissed: the destination is already forgotten, so it is the way back (audit 6).
    onError: (m, dest) => setNotice({ message: m, tone: 'error', maps: dest && { at: dest.at, label: dest.label }, sticky: !!dest }),
    onNotice: (m) => setArrived(m),
    // This walk's pace for the spoken time left (QL18), over its moving time as WalkStats counts it.
    pace: () => {
      const t = Date.now();
      return paceMps(live.distanceM, walk ? t - walk.started_at - pausedMs(pauses, walk.started_at, t) : 0);
    },
  });
  /** Going somewhere new: a failed route's banner (sticky, with Open in Maps) has had its say. */
  const goTo = (dest: Parameters<typeof navigation.goTo>[0]) => {
    setNotice((n) => (n?.maps ? null : n));
    void navigation.goTo(dest);
  };
  // Scenic routes' preview (SR8): Back (Android) and Escape (web) cancel it, setting no destination.
  const routePreview = navigation.preview;
  const dismissPreview = navigation.dismiss;
  useEffect(() => {
    if (!routePreview) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      dismissPreview();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissPreview();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, [routePreview, dismissPreview]);
  /**
   * Open in Maps (NH3-NH8): the destination to the phone's maps app, straight from the tap (a
   * browser opens a window only from one). Navigation and the walk go on as they were (NH7).
   */
  const handOff = (at: LngLat, label: string) => {
    feedback('tap');
    openInMaps(at, label).then(
      (ok) => {
        if (!ok) setNotice({ message: 'Couldn’t open a maps app.', tone: 'error' });
      },
      () => setNotice({ message: 'Couldn’t open a maps app.', tone: 'error' }),
    );
  };
  // The route ahead of you only; what is behind is walked. A preview shows its highlighted route whole (SR2).
  const routeLine = useMemo(
    () =>
      navigation.preview
        ? navigation.preview.options[navigation.preview.selected].route.path
        : navigation.nav
          ? live.here
            ? routeAhead(navigation.nav.route.path, live.here)
            : navigation.nav.route.path
          : null,
    [navigation.nav, navigation.preview, live.here],
  );
  // The preview's other routes, faint (SR2), and the map framed around all of them.
  const alternates = useMemo(
    () => (navigation.preview ? navigation.preview.options.filter((_, i) => i !== navigation.preview!.selected).map((o) => o.route.path) : null),
    [navigation.preview],
  );
  const previewFit = useMemo(() => (navigation.preview ? boundsOf(navigation.preview.options.flatMap((o) => o.route.path), 30) : null), [navigation.preview]);
  const previewKey = previewFit ? 300000 + (Math.abs(Math.round((previewFit[0] + previewFit[1]) * 1e5)) % 99999) : 0;
  // Walkability (WK13, WK15): the layer around you, and a quiet line before a stretch built around cars on the route.
  const layers = useLayers();
  const wk = useWalkability(live.here, !!layers.on.walkability);
  const busy = useBusyLayer(live.here, !!layers.on.busy);
  // While choosing among a preview's routes only the routes are drawn, in blue; the trace, the fog, the busy streets' shading and the rest
  // come back as it closes (fix preview-clutter).
  const drawn = forPreview(!!navigation.preview, {
    trace: live.runs,
    rides: live.rides,
    walked,
    fog,
    faint: gapView.faint,
    gapLinks: isDrawing ? undefined : gapView.links,
    landing: busy.view,
    borders: layers.on.borders ? borders : null,
    walkability: wk.draw,
    veil: showUnwalked,
    fogEmphasis: showUnwalked,
  });
  const aheadLine = useRouteWarning(navigation.nav?.route.path ?? null, live.here, !!layers.on.walkability);
  // Explore (v1 slice 5): checklists are built quietly on every walk (E2); the layers show only
  // on an exploring walk (E1, E9), and a capture finds a place on any walk.
  const fixes = useMemo(() => live.runs.flat(), [live.runs]);
  const [markOpen, setMarkOpen] = useState<string | null>(null);
  // RP20: whether the open place has a street or path close by, from the cached streets; said, never filtered.
  const [markReach, setMarkReach] = useState<{ key: string; near: boolean | null } | null>(null);
  const [landings, setLandings] = useState<LandingRow[]>([]);
  const [exploring, setExploring] = useState(false);
  const quiet = !exploring;
  const reloadLandings = useCallback(() => {
    db.listLandings().then((r) => setLandings(r.filter((x) => rulesCurrent(x.rules))), () => {});
  }, []);
  // The range preview (E21): a ring around you while the drawer is up on an exploring walk, as on the ready screen.
  const preview = options && exploring && loaded ? loaded.rangeM : null;
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
    onAreas: () => {
      reloadLandings();
      busy.reload();
    },
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
  const openMarkReach = openMark && markReach?.key === openMark.key && !explore.found.has(openMark.key) ? reachLine(markReach.near) : null;
  // Going to a place: "A place to find" until it is revealed, then its name (E12).
  const navKey = navigation.nav?.dest.kind === 'find' ? navigation.nav.dest.placeKey : undefined;
  const navItem = navKey ? explore.itemOf(navKey) : null;
  const relabel = navigation.relabel;
  useEffect(() => {
    if (navItem && (explore.revealed.has(navItem.key) || explore.found.has(navItem.key))) relabel(navItem.name);
  }, [navItem, explore.revealed, explore.found, relabel]);
  const ring = useMemo(() => (preview != null && live.here ? { center: live.here, radiusM: preview } : null), [preview, live.here]);
  const ringFit = useMemo(() => (ring ? boundsOf([ring.center], ring.radiusM * 1.15) : null), [ring]);
  // Each new range refits the map to the ring, in the part left above the raised drawer.
  const ringKey = ring ? 100000 + ring.radiusM : 0;
  const drawerH = raisedHeight(screenH, BAR_H + insets.bottom);
  // Remind me here (v1 slice 4): a flagged capture comes back when this walk
  // passes it (R2, R3). The web checks on each accepted fix in the open walk's
  // keeper, minimized or not (NV8); on a phone the location task checks every
  // batch. Fires reach this card while the screen is in front. A second fire
  // joins the open card (R7).
  const [reminder, setReminder] = useState<{ captures: Faced[]; at: LngLat | null; shownAt: number } | null>(null);
  // Memories on revisit: earlier walks' captures within 100 m, as faint pins, on every walk (the
  // owner's call), never a buzz or a notification (MR1, MR6). The area is read once per 50 m (MR8).
  const [memoryStore, setMemoryPool] = useState<Faced[]>([]);
  // A memory deleted from its viewer leaves its pin (D3).
  const memoryPool = useVisible(memoryStore);
  // The memory card drops what was deleted from its viewer (deletion audit 7).
  const memoryShown = useVisible(memory?.result.captures);
  // One reader per walk: a slow read lands even as fixes come in, a failed one is tried again, and
  // it sends only a changed set (audit 1, 10).
  const [memoryReads] = useState(() => memoryReader((at) => db.momentsIn(boundsOf([at], MEMORY_RULES.readBoxM)!).then(facedAll), setMemoryPool));
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
  const openMemory = async (group: Faced[], at: LngLat) => {
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
    const take = () =>
      takeRecallOpen()
        .then((found) => {
          if (!alive || !found.length) return;
          setAutoPlay(true);
          setViewing(found);
        })
        .catch(() => {});
    void take();
    // Kept while this screen was mounting (a cold open now shows the walk sooner, NR3): taken as it lands.
    const offWaiting = onRecallWaiting(() => void take());
    return () => {
      alive = false;
      off();
      offWaiting();
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
  const nudgeShown = !!nudge && !quiet && !spot && !openMark && !options && !memory && !navigation.nav && !navigation.finding;
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
  // Walk back here (DW7): this walk's spot, read again on a reload.
  const walkId = walk?.id ?? null;
  const [chosen, setChosen] = useState<{ walkId: string; at: LngLat } | null>(null);
  useEffect(() => {
    if (!walkId) return;
    let alive = true;
    loadWayBack(walkId).then((at) => {
      if (alive && at) setChosen({ walkId, at });
    }, () => {});
    return () => {
      alive = false;
    };
  }, [walkId]);
  const chosenAt = chosen && chosen.walkId === walkId ? chosen.at : null;
  // Walk me back leads to the spot chosen, else where the last ride ended, else the start (DW6-DW8, decision 0121),
  // once there is somewhere to walk back from.
  const wayBack = useMemo(() => wayBackTarget({ start: walkStart, landing: live.landing, chosen: chosenAt }), [walkStart, live.landing, chosenAt]);
  const awayFromStart = showsWayBack(wayBack, live.here);
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
      // A photo or video still held is said before the walk ends without it (SA8).
      if (cap.held.length > giveUpHeld.current) {
        giveUpHeld.current = cap.held.length;
        setNotice({ message: `${heldLabel(cap.held)} yet. Retry, or hold Stop again to end the walk without it.`, tone: 'error', sticky: true });
        return;
      }
      // The walk stays on screen until the replay replaces it (the keeper hears it ended first).
      setEnded(walk);
      await stopWalk(walk.id);
      feedback('success');
      router.replace(`/replay/${walk.id}`);
    } catch (e) {
      // The walk stays on screen with the error, even if storage already closed it (audit 3).
      setNotice({ message: `The walk could not be stopped: ${e instanceof Error ? e.message : e}`, tone: 'error', sticky: true });
    } finally {
      setStopping(false);
    }
  }

  // The walk goes on beneath the tabs: the recorder, the trace and the reminders are kept above
  // this screen (NV8). Never mid-memo: leaving would cut it short.
  function minimize() {
    if (recordingVoice || stopping) return;
    AccessibilityInfo.announceForAccessibility('Walk minimized. Still recording.');
    // To the tab beneath, Explore when there is none (NR4).
    props.onMinimize();
  }

  async function togglePause() {
    if (!walk || pausing) return;
    setPausing(true);
    try {
      if (paused) {
        void askMotion();
        await resumeWalk(walk.id);
        setNotice((n) => noticeShown(n, null)); // the paused reminder ends with the pause
        AccessibilityInfo.announceForAccessibility('Walk resumed');
      } else {
        // A memo in progress is saved first; a paused walk records nothing.
        await cap.finishVoice();
        await pauseWalk(walk.id);
        AccessibilityInfo.announceForAccessibility('Walk paused. Nothing is recorded until you resume.');
      }
      feedback('tap');
    } catch (e) {
      const fail = startErrorFrom(e);
      if (paused && fail.tone === 'info') {
        // Resume refused is the refusal's quiet notice, said, as Start's (tend recording audit 1). On the web the recorder's
        // status raised it already; on a phone the start throws before any status, so it is raised here.
        if (raisedError.current !== fail.message) {
          raisedError.current = fail.message;
          setNotice({ message: fail.message, tone: 'info', openSettings: fail.openSettings, sticky: true, said: ++saidCount.current });
          AccessibilityInfo.announceForAccessibility(fail.message);
        }
      } else setNotice({ message: `Could not ${paused ? 'resume' : 'pause'}: ${fail.message}`, tone: 'error', sticky: true });
    } finally {
      // The screen shows whatever the database holds, even after a failure.
      await notifyWalkChanged();
      setPausing(false);
    }
  }


  // After a photo or video, Edit is offered for a few seconds (ME23); it is opt-in.
  const editOffer = useEditOffer();
  const [editingKept, setEditingKept] = useState<Faced | null>(null);

  /** With `into`, the photo joins that open moment (MS2); Edit is offered for a new moment's photo only. */
  async function photo(into: string | null = null) {
    const kept = await cap.takePhoto(into);
    if (!kept) return;
    feedback('tap');
    if (kept.id === kept.momentId) editOffer.show(kept);
  }

  async function startVoice(into: string | null = null) {
    if (await cap.startVoice(into)) {
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
  // Back in front with the recorder in error (location denied, then perhaps allowed in Settings):
  // start it again once per return, the way Resume does, so the walk goes on without a restart
  // (QL20). The recorder's own status clears the chip if it worked; a failure keeps it quietly.
  const retriedFor = useRef(0);
  useEffect(() => {
    if (resumed === retriedFor.current) return;
    retriedFor.current = resumed;
    if (!walk || !retryRecorder(status, paused, true)) return;
    retrying.current = true;
    restartRecording(walk.id)
      .catch(() => {})
      .finally(() => {
        retrying.current = false;
      });
  }, [resumed, status, paused, walk]);
  // Paused time does not count as walking.
  // Weak GPS is no usable fix for a while, judged before the speed gate: a bus's fixes are good ones (R11).
  const weak = status.kind === 'recording' && live.lastGoodAt != null && now - live.lastGoodAt > WEAK_GPS_MS;
  // Time left while navigating (QL17): this walk's pace over its moving time, refreshed by the 5 s clock.
  const navTimeLeft = navigation.nav ? timeLeftMs(navigation.nav.leftM, live.distanceM, walk ? now - walk.started_at - pausedMs(pauses, walk.started_at, now) : 0) : 0;
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
  const notice = noticeShown(rawNotice, openPause?.started_at ?? null);
  const remindedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!openPause || remindedFor.current === openPause.started_at || now - openPause.started_at < PAUSE_REMIND_MS) return;
    remindedFor.current = openPause.started_at;
    setNotice({ message: `Paused for ${formatDuration(now - openPause.started_at)}. Nothing is recorded until you resume.`, sticky: true, forPause: openPause.started_at });
  }, [openPause, now]);
  const recordingVoice = cap.voiceStartedAt != null;
  // Keep or Not this way (G10): stored with the walk, and the line follows at once.
  const decideGap = async (state: 'kept' | 'dismissed') => {
    if (!openGap) return;
    setGapBusy(true);
    try {
      await gapView.decide(openGap, state);
      setGapOpen(null);
    } catch {
      setNotice({ message: 'Couldn’t save that. Try again.', tone: 'error' });
    } finally {
      setGapBusy(false);
    }
  };

  // The walk's notice, in the minimize row or just under the navigation bar when one holds the row.
  const noticeBanner = notice ? (
    <Banner
      tone={notice.tone}
      onDismiss={() => setNotice(null)}
      action={
        notice.openSettings && Platform.OS !== 'web'
          ? { label: 'Open Settings', onPress: () => Linking.openSettings() }
          : notice.maps
            ? { label: 'Open in Maps', onPress: () => notice.maps && handOff(notice.maps.at, notice.maps.label) }
            : undefined
      }
    >
      {notice.message}
    </Banner>
  ) : null;

  return (
    <View style={styles.screen}>
      {/* One map for both states, at one place in the tree, so Start never remounts it (NR6). */}
      {!walk ? (
        <WalkMap {...ready.mapProps} borders={ready.bordersOn ? borders : null} ref={mapRef} onBearingChange={bearing.set} scaleInset={{ bottom: scaleInsetBottom({ barTop: at.barTop, scaleBottom: SCALE_BOTTOM, mapEndsAtStrip: true }), left: sideInset + 12 }} />
      ) : (
      <WalkMap
        {...drawn}
        busyNamesNear={namesNearYou(live.here)}
        captures={captures}
        // Opening a capture would hide a memo that is still recording.
        // While drawing, a tap on a pin is a point along the way like any other (gap-drawing audit 8).
        onPinPress={recordingVoice || stopping || isDrawing ? undefined : setViewing}
        walker={live.here}
        walkerSource={live.dot}
        glideWalker
        walkerHeading={live.heading}
        // Not while a route is found: the street read moves the camera itself.
        // Drawing holds the map where it is: a new fix never moves it under a tap (GW8).
        follow={following && !navigation.finding && !navigation.preview && !ring && !isDrawing ? live.here : null}
        drawing={drawing.line}
        onPress={(at, radiusM) => {
          layers.closePanel();
          // While drawing, every tap is a point along the way (GW3).
          if (isDrawing) {
            drawing.tap(at);
            return;
          }
          // A tap on one of the preview's routes highlights it (SR8); elsewhere it does nothing.
          if (routePreview) {
            const i = optionAt(routePreview.options, at, Math.max(15, radiusM * 0.45));
            if (i != null) navigation.select(i);
            return;
          }
          setSpot(null);
          setMarkOpen(null);
          setMemory(null);
          // A tap on a stretch across a gap opens its card (G9); anywhere else closes it.
          // A line's reach is about 20 px, narrower than a pin's 44, so taps beside the trace still do what they did (audit 8).
          const reach = Math.max(10, radiusM * 0.45);
          const hit = navigation.nav || recordingVoice || stopping ? null : stretchAt(gapView.stretches, at, reach) ?? emptyGapAt(gapView.empty, at, reach);
          setGapOpen(hit ? gapKey(hit) : null);
        }}
        memories={memories}
        onMemoryPress={recordingVoice || stopping || isDrawing ? undefined : (group, at) => {
          setGapOpen(null);
          void openMemory(group, at);
        }}
        discoveries={explore.pins}
        onDiscoveryPress={recordingVoice || stopping || isDrawing ? undefined : (id) => {
          // A found place is shown, not a card to open: its capture's pin is the thing to tap (audit, UI).
          if (explore.found.has(id)) return;
          setSpot(null);
          setMemory(null);
          setGapOpen(null);
          setMarkOpen(id);
          const item = explore.itemOf(id);
          if (item) reach.ask(id, item.at, setMarkReach);
        }}
        marks={marks}
        ring={ring}
        fitBounds={previewFit ?? ringFit}
        fitKey={previewFit ? previewKey : ringKey}
        fitPadding={previewFit
          ? { top: insets.top + 24, bottom: cardAt.bottom + 300, left: 24, right: 24 }
          : { top: insets.top + 24, bottom: drawerH - BAR_H - insets.bottom + 16, left: 24, right: 24 }}
        onUserMove={() => setFollowing(false)}
        onBearingChange={bearing.set}
        // A long press, so a stray tap while walking does nothing.
        onLongPress={(at, radiusM) => {
          if (isDrawing) return;
          // Another card takes the slot: the stretch's card goes, rather than hiding and coming back (audit 7).
          setGapOpen(null);
          pressMap(at, radiusM);
        }}
        route={routeLine}
        alternates={alternates}
        // While navigating the trace steps aside, so the route reads; it is still recorded (the owner's call, Nov 2).
        traceOpacity={navigation.nav ? 0 : 1}
        covered={navigation.finding}
        ref={mapRef}
        // Started in place, the walk opens where the ready map was: around the last fix (NR6).
        initialCenter={live.here ?? getLastFix()?.at ?? undefined}
        initialZoom={16}
        // The map runs under the bottom strip (on the ready screen it ends at the strip's top), so the scale bar
        // is measured from the strip's top: in the bottom-left corner just above it, inside the 640
        // column (QL8). The pills stack above it (`at.pills`).
        scaleInset={{ bottom: scaleInsetBottom({ barTop: at.barTop, scaleBottom: SCALE_BOTTOM, mapEndsAtStrip: false }), left: sideInset + 12 }}
      />
      )}

      {/* T26, as tend map audit 12: kept mounted, so a quiet refusal on the walk is read as its words arrive. */}
      {Platform.OS === 'web' ? <Text testID="walk-said" accessibilityLiveRegion="polite" style={styles.said}>{walk && notice?.said ? (notice.said % 2 ? `${notice.message}\u200B` : notice.message) : ''}</Text> : null}
      {!walk ? (
        <>
          {ready.overlay}
          {/* The compass over Locate while the map is turned (CP2); the live walk has its own, below. */}
          <CompassButton bearing={bearing} onPress={() => mapRef.current?.resetNorth()} bottom={at.edgeBottom('unwalked')} right={at.edgeRight} focusAfter={readyLocateRef} />
        </>
      ) : (
      <>

      <View style={[styles.top, { top: insets.top + 4, left: sideInset, right: sideInset }]} pointerEvents="box-none">
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
            hitSlop={2}
            style={({ pressed }) => [styles.edgeBtn, styles.minBtn, (recordingVoice || stopping) && styles.disabled, pressed && styles.pressed]}
          >
            <Icon name="chevron-down" size={24} color={theme.ink} />
          </Pressable>
          {/* The navigation bar takes the top row beside Minimize, so nothing sits above it (the owner, Nov 6: it keeps
              drifting down; supersedes Nov 5's "Minimize above the bar"). */}
          {navigation.nav && (
            // Not a live region: it changes with every fix. The distance is announced in steps instead.
            <View testID="nav-bar" style={styles.navBar}>
              <Icon name="navigate" size={20} color="#ffffff" />
              <Text
                testID="nav-left"
                style={styles.navText}
                numberOfLines={2}
                accessibilityLabel={`${formatDistance(navigation.nav.leftM)}${navigation.nav.dest.suggested ? '' : `, ${aboutTimeLeft(navTimeLeft)}`} left to ${navigation.nav.dest.label}`}
              >
                {formatDistance(navigation.nav.leftM)} · {navigation.nav.dest.suggested ? '' : `${formatTimeLeft(navTimeLeft)} · `}{navigation.nav.dest.label}
              </Text>
              <Pressable
                testID="nav-handoff"
                accessibilityRole="button"
                accessibilityLabel="Open in Maps"
                accessibilityHint={HANDOFF_HINT}
                onPress={() => {
                  const d = navigation.nav?.dest;
                  if (d) handOff(d.at, d.label);
                }}
                style={({ pressed }) => [styles.navHandoff, pressed && styles.pressed]}
              >
                <Icon name="open-outline" size={22} color="#ffffff" />
              </Pressable>
              <Pressable testID="nav-end" accessibilityRole="button" accessibilityLabel="End navigation" onPress={navigation.end} style={styles.navEnd} hitSlop={8}>
                <Text style={styles.navEndText}>End</Text>
              </Pressable>
            </View>
          )}
          {/* The notice shares the minimize button's row, level with it at the top edge (the owner's call,
              Nov 4), so the button doesn't move when one appears (NR6). While the navigation bar holds the row
              it sits just below. */}
        {notice && !navigation.nav && (
          <View style={styles.noticeCell}>
            {noticeBanner}
          </View>
        )}
        {/* The street chip: top centre, level with the chevron, so nothing below it moves it (the owner, Nov 5).
            Under the navigation bar it sits in the column instead of over the bar. */}
        {!notice && onStrip && !problem && !navigation.nav && (
          // Quiet: a chip, not a notification or a hint (L14).
          <View style={styles.chipCell} pointerEvents="none">
            <LiftIn testID="on-strip" style={styles.chip}>
              <View style={[styles.statusDot, { backgroundColor: HOTSPOT }]} />
              <Text style={styles.chipText}>On {onStrip}</Text>
            </LiftIn>
          </View>
        )}
        </View>
        {navigation.nav && notice && <View style={styles.noticeBelow}>{noticeBanner}</View>}
        {navigation.nav && !notice && onStrip && !problem && (
          <LiftIn testID="on-strip" style={styles.chip}>
            <View style={[styles.statusDot, { backgroundColor: HOTSPOT }]} />
            <Text style={styles.chipText}>On {onStrip}</Text>
          </LiftIn>
        )}
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
        {problem && status.kind === 'error' && !paused ? (
          // Not recording is a button: its tap brings the recorder's notice back (why, and on a
          // phone Open Settings) after it was dismissed (QL19).
          <Pressable
            testID="status-chip"
            accessibilityRole="button"
            accessibilityLabel="Not recording. Why?"
            onPress={() => {
              if (status.kind !== 'error') return;
              raisedError.current = status.message;
              const quiet = status.tone === 'info';
              setNotice({ message: status.message, tone: status.tone ?? 'error', openSettings: status.openSettings, sticky: true, said: quiet ? ++saidCount.current : undefined });
              if (quiet) AccessibilityInfo.announceForAccessibility(status.message);
            }}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          >
            <View style={[styles.statusDot, { backgroundColor: problem.color }]} />
            <Text style={styles.chipText}>{problem.label}</Text>
          </Pressable>
        ) : problem ? (
          <View style={styles.chip} accessible accessibilityLabel={problem.label} accessibilityLiveRegion="polite">
            <View style={[styles.statusDot, { backgroundColor: problem.color }]} />
            <Text style={styles.chipText}>{problem.label}</Text>
          </View>
        ) : null}
        {nudgeShown && nudge && (
          <View testID="dead-zone" style={styles.undo}>
            <Text style={[styles.undoText, { flexShrink: 1 }]} numberOfLines={2}>{nudge.text}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Go to ${nudge.name}`}
              onPress={() => {
                const n = nudge;
                setNudge(null);
                goTo({ at: n.at, label: n.name, kind: 'place' });
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
        {toast && (
          <LiftIn style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.toastText}>{toast}</Text>
          </LiftIn>
        )}
      </View>

      {/* The pills (caption, undo, retry): left of the stack, above the strip, so the stack never
          moves (NR10). */}
      <View style={[styles.pills, at.pills]} pointerEvents="box-none">
        {walk && (
          <AddToMomentPill
            hidden={recordingVoice || noteOpen || !!spot || !!openMark || !!options || !!memory}
            onPhoto={() => void photo(momentPill.target())}
            onVoice={() => void startVoice(momentPill.target())}
            onNote={() => {
              openNote(momentPill.target());
            }}
          />
        )}
        {aheadLine && navigation.nav && !recordingVoice && (
          // Quiet (WK15): no sound, no haptic, nothing to press, and it never touches the route (WK16).
          <View testID="walk-ahead" pointerEvents="none" style={styles.ahead} accessibilityLiveRegion="polite">
            <WalkBandIcon band="car" size={20} />
            <Text style={styles.aheadText}>{aheadLine}</Text>
          </View>
        )}
        {editOffer.offer && !recordingVoice && !spot && !openMark && !options && !memory && (
          <EditOfferPill
            offer={editOffer.offer}
            where="here"
            onEdit={() => {
              const id = editOffer.offer?.id;
              setEditingKept(captures.find((c) => c.id === id) ?? null);
              editOffer.clear();
            }}
          />
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
        {walk && cap.held.length > 0 && !recordingVoice && !spot && !openMark && !options && !memory && (
          <View testID="held-captures" style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>{heldLabel(cap.held)}</Text>
            <Pressable testID="held-retry" accessibilityRole="button" onPress={() => cap.retryHeld()} hitSlop={10} style={styles.undoBtn}>
              <Text style={styles.undoBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {walk && !recordingVoice && !spot && !openMark && !options && !memory && <SpaceLine />}
      </View>
      {/* The capture stack at the right edge (NR9): where it was on the ready screen. While recording,
          Save takes the mic's own place, so tapping the mic again saves; Discard is smaller, in the
          camera's. It hides while a gap's way is drawn, so taps belong to the map (GW8); the pills stay,
          so a memo's Undo isn't lost under the drawing (gap-drawing audit 7). */}
      <CaptureStack
        ref={saveRef}
        ids={{ photo: 'cap-photo', voice: 'cap-voice', note: 'cap-note', save: 'voice-save', discard: 'voice-discard' }}
        labels={{ photo: 'Take a photo or video', voice: 'Record a voice memo', note: 'Write a note' }}
        voiceStartedAt={cap.voiceStartedAt}
        busy={cap.busy}
        disabled={stopping}
        hidden={isDrawing}
        // With Group captures on, the edge adds to the open moment (MS19); off, a new moment (MS1).
        onPhoto={() => void photo(momentPill.edgeTarget())}
        onVoice={() => void startVoice(momentPill.edgeTarget())}
        onSave={saveVoice}
        onDiscard={discardVoice}
        onNote={() => {
          openNote(momentPill.edgeTarget());
        }}
      />

      {/* The walk's strip is the ready bar's twin (NR7): pull it up for the walk's options, which are
          no button of their own. Pause and Stop stay at its foot at every height. */}
      <ReadyBar
        idPrefix="walk"
        up={options}
        onUp={(u) => {
          if (u) {
            setSpot(null);
            setMarkOpen(null);
            setMemory(null);
            setGapOpen(null);
          }
          setOptions(u && !recordingVoice);
          // Lowered with the ring up: back to following you, out of the ring's zoom (audit, UI); a pan stays otherwise.
          if (!u && preview != null) setFollowing(true);
        }}
        areaHeight={screenH}
        locked={recordingVoice}
        summaryLabel={exploring ? 'The walk, exploring' : 'The walk'}
        summary={<WalkStats startedAt={walk?.started_at ?? null} pauses={pauses} distanceM={live.distanceM} rideM={live.rideM} />}
        actions={
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
        }
      >
        <View testID="options-card" style={styles.drawer}>
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
            {exploring && loaded && (
              <>
                <Text style={styles.optionSection} accessibilityRole="header">“?” range</Text>
                <Text style={styles.markSub}>
                  A “?” shows for places within {formatRange(settings.rangeM)} of you, {walkNote(settings.rangeM)}.
                  {live.here ? ' The ring on the map shows how far that is.' : ' The ring shows on the map once there’s a position.'}
                </Text>
                <RangeSlider value={settings.rangeM} onChange={(m) => changeSettings({ ...settings, rangeM: clampRange(m) })} />
                <Text style={styles.optionSection} accessibilityRole="header">What I’m into</Text>
                <KindSwitches hidden={settings.hidden} onToggle={toggleKind} />
                <ComplexKindSwitches sectionStyle={styles.optionSection} />
              </>
            )}
            {Object.values(layers.on).some(Boolean) && (
              <>
                <Text style={styles.optionSection} accessibilityRole="header">On the map</Text>
                <LayersKey layers={layers} />
              </>
            )}
            {/* The pocket alert is a nudge you feel: on every phone, and on a touch-screen browser that can vibrate (E19, PA6). */}
            {canBuzz() && loaded && (
              <SwitchRow
                testID="pocket-alert"
                label="Pocket alert"
                note={POCKET_ALERT_NOTE}
                value={settings.haptic}
                onChange={(haptic) => changeSettings({ ...settings, haptic })}
              />
            )}
            <RouteLeaningSettings sectionStyle={styles.optionSection} />
            <NotificationSettings heading={false} />
            {motionAccess !== 'on' && (
              // Without motion the walk goes on, on the GPS filters alone (Motion, MO2).
              <View testID="motion-off" style={styles.optionRow}>
                <Icon name="walk-outline" size={20} color={theme.ink} />
                <Text style={[styles.markSub, { flex: 1 }]}>
                  {motionAccess === 'unavailable'
                    ? 'Motion isn’t available here: standing still may drift.'
                    : motionAccess === 'denied'
                      ? Platform.OS === 'web'
                        ? 'Motion is blocked: allow Motion & Orientation Access in Settings › Safari. Standing still may drift.'
                        : 'Motion is blocked: allow Motion & Fitness for Chronicles in Settings. Standing still may drift.'
                      : 'Motion off: standing still may drift.'}
                </Text>
                {(motionAccess === 'off' || motionAccess === 'denied') && (
                  <Pressable testID="motion-on" accessibilityRole="button" accessibilityLabel="Turn on motion" onPress={() => void askMotion()} hitSlop={8}>
                    <Text style={styles.optionLabel}>Turn on</Text>
                  </Pressable>
                )}
              </View>
            )}
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
        </View>
      </ReadyBar>

      {/* Small round controls in the stack's column, above the captures (as in AllTrails), inside the
          640 column on wide screens: Recenter where Locate sits on the ready screen (NR9). */}
      <Pressable
        ref={unwalkedRef}
        testID="unwalked"
        accessibilityRole="switch"
        accessibilityState={{ checked: showUnwalked }}
        aria-checked={showUnwalked}
        accessibilityLabel="Show unwalked streets near me"
        onPress={() => setShowUnwalked((v) => !v)}
        style={({ pressed }) => [styles.edgeBtn, { right: at.edgeRight, bottom: at.edgeBottom('unwalked') }, showUnwalked && styles.edgeBtnOn, pressed && styles.pressed]}
      >
        <Icon name="footsteps-outline" size={22} color={showUnwalked ? '#ffffff' : theme.ink} />
      </Pressable>
      {showUnwalked && (
        <View
          style={[styles.unwalked, { right: at.edgeRight + EDGE + 8, bottom: at.edgeBottom('unwalked') + 7 }]}
          accessibilityLiveRegion="polite"
          pointerEvents="none"
        >
          <Text style={styles.unwalkedText}>{unwalkedCount} unwalked nearby</Text>
        </View>
      )}

      {/* The compass (CP2): the column's top, so no other button moves; it takes Walk me back's
          place while that is away, and sits above Locate on the ready screen. */}
      <CompassButton
        bearing={bearing}
        onPress={() => mapRef.current?.resetNorth()}
        bottom={at.edgeBottom(awayFromStart && !navigation.nav ? 'compass' : 'back')}
        right={at.edgeRight}
        focusAfter={awayFromStart && wayBack && !navigation.nav ? backRef : unwalkedRef}
      />
      {/* Layers (ML3): the bottom-left corner above the scale bar, clear of the navigation bar. */}
      <LayersControl layers={layers} notes={layerNotes({ walkability: wk.status, busyReading: busy.reading, busyFailed: busy.failed })} bottom={at.layers.bottom} left={at.layers.left} rightClear={at.layersRightClear} clearTop={at.insets.top + 152} />

      {awayFromStart && wayBack && !navigation.nav && (
        // Walk me back: the way back to where this walk began, where the last ride ended, or the spot chosen (N1, N11, DW6-DW8).
        <Pressable
          ref={backRef}
          testID="walk-back"
          accessibilityRole="button"
          accessibilityLabel={wayBack.said}
          disabled={navigation.finding}
          onPress={() => goTo({ at: wayBack.at, label: wayBack.label, kind: 'start' })}
          style={({ pressed }) => [styles.edgeBtn, { right: at.edgeRight, bottom: at.edgeBottom('back') }, pressed && styles.pressed]}
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
          style={({ pressed }) => [styles.edgeBtn, { right: at.edgeRight, bottom: at.edgeBottom('locate') }, pressed && styles.pressed]}
        >
          <Icon name="locate" size={22} color={theme.ink} />
        </Pressable>
      )}

      {openMark && !spot && !quiet && (
        // A place's card, in the spot card's place (E7, E8, E12).
        <View style={[styles.spotRow, cardAt]} pointerEvents="box-none">
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
            {openMarkReach && (
              <Text testID="mark-reach" style={styles.markSub}>
                {openMarkReach}
              </Text>
            )}
            <View style={styles.spotActions}>
              <Button
                testID="mark-go"
                label="Go here"
                onPress={() => {
                  const m = openMark;
                  setMarkOpen(null);
                  goTo({ at: m.at, label: openMarkNamed ? m.name : 'A place to find', kind: 'find', placeKey: m.key });
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
      {openGapOf && !isDrawing && !spot && !openMark && !memory && !recordingVoice && !options && !viewing && (
        <GapCard
          stretch={openGap}
          gap={openGapOf}
          busy={gapBusy}
          style={cardAt}
          onClose={() => setGapOpen(null)}
          onKeep={() => void decideGap('kept')}
          onDismiss={() => void decideGap('dismissed')}
          onDraw={() => {
            setGapOpen(null);
            setFollowing(false);
            drawing.start(openGapOf);
          }}
        />
      )}
      {/* Low, where the capture row was: big controls stay in thumb's reach (audit, UI). */}
      {isDrawing && <GapDraw drawing={drawing} style={{ bottom: insets.bottom + 92, zIndex: 6 }} />}
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
        onSaveEdit={(c, patch) => cap.setEdit(c, patch)}
        onSaveNote={(c, body, type, only) => cap.setNote(c, body, type, only)}
        onGoHere={navigation.finding ? undefined : (c) => {
          setViewing(null);
          if (c.lat != null && c.lon != null) goTo({ at: [c.lon, c.lat], label: KIND_LABEL[c.kind], kind: 'capture' });
        }}
        onOpenInMaps={(c) => {
          if (c.lat != null && c.lon != null) handOff([c.lon, c.lat], KIND_LABEL[c.kind]);
        }}
      />
      {editingKept && (
        <MediaEditor key={editingKept.id} capture={editingKept} initialTool="crop" onClose={() => setEditingKept(null)} onSave={(patch) => cap.setEdit(editingKept, patch)} />
      )}
      {memory && memoryShown.length > 0 && !spot && !recordingVoice && (
        <View style={[styles.spotRow, cardAt]} pointerEvents="box-none">
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
      {routePreview && !spot && (
        <View style={[styles.spotRow, cardAt]} pointerEvents="box-none">
          <RoutePreview
            preview={routePreview}
            onSelect={navigation.select}
            onGo={navigation.choose}
            onCancel={navigation.dismiss}
          />
        </View>
      )}
      {spot && (
        // Above the capture row (bottom 92, 68 tall), in the pills' place, so the row never moves or hides.
        <View style={[styles.spotRow, cardAt]} pointerEvents="box-none">
          <View style={styles.spot} accessibilityViewIsModal>
            <Text style={styles.spotTitle} accessibilityRole="header">This spot</Text>
            <View style={styles.spotActions}>
              <Button
                testID="go-here"
                label="Go here"
                onPress={() => {
                  const at = spot.at;
                  setSpot(null);
                  goTo({ at, label: 'Your spot', kind: 'point' });
                }}
                disabled={navigation.finding}
              />
              {walk && (
                // Walk back here (DW7): Walk me back leads to this spot for the rest of this walk, said once.
                <Button
                  testID="spot-way-back"
                  variant="secondary"
                  label="Walk back here"
                  onPress={() => {
                    const at = spot.at;
                    setSpot(null);
                    setChosen({ walkId: walk.id, at });
                    saveWayBack(walk.id, at).catch(() => {});
                    setNotice({ message: CHOSEN_NOTICE });
                  }}
                />
              )}
              <Button
                testID="spot-handoff"
                variant="secondary"
                label="Open in Maps"
                accessibilityHint={HANDOFF_HINT}
                onPress={() => {
                  const at = spot.at;
                  setSpot(null);
                  handOff(at, 'Your spot');
                }}
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
        onSaveNote={(c, body, type, only) => cap.setNote(c, body, type, only)}
      />

      {/* At the top, clear of the voice memo's own Undo and the caption pill above the capture row (UI review). */}
      <UndoToast style={{ top: insets.top + 64 }} />

      <Modal visible={noteOpen} animationType="slide" onRequestClose={() => pageRef.current?.requestClose()}>
        {page && (
          <NewNotePage
            key={page.key}
            typed
            ref={pageRef}
            cap={cap}
            into={page.into}
            onWalk
            camera
            // No buzz mid-sentence (note-pages audit 27); the toast says where it went.
            onKept={() => setToast('Note saved here')}
            onClose={() => setPage(null)}
          />
        )}
      </Modal>
      </>
      )}
    </View>
  );
}

/** A large round icon button; the label is what screen readers say. */
type PressableRef = ComponentRef<typeof Pressable>;

const styles = StyleSheet.create({
  said: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { position: 'absolute', left: GUTTER, right: GUTTER, gap: 8, alignItems: 'center', maxWidth: 640, alignSelf: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line,
  },
  chipPressed: { opacity: 0.8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: theme.ink, fontWeight: '600', fontSize: 14 },
  // Navigating: what is left and where to, as on a maps app's top bar, with End.
  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, backgroundColor: COLORS.route, borderRadius: 16,
    paddingLeft: 16, paddingRight: 8, minHeight: 56,
  },
  navText: { flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '700' },
  // A white pill: 5.2:1 for its blue text.
  navEnd: { minHeight: 44, minWidth: 64, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  navEndText: { color: COLORS.route, fontSize: 16, fontWeight: '700' },
  navHandoff: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  finding: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999, paddingLeft: 16, paddingRight: 4,
    minHeight: 52, borderWidth: 1, borderColor: theme.line,
  },
  findingText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  findingCancel: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 22 },
  findingCancelText: { color: theme.ink, fontSize: 16, fontWeight: '700', textDecorationLine: 'underline' },
  flashText: { fontSize: 16 },
  spotRow: { position: 'absolute', left: GUTTER, right: GUTTER, alignItems: 'center' },
  spot: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  spotTitle: { fontSize: 16, fontWeight: '700', color: theme.ink },
  markSub: { fontSize: 14, color: theme.muted },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: theme.ink },
  optionSection: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 8 },
  drawer: { paddingHorizontal: 16, paddingBottom: 8, gap: 4, maxWidth: 640, width: '100%', alignSelf: 'center' },
  edgeBtnOff: { opacity: 0.5 },
  spotActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  spotClose: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toast: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'center' },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  hidden: { display: 'none' },
  pills: { position: 'absolute', alignItems: 'flex-end', gap: 8 },
  undo: {
    flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: theme.ink, borderRadius: 999, maxWidth: '100%',
    paddingVertical: 8, paddingLeft: 16, paddingRight: 8,
  },
  undoText: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  undoBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  undoBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  stats: { color: theme.ink, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], flexShrink: 1 },
  stopInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  pauseBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.ink, backgroundColor: theme.surface,
  },
  // Resume is the one thing to do while paused.
  pauseBtnOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  edgeBtnOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  minRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeCell: { flex: 1, minWidth: 0 },
  noticeBelow: { alignSelf: 'stretch' },
  minBtn: { position: 'relative' },
  chipCell: { position: 'absolute', left: 0, right: 0, top: 0, height: 44, alignItems: 'center', justifyContent: 'center' },
  ahead: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 360, backgroundColor: theme.glass, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line },
  aheadText: { color: theme.ink, fontSize: 14, flexShrink: 1 },
  unwalked: { position: 'absolute', backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
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
  input: { minHeight: 90, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 12, padding: 12, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
