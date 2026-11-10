import { forwardRef } from 'react';
import { WalkMap } from '../map/WalkMap';
import type { WalkMapHandle } from '../map/types';
import { BAR_H, raisedHeight, SCALE_BOTTOM, type useStackLayout } from '../walk/layout';
import type { useReady } from '../walk/useReady';
import { emptyGapAt, gapKey, stretchAt } from '../../lib/gaps/infer';
import { getLastFix } from '../../lib/lastFix';
import { forPreview } from '../../lib/nav/previewView';
import { optionAt } from '../../lib/nav/scenic';
import type { OpenWalkState } from '../OpenWalk';
import type { Faced } from '../../lib/moment';
import { scaleInsetBottom } from '../../lib/stackSlots';
import type { StreetSegment } from '../../lib/types';
import type { Cards } from './useCards';
import type { WalkExplore } from './useWalkExplore';
import type { WalkGaps } from './useWalkGaps';
import type { WalkLayers } from './useWalkLayers';
import type { WalkMemories } from './useWalkMemories';
import type { WalkNavigation } from './useWalkNavigation';

/** What the walking map draws and how it answers a tap, from the walk's parts. */
export type Walking = {
  live: OpenWalkState['live'];
  captures: Faced[];
  /** A memo recording or the walk stopping: pins and the map's cards wait. */
  busy: boolean;
  following: boolean;
  setFollowing: (on: boolean) => void;
  streets: { fog: StreetSegment[]; walked: StreetSegment[]; showUnwalked: boolean };
  nav: WalkNavigation;
  ex: WalkExplore;
  cards: Cards;
  gaps: WalkGaps;
  mem: WalkMemories;
  screenH: number;
};

/**
 * The one map, at one place in the tree in both states, so Start never remounts it (NR6): the ready
 * screen's (`ready`) with no walk open, the walk's (`walking`) with one. On the walk, a tap is a point of
 * the way being drawn (GW3), a preview's route (SR8), or a stretch across a gap (G9), and closes the cards.
 */
export const WalkingMap = forwardRef<
  WalkMapHandle,
  {
    ready: ReturnType<typeof useReady> | null;
    walking: Walking | null;
    layers: WalkLayers;
    at: ReturnType<typeof useStackLayout>;
    onBearingChange: (b: number) => void;
  }
>(function WalkingMap(props, mapRef) {
  const { at, layers: lay } = props;
  const sideInset = at.sideInset;
  const insets = at.insets;
  const w = props.walking;
  if (!w) {
    const ready = props.ready!;
    return (
      <WalkMap {...ready.mapProps} borders={ready.bordersOn ? lay.borders : null} ref={mapRef} onBearingChange={props.onBearingChange} scaleInset={{ bottom: scaleInsetBottom({ barTop: at.barTop, scaleBottom: SCALE_BOTTOM, mapEndsAtStrip: true }), left: sideInset + 12 }} />
    );
  }
  const { live, nav, ex, cards, gaps, mem } = w;
  const { navigation } = nav;
  const { layers, wk, busy } = lay;
  const { isDrawing, drawing, gapView, setGapOpen } = gaps;
  const routePreview = navigation.preview;
  const blocked = w.busy || isDrawing;
  // The walk's cards sit above the strip, left of the stack's column, so they never cover it (audit 5).
  const cardBottom = at.barTop + 12;
  const drawerH = raisedHeight(w.screenH, BAR_H + insets.bottom);
  // While choosing among a preview's routes only the routes are drawn, in blue; the trace, the fog, the busy streets' shading and the rest
  // come back as it closes (fix preview-clutter).
  const drawn = forPreview(!!navigation.preview, {
    trace: live.runs,
    rides: live.rides,
    walked: w.streets.walked,
    fog: w.streets.fog,
    faint: gapView.faint,
    gapLinks: isDrawing ? undefined : gapView.links,
    landing: busy.view,
    borders: layers.on.borders ? lay.borders : null,
    walkability: wk.draw,
    veil: w.streets.showUnwalked,
    fogEmphasis: w.streets.showUnwalked,
  });
  return (
    <WalkMap
      {...drawn}
      captures={w.captures}
      // Opening a capture would hide a memo that is still recording.
      // While drawing, a tap on a pin is a point along the way like any other (gap-drawing audit 8).
      onPinPress={blocked ? undefined : cards.setViewing}
      walker={live.here}
      walkerSource={live.dot}
      glideWalker
      walkerHeading={live.heading}
      // Not while a route is found: the street read moves the camera itself.
      // Drawing holds the map where it is: a new fix never moves it under a tap (GW8).
      follow={w.following && !navigation.finding && !navigation.preview && !ex.ring && !isDrawing ? live.here : null}
      drawing={drawing.line}
      onPress={(tapAt, radiusM) => {
        layers.closePanel();
        // While drawing, every tap is a point along the way (GW3).
        if (isDrawing) {
          drawing.tap(tapAt);
          return;
        }
        // A tap on one of the preview's routes highlights it (SR8); elsewhere it does nothing.
        if (routePreview) {
          const i = optionAt(routePreview.options, tapAt, Math.max(15, radiusM * 0.45));
          if (i != null) navigation.select(i);
          return;
        }
        cards.setSpot(null);
        cards.setMarkOpen(null);
        cards.setMemory(null);
        // A tap on a stretch across a gap opens its card (G9); anywhere else closes it.
        // A line's reach is about 20 px, narrower than a pin's 44, so taps beside the trace still do what they did (audit 8).
        const reach = Math.max(10, radiusM * 0.45);
        const hit = navigation.nav || w.busy ? null : stretchAt(gapView.stretches, tapAt, reach) ?? emptyGapAt(gapView.empty, tapAt, reach);
        setGapOpen(hit ? gapKey(hit) : null);
      }}
      memories={mem.memories}
      onMemoryPress={blocked ? undefined : (group, pinAt) => {
        setGapOpen(null);
        void mem.openMemory(group, pinAt);
      }}
      discoveries={ex.explore.pins}
      onDiscoveryPress={blocked ? undefined : (id) => {
        // A found place is shown, not a card to open: its capture's pin is the thing to tap (audit, UI).
        if (ex.explore.found.has(id)) return;
        cards.setSpot(null);
        cards.setMemory(null);
        setGapOpen(null);
        cards.setMarkOpen(id);
        ex.askReach(id);
      }}
      marks={cards.marks}
      ring={ex.ring}
      fitBounds={nav.previewFit ?? ex.ringFit}
      fitKey={nav.previewFit ? nav.previewKey : ex.ringKey}
      fitPadding={nav.previewFit
        ? { top: insets.top + 24, bottom: cardBottom + 300, left: 24, right: 24 }
        : { top: insets.top + 24, bottom: drawerH - BAR_H - insets.bottom + 16, left: 24, right: 24 }}
      onUserMove={() => w.setFollowing(false)}
      onBearingChange={props.onBearingChange}
      // A long press, so a stray tap while walking does nothing.
      onLongPress={(pressAt, radiusM) => {
        if (isDrawing) return;
        // Another card takes the slot: the stretch's card goes, rather than hiding and coming back (audit 7).
        setGapOpen(null);
        void cards.pressMap(pressAt, radiusM, { busy: w.busy, captures: w.captures });
      }}
      route={nav.routeLine}
      alternates={nav.alternates}
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
  );
});
