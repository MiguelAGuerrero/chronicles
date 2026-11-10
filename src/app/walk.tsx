import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useOpenWalk, useOpenWalkInfo } from '../components/OpenWalk';
import { ReminderCard } from '../components/ReminderCard';
import { theme } from '../components/ui';
import { UndoToast } from '../components/UndoToast';
import { CAP, STACK_GAP, useStackLayout } from '../components/walk/layout';
import { useReady } from '../components/walk/useReady';
import { AddToMomentPills, CapturePills } from '../components/walking/CapturePills';
import { RecenterButton, WalkCompass } from '../components/walking/EdgeButtons';
import { HeadsUpLine } from '../components/walking/HeadsUpLine';
import { DeadZoneNudge, OnStripChip } from '../components/walking/HotspotLines';
import { MarkCard } from '../components/walking/MarkCard';
import { MemoryCard } from '../components/walking/MemoryCard';
import { NavBar, NavLines } from '../components/walking/NavBar';
import { NoteSheet } from '../components/walking/NoteSheet';
import { NoticeBanner } from '../components/walking/NoticeBanner';
import { RouteCard, SpotCard } from '../components/walking/SpotCard';
import { StatusChip } from '../components/walking/StatusChip';
import { UnwalkedButton } from '../components/walking/UnwalkedButton';
import { useCards } from '../components/walking/useCards';
import { useDeadZone, useHotspots } from '../components/walking/useHotspots';
import { useRecall } from '../components/walking/useRecall';
import { useRecorderStatus } from '../components/walking/useRecorderStatus';
import { useResumed } from '../components/walking/useResumed';
import { useShareLog } from '../components/walking/useShareLog';
import { useClose, useShownWalk } from '../components/walking/useShownWalk';
import { useWalkCaptures } from '../components/walking/useWalkCaptures';
import { useExploring, useWalkExplore } from '../components/walking/useWalkExplore';
import { useWalkGaps } from '../components/walking/useWalkGaps';
import { useWalkLayers } from '../components/walking/useWalkLayers';
import { useWalkLifecycle } from '../components/walking/useWalkLifecycle';
import { useWalkMap } from '../components/walking/useWalkMap';
import { useWalkMemories } from '../components/walking/useWalkMemories';
import { useWalkNavigation } from '../components/walking/useWalkNavigation';
import { useWalkNotice } from '../components/walking/useWalkNotice';
import { useWalkStreets } from '../components/walking/useWalkStreets';
import { useWayBack } from '../components/walking/useWayBack';
import { WalkBackButton } from '../components/walking/WalkBackButton';
import { WalkCaptureStack } from '../components/walking/WalkCaptureStack';
import { WalkGapCard } from '../components/walking/WalkGapCard';
import { WalkingMap } from '../components/walking/WalkingMap';
import { WalkLayersControl } from '../components/walking/WalkLayersControl';
import { WalkLoading } from '../components/walking/WalkLoading';
import { WalkOptions } from '../components/walking/WalkOptions';
import { WalkStrip } from '../components/walking/WalkStrip';
import { WalkTop } from '../components/walking/WalkTop';
import { HereViewers, WalkViewer } from '../components/walking/WalkViewers';
import { momentPill } from '../lib/momentPill';
import { perfCount } from '../lib/perfCount';
import { screenState } from '../lib/readyNav';
import { useUnits } from '../lib/useUnits';
import { walkScreenShown } from '../lib/walkNav';

// A screen that throws shows what broke, with Try again, never a blank page (bug, Nov 1).
export { ScreenError as ErrorBoundary } from '../components/ScreenError';

/**
 * The walk screen, and Navigate itself (NR1-NR6): ready with no walk open,
 * the walk with one. Start on the ready screen records in place: the walk
 * takes the screen once its plan is written, with no route change, so nothing
 * animates and every button stays where it was.
 *
 * This file is the composition only (the walk screen in parts, WS1): each part's state and effects are a
 * hook in `components/walking/`, its drawing a view there, its effects the `lib/walkScreen` shell. A new
 * walk-screen feature is a part with the journeys that check it, never more lines here.
 */
export default function WalkRoute() {
  // In front: another ask to show the walk does nothing (tabs audit 1). Only while in front, not
  // while mounted: a walk screen left mounted behind the tabs once left the bar's › dead (Nov 2).
  useFocusEffect(useCallback(() => walkScreenShown(), []));
  // Leaving the walk screen (a tab, minimize) closes the Add to this moment pill (MS4).
  useFocusEffect(useCallback(() => () => momentPill.leave(), []));
  const info = useOpenWalkInfo();
  const close = useClose();
  // Storage not read yet (or never, if it keeps failing): still a way back to the tabs (audit 8).
  if (screenState({ known: info.known, walkId: info.walk?.id ?? null }) === 'loading') return <WalkLoading onClose={close} />;
  return <WalkScreen onMinimize={close} />;
}

function WalkScreen(props: { onMinimize: () => void }) {
  perfCount('render:walk');
  // Every distance on this screen follows the units setting (QL16).
  useUnits();
  const { height: screenH } = useWindowDimensions();
  const params = useLocalSearchParams<{ warning?: string; started?: string; recall?: string }>();
  const at = useStackLayout();
  // The walk's cards sit above the strip, left of the stack's column, so they never cover it (audit 5).
  // zIndex 2: over the Layers button in the corner (1), under the drawer (3) (fix layers-corner audit 2).
  const cardAt = { bottom: at.barTop + 12, right: at.right + CAP + STACK_GAP, zIndex: 2 };
  const shown = useShownWalk();
  const { walk } = shown;
  const walkId = walk?.id ?? null;
  // The open walk's pauses and live trace are kept above this screen, so they go on while it is minimized (NV8).
  const openWalk = useOpenWalk();
  const { live, pauses } = openWalk;
  const resumed = useResumed();
  const { mapRef, bearing, setBearing, following, setFollowing, resetNorth } = useWalkMap();
  const n = useWalkNotice({ shownWalk: shown.shownWalk, params, pauses, distanceM: live.distanceM });
  // The ready state (NR1, NR5-NR13): with no walk open, the map and the overlay are its.
  const ready = useReady({
    active: !walk,
    onClose: props.onMinimize,
    onStarting: () => shown.setHolding(true),
    onStarted: (p) => {
      shown.setHolding(false);
      n.started(p);
    },
  });
  const nav = useWalkNavigation({ walk, live, pauses, mapRef: mapRef, setNotice: n.setNotice });
  const lay = useWalkLayers({ walking: !!walk, here: live.here, readyWalker: ready.mapProps.walker ?? null, routePath: nav.navigation.nav?.route.path ?? null });
  const streets = useWalkStreets({ here: live.here, riding: live.riding, runs: live.runs, mapRef: mapRef });
  const gaps = useWalkGaps({ gaps: openWalk.gaps, here: live.here, setFollowing: setFollowing, setNotice: n.setNotice });
  const cards = useCards({ here: live.here, setFollowing: setFollowing, navDest: nav.navigation.nav?.dest.at ?? null, closeGap: () => gaps.setGapOpen(null) });
  const caps = useWalkCaptures({ walkId, live, setNotice: n.setNotice, setToast: n.setToast });
  const life = useWalkLifecycle({ walk, pauses, captures: caps, setNotice: n.setNotice, setEnded: shown.setEnded, onMinimize: props.onMinimize });
  const status = useRecorderStatus({ walk, paused: life.paused, resumed, now: n.now, lastGoodAt: live.lastGoodAt, riding: live.riding, setNotice: n.setNotice });
  const { exploring, setExplore } = useExploring({ walk, setMarkOpen: cards.setMarkOpen });
  const hot = useHotspots({ here: live.here, exploring, resumed });
  const ex = useWalkExplore({ walk, exploring, live, captures: caps.captures, nav, options: cards.options, markOpen: cards.markOpen, onAreas: () => (hot.reload(), lay.busy.reload()) });
  const recall = useRecall({ walk, here: live.here, recall: params.recall, resumed, setViewing: cards.setViewing });
  const mem = useWalkMemories({ walk, here: live.here, reminder: recall.reminder, cards });
  const way = useWayBack({ walkId, start: live.runs[0]?.[0] ?? null, landing: live.landing, here: live.here, setNotice: n.setNotice });
  const shareLog = useShareLog({ walk, open: cards.options, setNotice: n.setNotice });
  const covered = cards.covering(ex.openMark);
  const busy = caps.recordingVoice || life.stopping;
  const finding = nav.navigation.finding;
  const dead = useDeadZone({ walk, here: live.here, riding: live.riding, paused: life.paused, pockets: hot.hotPockets, quiet: !exploring, covered: covered || !!nav.navigation.nav || finding });

  return (
    <View style={styles.screen}>
      {/* One map for both states, at one place in the tree, so Start never remounts it (NR6). */}
      <WalkingMap
        ref={mapRef}
        ready={walk ? null : ready}
        walking={walk ? { live, captures: caps.captures, busy, following: following, setFollowing: setFollowing, streets, nav, ex, cards, gaps, mem, screenH } : null}
        layers={lay}
        at={at}
        onBearingChange={setBearing}
      />
      {!walk ? (
        <>
          {ready.overlay}
          {/* The compass over Locate while the map is turned (CP2); the live walk has its own, below. */}
          <WalkCompass bearing={bearing} onNorth={resetNorth} slot="unwalked" at={at} />
        </>
      ) : (
        <>
          <WalkTop
            top={at.insets.top}
            sideInset={at.sideInset}
            onMinimize={life.minimize}
            minimizeDisabled={busy}
            bar={nav.navigation.nav ? <NavBar nav={nav} walk={walk} pauses={pauses} distanceM={live.distanceM} now={n.now} /> : null}
            notice={n.notice ? <NoticeBanner notice={n.notice} onDismiss={() => n.setNotice(null)} onHandOff={nav.handOff} /> : null}
            chip={hot.onStrip && !status.problem ? <OnStripChip street={hot.onStrip} /> : null}
            toast={n.toast}
          >
            <NavLines nav={nav} />
            <StatusChip problem={status.problem} error={status.status.kind === 'error' && !life.paused} onWhy={status.why} />
            <DeadZoneNudge nudge={dead.nudge} nav={nav} onDismiss={dead.dismiss} />
            {recall.reminder && <ReminderCard captures={recall.reminder.captures} onOpen={recall.open} onDismiss={recall.dismiss} />}
          </WalkTop>

          {/* The pills (caption, undo, retry): left of the stack, above the strip, so the stack never moves (NR10). */}
          <View style={[styles.pills, at.pills]} pointerEvents="box-none">
            <AddToMomentPills captures={caps} walking={!!walk} hidden={caps.recordingVoice || caps.note.open || covered} />
            <HeadsUpLine line={lay.aheadLine} show={!!nav.navigation.nav && !caps.recordingVoice} />
            <CapturePills captures={caps} walking={!!walk} covered={covered} />
          </View>
          <WalkCaptureStack captures={caps} stopping={life.stopping} drawing={gaps.isDrawing} />

          <WalkStrip
            walk={walk}
            pauses={pauses}
            live={live}
            life={life}
            up={cards.options}
            onUp={(u) => cards.drawer(u, { locked: caps.recordingVoice, ringUp: ex.preview != null })}
            areaHeight={screenH}
            locked={caps.recordingVoice}
            exploring={exploring}
            onHoldTap={() => n.setToast('Hold to stop the walk')}
          >
            <WalkOptions exploring={exploring} onExplore={setExplore} ex={ex} layers={lay} hasHere={!!live.here} motionAccess={life.motionAccess} onShareLog={shareLog} />
          </WalkStrip>

          {/* Small round controls in the stack's column, above the captures (as in AllTrails), inside the 640 column. */}
          <UnwalkedButton on={streets.showUnwalked} onToggle={() => streets.setShowUnwalked((v) => !v)} count={streets.unwalkedCount} at={at} />
          <WalkCompass bearing={bearing} onNorth={resetNorth} slot={way.compassSlot(!!nav.navigation.nav)} at={at} />
          <WalkLayersControl layers={lay} at={at} />
          <WalkBackButton wayBack={way} nav={nav} at={at} />
          <RecenterButton show={!following && !!live.here} onRecenter={() => setFollowing(true)} at={at} />

          <MarkCard ex={ex} nav={nav} cards={cards} here={live.here} covered={!!cards.spot || !exploring} cardAt={cardAt} />
          <WalkGapCard gaps={gaps} covered={covered || caps.recordingVoice || !!cards.viewing} cardAt={cardAt} drawBottom={at.insets.bottom + 92} onDraw={() => setFollowing(false)} />
          <WalkViewer cards={cards} captures={caps} recall={recall} walkId={walkId} nav={nav} />
          <MemoryCard mem={mem} cards={cards} show={!cards.spot && !caps.recordingVoice} cardAt={cardAt} />
          <RouteCard nav={nav} covered={!!cards.spot} cardAt={cardAt} />
          <SpotCard cards={cards} walkId={walkId} nav={nav} way={way} cardAt={cardAt} />
          <HereViewers cards={cards} mem={mem} captures={caps} walkId={walkId} />

          {/* At the top, clear of the voice memo's own Undo and the caption pill above the capture row (UI review). */}
          <UndoToast style={{ top: at.insets.top + 64 }} />
          <NoteSheet captures={caps} top={at.insets.top} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  pills: { position: 'absolute', alignItems: 'flex-end', gap: 8 },
});
