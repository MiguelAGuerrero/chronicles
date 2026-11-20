import { type Faced, facedAll } from '../lib/moment';
import { NewNotePage } from '../components/notePage/NewNotePage';
import type { NotePageHandle } from '../components/notePage/NotePage';
import { router, useFocusEffect, useIsFocused, useLocalSearchParams, useNavigation as useRouteNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { walkClocks } from '../lib/pins';
import { nextDayPartBoundary } from '../lib/resurface/context';
import { AccessibilityInfo, ActivityIndicator, AppState, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { useEditAfterCapture } from '../components/edit/EditOffer';
import { MediaEditor } from '../components/edit/MediaEditor';
import { CaptureViewer } from '../components/CaptureView';
import { Icon, KIND_LABEL } from '../components/icons';
import { Banner, Button, HoldButton, LiftIn, theme } from '../components/ui';
import { GapCard } from '../components/GapCard';
import { emptyGapAt, gapKey, stretchAt, type Gap } from '../lib/gaps/infer';
import type { DrawnLine } from '../lib/gaps/draw';
import { useGapDraw } from '../lib/gaps/useGapDraw';
import { GapDraw } from '../components/GapDraw';
import { PASS_SCALE, passNote, RangeSlider, walkNote } from '../components/ExploreSettings';
import { IntoRow } from '../components/IntoRow';
import { tookDetour } from '../lib/intoNav';
import { NotificationSettings } from '../components/NotificationSettings';
import { RouteLeaningSettings } from '../components/RouteLeaningSettings';
import { RoutePreview } from '../components/RoutePreview';
import { forPreview } from '../lib/nav/previewView';
import { SwitchRow } from '../components/SwitchRow';
import { ReminderCard } from '../components/ReminderCard';
import { onRecallFired, onRecallOpen, onRecallWaiting, recallPlaceShown, takeRecallOpen } from '../lib/discovery/recallCheck';
import { reminderHeld, reminderText } from '../lib/discovery/recall';
import { categoryOf } from '../lib/discovery/categories';
import { deadZoneDue, deadZoneNudge, inDeadZone, stripAt } from '../lib/landing/walk';
import { rulesCurrent, type LandingRow } from '../lib/landing/view';
import { placesFromTilePois } from '../lib/discovery/tilePois';
import { canBuzz } from '../lib/canBuzz';
import { armedLine, canArm, walkPassKey, clampPass, clampRange, intoRowShown, kindOf, POCKET_ALERT_NOTE } from '../lib/explore/explore';
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
import { deriveSegments } from '../lib/streets';
import { feedback } from '../lib/motion';
import { MOTION } from '../lib/motionTokens';
import { recorder } from '../lib/recorder';
import { PAUSE_REMIND_MS } from '../lib/notify';
import { ensureTileBuild } from '../lib/tiles';
import { startErrorFrom, type RecorderStatus } from '../lib/recorder/types';
import { raisedAfter, retryRecorder } from '../lib/recorderRetry';
import { useUnits } from '../lib/useUnits';
import type { Units } from '../lib/units';
import { formatRange } from '../lib/format';
import { pauseWalk, restartRecording, resumeWalk } from '../lib/session';
import { stopEnd } from '../lib/unsaved/stopEnd';
import { formatDistance, formatDuration } from '../lib/summary';
import type { LngLat, Pause, StreetSegment, Walk } from '../lib/types';
import { useCaptures } from '../lib/useCaptures';
import { momentPill } from '../lib/momentPill';
import { useStore } from '../lib/useStore';
import { routeLeanings } from '../lib/routeLeanings';
import { whileFocused } from '../lib/openers';
import { AddToMomentPill } from '../components/walk/AddToMomentPill';
import { walkScreenShown } from '../lib/walkNav';
import { askMotion, useMotionAccess } from '../lib/walkMotion';
import { shareLogText, walkLogText } from '../lib/shareLog';
import { notifyWalkChanged } from '../lib/walkEvents';
import { routeAhead } from '../lib/nav/navigator';
import { shareLabel } from '../lib/atlas/mapsButton';
import { travelMode, type TravelMode } from '../lib/nav/handoff';
import { DRIVE_LABEL, END_LABEL, MUTE_LABEL, SHOWN_LINE, UNMUTE_LABEL } from '../lib/roads/words';
import { HANDOFF_HINT, handoffHint, openInMaps } from '../lib/nav/openInMaps';
import { useNavigation } from '../lib/nav/useNavigation';
import { loadWayBack, saveWayBack } from '../lib/nav/store';
import { CHOSEN_NOTICE, showsWayBack, wayBackTarget } from '../lib/nav/wayBack';
import { layerNotes } from '../lib/layers/notes';
import { useStorefrontsLayer } from '../lib/layers/useStorefrontsLayer';
import { usePastLines } from '../lib/pastLines/usePastLines';
import { useWalkLayers } from '../lib/layers/useWalkLayers';
import { useRouteWarning } from '../lib/walk/useRouteWarning';
import { useWalkability } from '../lib/walk/useWalkability';
import { arrivalNotice, exitPlan, screenState, startNotice, walkStripText, walkSummaryLabel } from '../lib/readyNav';
import { noticeShown } from '../lib/pauseReminder';
import { getLastFix } from '../lib/lastFix';
import { useStopArrival } from '../lib/outing/useArrival';
import { PASS_HINT, PASS_LABEL, WAY_LABEL } from '../lib/outing/journeyWords';
import { useJourneyBar } from '../lib/outing/useJourneyBar';
import { CaptureStack } from '../components/walk/CaptureStack';
import { ReadyBar } from '../components/walk/ReadyBar';
import { scaleInsetBottom } from '../lib/stackSlots';
import { BAR_H, CAP, GUTTER, raisedHeight, SCALE_BOTTOM, STACK_GAP, useStackLayout } from '../components/walk/layout';
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
import { heldLabel, saveFailLine } from '../lib/space/core';
import { unsaved } from '../lib/unsaved';
import { memoGate } from '../lib/memoGate';
import { settleWithin } from '../lib/settleWithin';
import { lostAtStop, memoLabel, stopWarning } from '../lib/unsaved/core';

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
/** The screen's own clock: weak GPS (20 s) and the pause reminder (10 min) need no finer. */
const SLOW_TICK_MS = 5000;
/** Stop waits this long at most for a capture still being kept, and a Retry under way (as the bar's Stop does). */
const STOP_WAIT_MS = 5000;

/** Time walked (paused time left out) and distance, in the bottom strip; a ride's distance after it (R6). */
function WalkStats(props: { startedAt: number | null; pauses: Pause[]; distanceM: number; rideM: number; units: Units }) {
  const { startedAt, pauses, distanceM, rideM, units } = props;
  const elapsed = (now: number) => (startedAt == null ? 0 : now - startedAt - pausedMs(pauses, startedAt, now));
  // The ride on a second, smaller line, so the strip keeps its width at 390 px (rides audit, UI).
  const ride = rideM >= 1 ? `\n+ ${formatDistance(rideM)} ride` : '';
  return (
    <Ticking
      testID="walk-stats"
      style={styles.stats}
      numberOfLines={ride ? 2 : 1}
      // The same words the strip's spoken name holds (tend walk-screen audit 12).
      text={(now) => `${walkStripText({ elapsedMs: elapsed(now), distanceM, units })}${ride}`}
      label={(now) => `${formatDistance(distanceM)} walked in ${formatDuration(elapsed(now))}${rideM >= 1 ? `, plus ${formatDistance(rideM)} by ride` : ''}`}
    />
  );
}

/**
 * A ref whose `current` is `get()` at each read, made once as the screen mounts: `get` should read only refs. A hook, so
 * the React Compiler does not take the getter for a ref read during render, as it did built inline (walk-screen compiler).
 */
function useLazyRef<T>(get: () => T): { readonly current: T } {
  const [ref] = useState(() => Object.defineProperty({} as { current: T }, 'current', { get }));
  return ref;
}

/** The walk that has had its dead-zone nudge (L15): once a walk. */
const NUDGED_KEY = 'deadzone_walk';

/** A reminder's card goes after `MOTION.reminder`, or this far walked on. */
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


// A screen that throws shows what broke, with Try again, never a blank page (bug, Nov 1); here, that the walk is still
// recording (decision 0172, O35).
export { WalkScreenError as ErrorBoundary } from '../components/ScreenError';

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
  // Leaving the walk screen (a tab, minimize) closes the Add to this moment pill (MS4); What I'm into's page, a detour
  // inside the walk, leaves it open (the owner, Nov 18; specs/what-im-into-page Q5).
  useFocusEffect(useCallback(() => () => {
    if (!tookDetour()) momentPill.leave();
  }, []));
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
  const units = useUnits();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  // The strip's words step down a size below 360, so long numbers still leave them whole (fix walk-strip-buttons audit 1).
  const narrow = width < 360;
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
  // The held captures of the walk Stop has warned of; one held beyond them is warned of too (SA8, unsaved captures UN5).
  const warnedHeld = useRef<string[]>([]);
  const saveRef = useRef<PressableRef>(null);
  const mapRef = useRef<WalkMapHandle>(null);
  // The map's turn, for the compass (CP2): the map opens north-up and keeps no bearing (CP8).
  // A store the compass reads, so a turn re-renders the compass alone (tend map 8).
  const [bearing] = useState(() => createStore(0));
  const [viewing, setViewing] = useState<Faced[] | null>(null);
  // A memory pin's preview (MR4), and the viewer it opens; declared before the capture path, which says nothing behind them.
  const [memory, setMemory] = useState<{ result: HereResult; from: LngLat | null } | null>(null);
  const [memoryView, setMemoryView] = useState<HereResult | null>(null);
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
  // The moment the pins say their part of the day from (tend map audit 29): this one map stays up from the ready
  // screen through the walk, so it is renewed on each return to the front and at the next boundary the words turn on.
  const [pinNow, setPinNow] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setPinNow(Date.now()));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setPinNow(Date.now()), nextDayPartBoundary(pinNow) - pinNow);
    return () => clearTimeout(id);
  }, [pinNow]);

  // The ready state (NR1, NR5-NR13): with no walk open, the map and the overlay are its.
  // The buttons the compass hands the focus to as it leaves (tend map 6): Locate on the ready screen; on the walk,
  // the one below it in the column, Walk me back while that shows, else Recenter while it shows, else the map (WB3).
  const readyLocateRef = useRef<PressableRef>(null);
  const backRef = useRef<PressableRef>(null);
  const recenterRef = useRef<PressableRef>(null);
  // Resolved as the compass is pressed, never in render: whichever is drawn then.
  const compassNext = useLazyRef((): unknown => backRef.current ?? recenterRef.current ?? { focus: () => mapRef.current?.focus() });
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
  // The words of the refusal's notice, until the walk records again and takes it down (QL25).
  const shownError = useRef<string | null>(null);
  // Each quiet refusal raised, for the live region's repeat (tend recording audit 4).
  const saidCount = useRef(0);
  const retrying = useRef(false);
  useEffect(
    () =>
      recorder.subscribeStatus((s) => {
        // The recorder reports "recording" with every fix: only a change re-renders the screen (perf).
        setStatus((prev) => (prev.kind === s.kind && JSON.stringify(prev) === JSON.stringify(s) ? prev : s));
        if (s.kind !== 'error') {
          // Recording again takes the refusal's notice down, whatever restarted it, even mid-retry (QL25).
          const next = raisedAfter(raisedError.current, shownError.current, s.kind, retrying.current);
          raisedError.current = next.raised;
          shownError.current = next.shown;
          const words = next.clear;
          if (words != null) setNotice((n) => (n?.sticky && n.message === words ? null : n));
          return;
        }
        if (raisedError.current === s.message) return;
        raisedError.current = s.message;
        shownError.current = s.message;
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
  const screenFocused = useIsFocused();
  const cap = useCaptures(walk?.id ?? null, live.here, live.lastFixAt, onCaptureError, {
    // The pill (moment stacks MS2, MS5): a new moment opens it; a piece keeps it.
    onKept: (id, piece) => (piece ? momentPill.piece(id) : momentPill.kept(id, true)),
    // In front, the walk's pills say why for a capture that failed on a screen gone (unsaved captures UN9).
    // Never behind a viewer or a memory's card (unsaved-captures audit 9).
    sayHeld: screenFocused && !!walk && !viewing && !memoryView && !memory,
  });
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
  // Scenic routes' Sights read What I'm into's kinds too: its row shows with Sights on (what-im-into-page audit 6).
  const sightsOn = useStore(routeLeanings.store, (s) => s.includes('sights'));
  // Once a photo or video is kept, its editor opens by itself, before it is looked at on the map (ME23 as decision 0240
  // amends it).
  const editAfter = useEditAfterCapture(cap.captures);
  const editing = editAfter.editing;

  // Declared before the effect below that calls them: the React Compiler skips a component that uses a function above its
  // declaration (walk-screen compiler).
  /** With `into`, the photo joins that open moment (MS2); the editor opens for a new moment's photo only. */
  async function photo(into: string | null = null) {
    const kept = await cap.takePhoto(into);
    if (!kept) return;
    feedback('tap');
    editAfter.open(kept);
  }

  async function startVoice(into: string | null = null) {
    if (await cap.startVoice(into)) {
      feedback('tap');
      AccessibilityInfo.announceForAccessibility('Recording voice memo');
    }
  }
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
    const t = setTimeout(() => setNotice(null), MOTION.walkNotice);
    return () => clearTimeout(t);
  }, [rawNotice]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), MOTION.walkToast);
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
      // Not `??=`: the React Compiler skips a component that holds one (walk-screen compiler).
      if (visitedRef.current == null) visitedRef.current = await db.visitedSegmentIds();
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

  // A long press on the map opens a small sheet for that spot: Go here, and
  // what happened here (every capture near it, on any walk) when there is any.
  const [here, setHere] = useState<HereResult | null>(null);
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
    // The open walk's replay reads its own distance, so the slider moves it too (audit 1).
    if (walk && layers.on.places && next.passM !== loaded.passM) {
      db.setMeta(walkPassKey(walk.id), String(clampPass(next.passM))).catch(() => {});
    }
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
    // Only while in front: under What I'm into's page, Back and Escape are the page's (what-im-into-page audit 1).
    if ((!spot && !memory) || !screenFocused) return;
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
  }, [spot, memory, screenFocused]);
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
    const t = setTimeout(() => setArrived(null), MOTION.arrival);
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
  // A planned outing names a stop once, as it is reached (QC19).
  const stopLine = useStopArrival(navigation.nav?.dest ?? null, live.here);
  /** Going somewhere new: a failed route's banner (sticky, with Open in Maps) has had its say. */
  const goTo = (dest: Parameters<typeof navigation.goTo>[0]) => {
    setNotice((n) => (n?.maps ? null : n));
    void navigation.goTo(dest);
  };
  // A journey carried by this session (OJ28-OJ31, decision 0213): the bar between towns, and the way on foot within reach of one.
  const journey = useJourneyBar({ walkId: walk?.open ? walk.id : null, here: live.here, navigating: !!navigation.nav || navigation.finding || !!navigation.preview, goTo });
  // Scenic routes' preview (SR8): Back (Android) and Escape (web) cancel it, setting no destination.
  const routePreview = navigation.preview;
  const dismissPreview = navigation.dismiss;
  useEffect(() => {
    if (!routePreview || !screenFocused) return;
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
  }, [routePreview, dismissPreview, screenFocused]);
  /**
   * Open in Maps (NH3-NH8): the destination to the phone's maps app, straight from the tap (a
   * browser opens a window only from one). Navigation and the walk go on as they were (NH7).
   */
  const handOff = (at: LngLat, label: string, mode: TravelMode = 'walk') => {
    feedback('tap');
    // go-here-everywhere audit 2: a star's title or a spot is the owner's own; only a neutral label rides in the link (0058).
    openInMaps(at, shareLabel('spot', label), mode).then(
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
  const drivePath = journey.next?.drivePath ?? null;
  // The preview's other routes, faint (SR2), and the map framed around all of them.
  const alternates = useMemo(
    // Audit 12: a guided drive's road is drawn the same faint way: one line, no markers (RE16).
    () => (navigation.preview ? navigation.preview.options.filter((_, i) => i !== navigation.preview!.selected).map((o) => o.route.path) : drivePath ? [drivePath] : null),
    [navigation.preview, drivePath],
  );
  const previewFit = useMemo(() => (navigation.preview ? boundsOf(navigation.preview.options.flatMap((o) => o.route.path), 30) : null), [navigation.preview]);
  const previewKey = previewFit ? 300000 + (Math.abs(Math.round((previewFit[0] + previewFit[1]) * 1e5)) % 99999) : 0;
  // Walkability (WK13, WK15): the layer around you, and a quiet line before a stretch built around cars on the route.
  // The walk's own layers (specs/modes-to-layers MD3, MD10): every one off at the start of every walk.
  const layers = useWalkLayers(walk?.id ?? null);
  const wk = useWalkability(live.here, !!layers.on.walkability);
  const storefronts = useStorefrontsLayer(live.here, !!layers.on.storefronts);
  // Where I've been (WB6, WB8): earlier walks near you, never this one; read only while a walk is open (the ready screen reads its own).
  const past = usePastLines(live.here, !!layers.on.past && !!walk, walk?.id ?? null);
  // While choosing among a preview's routes only the routes are drawn, in blue; the trace, the fog, the storefront streets' shading and the rest
  // come back as it closes (fix preview-clutter).
  const drawn = forPreview(!!navigation.preview, {
    trace: live.runs,
    rides: live.rides,
    walked,
    fog,
    faint: gapView.faint,
    gapLinks: isDrawing ? undefined : gapView.links,
    landing: storefronts.view,
    borders: layers.on.borders ? borders : null,
    walkability: wk.draw,
    past: past.view,
  });
  const aheadLine = useRouteWarning(navigation.nav?.route.path ?? null, live.here, !!layers.on.walkability);
  // Explore (v1 slice 5): checklists are built quietly on every walk (E2); the layers show only
  // on an exploring walk (E1, E9), and a capture finds a place on any walk.
  const fixes = useMemo(() => live.runs.flat(), [live.runs]);
  const [markOpen, setMarkOpen] = useState<string | null>(null);
  // RP20: whether the open place has a street or path close by, from the cached streets; said, never filtered.
  const [markReach, setMarkReach] = useState<{ key: string; near: boolean | null } | null>(null);
  const [landings, setLandings] = useState<LandingRow[]>([]);
  // Places and Storefronts are the walk's layers (decision 0231), not a mode: what Explore mode drew follows them.
  const placesOn = !!layers.on.places;
  const storefrontsOn = !!layers.on.storefronts;
  const reloadLandings = useCallback(() => {
    db.listLandings().then((r) => setLandings(r.filter((x) => rulesCurrent(x.rules))), () => {});
  }, []);
  // The range preview (E21): a ring around you while the drawer is up on an exploring walk, as on the ready screen.
  const preview = options && placesOn && loaded ? loaded.rangeM : null;
  const explore = useExplore({
    walkId: walk?.id ?? null,
    places: placesOn,
    storefronts: storefrontsOn,
    here: live.here,
    riding: live.riding,
    fixes,
    captures: captures,
    route: routeLine,
    routePath: navigation.nav?.route.path ?? null,
    previewRangeM: preview,
    onAreas: () => {
      reloadLandings();
      storefronts.reload();
    },
    onFound: (item) => {
      // A find needs Places on (Capture here starts from a "?"); the line says so as it happens (MD8).
      if (!placesOn) return;
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
  // The walk's clock, so a pin says how far in it was (tend map T14, T28).
  // Only while the open walk is this one: after Stop its pauses are gone (tend map audit 21).
  const openRow = openWalk.walk;
  const clocks = useMemo(() => walkClocks(walk, openRow, pauses), [walk, openRow, pauses]);
  const memories = useMemo(() => {
    const ids = new Set(memoryIds.split(','));
    return memoryPool.filter((c) => ids.has(c.id));
  }, [memoryIds, memoryPool]);
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
  // Whether this screen is in front, asked of the navigator when a fire comes, never a copy a frame behind (tend
  // explore audit 26). As it comes to the front it takes a reminder the bar went with unseen (tend explore audit 23).
  const routeNav = useRouteNavigation();
  useFocusEffect(useCallback(() => recallPlaceShown(), []));
  // What the card holds, read by the listener below, so it announces the card's own title (tend explore audit 6).
  const reminderRef = useRef(reminder);
  useEffect(() => {
    reminderRef.current = reminder;
  }, [reminder]);
  useEffect(
    () =>
      onRecallFired(
        (due) => {
          const next = { captures: reminderHeld(reminderRef.current?.captures ?? null, due), at: hereRef.current, shownAt: Date.now() };
          reminderRef.current = next;
          setReminder(next);
          AccessibilityInfo.announceForAccessibility(reminderText(next.captures).title);
        },
        // Only while in front: kept behind the tabs after a reload, the bar above them takes it (tend explore 21).
        () => routeNav.isFocused(),
      ),
    [routeNav],
  );
  // The card goes by itself after half a minute or 100 m walked on (it stays fired).
  useEffect(() => {
    if (!reminder) return;
    const walkedOn = reminder.at && live.here && distanceM(reminder.at, live.here) > REMINDER_AWAY_M;
    const t = setTimeout(() => setReminder(null), walkedOn ? 0 : Math.max(0, reminder.shownAt + MOTION.reminder - Date.now()));
    return () => clearTimeout(t);
  }, [reminder, live.here]);
  // A tapped reminder notification opens its captures, playing (R4).
  const [autoPlay, setAutoPlay] = useState(false);
  useEffect(() => {
    if (!walk) return;
    let alive = true;
    // A reminder tapped while this screen is in front opens here at once (audit 1); under What I'm into's page it is
    // kept, and taken once the walk is in front again (what-im-into-page audit 9).
    const inFront = () => routeNav.isFocused();
    const off = onRecallOpen(
      whileFocused(inFront, (found) => {
        setAutoPlay(true);
        setViewing(found);
      }),
    );
    const take = () =>
      takeRecallOpen()
        .then((found) => {
          if (!alive || !found.length) return;
          setAutoPlay(true);
          setViewing(found);
        })
        .catch(() => {});
    // Taken in front only: the effect runs again as the walk comes back from under the page.
    if (screenFocused) void take();
    // Kept while this screen was mounting (a cold open now shows the walk sooner, NR3): taken as it lands.
    const offWaiting = onRecallWaiting(() => {
      if (inFront()) void take();
    });
    return () => {
      alive = false;
      off();
      offWaiting();
    };
  }, [walk, params.recall, resumed, screenFocused, routeNav]);
  // Places turned on for this walk: its pass distance is kept once, so a later setting never rewrites its replay (TC9); off, a
  // place card that was open closes. (The spans it was on are kept by `walkLayers.set`, MD9.)
  useEffect(() => {
    if (!walk) return;
    if (!placesOn) {
      setMarkOpen(null);
      return;
    }
    const key = walkPassKey(walk.id);
    db.getMeta(key).then((v) => (v ? undefined : loadSettings().then((s) => db.setMeta(key, String(clampPass(s.passM))))), () => {}).catch(() => {});
  }, [walk, placesOn]);
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
    const t = setTimeout(() => setOnStrip((cur) => (at && hotStrips.length && storefrontsOn ? stripAt(at, hotStrips, cur) : null)), 0);
    return () => clearTimeout(t);
  }, [live.here, hotStrips, storefrontsOn]);
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
    if (farSince.current == null) farSince.current = now;
    const far = now - farSince.current;
    if (nudgedRef.current || !deadZoneDue({ here: at, pockets: hotPockets, farSinceMs: far })) return;
    let alive = true;
    (async () => {
      if (nudgedRef.current == null) nudgedRef.current = (await db.getMeta(NUDGED_KEY)) === walk.id;
      const got = deadZoneNudge({ here: at, pockets: hotPockets, farSinceMs: far, quiet: !storefrontsOn, nudged: nudgedRef.current });
      if (alive && got) setNudge(got);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [walk, live.here, live.riding, hotPockets, storefrontsOn, pausedNow]);
  // Spent only once it has been seen: not under a card, a route or settings, never without Storefronts on (audit).
  const nudgeShown = !!nudge && storefrontsOn && !spot && !openMark && !options && !memory && !navigation.nav && !navigation.finding;
  useEffect(() => {
    if (!nudgeShown || !walk) return;
    if (!nudgedRef.current) {
      nudgedRef.current = true;
      db.setMeta(NUDGED_KEY, walk.id).catch(() => {});
      AccessibilityInfo.announceForAccessibility(nudge!.text);
    }
    const t = setTimeout(() => setNudge(null), MOTION.deadZoneNudge);
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
    // The walk stays on screen with the error, even if storage already closed it (audit 3).
    const couldNotStop = (e: unknown) =>
      setNotice({ message: `The walk could not be stopped: ${e instanceof Error ? e.message : e}`, tone: 'error', sticky: true });
    // A try/finally, written so the React Compiler keeps WalkScreen (it skips a component holding a `finally`, or a `? :`,
    // `&&` or `?.` inside a try, hence the catch's words above): every way out, a throw from the catch included, reaches
    // `setStopping(false)` once, and that throw goes on after it.
    let failed = false;
    let failure: unknown;
    try {
      try {
        // Waits for any voice action in flight (a start, a save) before ending.
        const r = await cap.finishVoice();
        if (r === 'lost') {
          // A memo with nothing to keep is said while the walker is still here; the next hold ends the walk (UN13).
          setNotice({ message: lostAtStop(saveFailLine('voice', false)), tone: 'error', sticky: true });
        } else {
          // A photo or video still being kept from any screen (Memories' band, the bar), and a Retry under way, land first,
          // as the bar's Stop waits: one that fails meanwhile is warned of (unsaved-captures audit 2, 3).
          await settleWithin(Promise.all([memoGate.kept(), unsaved.settled()]), STOP_WAIT_MS);
          // Whatever of the walk is held, from any screen, read now (not from a render's closure), is said before the walk
          // ends without it (SA8, UN5); the next hold lets go what it warned of, files and all, once the walk has ended (UN8;
          // audit 4). A save still under way keeps the walk from the empty drop: the end both Stops share (tend tabs audit
          // 42, decision 0227). The walk stays on screen until the replay replaces it (the keeper hears it ended first).
          const end = await stopEnd(walk.id, { leaves: true, warned: warnedHeld.current, going: () => setEnded(walk) });
          if ('warn' in end) {
            warnedHeld.current = end.warn.map((x) => x.id);
            setNotice({ message: stopWarning(end.warn.map((x) => x.kind)), tone: 'error', sticky: true });
          } else {
            const { dropped } = end;
            feedback('success');
            if (dropped) {
              // A walk with nothing in it has no replay: back to where the walker was, with the pill's Undo (EW1).
              const to = exitPlan(router.canGoBack());
              if (to.kind === 'back') router.back();
              else router.replace(to.to);
            } else router.replace(`/replay/${walk.id}`);
          }
        }
      } catch (e) {
        couldNotStop(e);
      }
    } catch (e) {
      failed = true;
      failure = e;
    }
    setStopping(false);
    if (failed) throw failure;
  }

  // The walk goes on beneath the tabs: the recorder, the trace and the reminders are kept above
  // this screen (NV8). Never mid-memo: leaving would cut it short.
  function minimize() {
    if (recordingVoice || stopping) return;
    AccessibilityInfo.announceForAccessibility('Walk minimized. Still recording.');
    // To the tab beneath, Explore when there is none (NR4).
    props.onMinimize();
  }

  // The walk's options, raised or lowered by the strip's drag, a tap on its numbers or its … (decision 0220).
  function raiseOptions(u: boolean) {
    if (u) {
      setSpot(null);
      setMarkOpen(null);
      setMemory(null);
      setGapOpen(null);
    }
    setOptions(u && !recordingVoice);
    // Lowered with the ring up: back to following you, out of the ring's zoom (audit, UI); a pan stays otherwise.
    if (!u && preview != null) setFollowing(true);
  }

  async function togglePause() {
    if (!walk || pausing) return;
    setPausing(true);
    const failedWith = (e: unknown) => {
      const fail = startErrorFrom(e);
      if (paused && fail.tone === 'info') {
        // Resume refused is the refusal's quiet notice, said, as Start's (tend recording audit 1). On the web the recorder's
        // status raised it already; on a phone the start throws before any status, so it is raised here.
        if (raisedError.current !== fail.message) {
          raisedError.current = fail.message;
          shownError.current = fail.message;
          setNotice({ message: fail.message, tone: 'info', openSettings: fail.openSettings, sticky: true, said: ++saidCount.current });
          AccessibilityInfo.announceForAccessibility(fail.message);
        }
      } else setNotice({ message: `Could not ${paused ? 'resume' : 'pause'}: ${fail.message}`, tone: 'error', sticky: true });
    };
    // A try/finally the React Compiler keeps (as Stop's): the cleanup below runs on every way out, then a throw goes on.
    let failed = false;
    let failure: unknown;
    try {
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
        failedWith(e);
      }
    } catch (e) {
      failed = true;
      failure = e;
    }
    // The screen shows whatever the database holds, even after a failure. A throw here goes on in place of the one held,
    // and leaves pausing set, as a `finally` did.
    await notifyWalkChanged();
    setPausing(false);
    if (failed) throw failure;
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
    const t = setTimeout(() => focusOn(saveRef), MOTION.saveFocus);
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
    // A try/finally the React Compiler keeps (as Stop's).
    let failed = false;
    let failure: unknown;
    try {
      try {
        await gapView.decide(openGap, state);
        setGapOpen(null);
      } catch {
        setNotice({ message: 'Couldn’t save that. Try again.', tone: 'error' });
      }
    } catch (e) {
      failed = true;
      failure = e;
    }
    setGapBusy(false);
    if (failed) throw failure;
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
        <WalkMap {...ready.mapProps} now={pinNow} borders={ready.bordersOn ? borders : null} ref={mapRef} onBearingChange={bearing.set} scaleInset={{ bottom: scaleInsetBottom({ barTop: at.barTop, scaleBottom: SCALE_BOTTOM, mapEndsAtStrip: true }), left: sideInset + 12 }} />
      ) : (
      <WalkMap
        {...drawn}
        storefrontNamesNear={namesNearYou(live.here)}
        // QC24: following an outing, the base map names no shop beside a stop.
        hideLabels={navigation.nav?.dest?.outing === true}
        captures={captures}
        clocks={clocks}
        now={pinNow}
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
        spreadMarks
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
          <CompassButton bearing={bearing} onPress={() => mapRef.current?.resetNorth()} bottom={at.edgeBottom('back')} right={at.edgeRight} focusAfter={readyLocateRef} />
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
          {/* A journey between towns (OJ29, OJ31, decision 0213): the town ahead and how far, Maps for the road, a way to pass it by. */}
          {!navigation.nav && journey.next && (
            // On the surface's own ground, not the route's colour: this is where the outing is headed, not a way being followed.
            <View testID="journey-bar" style={styles.journeyBar} {...({ dataSet: { drivePoints: drivePath?.length ?? 0 } } as object)}>
              {/* RE20, RE26: while guiding, the turn and how far above the town; before the first turn, what the map cannot know. */}
              {journey.next.turn ? <Text testID="journey-turn" style={styles.journeyTurn} numberOfLines={journey.next.notice ? 4 : 2}>{journey.next.turn}</Text> : null}
              <Text testID="journey-next" style={journey.next.turn ? styles.journeyUnder : styles.journeyText} numberOfLines={2}>{journey.next.line}</Text>
              {journey.next.note ? <Text testID="journey-note" style={styles.journeyUnder} accessibilityLiveRegion="polite">{journey.next.note}</Text> : null}
              <View style={styles.journeyActions}>
                {journey.next.driving && journey.next.speaks ? (
                  // RE25: the mute, in words; it says what a tap does now.
                  <Pressable testID="journey-mute" accessibilityRole="button" accessibilityLabel={journey.next.muted ? UNMUTE_LABEL : MUTE_LABEL} onPress={journey.mute} style={({ pressed }) => [styles.journeyBtn, pressed && styles.pressed]}>
                    <Text style={styles.journeyBtnText}>{journey.next.muted ? UNMUTE_LABEL : MUTE_LABEL}</Text>
                  </Pressable>
                ) : null}
                {journey.next.driving ? (
                  // RE20a: nothing else to tap while guiding; Open in Maps and Pass by return when it ends.
                  <Pressable testID="journey-end" accessibilityRole="button" accessibilityLabel={END_LABEL} onPress={journey.end} style={({ pressed }) => [styles.journeyBtn, pressed && styles.pressed]}>
                    <Text style={styles.journeyBtnText}>{END_LABEL}</Text>
                  </Pressable>
                ) : null}
                {journey.next.driving ? null : !journey.next.within && journey.next.at && journey.next.town ? (
                  <Pressable testID="journey-drive" accessibilityRole="button" accessibilityLabel={DRIVE_LABEL} accessibilityHint={journey.next.speaks ? undefined : SHOWN_LINE} onPress={journey.drive} style={({ pressed }) => [styles.journeyBtn, pressed && styles.pressed]}>
                    <Text style={styles.journeyBtnText}>{DRIVE_LABEL}</Text>
                  </Pressable>
                ) : null}
                {journey.next.driving ? null : journey.next.within ? (
                  <Pressable testID="journey-walk" accessibilityRole="button" accessibilityLabel={WAY_LABEL} onPress={journey.walk} style={({ pressed }) => [styles.journeyBtn, pressed && styles.pressed]}>
                    <Text style={styles.journeyBtnText}>{WAY_LABEL}</Text>
                  </Pressable>
                ) : journey.next.at && journey.next.town ? (
                  <Pressable testID="journey-maps" accessibilityRole="button" accessibilityLabel="Open in Maps" accessibilityHint={handoffHint(travelMode(journey.next.awayM))} onPress={() => journey.next?.at && journey.next.town && handOff(journey.next.at, journey.next.town, travelMode(journey.next.awayM))} style={({ pressed }) => [styles.journeyBtn, pressed && styles.pressed]}>
                    <Text style={styles.journeyBtnText}>Open in Maps</Text>
                  </Pressable>
                ) : null}
                {journey.next.driving ? null : journey.next.undo ? (
                  <Pressable testID="journey-undo" accessibilityRole="button" accessibilityLabel="Undo" onPress={journey.undo} style={({ pressed }) => [styles.journeyPlain, pressed && styles.pressed]}>
                    <Text style={styles.journeyBtnText}>Undo</Text>
                  </Pressable>
                ) : (
                  <Pressable testID="journey-pass" accessibilityRole="button" accessibilityLabel={PASS_LABEL} accessibilityHint={PASS_HINT} onPress={journey.pass} style={({ pressed }) => [styles.journeyPlain, pressed && styles.pressed]}>
                    <Text style={styles.journeyBtnText}>{PASS_LABEL}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
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
        {stopLine ? (
          <LiftIn testID="outing-arrival" style={styles.chip} accessibilityLiveRegion="polite">
            <Text style={styles.chipText}>{stopLine}</Text>
          </LiftIn>
        ) : null}
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
        {placesOn && explore.armed && (
          // The armed place (TC3): plain words, above the capture stack, never moving it.
          <LiftIn testID="armed-line" style={styles.findChoice} accessibilityLiveRegion="polite">
            <Text style={styles.findChoiceTitle} numberOfLines={2} accessibilityLabel={armedLine(explore.armed.item)}>{armedLine(explore.armed.item)}</Text>
            <Pressable testID="armed-cancel" accessibilityRole="button" accessibilityLabel="Cancel, don’t tie the next moment to a place" onPress={explore.disarm} style={[styles.findChoiceBtn, styles.armedCancel]} hitSlop={6}>
              <Text style={styles.findChoiceBtnText}>Cancel</Text>
            </Pressable>
          </LiftIn>
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
              shownError.current = status.message;
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
          // Below 360 its text takes a line of its own above Route here and Dismiss (tend walk-screen audit 13).
          <View testID="dead-zone" style={[styles.undo, narrow && styles.nudgeNarrow]}>
            <Text style={[styles.undoText, narrow ? styles.nudgeTextNarrow : { flexShrink: 1 }]} numberOfLines={2}>{nudge.text}</Text>
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
              <Text style={styles.undoBtnText}>Route here</Text>
            </Pressable>
            {/* 44 pt itself: react-native-web has no hitSlop (tend walk-screen 14). */}
            <Pressable testID="dead-zone-dismiss" accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => setNudge(null)} style={styles.nudgeClose}>
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
            // Not while a place is armed: its line says where the next capture goes (tend walk-screen 13).
            hidden={recordingVoice || noteOpen || !!spot || !!openMark || !!options || !!memory || !!explore.armed}
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
        {cap.discarded && !recordingVoice && !spot && !openMark && !options && !memory && (
          <View style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>Voice memo discarded</Text>
            <Pressable testID="voice-undo" accessibilityRole="button" onPress={() => cap.undoDiscard()} hitSlop={10} style={styles.undoBtn}>
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          </View>
        )}
        {walk && cap.unsaved && !recordingVoice && !spot && !openMark && !options && !memory && (
          <View testID="held-memo" style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>{memoLabel(cap.memosHeld, 'Voice memo')}</Text>
            <Pressable testID="held-memo-retry" accessibilityRole="button" onPress={() => cap.retrySave()} hitSlop={10} style={styles.undoBtn}>
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

      {/* The walk's strip is the ready bar's twin (NR7): pull it up, tap the numbers, or (walking) tap … for the
          walk's options (decision 0220). Its buttons stay at its foot at every height. */}
      <ReadyBar
        idPrefix="walk"
        up={options}
        onUp={raiseOptions}
        areaHeight={screenH}
        locked={recordingVoice}
        // Named with what it draws, word for word, as the ready bar's twin is (tend walk-screen 12, audit 12): read each second
        // by the bar's own summary, never a live region.
        summaryLabel={(t) => walkSummaryLabel({ elapsedMs: walk ? t - walk.started_at - pausedMs(pauses, walk.started_at, t) : 0, distanceM: live.distanceM, rideM: live.rideM, units })}
        summary={<WalkStats startedAt={walk?.started_at ?? null} pauses={pauses} distanceM={live.distanceM} rideM={live.rideM} units={units} />}
        actions={
          // Pause alone while walking; Resume and a held Stop once paused, as AllTrails does (decision 0220). The owner's
          // AllTrails look (Nov 18): the buttons fill what the numbers leave. Walking: … (the walk's settings) and a wide
          // Pause; paused: Resume and Stop, half each, words only (the owner's picks), and no …: at 320 px it does not fit
          // beside them, and the numbers still open the settings.
          <View testID="walk-actions" style={styles.barActions}>
            {!paused && (
              <Pressable
                testID="strip-more"
                accessibilityRole="button"
                // Named as the numbers name the same drawer (fix walk-strip-buttons audit 4).
                accessibilityLabel={options ? 'Lower the walk settings' : 'Walk settings'}
                accessibilityState={{ expanded: options, disabled: recordingVoice || stopping || !walk }}
                // react-native-web reads aria-expanded, not accessibilityState's (fix walk-strip-buttons audit 4).
                aria-expanded={options}
                onPress={() => raiseOptions(!options)}
                disabled={recordingVoice || stopping || !walk}
                style={({ pressed }) => [styles.roundBtn, (recordingVoice || stopping || !walk) && styles.disabled, pressed && styles.pressed]}
              >
                <Icon name="ellipsis-horizontal" size={22} color={theme.ink} />
              </Pressable>
            )}
            <Pressable
              testID={paused ? 'resume-walk' : 'pause-walk'}
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume the walk' : 'Pause the walk'}
              accessibilityHint={paused ? undefined : 'Stops recording until you resume. Stop is offered while paused'}
              onPress={togglePause}
              disabled={pausing || stopping || !walk}
              style={({ pressed }) => [styles.barBtn, narrow && styles.barBtnNarrow, paused && styles.resumeBtn, pressed && styles.pressed]}
            >
              {/* Resume is the strip's one primary action while paused: the accent, as 0172 allows. */}
              {!paused && <Icon name="pause" size={narrow ? 16 : 18} color={theme.ink} />}
              <Text style={[styles.barBtnText, narrow && styles.barBtnTextNarrow, paused && styles.resumeText]} numberOfLines={1} selectable={false}>
                {paused ? 'Resume' : 'Pause'}
              </Text>
            </Pressable>
            {paused && (
              <HoldButton
                testID="stop"
                label="Hold to stop"
                busyLabel="Stopping…"
                // The spinner alone while stopping: "Stopping…" does not fit a half on most phones, and stays the spoken
                // name (fix walk-strip-buttons audits 2, 5).
                quietWhilePending
                onHold={stop}
                onTap={() => setToast('Hold to stop the walk')}
                busy={stopping}
                disabled={!walk || pausing}
                style={[styles.stopBtn, narrow && styles.barBtnNarrow]}
              >
                <Text style={[styles.barBtnText, narrow && styles.barBtnTextNarrow]} numberOfLines={1} selectable={false}>Stop</Text>
              </HoldButton>
            )}
          </View>
        }
      >
        <View testID="options-card" style={styles.drawer}>
          <Text style={styles.spotTitle} accessibilityRole="header">This walk</Text>
            {loaded && (
              <>
                <Text style={styles.optionSection} accessibilityRole="header">“?” range</Text>
                <Text style={styles.markSub}>
                  With Places on, a “?” shows for places within {formatRange(settings.rangeM)} of you, {walkNote(settings.rangeM)}.
                  {live.here ? ' The ring on the map shows how far that is.' : ' The ring shows on the map once there’s a position.'}
                </Text>
                <RangeSlider value={settings.rangeM} onChange={(m) => changeSettings({ ...settings, rangeM: clampRange(m) })} />
                <Text style={styles.optionSection} accessibilityRole="header">Passing a place</Text>
                <Text style={styles.markSub}>{passNote(settings.passM)}</Text>
                <RangeSlider scale={PASS_SCALE} value={settings.passM} onChange={(m) => changeSettings({ ...settings, passM: clampPass(m) })} />
              </>
            )}
            <LayersKey map="walk" layers={layers} heading="On the map" headingStyle={styles.optionSection} />
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
                  <Pressable testID="motion-on" accessibilityRole="button" accessibilityLabel="Turn on motion" onPress={() => void askMotion()} style={styles.motionOn}>
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
            {intoRowShown({ places: placesOn, sights: sightsOn }) && (
              // WI1, WI19: What I'm into lasts beyond this walk, so its row is a short section of its own after the walk's
              // settings, out from under "This walk" (the owner, Nov 18), headed "Explore" (audit 13); the kinds and
              // Complexes are on its page (0192). Scenic routes' Sights read the kinds too, so it shows with either on
              // (audit 6, the owner, Nov 18).
              <>
                <View style={styles.rule} />
                <Text style={styles.spotTitle} accessibilityRole="header">Explore</Text>
                <IntoRow from="walk" />
              </>
            )}
        </View>
      </ReadyBar>

      {/* Small round controls in the stack's column, above the captures (as in AllTrails), inside the
          640 column on wide screens: Recenter where Locate sits on the ready screen (NR9). */}
      {/* The compass (CP2): the column's top, so no other button moves; it takes Walk me back's
          place while that is away, and sits above Locate on the ready screen. */}
      <CompassButton
        bearing={bearing}
        onPress={() => mapRef.current?.resetNorth()}
        bottom={at.edgeBottom(awayFromStart && !navigation.nav ? 'compass' : 'back')}
        right={at.edgeRight}
        focusAfter={compassNext}
      />
      {/* Layers (ML3): the bottom-left corner above the scale bar, clear of the navigation bar. */}
      <LayersControl map="walk" layers={layers} notes={layerNotes({ walkability: wk.status, storefrontsReading: storefronts.reading, storefrontsFailed: storefronts.failed, past: past.status, placesRange: formatRange(settings.rangeM) })} bottom={at.layers.bottom} left={at.layers.left} rightClear={at.layersRightClear} clearTop={at.insets.top + 152} />

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
          ref={recenterRef}
          testID="recenter"
          accessibilityRole="button"
          accessibilityLabel="Recenter on your position"
          onPress={() => setFollowing(true)}
          style={({ pressed }) => [styles.edgeBtn, { right: at.edgeRight, bottom: at.edgeBottom('locate') }, pressed && styles.pressed]}
        >
          <Icon name="locate" size={22} color={theme.ink} />
        </Pressable>
      )}

      {openMark && !spot && placesOn && (
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
                  ? 'Capture here ties the next moment to it.'
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
                label="Route here"
                onPress={() => {
                  const m = openMark;
                  setMarkOpen(null);
                  goTo({ at: m.at, label: openMarkNamed ? m.name : 'A place to find', kind: 'find', placeKey: m.key });
                }}
                disabled={navigation.finding}
              />
              {openMarkNamed && !explore.found.has(openMark.key) && canArm(openMark, live.here) && (
                <Button
                  testID="mark-capture"
                  variant="secondary"
                  label="Capture here"
                  onPress={() => {
                    explore.arm(openMark);
                    setMarkOpen(null);
                  }}
                />
              )}
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
        onSaveNote={(c, body) => cap.setNote(c, body)}
        onGoHere={navigation.finding ? undefined : (c) => {
          setViewing(null);
          if (c.lat != null && c.lon != null) goTo({ at: [c.lon, c.lat], label: KIND_LABEL[c.kind], kind: 'capture' });
        }}
        onOpenInMaps={(c) => {
          if (c.lat != null && c.lon != null) handOff([c.lon, c.lat], KIND_LABEL[c.kind]);
        }}
      />
      {editing && (
        <MediaEditor key={editing.id} capture={editing} justKept initialTool="crop" onClose={() => editAfter.close()} onSave={(patch) => cap.setEdit(editing, patch)} />
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
                label="Route here"
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
                  // What it opens, never how many (counts are words, 0052; tend walk-screen 15).
                  label="What happened here"
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
        onSaveNote={(c, body) => cap.setNote(c, body)}
      />

      {/* At the top, clear of the voice memo's own Undo and the caption pill above the capture row (UI review). */}
      <UndoToast style={{ top: insets.top + 64 }} />

      <Modal visible={noteOpen} animationType="slide" onRequestClose={() => pageRef.current?.requestClose()}>
        {page && (
          <NewNotePage
            key={page.key}
            reactable
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
  journeyBar: { flex: 1, minWidth: 0, gap: 4, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.edge, paddingHorizontal: 12, paddingVertical: 8 },
  journeyText: { color: theme.ink, fontSize: 15, fontWeight: '700' },
  // Audit: read at a glance, moving: the largest line on the bar.
  journeyTurn: { color: theme.ink, fontSize: 22, fontWeight: '700' },
  journeyUnder: { color: theme.ink, fontSize: 14 },
  // Audit: 12 px between targets on a screen used in a car.
  journeyActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  journeyBtn: { minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: theme.edge, alignItems: 'center', justifyContent: 'center' },
  journeyPlain: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  journeyBtnText: { color: theme.ink, fontSize: 14, fontWeight: '700' },
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
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.edge, marginTop: 8 },
  markSub: { fontSize: 14, color: theme.muted },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: theme.ink },
  optionSection: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 8 },
  drawer: { paddingHorizontal: 16, paddingBottom: 8, gap: 4, maxWidth: 640, width: '100%', alignSelf: 'center' },
  edgeBtnOff: { opacity: 0.5 },
  spotActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  spotClose: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  findChoice: { backgroundColor: theme.ink, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'center', maxWidth: 420, gap: 8 },
  findChoiceTitle: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  armedCancel: { alignSelf: 'flex-start' },
  findChoiceBtn: { backgroundColor: '#ffffff', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', maxWidth: 220 },
  findChoiceBtnText: { color: theme.ink, fontSize: 14, fontWeight: '600' },
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
  // 44 pt themselves, not by hit slop, which react-native-web lacks (tend walk-screen 14).
  nudgeClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginVertical: -8 },
  motionOn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  // The nudge below 360: wrapped, its text a full line above its two buttons (tend walk-screen audit 13).
  nudgeNarrow: { flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: 4, borderRadius: 20 },
  nudgeTextNarrow: { flexBasis: '100%', paddingTop: 4 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  stats: { color: theme.ink, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], flexShrink: 1 },
  // The buttons fill what the numbers leave (the owner's AllTrails look, decision 0220): the numbers keep their width.
  barActions: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  // Pause, Resume and Stop: wide pills sharing the row, no outline, words centred, 48 high. Thin at the sides, so an
  // hour-long walk's numbers at 320 still leave the words whole (fix walk-strip-buttons audit 1).
  barBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, paddingHorizontal: 4,
    borderRadius: 24, backgroundColor: theme.line,
  },
  barBtnText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  barBtnTextNarrow: { fontSize: 14 },
  // Below 360, Pause's icon closer to its word and no side padding (the words are centred, so it shows only when tight), so
  // an hour-long walk's numbers leave every word whole (fix walk-strip-buttons audits 1, 7).
  barBtnNarrow: { gap: 4, paddingHorizontal: 0 },
  // Resume, the one primary action while paused: solid accent, white word.
  resumeBtn: { backgroundColor: theme.accent },
  resumeText: { color: theme.accentInk },
  // …: round, 48, soft like Pause.
  roundBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.line, alignItems: 'center', justifyContent: 'center' },
  // Stop: HoldButton with its outline off, half the row beside Resume, the hold's fill sweeping across it.
  stopBtn: { flex: 1, minHeight: 48, paddingHorizontal: 4, borderRadius: 24, borderWidth: 0, backgroundColor: theme.line },
  minRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeCell: { flex: 1, minWidth: 0 },
  noticeBelow: { alignSelf: 'stretch' },
  minBtn: { position: 'relative' },
  chipCell: { position: 'absolute', left: 0, right: 0, top: 0, height: 44, alignItems: 'center', justifyContent: 'center' },
  ahead: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 360, backgroundColor: theme.glass, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line },
  aheadText: { color: theme.ink, fontSize: 14, flexShrink: 1 },
  // Small round controls at the map's edges, as in AllTrails.
  edgeBtn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalWrap: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 16 },
  modal: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: { minHeight: 90, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 12, padding: 12, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
