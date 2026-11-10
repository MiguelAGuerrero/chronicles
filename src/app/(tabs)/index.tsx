import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AreaPointPin } from '../../components/AreaPoint';
import { AtlasCard, type CardLayout } from '../../components/atlas/AtlasCard';
import { AtlasCarousel } from '../../components/atlas/AtlasCarousel';
import { AtlasTile } from '../../components/atlas/AtlasTile';
import { LocateButton } from '../../components/LocateButton';
import { CompassButton } from '../../components/CompassButton';
import { LayersControl } from '../../components/LayersControl';
import { layerNotes } from '../../lib/layers/notes';
import { useBusyLayer } from '../../lib/layers/useBusyLayer';
import { useLayers } from '../../lib/layers/useLayers';
import { useWalkability } from '../../lib/walk/useWalkability';
import { WalkMap } from '../../components/map/WalkMap';
import { PlannerDrawer } from '../../components/planner/PlannerDrawer';
import type { CategoryId } from '../../lib/discovery/types';
import type { WalkMapHandle } from '../../components/map/types';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import {
  ATLAS_RULES, areaPins, busyAreas, canWalkTo, distanceWords, familiarity, findsIn, nextDoor, otherTowns, nextFrame, townReachM, waitingMarks, walkTarget,
  type AtlasArea, type Familiarity, type Listed, type PageFramed,
} from '../../lib/atlas/atlas';
import { mapTopInset } from '../../lib/mapTopInset';
import { nearReads } from '../../lib/atlas/read';
import { busyNamesNear, firstSelection, rowOf, rowStep, stepKey } from '../../lib/atlas/carousel';
import { SNAP } from '../../lib/atlas/snap';
import { useAtlas } from '../../lib/atlas/useAtlas';
import { bordersFor, outlineIdHere, outlineOf, townFrame } from '../../lib/areas/borders';
import { BORDER_ZOOM } from '../../lib/areas/outlines';
import { useOutlineSet } from '../../lib/areas/useOutlineSet';
import { db } from '../../lib/db';
import type { Find } from '../../lib/explore/explore';
import { formatDistance } from '../../lib/format';
import { boundsOf, distanceM as metresBetween, type Bounds } from '../../lib/geo';
import { readArea, rememberArea } from '../../lib/landing/read';
import { getLastFix, launchFix, setLastFix } from '../../lib/lastFix';
import { locateOnce } from '../../lib/locate';
import { useReducedMotion } from '../../lib/motion';
import { perfCount } from '../../lib/perfCount';
import type { LngLat } from '../../lib/types';
import { useLocate, type LocateError } from '../../lib/useLocate';
import { useStartWalk } from '../../lib/useStartWalk';
import { useTabMap } from '../../lib/useTabMap';

// A tab that throws shows what broke, with the tab bar and the recording bar still there (fix ios-video audit 1).
export { ScreenError as ErrorBoundary } from '../../components/ScreenError';

const NONE: never[] = [];
const NEW_FAM: Familiarity = { walks: 0, last: null };
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** Meta: the long press was used once, so its hint stops showing (atlas round 3). */
const PRESS_HINT_KEY = 'atlas_press_seen';
/** The Busy layer's street names show on the map only from this zoom, and only near the selected area (EC7, decision 0109). */
const BUSY_NAMES_ZOOM = 13;
/** The long press's choices over the map's bottom (`spot`): the overlay sits above them, never over (EC19). */
const SPOT_H = 68;
/** From this width the area's card opens as a side panel beside the map; narrower, as a full-screen drawer. */
const TWO_PANES = 1000;
const fmt = (m: number) => formatDistance(m);

/**
 * Explore as an atlas (AT1-AT16, EC1-EC20, decision 0109): the map fills the screen with the page's
 * title over it, and the areas are one row of cards at the bottom: the neighborhoods near you, then
 * the other towns. One is always selected, highlighted on the map and the only one named there. The
 * title opens your own town; the selected town's card opens its page, the selected neighborhood's
 * its card, a sheet that keeps the map in sight. Rings are
 * read by themselves while the tab is open. A long press on the map offers
 * What's good here and Walk here, over the map. It never tracks you: it reads
 * one fix as the app opens (it is the first tab, NV2), then moves with your last
 * fix, or a Locate tap.
 */
export default function Explore() {
  perfCount('render:explore');
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const walkStart = useStartWalk();
  const [from, setFrom] = useState<LngLat | null>(() => getLastFix()?.at ?? null);
  // With no fix since launch (a reload), the atlas opens where it last listed areas, never saying "You're here" (AT1).
  const [stale, setStale] = useState(() => !getLastFix());
  useEffect(() => {
    if (from) return;
    let live = true;
    // Only a read of the page near you counts: a town's page reads around the town, not around you.
    nearReads('neighborhood').then((n) => {
      const mine = n.find((r) => (r.radiusM ?? ATLAS_RULES.nearNeighborhoodM) === ATLAS_RULES.nearNeighborhoodM);
      if (live && mine) setFrom((f) => f ?? mine.at);
    }, () => {});
    return () => {
      live = false;
    };
  }, [from]);
  const [fit, setFit] = useState<{ bounds: Bounds | null; key: number }>({ bounds: null, key: 0 });
  const { focused, savedCamera, onCameraChange, onFitSettled } = useTabMap({ key: fit.key, refit: () => setFit((f) => ({ ...f, key: f.key + 1 })) });
  // What the reader chose; the selected area is this while it is in the row, else the row's first (EC1).
  const [picked, setSelected] = useState<string | null>(null);
  // What a swipe landed on, for the screen reader (DN12): web's live region, since react-native-web's announce does nothing.
  // A count beside it, so the same name twice in a row still changes the region and is said again (audit 7).
  const [said, setSaid] = useState({ text: '', n: 0 });
  const [open, setOpen] = useState<string | null>(null);
  // The town whose page is open (AT2); null is the page of the areas near you.
  const [townSeen, setTownSeen] = useState<AtlasArea | null>(null);
  const fresh = useAtlas(focused, from, townSeen);
  const town = useMemo(() => (townSeen ? fresh.rows.find((r) => r.key === townSeen.key) ?? townSeen : null), [fresh.rows, townSeen]);
  const neighborhoods = useMemo(() => (stale ? fresh.neighborhoods.map((x) => ({ ...x, here: false })) : fresh.neighborhoods), [fresh.neighborhoods, stale]);
  const allTowns = useMemo(() => (stale ? fresh.towns.map((x) => ({ ...x, here: false })) : fresh.towns), [fresh.towns, stale]);
  // Your own town is the title, never listed again (atlas round 3).
  const towns = useMemo(() => otherTowns(allTowns), [allTowns]);
  const home = stale ? null : fresh.home;
  // What this visit to the page has framed; opening a page or going back starts a new visit.
  const framed = useRef<PageFramed | null>(null);
  const [spot, setSpot] = useState<{ at: LngLat; zoom: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pressSeen, setPressSeen] = useState(true);
  useEffect(() => {
    let live = true;
    db.getMeta(PRESS_HINT_KEY).then((v) => live && setPressSeen(v === '1'), () => {});
    return () => {
      live = false;
    };
  }, []);
  // Back on the tab, a newer fix from Navigate moves the atlas with you (explore-atlas audit 1).
  const fixSeen = useRef(getLastFix()?.t ?? 0);
  const mapRef = useRef<WalkMapHandle>(null);
  // The walk planner's kind (WP1): a page over the card, with a map of its own, so Explore's map steps aside while it is open.
  const [plan, setPlan] = useState<CategoryId | null>(null);
  const [bearing, setBearing] = useState(0);
  // The map comes down when Explore loses focus and opens north-up again (CP8).
  useFocusEffect(useCallback(() => () => setBearing(0), []));
  useFocusEffect(
    useCallback(() => {
      const fix = getLastFix();
      if (fix && fix.t > fixSeen.current) {
        fixSeen.current = fix.t;
        setFrom(fix.at);
        setStale(false);
      }
      // A card or the long press's choices never outlive the tab's turn in front (audit 8, round 3).
      return () => {
        setOpen(null);
        setSpot(null);
      };
    }, []),
  );
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  const [looking, setLooking] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone?: 'info' | 'error' } | null>(null);
  const [locError, setLocError] = useState<LocateError | null>(null);
  const cancelled = useRef(false);
  const [screen, setScreen] = useState({ w: width, h: height });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const frame = useCallback((points: LngLat[], padM: number) => {
    const box = boundsOf(points, padM);
    if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
  }, []);

  const { busy: locating, locate } = useLocate({
    onFix: (at) => {
      setFrom(at);
      setStale(false);
      fixSeen.current = Date.now();
      frame([at], ATLAS_RULES.ringM);
    },
    onError: setLocError,
  });
  // One fix as the app opens, framed (NV16, the owner's call, Nov 3): Explore is the first tab (NV2),
  // so it can't wait for Navigate's. Once per launch; nothing tracks after.
  useEffect(() => {
    if (!focused || !launchFix.take(!!getLastFix())) return;
    locateOnce().then((r) => {
      if (!r.at) return;
      setLastFix(r.at);
      fixSeen.current = getLastFix()?.t ?? Date.now();
      setFrom(r.at);
      setStale(false);
      frame([r.at], ATLAS_RULES.ringM);
    }, () => {});
  }, [focused, frame]);

  const ownTown: Listed | null = useMemo(() => {
    if (!town) return null;
    return allTowns.find((x) => x.area.key === town.key) ?? { area: town, distanceM: 0, here: false };
  }, [town, allTowns]);
  const shown = useMemo(() => rowOf({ ownTown, neighborhoods, towns }), [ownTown, neighborhoods, towns]);
  const order = useMemo(() => shown.map((l) => l.area.key), [shown]);
  const selected = useMemo(() => firstSelection(order, picked), [order, picked]);
  const famOf = useMemo(() => {
    const m = new Map<string, Familiarity>();
    for (const l of shown) m.set(l.area.key, familiarity(l.area, fresh.areas, fresh.walkAreas));
    return m;
  }, [shown, fresh.areas, fresh.walkAreas]);
  const found = useMemo(() => new Set(fresh.finds.map((f) => f.key)), [fresh.finds]);
  const ringOf = useMemo(() => {
    const m = new Map<string, { waiting: ReturnType<typeof waitingMarks>; finds: Find[] }>();
    for (const l of shown) {
      const a = l.area;
      m.set(a.key, {
        waiting: a.profile ? waitingMarks(a.profile.marks, found, a.profile.sketchAt ?? a.at, fresh.hidden) : [],
        finds: findsIn(fresh.finds, a.profile?.sketchAt ?? a.at),
      });
    }
    return m;
  }, [shown, fresh.finds, fresh.hidden, found]);

  // The map's areas: the page's neighborhoods (and the town), dots, the selected one named in the accent (round 3).
  const pointsOf = useMemo(() => (town ? [{ area: town, distanceM: 0, here: false }, ...neighborhoods] : neighborhoods), [town, neighborhoods]);
  const points = useMemo(() => pointsOf.map((l) => l.area.at), [pointsOf]);
  // Only the selected area's level is drawn, so a town's name and its neighborhoods' never overlay (fix map-levels).
  const areaPoints = useMemo<AreaPointPin[]>(() => areaPins(shown, selected, !!town), [shown, selected, town]);
  const sel = shown.find((l) => l.area.key === selected) ?? null;
  // Town borders (TB1, TB2): whole, from the z10 tile around you (or the open or selected town); yours tinted, the rest lined.
  // A town selected in the row is the one tinted (EC5).
  const lit = town ?? (sel?.area.level === 'town' ? sel.area : null);
  // Town borders (TB1, TB2): whole, from the z10 tile around you (or the open town); yours tinted, the rest lined.
  const drawn = useOutlineSet([from, lit?.at], BORDER_ZOOM, focused);
  const tintedId = useMemo(
    () => (lit ? outlineOf({ name: lit.name, at: lit.at }, drawn)?.id : home && from ? outlineIdHere(from, home.area.name, fresh.outlines) : null) ?? null,
    [drawn, lit, home, from, fresh.outlines],
  );
  const borders = useMemo(() => bordersFor(drawn, { tinted: tintedId ? [tintedId] : [], near: town?.at ?? from }), [drawn, tintedId, town, from]);
  // TB11: the whole of the tinted town (yours, or a page's) once its border is known; the page frames it below.
  const townBox = useMemo(() => townFrame(drawn, tintedId), [drawn, tintedId]);
  // Map layers (ML3-ML9): what is drawn over the base map, one setting for every map, around the selected area else around you.
  const layers = useLayers();
  const layersAt = sel?.area.at ?? from ?? null;
  const wk = useWalkability(layersAt, !!layers.on.walkability);
  const busy = useBusyLayer(layersAt, !!layers.on.busy);
  // The Busy layer's lines draw at any zoom; its street names only near the selected area and zoomed in (EC7).
  const busyView = useMemo(() => busyNamesNear(busy.view, sel?.area.at ?? null, view?.zoom ?? 0, ATLAS_RULES.ringM, BUSY_NAMES_ZOOM), [busy.view, sel, view]);
  // A card is only ever one of the areas shown, with its real distance (explore-atlas audit 7).
  const card = focused ? shown.find((l) => l.area.key === open) ?? null : null;
  const shownRef = useRef(shown);
  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);
  const pick = useCallback((key: string) => {
    const l = shownRef.current.find((x) => x.area.key === key);
    if (!l) return;
    setSpot(null);
    setSelected(key);
    setOpen(key);
    frame([l.area.at], ATLAS_RULES.ringM);
  }, [frame, setOpen, setSelected, setSpot]);
  // AT2: a town opens its page; Back, Escape and the back pill return (the title has no arrow: decision 0077).
  const enterArea = useCallback((area: AtlasArea) => {
    setSpot(null);
    framed.current = null;
    setTownSeen(area);
    setSelected(null);
    frame([area.at], townReachM(area) * 0.6);
  }, [frame]);
  const leave = useCallback(() => {
    setSpot(null);
    framed.current = null;
    setTownSeen(null);
    setSelected(null);
  }, []);
  useEffect(() => {
    if (!townSeen || open || !focused) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && leave();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, [townSeen, open, focused, leave]);
  // Each visit to a page is framed (AT9, TB11): its areas until its town's border is known, then the whole
  // town, and nothing undoes that within the visit (`nextFrame`, fix explore-fit-area).
  useEffect(() => {
    const page = townSeen ? `town:${townSeen.key}` : 'near';
    // A town's page waits for its areas with its reach in view, as `enterArea` frames it (audit 9).
    const padM = townSeen ? townReachM(townSeen) * 0.6 : 150;
    const next = nextFrame(framed.current, { page, build: fresh.build, town: townBox, points, from, padM });
    if (!next) return;
    framed.current = next.framed;
    setFit((f) => ({ bounds: next.bounds, key: f.key + 1 }));
  }, [townSeen, fresh.build, townBox, points, from]);

  const lookHere = async (at: LngLat) => {
    if (looking) return;
    cancelled.current = false;
    setLooking(true);
    try {
      const r = await readArea(at, () => cancelled.current);
      if (cancelled.current) return;
      if (!r.ok) {
        if (r.reason === 'failed') setNotice({ message: 'Couldn’t read the map here', tone: 'error' });
        return;
      }
      const tile = await db.getMeta('tile_build').catch(() => null);
      await rememberArea(r.centre, r.analysis, tile ?? 'unknown', r.overture);
      const top = r.analysis.pockets[0]?.name ?? r.analysis.landing?.street;
      const message = `${r.analysis.reason}${r.analysis.basis === 'density' && top ? `: ${top}` : ''}. A best guess from the map.`;
      setNotice({ message });
      AccessibilityInfo.announceForAccessibility(message);
    } finally {
      if (!cancelled.current) setLooking(false);
    }
  };

  const topInset = mapTopInset(insets.top, Platform.OS === 'web');
  // The fit's padding, so selecting an area centres it where a tap's frame would (EC5).
  const mapPad = useMemo(() => ({ top: topInset + 84, right: 24, bottom: spot ? 80 : 24, left: 24 }), [topInset, spot]);
  const reduced = useReducedMotion();
  const say = useCallback((name: string) => {
    setSaid((s) => ({ text: name, n: s.n + 1 }));
    AccessibilityInfo.announceForAccessibility(name);
  }, []);
  // Selecting an area, by the row, a swipe, a key or a tap on its card (EC5, EC13): the map eases to it keeping its zoom
  // (a town is framed whole), a card or the long press's choices never outlive it, a screen reader hears its name.
  const selectKey = useCallback((key: string) => {
    const l = shownRef.current.find((x) => x.area.key === key);
    if (!l) return;
    setSpot(null);
    setOpen(null);
    setSelected(key);
    if (l.area.level === 'town') frame([l.area.at], townReachM(l.area) * 0.6);
    else mapRef.current?.showPoint(l.area.at, mapPad);
    say(l.area.name);
  }, [frame, mapPad, say]);
  // A swipe on the map steps the row, by what is on screen (EC8, EC9, EC10): left is the next card, right the previous.
  const onSwipe = useCallback(({ dx, dy }: { dx: number; dy: number }) => {
    const key = stepKey(order, selected, rowStep(dx, dy, SNAP.minSwipePx));
    if (key) selectKey(key);
  }, [order, selected, selectKey]);
  // A tap on a card (EC11): the selected one opens (a town's its page, an area's its card), another only selects.
  const onCard = useCallback((key: string) => {
    const l = shownRef.current.find((x) => x.area.key === key);
    if (!l) return;
    if (key !== selected) {
      selectKey(key);
      return;
    }
    if (!town && l.area.level === 'town') {
      setOpen(null);
      enterArea(l.area);
      return;
    }
    setSpot(null);
    setOpen(key);
    frame([l.area.at], ATLAS_RULES.ringM);
  }, [selected, town, selectKey, enterArea, frame]);

  const wide = screen.w >= TWO_PANES;
  const error = walkStart.error ?? locError;
  const title = town?.name ?? home?.area.name ?? 'Near you';
  const subtitle = town
    ? (ownTown?.here || (home && home.area.key === town.key) ? 'You’re here' : distanceWords(ownTown?.distanceM ?? 0, false, fmt))
    : home ? 'Your town' : 'Areas around you';
  const listing = fresh.status === 'listing' || (fresh.status === 'idle' && !fresh.build);
  const cardLayout: CardLayout = wide
    ? { kind: 'side', width: 400, height: screen.h }
    : { kind: 'sheet', screenH: screen.h };

  const townNote = town && ownTown && !neighborhoods.length
    ? (listing ? `Reading ${town.name}…` : `No neighborhoods are named on the map in ${town.name}. It is one area.`)
    : null;
  const overlay = error ? (
    <Banner
      tone="error"
      onDismiss={() => {
        walkStart.setError(null);
        setLocError(null);
      }}
      action={error.openSettings ? { label: 'Open Settings', onPress: () => Linking.openSettings() } : undefined}
    >
      {error.message}
    </Banner>
  ) : notice ? (
    <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>
      {notice.message}
    </Banner>
  ) : looking ? (
    <View style={styles.scanning} accessibilityLiveRegion="polite">
      <ActivityIndicator color={theme.ink} />
      <Text style={styles.scanningText}>Looking around…</Text>
      <Pressable
        testID="look-cancel"
        accessibilityRole="button"
        accessibilityLabel="Stop looking around"
        onPress={() => {
          cancelled.current = true;
          setLooking(false);
        }}
        style={styles.scanCancel}
      >
        <Text style={styles.scanCancelText}>Cancel</Text>
      </Pressable>
    </View>
  ) : townNote ? (
    <View style={styles.note} testID="atlas-town-note" accessibilityLiveRegion="polite">
      {listing ? <ActivityIndicator color={theme.muted} /> : null}
      <Text style={styles.noteText}>{townNote}</Text>
    </View>
  ) : !pressSeen && !spot && from ? (
    <Text style={styles.hint} testID="atlas-press-hint">Press and hold the map to look anywhere.</Text>
  ) : null;

  const mapPane = (
    <View style={styles.map}>
      {/* Only while Explore is in front (NV4): one map is live at a time. */}
      {focused && !plan && (
        <WalkMap
          trace={NONE}
          walked={NONE}
          fog={NONE}
          ref={mapRef}
          onBearingChange={setBearing}
          captures={NONE}
          walker={from}
          marks={spot ? [spot.at] : NONE}
          areaPoints={areaPoints}
          // A neighborhood by its ring; a town by its tinted border (EC5).
          ring={sel?.area.level === 'neighborhood' ? { center: sel.area.at, radiusM: ATLAS_RULES.ringM } : null}
          // Town borders are a layer (ML12); a town's own page keeps the border it frames (TB2).
          borders={layers.on.borders || town ? borders : null}
          walkability={wk.draw}
          landing={busyView}
          onLongPress={(at) => {
            if (looking) return;
            if ((view?.zoom ?? 0) < 10) {
              setToast('Zoom in to look closer');
              return;
            }
            setSpot({ at, zoom: view?.zoom ?? 0 });
            if (!pressSeen) {
              setPressSeen(true);
              db.setMeta(PRESS_HINT_KEY, '1').catch(() => {});
            }
          }}
          onPress={() => {
            layers.closePanel();
            // A tap closes the long press's choices; the selection stays: something is always selected (EC1).
            if (spot) setSpot(null);
          }}
          onSwipe={onSwipe}
          onViewChange={setView}
          fitBounds={fit.bounds}
          fitKey={fit.key}
          onFitSettled={onFitSettled}
          fitPadding={mapPad}
          initialCenter={savedCamera?.center ?? from ?? WORLD.center}
          initialZoom={savedCamera?.zoom ?? (from ? 13 : WORLD.zoom)}
          onCameraChange={onCameraChange}
          scaleInset={{ bottom: 6, left: 8 }}
        />
      )}
      {/* The page's title floats over the map, lifted by a shadow; near you, it is the way into your own town.
          On a town's page it has no back arrow: the pill low on the screen is the one way back (decision 0077). */}
      <View style={[styles.titleWrap, { top: topInset + 8, left: 12 }]} pointerEvents="box-none">
        <View style={styles.titleCard}>
          <Pressable
            disabled={!!town || !home}
            onPress={() => home && enterArea(home.area)}
            accessibilityRole={!town && home ? 'button' : 'header'}
            accessibilityLabel={!town && home ? `${home.area.name}, your town. See all its neighborhoods` : undefined}
            style={styles.titleText}
            testID="atlas-title"
          >
            <View style={styles.titleRow}>
              <Text testID="explore-area" style={styles.title} numberOfLines={1}>{title}</Text>
              {!town && home ? <Icon name="chevron-forward" size={18} color={theme.muted} /> : null}
            </View>
            <Text testID="explore-subtitle" style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </Pressable>
        </View>
      </View>
      {/* The long press's choices sit over the map where it was pressed, never inside the scrolled list (round 3). */}
      {spot ? (
        <View style={styles.spot} testID="atlas-spot">
          <Button
            testID="look-here"
            label="What's good here?"
            disabled={looking}
            style={styles.spotBtn}
            onPress={() => {
              const at = spot.at;
              setSpot(null);
              lookHere(at);
            }}
          />
          {spot.zoom >= 12 && (
            <Button
              testID="walk-here"
              variant="secondary"
              label="Walk here"
              disabled={looking}
              busy={walkStart.starting}
              busyLabel="Starting…"
              style={styles.spotBtn}
              onPress={() => {
                const at = spot.at;
                setSpot(null);
                walkStart.start({ at, label: 'Your spot', kind: 'point' });
              }}
            />
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSpot(null)} style={styles.spotClose}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
      ) : (
        <LocateButton busy={locating} onPress={locate} bottom={8} />
      )}
      {/* The compass (CP2): above Locate, only while the map is turned and on screen. */}
      {focused && !spot && <LayersControl layers={layers} notes={layerNotes({ walkability: wk.status, busyReading: busy.reading, busyFailed: busy.failed })} top={insets.top + 8} right={12} paneWidth={screen.w} clearBottom={insets.bottom + 100} />}
      {focused && !spot && <CompassButton bearing={bearing} onPress={() => mapRef.current?.resetNorth()} bottom={8 + 44 + 12} />}
      {toast ? <View style={styles.toast} accessibilityLiveRegion="polite"><Text style={styles.toastText}>{toast}</Text></View> : null}
      {/* DN12 on web: react-native-web's announceForAccessibility does nothing, so a hidden live region says it.
          Phones announce through the call alone (a live region too would say it twice on Android). */}
      {Platform.OS === 'web' ? <Text testID="atlas-snap-said" accessibilityLiveRegion="polite" style={styles.said}>{said.n % 2 ? `${said.text}\u200B` : said.text}</Text> : null}
      {/* One of an error, a notice, "Looking around…", a town's note or the hint at a time, over the map above the row, clear of
          the back pill and the map's buttons (EC12, EC14). */}
      {overlay ? <View style={[styles.overlay, { bottom: spot ? 10 + SPOT_H + 8 : town ? 12 + 44 + 8 : 12 }]} pointerEvents="box-none">{overlay}</View> : null}
      {/* On a town's page, the way back also sits low, where a thumb reaches (round 3), over the map above the row. */}
      {town && !spot ? (
        <Pressable testID="atlas-back-pill" accessibilityRole="button" accessibilityLabel={`Back to ${home?.area.name ?? 'near you'}`} onPress={leave} style={styles.backPill}>
          <Icon name="chevron-back" size={18} color={theme.ink} />
          <Text style={styles.backPillText} numberOfLines={1}>{home?.area.name ?? 'Near you'}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen} onLayout={(e) => setScreen({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {mapPane}
      {/* The row of areas under the map (EC2, EC3): one card at a time is selected; with no area to show, one status card. */}
      <View style={styles.rowPane} testID="atlas-row">
        {shown.length ? (
          <AtlasCarousel
            items={shown}
            selected={selected}
            width={screen.w}
            reduced={reduced}
            onSettle={selectKey}
            renderCard={(l, isSel) => (
              <AtlasTile
                listed={l}
                fam={famOf.get(l.area.key) ?? NEW_FAM}
                selected={isSel}
                drill={!town && l.area.level === 'town'}
                wide={!!town && l.area.key === town.key}
                onPress={onCard}
              />
            )}
          />
        ) : !from ? (
          <View style={styles.empty} testID="atlas-empty">
            <Icon name="locate-outline" size={22} color={theme.muted} />
            <Text style={styles.emptyText}>Find where you are to see the areas around you.</Text>
            <Button testID="atlas-locate" label="Find me" variant="secondary" onPress={locate} busy={locating} busyLabel="Finding you…" />
          </View>
        ) : (
          <View style={styles.empty} testID="atlas-empty">
            {listing ? <ActivityIndicator color={theme.muted} /> : null}
            <Text style={styles.emptyText}>
              {listing ? 'Reading the map around you…'
                : fresh.status === 'offline' ? 'Couldn’t read the map. It will try again in a moment.'
                  : 'No neighborhoods are named on the map here.'}
            </Text>
          </View>
        )}
      </View>

      {card && (
        <AtlasCard
          key={card.area.key}
          area={card.area}
          parent={card.area.level === 'neighborhood' ? town?.name ?? home?.area.name ?? null : null}
          distanceM={card.distanceM}
          here={card.here}
          fam={famOf.get(card.area.key) ?? NEW_FAM}
          walked={fresh.walked}
          waiting={ringOf.get(card.area.key)?.waiting ?? NONE}
          finds={ringOf.get(card.area.key)?.finds ?? NONE}
          you={from}
          nextDoor={nextDoor(card.area, shown.map((l) => l.area), fresh.build)}
          walkTo={!card.here && canWalkTo(card.distanceM) ? walkTarget(card.area) : null}
          busyAreas={busyAreas(card.area).map((b) => ({ ...b, walkable: !!from && canWalkTo(metresBetween(from, b.at)) }))}
          starting={walkStart.starting}
          onWalkAt={(at, label) => {
            setOpen(null);
            walkStart.start({ at, label, kind: 'point' });
          }}
          onPlan={(k) => setPlan(k)}
          onWalk={() => {
            const t = walkTarget(card.area);
            setOpen(null);
            walkStart.start({ at: t.at, label: t.label, kind: 'point' });
          }}
          onPick={pick}
          onClose={() => setOpen(null)}
          layout={cardLayout}
        />
      )}
      {card && plan && (
        <PlannerDrawer
          kind={plan}
          area={card.area}
          you={getLastFix()?.at ?? from}
          lastFixAt={getLastFix()?.t ?? null}
          fixNow={() => getLastFix()?.at ?? from}
          starting={walkStart.starting}
          onClose={() => setPlan(null)}
          onStart={(dest) => {
            setPlan(null);
            setOpen(null);
            walkStart.start(dest);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  said: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  // The map takes what the row leaves. Overflow visible, above the row: the Layers panel opens over the cards like a popover (ML4).
  map: { flex: 1, minHeight: 0, borderBottomWidth: 1, borderColor: theme.line, overflow: 'visible', zIndex: 5 },
  // The row under the map sizes to its cards: never `flex: 1` (react-native-web would stretch it).
  rowPane: { flexGrow: 0, flexShrink: 0, paddingBottom: 8, paddingTop: 4 },
  overlay: { position: 'absolute', left: 12, right: 64, alignItems: 'flex-start', gap: 8 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  noteText: { fontSize: 14, color: theme.muted, flexShrink: 1 },
  titleWrap: { position: 'absolute', right: 12, alignItems: 'flex-start' },
  titleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.surface, borderRadius: 14, paddingVertical: 8, paddingLeft: 14, paddingRight: 14,
    maxWidth: 616, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  titleText: { flexShrink: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  title: { fontSize: 22, fontWeight: '800', color: theme.ink, flexShrink: 1 },
  subtitle: { fontSize: 13, color: theme.muted, marginTop: 1 },
  hint: { fontSize: 13, color: theme.muted, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.surface, borderRadius: 14, overflow: 'hidden' },
  empty: { marginHorizontal: 12, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line, padding: 16, gap: 10, alignItems: 'center' },
  emptyText: { fontSize: 15, color: theme.muted, textAlign: 'center' },
  spot: {
    position: 'absolute', left: 12, right: 12, bottom: 10, maxWidth: 420, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 8, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  spotBtn: { flex: 1 },
  spotClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 16, backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  scanning: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', backgroundColor: theme.surface, borderRadius: 999, paddingVertical: 6, paddingLeft: 14, paddingRight: 6 },
  scanningText: { fontSize: 15, fontWeight: '600', color: theme.ink },
  scanCancel: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  scanCancelText: { fontSize: 15, fontWeight: '600', color: theme.accent },
  backPill: {
    position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, maxWidth: 240,
    paddingLeft: 10, paddingRight: 16, borderRadius: 999, backgroundColor: theme.surface,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  backPillText: { fontSize: 15, fontWeight: '600', color: theme.ink, flexShrink: 1 },
});
