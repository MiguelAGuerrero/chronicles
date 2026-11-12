import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AreaPointPin } from '../../components/AreaPoint';
import { AtlasCard, type CardLayout } from '../../components/atlas/AtlasCard';
import { AtlasCarousel } from '../../components/atlas/AtlasCarousel';
import { AtlasTile } from '../../components/atlas/AtlasTile';
import { CentreMark, MoveMapToggle, ShowAreasPill } from '../../components/atlas/FreeLookControls';
import { centreOf, emptyLook, listedAround, lookPage, lookRowLabel, lookWords, lookedList, youFresh } from '../../lib/atlas/freeLook';
import { cancelLook, endLook, IDLE, isLive, startLook, type Look } from '../../lib/atlas/look';
import { exploreSlots, SCALE_LEFT } from '../../lib/atlas/overlaySlots';
import { KIND_COLOR, KIND_ICON_OF } from '../../components/atlas/kinds';
import type { MarkPin } from '../../components/MarkPinView';
import { CATEGORIES } from '../../lib/discovery/categories';
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
import type { WaitingDot, WalkMapHandle } from '../../components/map/types';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import {
  ATLAS_RULES, areaPins, busyAreas, canWalkTo, distanceWords, familiarity, findsIn, nextDoor, nextFrame, townReachM, waitingMarks, walkTarget,
  type AtlasArea, type Familiarity, type Listed, type PageFramed,
} from '../../lib/atlas/atlas';
import { mapTopInset } from '../../lib/mapTopInset';
import { nearReads } from '../../lib/atlas/read';
import { busyNamesNear, busyNamesOn, busyRadiusM, firstSelection, layerCentre, nearWords, rowOf, rowStep, stepKey, townNote } from '../../lib/atlas/carousel';
import { SNAP } from '../../lib/atlas/snap';
import { useAtlas } from '../../lib/atlas/useAtlas';
import { areaMapMarks, dotAt, halfZoom, metresPerPx, PIN_ROOM, pageBack, roomZoom, tapDoes, tapZoom, viewOf, waitingLabel } from '../../lib/atlas/waitingPins';
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
import { walkToChoice } from '../../lib/startPlan';
import { inPolygons } from '../../lib/complexes/geom';
import { readsWanted, shown as shownComplexes } from '../../lib/complexes/kinds';
import { complexSection } from '../../lib/complexes/lines';
import { COMPLEX_STYLE, complexMap } from '../../lib/complexes/mapLayer';
import { useComplexes, useHiddenKinds } from '../../lib/complexes/useComplexes';
import { useOpenWalkInfo } from '../../components/OpenWalk';
import { useTabMap } from '../../lib/useTabMap';

// A tab that throws shows what broke, with the tab bar and the recording bar still there (fix ios-video audit 1).
export { ScreenError as ErrorBoundary } from '../../components/ScreenError';

const NONE: never[] = [];
const NEW_FAM: Familiarity = { walks: 0, last: null };
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** Meta: the long press was used once, so its hint stops showing (atlas round 3). */
const PRESS_HINT_KEY = 'atlas_press_seen';
/** The Busy layer's street names show on the map only from this zoom, and only near the selected area (EC7, decision 0124). */
const BUSY_NAMES_ZOOM = 13;
/** How long the long press's hint stays up before it is marked seen (explore-carousel audit 10). */
const HINT_MS = 5000;
/** The long press's choices over the map's bottom (`spot`): the overlay sits above them, never over (EC19). */
const SPOT_H = 68;
/** From this width the area's card opens as a side panel beside the map; narrower, as a full-screen drawer. */
const TWO_PANES = 1000;
const fmt = (m: number) => formatDistance(m);

/**
 * Explore as an atlas (AT1-AT16, EC1-EC20, decision 0124): the map fills the screen with the page's
 * title over it, and the areas are one row of cards at the bottom: near you, the towns, yours first and
 * selected; on a town's page, the town, then its neighborhoods (one level per row, fix explore-town-scope).
 * One is always selected, highlighted on the map and the only one named there. The selected town's card
 * opens its page, the selected neighborhood's its card, a sheet that keeps the map in sight. Rings are
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
  const openInfo = useOpenWalkInfo();
  // `you` is where the reader is (their fix); `from` is where the page lists around: `you`, or the looked point (FL16).
  const [you, setYou] = useState<LngLat | null>(() => getLastFix()?.at ?? null);
  // Free look (FL3): Move map frees one finger; Show areas here takes the map's middle as the page's centre.
  const [free, setFree] = useState(false);
  const [looked, setLooked] = useState<{ at: LngLat; you: LngLat | null } | null>(null);
  const from = looked?.at ?? you;
  const lookedRef = useRef(looked);
  const freeRef = useRef(free);
  useEffect(() => {
    lookedRef.current = looked;
    freeRef.current = free;
  }, [looked, free]);
  // With no fix since launch (a reload), the atlas opens where it last listed areas, never saying "You're here" (AT1).
  const [stale, setStale] = useState(() => !getLastFix());
  useEffect(() => {
    if (you) return;
    let live = true;
    // Only a read of the page near you counts: a town's page reads around the town, a look around the looked point (FL15).
    nearReads('neighborhood').then((n) => {
      const mine = listedAround(n, ATLAS_RULES.nearNeighborhoodM);
      if (live && mine) setYou((f) => f ?? mine.at);
    }, () => {});
    return () => {
      live = false;
    };
  }, [you]);
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
  const fresh = useAtlas(focused, from, townSeen, looked != null);
  const town = useMemo(() => (townSeen ? fresh.rows.find((r) => r.key === townSeen.key) ?? townSeen : null), [fresh.rows, townSeen]);
  // A look lists in plain distance order from its point, says "here" nowhere, and measures from a fresh fix of yours (FL6, FL7, FL12).
  const around = (l: Listed[]) => (looked ? lookedList(l, looked.at, looked.you) : stale ? l.map((x) => ({ ...x, here: false })) : l);
  const neighborhoods = useMemo(() => around(fresh.neighborhoods), [fresh.neighborhoods, stale, looked]); // eslint-disable-line react-hooks/exhaustive-deps
  const allTowns = useMemo(() => around(fresh.towns), [fresh.towns, stale, looked]); // eslint-disable-line react-hooks/exhaustive-deps
  const home = stale || looked ? null : fresh.home;
  // What this visit to the page has framed; opening a page or going back starts a new visit.
  const framed = useRef<PageFramed | null>(null);
  // `ask` is a far Walk here's question, asked before anything starts (FL12, decision 0121).
  const [spot, setSpot] = useState<{ at: LngLat; zoom: number; ask?: 'ask' | 'later' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pressSeen, setPressSeen] = useState(true);
  // The hint is shown once (explore-carousel audit 10): after a few seconds on screen it is marked seen, used or not.
  const hintShown = !pressSeen && !spot && !!from;
  useEffect(() => {
    if (!hintShown) return;
    const t = setTimeout(() => {
      setPressSeen(true);
      db.setMeta(PRESS_HINT_KEY, '1').catch(() => {});
    }, HINT_MS);
    return () => clearTimeout(t);
  }, [hintShown]);
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
        setYou(fix.at);
        setStale(false);
      }
      // A card or the long press's choices never outlive the tab's turn in front (audit 8, round 3).
      return () => {
        setOpen(null);
        setSpot(null);
        // FL14: Move map is off on the next visit; the look stands, like the page and the selection.
        setFree(false);
      };
    }, []),
  );
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  // The settled camera and the map's size, for the split of the selected area's places (whole-towns audits 3, 6).
  const [cam, setCam] = useState<{ center: LngLat; zoom: number } | null>(null);
  const [mapSize, setMapSize] = useState<{ width: number; height: number } | null>(null);
  const [looking, setLooking] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone?: 'info' | 'error' } | null>(null);
  const [locError, setLocError] = useState<LocateError | null>(null);
  // tend explore 2: each look has its own token, so a cancelled one never speaks for a newer one.
  const look = useRef<Look>(IDLE);
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
      setYou(at);
      setLooked(null);
      setStale(false);
      fixSeen.current = Date.now();
      // Locate is a way back to you: leave a town's page, drop the reader's pick (so the row's first, your own
      // town, is selected again) and close anything open over the map.
      // (`framed` is left alone: a new page frames itself, and on the same page nothing refits over Locate's frame.)
      setTownSeen(null);
      setSelected(null);
      setOpen(null);
      setSpot(null);
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
      setYou(r.at);
      setStale(false);
      // FL17: a fix that arrives while Move map is on or a look stands only becomes `you`; it moves nothing.
      if (!lookedRef.current && !freeRef.current) frame([r.at], ATLAS_RULES.ringM);
    }, () => {});
  }, [focused, frame]);

  const ownTown: Listed | null = useMemo(() => {
    if (!town) return null;
    return allTowns.find((x) => x.area.key === town.key) ?? { area: town, distanceM: 0, here: false };
  }, [town, allTowns]);
  // Near you the row is the towns, yours leading and so selected on arrival; a town's page is the town, then its neighborhoods.
  // The neighborhoods stand in only once a town read has covered you and named none (fix explore-town-scope audits 1, 9, 10).
  const listing = fresh.status === 'listing' || (fresh.status === 'idle' && !fresh.build);
  const shown = useMemo(() => rowOf({ ownTown, neighborhoods, towns: allTowns, townsListed: fresh.townsListed }), [ownTown, neighborhoods, allTowns, fresh.townsListed]);
  const words = useMemo(() => nearWords(shown), [shown]);
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
  // CX9, CX16: the selected area's complexes, read silently once it is selected, drawn as quiet outlines named at close zoom.
  const { hidden: hiddenKinds } = useHiddenKinds();
  // With every kind switched off nothing would show, so nothing is read (complexes audit 15).
  const { complexes: areaComplexes, partial: complexPartial } = useComplexes(focused && readsWanted(hiddenKinds), sel ? { key: sel.area.key, at: sel.area.at, reachM: sel.area.reachM } : null);
  const complexesShown = useMemo(() => shownComplexes(areaComplexes, hiddenKinds), [areaComplexes, hiddenKinds]);
  // The selected area's places over the map (WT7, WT10, WT12, decision 0132; whole-towns audits 3, 6, 14): a
  // neighborhood's places still to find (a town's once zoomed in), a "?" where it has room and a dot where it would
  // crowd, only places in view as "?"; a town at its own scale, every findable place as the same dot, found or not.
  // Never named (AT7). Decided at the settled camera (its exact zoom on both platforms), never per frame.
  const camZoom = cam?.zoom ?? view?.zoom ?? 13;
  // The outlines do not depend on zoom; only whether the names show does, so the map's data is set when that flips, not on every zoom tick (complexes audit 11).
  const labelsOn = camZoom >= COMPLEX_STYLE.labelMinZoom;
  const complexLayer = useMemo(() => (complexesShown.length ? complexMap(complexesShown, labelsOn ? COMPLEX_STYLE.labelMinZoom : 0) : null), [complexesShown, labelsOn]);
  const zoomHalf = halfZoom(camZoom);
  const inViewBox = useMemo(() => (cam && mapSize ? viewOf(cam.center, halfZoom(cam.zoom), mapSize) : null), [cam, mapSize]);
  const split = useMemo(() => {
    const p = sel?.area.profile;
    if (!sel || !p) return { pins: [], dots: [] };
    const centre = p.sketchAt ?? sel.area.at;
    return areaMapMarks(sel.area.level, p.marks, found, fresh.hidden, centre, zoomHalf, centre[1], inViewBox);
  }, [sel, found, fresh.hidden, zoomHalf, inViewBox]);
  const areaMarks = useMemo<MarkPin[]>(() => {
    if (!split.pins.length) return NONE;
    const label = (c: CategoryId) => CATEGORIES.find((x) => x.id === c)?.label ?? '';
    return split.pins.map((m) => ({ id: `waiting:${m.key}`, at: m.at, revealed: false, quiet: true, icon: KIND_ICON_OF[m.category], name: '', category: label(m.category) }));
  }, [split]);
  const waitingDots = useMemo<WaitingDot[]>(() => split.dots.map((m) => ({ id: m.key, at: m.at, color: KIND_COLOR[m.category] })), [split]);
  // WT11, audit 15: the "?" and dots are one thing to a screen reader: the area and the kinds, never how many.
  const waitingSaid = sel ? waitingLabel(sel.area.name, [...split.pins, ...split.dots], found) : '';
  // Town borders (TB1, TB2): whole, from the z10 tile around you (or the open or selected town); yours tinted, the rest lined.
  // A town selected in the row is the one tinted (EC5).
  const litKey = town ? town.key : sel?.area.level === 'town' ? sel.area.key : null;
  const lit = litKey == null ? null : town ?? shown.find((l) => l.area.key === litKey)?.area ?? null;
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
  const { open: layersOpen, closePanel: closeLayers } = layers;
  const layersAt = layerCentre(sel, from, !town);
  const wk = useWalkability(layersAt, !!layers.on.walkability);
  const busy = useBusyLayer(layersAt, !!layers.on.busy);
  // The Busy layer's lines draw at any zoom; its street names only near the selected area and zoomed in (EC7).
  // On or off by one boolean, never the zoom itself, so a camera move does not send the map a new view (audit 3); a
  // neighborhood's names reach its ring, a town's its own reach (audit 16).
  const namesOn = busyNamesOn(view?.zoom ?? 0, BUSY_NAMES_ZOOM);
  // The names stay near the selected area itself, your town's too, so they never reach into the next town (audit 12).
  const namesAt = sel?.area.at ?? null;
  const selLevel = sel?.area.level ?? 'neighborhood';
  const selReach = sel ? sel.area.reachM : 0;
  const namesM = busyRadiusM(selLevel, ATLAS_RULES.ringM, Math.min(selReach, ATLAS_RULES.townNeighborhoodsM));
  const busyView = useMemo(() => busyNamesNear(busy.view, namesAt, namesOn ? BUSY_NAMES_ZOOM : 0, namesM, BUSY_NAMES_ZOOM), [busy.view, namesAt, namesOn, namesM]);
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
  // Back to the towns with the one you left still selected (fix explore-town-scope).
  const leave = useCallback(() => {
    setSpot(null);
    framed.current = null;
    setSelected(townSeen?.key ?? null);
    setTownSeen(null);
  }, [townSeen]);
  useEffect(() => {
    // tend explore 6, audit 1: one Back or Escape steps out of one thing: the Layers panel, the long press's choices, the page.
    if (!townSeen || open || !focused) return;
    const out = () => {
      const does = pageBack({ layersOpen: layersOpen, spot: !!spot });
      if (does === 'layers') closeLayers();
      else if (does === 'spot') setSpot(null);
      else leave();
    };
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      out();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && out();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, [townSeen, open, focused, leave, layersOpen, closeLayers, spot]);
  // Each visit to a page is framed (AT9, TB11): its areas until its town's border is known, then the whole
  // town, and nothing undoes that within the visit (`nextFrame`, fix explore-fit-area).
  useEffect(() => {
    const page = townSeen ? `town:${townSeen.key}` : looked ? lookPage(looked.at) : 'near';
    // A town's page waits for its areas with its reach in view, as `enterArea` frames it (audit 9).
    const padM = townSeen ? townReachM(townSeen) * 0.6 : 150;
    const next = nextFrame(framed.current, { page, build: fresh.build, town: townBox, points, from, padM });
    if (!next) return;
    framed.current = next.framed;
    setFit((f) => ({ bounds: next.bounds, key: f.key + 1 }));
  }, [townSeen, looked, fresh.build, townBox, points, from]);

  const lookHere = async (at: LngLat) => {
    const started = startLook(look.current);
    if (!started) return;
    look.current = started.state;
    const stopped = () => !isLive(look.current, started.token);
    setLooking(true);
    try {
      const r = await readArea(at, stopped);
      if (stopped()) return;
      if (!r.ok) {
        if (r.reason === 'failed') setNotice({ message: 'Couldn’t read the map here', tone: 'error' });
        return;
      }
      const tile = await db.getMeta('tile_build').catch(() => null);
      if (stopped()) return;
      await rememberArea(r.centre, r.analysis, tile ?? 'unknown', r.overture);
      const top = r.analysis.pockets[0]?.name ?? r.analysis.landing?.street;
      const message = `${r.analysis.reason}${r.analysis.basis === 'density' && top ? `: ${top}` : ''}. A best guess from the map.`;
      setNotice({ message });
      AccessibilityInfo.announceForAccessibility(message);
    } finally {
      if (!stopped()) {
        look.current = endLook(look.current, started.token);
        setLooking(false);
      }
    }
  };

  const topInset = mapTopInset(insets.top, Platform.OS === 'web');
  // The fit's padding, so selecting an area centres it where a tap's frame would (EC5).
  const mapPad = useMemo(() => ({ top: topInset + 84, right: 24, bottom: spot ? 80 : 24, left: 24 }), [topInset, spot]);
  // WT13, audits 2 and 4: a tap on a dot, or on a "?" with places under it, eases the map in around it until it has
  // room; a "?" with nothing under it, or at the closest zoom, opens the selected area's card.
  const zoomTo = useCallback((at: LngLat, key: string) => {
    const z = tapZoom(sel?.area.level ?? 'neighborhood', roomZoom({ key, at }, [...split.pins, ...split.dots], at[1]), zoomHalf, !found.has(key));
    const size = mapSize ?? { width: 360, height: 360 };
    const px = Math.max(120, Math.min(size.width - mapPad.left - mapPad.right, size.height - mapPad.top - mapPad.bottom));
    frame([at], (px / 2) * metresPerPx(Math.min(z, PIN_ROOM.maxZoom), at[1]));
  }, [split, zoomHalf, frame, mapPad, mapSize, sel?.area.level, found]);
  const openSelected = useCallback(() => {
    if (!sel) return;
    setSpot(null);
    setOpen(sel.area.key);
  }, [sel]);
  const pressPin = useCallback((id: string) => {
    const pin = split.pins.find((p) => `waiting:${p.key}` === id);
    if (pin?.crowded && zoomHalf < PIN_ROOM.maxZoom) zoomTo(pin.at, pin.key);
    else openSelected();
  }, [split, zoomHalf, zoomTo, openSelected]);
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
  // Show areas here (FL5, FL6): the page lists around the map's settled middle; it is its own page, framed afresh.
  const showHere = useCallback(() => {
    const at = centreOf(cam);
    if (!at) return;
    setSpot(null);
    setOpen(null);
    setSelected(null);
    setTownSeen(null);
    framed.current = null;
    setLooked({ at, you: youFresh(getLastFix(), Date.now()) });
    say(lookWords().announcement);
  }, [cam, say]);
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
  // The title names the level shown (fix explore-town-scope): the towns near you, or the town whose page is open.
  const lookOn = looked != null;
  const title = town?.name ?? (lookOn ? lookWords().title : 'Near you');
  const subtitle = lookOn
    ? lookWords().subtitle
    : town
      ? (ownTown?.here || (home && home.area.key === town.key) ? 'You’re here' : distanceWords(ownTown?.distanceM ?? 0, false, fmt))
      : words.subtitle;
  const lookEmpty = lookOn && !town ? emptyLook(shown.length, fresh.status) : null;
  const cardLayout: CardLayout = wide
    ? { kind: 'side', width: 400, height: screen.h }
    : { kind: 'sheet', screenH: screen.h };

  // Never after a failed read: that is no claim about the map (the row then holds the town's card, as before).
  const noteText = town && ownTown && !neighborhoods.length && fresh.status !== 'offline' ? townNote(town.name, listing) : null;
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
          look.current = cancelLook(look.current);
          setLooking(false);
        }}
        style={styles.scanCancel}
      >
        <Text style={styles.scanCancelText}>Cancel</Text>
      </Pressable>
    </View>
  ) : !pressSeen && !spot && from ? (
    <Text style={styles.hint} testID="atlas-press-hint">Press and hold the map to look anywhere.</Text>
  ) : null;

  // tend explore 1: the scale bar clears the Towns pill, and the overlay clears the scale bar.
  const slots = exploreSlots({ spot: !!spot, town: !!town, free });
  const mapPane = (
    <View style={styles.map} onLayout={(e) => setMapSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {/* Only while Explore is in front (NV4): one map is live at a time. */}
      {focused && !plan && (
        <WalkMap
          trace={NONE}
          walked={NONE}
          fog={NONE}
          ref={mapRef}
          onBearingChange={setBearing}
          captures={NONE}
          walker={you}
          marks={spot ? [spot.at] : NONE}
          areaPoints={areaPoints}
          complexes={complexLayer}
          discoveries={areaMarks}
          waitingDots={waitingDots}
          // A "?" opens the selected area's card, where its kinds are named (AT7: the map never names them); one with
          // places under it zooms in first (whole-towns audit 4).
          onDiscoveryPress={pressPin}
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
          onPress={(at) => {
            // One thing a tap (whole-towns audit 9): close the Layers panel, else the long press's choices, else zoom
            // to a dot; the selection stays: something is always selected (EC1).
            const dot = dotAt(at, camZoom, split.dots);
            const does = tapDoes({ panelOpen: layers.open, spot: !!spot, dot: !!dot });
            // CX9: a tap inside a complex's outline eases the map to it (only when nothing else a tap does is pending).
            const hit = does === 'zoom' || does === 'close-panel' || does === 'clear-spot' ? null : complexesShown.find((c) => inPolygons(at, c.polygons));
            if (hit) return setFit((f) => ({ bounds: boundsOf(hit.polygons.flat(2), 20), key: f.key + 1 }));
            if (does === 'close-panel') layers.closePanel();
            else if (does === 'clear-spot') setSpot(null);
            else if (does === 'zoom' && dot) zoomTo(dot.at, dot.key);
          }}
          onSwipe={onSwipe}
          freePan={free}
          onViewChange={setView}
          fitBounds={fit.bounds}
          fitKey={fit.key}
          onFitSettled={onFitSettled}
          fitPadding={mapPad}
          initialCenter={savedCamera?.center ?? from ?? WORLD.center}
          initialZoom={savedCamera?.zoom ?? (from ? 13 : WORLD.zoom)}
          onCameraChange={(c) => {
            onCameraChange(c);
            setCam(c);
          }}
          scaleInset={{ bottom: slots.scaleBottom, left: SCALE_LEFT }}
        />
      )}
      {/* WT11: the selected area's "?" and dots, said once: the area and the kinds, never how many. */}
      {focused && !plan && !!waitingSaid && (
        // Audit 5: the one way to the selected area's card for a keyboard or a screen reader, now that the "?" are hidden.
        <Pressable accessibilityRole="button" accessibilityLabel={`${waitingSaid}. Opens its card`} onPress={openSelected} style={styles.srOnly} testID="atlas-waiting-said">
          <Text>{waitingSaid}</Text>
        </Pressable>
      )}
      {/* The page's title floats over the map, lifted by a shadow; near you, it is the way into your own town.
          On a town's page it has no back arrow: the pill low on the screen is the one way back (decision 0077). */}
      <View style={[styles.titleWrap, { top: topInset + 8, left: 12 }]} pointerEvents="box-none">
        <View style={styles.titleCard}>
          <View accessibilityRole="header" style={styles.titleText} testID="atlas-title">
            <View style={styles.titleRow}>
              <Text testID="explore-area" style={styles.title} numberOfLines={lookOn && !town ? 2 : 1}>{title}</Text>
            </View>
            <Text testID="explore-subtitle" style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
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
          {spot.ask ? (
            <>
              {spot.ask === 'ask' && (
                <Button
                  testID="spot-walk-now"
                  label="Walk now"
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
              <Button
                testID="spot-walk-later"
                variant="secondary"
                label="When I get there"
                style={styles.spotBtn}
                onPress={() => {
                  const at = spot.at;
                  setSpot(null);
                  void walkStart.later({ at, label: 'Your spot', kind: 'point' });
                }}
              />
            </>
          ) : spot.zoom >= 12 && (
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
                // A far point, or none of your fixes fresh, asks first; a walk open routes as before (FL12).
                const choice = walkToChoice(you ? metresBetween(you, at) : null, stale ? null : fixSeen.current || null, Date.now());
                if (openInfo.walk || choice === 'start') {
                  setSpot(null);
                  walkStart.start({ at, label: 'Your spot', kind: 'point' });
                } else setSpot({ ...spot, ask: choice });
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
      {/* Free look (FL2, FL5): Move map above the compass's slot; while it is on, the middle is marked and Show areas here loads it. */}
      {focused && !plan && <MoveMapToggle on={free} onPress={() => setFree((f) => !f)} bottom={8 + 44 + 12 + 44 + 12} />}
      {focused && !plan && free && <CentreMark />}
      {focused && !plan && free && <ShowAreasPill onPress={showHere} bottom={slots.showBottom ?? 12} />}
      {toast ? <View style={styles.toast} accessibilityLiveRegion="polite"><Text style={styles.toastText}>{toast}</Text></View> : null}
      {/* DN12 on web: react-native-web's announceForAccessibility does nothing, so a hidden live region says it.
          Phones announce through the call alone (a live region too would say it twice on Android). */}
      {Platform.OS === 'web' ? <Text testID="atlas-snap-said" accessibilityLiveRegion="polite" style={styles.said}>{said.n % 2 ? `${said.text}\u200B` : said.text}</Text> : null}
      {/* One of an error, a notice, "Looking around…", a town's note or the hint at a time, over the map above the row, clear of
          the back pill and the map's buttons (EC12, EC14). */}
      {overlay ? <View style={[styles.overlay, { bottom: slots.overlayBottom }]} pointerEvents="box-none">{overlay}</View> : null}
      {/* On a town's page, the way back also sits low, where a thumb reaches (round 3), over the map above the row. */}
      {town ? (
        <Pressable testID="atlas-back-pill" accessibilityRole="button" accessibilityLabel="Back to the towns" onPress={leave} style={[styles.backPill, spot ? { bottom: 10 + SPOT_H + 8 } : null]}>
          <Icon name="chevron-back" size={18} color={theme.ink} />
          <Text style={styles.backPillText} numberOfLines={1}>Towns</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen} onLayout={(e) => setScreen({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {mapPane}
      {/* The row of areas under the map (EC2, EC3): one card at a time is selected; with no area to show, one status card. */}
      <View style={styles.rowPane} testID="atlas-row">
        {noteText ? (
          // A town with no neighborhoods: its own card alone would repeat the page, so the note takes the row's place.
          <View style={styles.empty} testID="atlas-town-note" accessibilityLiveRegion="polite">
            {listing ? <ActivityIndicator color={theme.muted} /> : null}
            <Text style={styles.emptyText}>{noteText}</Text>
          </View>
        ) : shown.length ? (
          <AtlasCarousel
            items={shown}
            selected={selected}
            width={screen.w}
            reduced={reduced}
            label={town ? `Areas in ${town.name}` : lookOn ? lookRowLabel(shown[0]?.area.level === 'town') : words.label}
            onSettle={selectKey}
            renderCard={(l, isSel) => (
              <AtlasTile
                listed={l}
                fam={famOf.get(l.area.key) ?? NEW_FAM}
                selected={isSel}
                drill={!town && l.area.level === 'town'}
                wide={!!town && l.area.key === town.key}
                fromYou={lookOn}
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
              {lookEmpty ? lookEmpty
                : listing ? (lookOn ? 'Reading the map around the middle of the map…' : 'Reading the map around you…')
                : fresh.status === 'offline' ? 'Couldn’t read the map. It will try again in a moment.'
                  : town ? 'No neighborhoods are named on the map here.' : 'No towns are named on the map here.'}
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
          you={you}
          unplaced={card.unplaced}
          fromYou={lookOn}
          nextDoor={nextDoor(card.area, shown.map((l) => l.area), fresh.build)}
          walkTo={!card.here ? walkTarget(card.area) : null}
          // DW14: too far to walk (N5) offers When I get there alone.
          farOff={!card.unplaced && !canWalkTo(card.distanceM)}
          busyAreas={busyAreas(card.area).map((b) => ({ ...b, walkable: !!you && canWalkTo(metresBetween(you, b.at)) }))}
          // CX4: the complexes of the selected area, nearest its point first, "See more" for the rest.
          complexSection={(expanded) => {
            if (!sel || sel.area.key !== card.area.key) return null;
            const s = complexSection(areaComplexes, { from: card.area.at, partial: complexPartial, hidden: hiddenKinds, expanded });
            return s && { ...s, rows: s.rows.map((r) => ({ ...r, walkable: !!you && canWalkTo(metresBetween(you, r.at)) })) };
          }}
          // DW1, DW2, DW5 (decision 0121): near with a fresh fix starts at once; far, or with no fresh fix, asks.
          // With a walk open, Walk to routes that walk, as before (NV10).
          askFirst={(to) => !openInfo.walk && walkToChoice(you ? metresBetween(you, to) : null, stale ? null : fixSeen.current || null, Date.now()) !== 'start'}
          onLater={(at, label) => {
            setOpen(null);
            void walkStart.later({ at, label, kind: 'point' });
          }}
          starting={walkStart.starting}
          onWalkAt={(at, label) => {
            setOpen(null);
            walkStart.start({ at, label, kind: 'point' });
          }}
          onPlan={(k) => setPlan(k)}
          covered={plan != null}
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
          you={getLastFix()?.at ?? you}
          lastFixAt={getLastFix()?.t ?? null}
          fixNow={() => getLastFix()?.at ?? you}
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
  // Read by a screen reader, never seen (WT11).
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, left: 0, top: 0 },
  screen: { flex: 1, backgroundColor: theme.bg },
  said: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  // The map takes what the row leaves. Overflow visible, above the row: the Layers panel opens over the cards like a popover (ML4).
  map: { flex: 1, minHeight: 0, borderBottomWidth: 1, borderColor: theme.line, overflow: 'visible', zIndex: 5 },
  // The row under the map sizes to its cards: never `flex: 1` (react-native-web would stretch it).
  rowPane: { flexGrow: 0, flexShrink: 0, paddingBottom: 8, paddingTop: 4 },
  overlay: { position: 'absolute', left: 12, right: 64, alignItems: 'flex-start', gap: 8 },
  // Clear of the Layers button's column (free-look ui 1): the looked page's longer title never runs under it.
  titleWrap: { position: 'absolute', right: 64, alignItems: 'flex-start' },
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
