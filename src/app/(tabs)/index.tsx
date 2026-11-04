import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AreaPointPin } from '../../components/AreaPoint';
import { AtlasCard, type CardLayout } from '../../components/atlas/AtlasCard';
import { AtlasTile } from '../../components/atlas/AtlasTile';
import { LocateButton } from '../../components/LocateButton';
import { CompassButton } from '../../components/CompassButton';
import { WalkMap } from '../../components/map/WalkMap';
import type { WalkMapHandle } from '../../components/map/types';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import {
  ATLAS_RULES, canWalkTo, distanceWords, familiarity, findsIn, nextDoor, otherTowns, townReachM, waitingMarks, walkTarget,
  type AtlasArea, type Familiarity, type Listed,
} from '../../lib/atlas/atlas';
import { nearReads } from '../../lib/atlas/read';
import { useAtlas } from '../../lib/atlas/useAtlas';
import { bordersFor, outlineIdHere, outlineOf, townFrame } from '../../lib/areas/borders';
import { BORDER_ZOOM } from '../../lib/areas/outlines';
import { useOutlineSet } from '../../lib/areas/useOutlineSet';
import { db } from '../../lib/db';
import type { Find } from '../../lib/explore/explore';
import { formatDistance } from '../../lib/format';
import { boundsOf, type Bounds } from '../../lib/geo';
import { readArea, rememberArea } from '../../lib/landing/read';
import { getLastFix, launchFix, setLastFix } from '../../lib/lastFix';
import { locateOnce } from '../../lib/locate';
import { perfCount } from '../../lib/perfCount';
import type { LngLat } from '../../lib/types';
import { useLocate, type LocateError } from '../../lib/useLocate';
import { useStartWalk } from '../../lib/useStartWalk';
import { useTabMap } from '../../lib/useTabMap';

const NONE: never[] = [];
const NEW_FAM: Familiarity = { walks: 0, last: null };
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** Meta: the long press was used once, so its hint stops showing (atlas round 3). */
const PRESS_HINT_KEY = 'atlas_press_seen';
/** The nearest few areas are named on the map; the rest are dots. */
const NAMED_POINTS = 3;
/** Widths where the grid takes three columns, and where the map and grid sit side by side. */
const THREE_COLS = 700;
const TWO_PANES = 1000;
const fmt = (m: number) => formatDistance(m);

/**
 * Explore as an atlas (AT1-AT16, round 3): the map with the page's title over
 * it; below (or beside, on a wide screen), the neighborhoods near you, then
 * the other towns. The title opens your own town; a town's tile opens its page.
 * A neighborhood opens its card, a sheet that keeps the map in sight. Rings are
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
  const [selected, setSelected] = useState<string | null>(null);
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
  // Town borders (TB1, TB2): whole, from the z10 tile around you (or the open town); yours tinted, the rest lined.
  const drawn = useOutlineSet([from, town?.at], BORDER_ZOOM, focused);
  const tintedId = useMemo(
    () => (town ? outlineOf({ name: town.name, at: town.at }, drawn)?.id : home && from ? outlineIdHere(from, home.area.name, fresh.outlines) : null) ?? null,
    [drawn, town, home, from, fresh.outlines],
  );
  const borders = useMemo(() => bordersFor(drawn, { tinted: tintedId ? [tintedId] : [], near: town?.at ?? from }), [drawn, tintedId, town, from]);
  // TB11: the map frames the whole of the tinted town once its border is known, once per town (yours, or a page's).
  const framedTown = useRef<string | null>(null);
  const townBox = useMemo(() => townFrame(drawn, tintedId), [drawn, tintedId]);
  useEffect(() => {
    if (!townBox || framedTown.current === townBox.id) return;
    framedTown.current = townBox.id;
    setFit((f) => ({ bounds: townBox.bounds, key: f.key + 1 }));
  }, [townBox]);
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
  const shown = useMemo(() => [...(ownTown ? [ownTown] : []), ...neighborhoods, ...(town ? [] : towns)], [ownTown, neighborhoods, towns, town]);
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
        waiting: a.profile ? waitingMarks(a.profile.marks, found, a.at, fresh.hidden) : [],
        finds: findsIn(fresh.finds, a.at),
      });
    }
    return m;
  }, [shown, fresh.finds, fresh.hidden, found]);

  // The map's areas: the page's neighborhoods (and the town), the nearest few named, the selected one in the accent (round 3).
  const pointsOf = useMemo(() => (town ? [{ area: town, distanceM: 0, here: false }, ...neighborhoods] : neighborhoods), [town, neighborhoods]);
  const points = useMemo(() => pointsOf.map((l) => l.area.at), [pointsOf]);
  const areaPoints = useMemo<AreaPointPin[]>(() => {
    const near = new Set(pointsOf.slice(0, NAMED_POINTS).map((l) => l.area.key));
    return pointsOf.map((l) => ({ id: l.area.key, at: l.area.at, name: near.has(l.area.key) || l.area.key === selected ? l.area.name : null, selected: l.area.key === selected }));
  }, [pointsOf, selected]);
  const sel = shown.find((l) => l.area.key === selected) ?? null;
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
    setTownSeen(area);
    setSelected(null);
    frame([area.at], townReachM(area) * 0.6);
  }, [frame]);
  const enter = useCallback((key: string) => {
    const l = shownRef.current.find((x) => x.area.key === key);
    if (l) enterArea(l.area);
  }, [enterArea]);
  const leave = useCallback(() => {
    setSpot(null);
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
  // Each page is framed once its areas are first listed (AT9): the map shows them all.
  const framed = useRef<string | null>(null);
  useEffect(() => {
    const key = `${townSeen?.key ?? 'near'}:${fresh.build}`;
    if (!points.length || framed.current === key) return;
    framed.current = key;
    frame(from && !townSeen ? [from, ...points] : points, 150);
  }, [points, townSeen, fresh.build, from, frame]);

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

  const wide = screen.w >= TWO_PANES;
  const cols = screen.w >= THREE_COLS ? 3 : 2;
  const gridMax = wide ? 960 : cols === 3 ? 960 : 640;
  // The map runs under the status bar to the top of the screen, so no band of it is left empty.
  const mapH = wide ? screen.h : insets.top + Math.round(Math.min(260, Math.max(170, screen.h * 0.26)));
  const mapW = wide ? Math.round(screen.w * 0.4) : screen.w;
  // The title lines up with the grid's column on a wide single pane (round 3).
  const titleLeft = wide ? 12 : Math.max(12, (screen.w - gridMax) / 2 + 12);
  const error = walkStart.error ?? locError;
  const title = town?.name ?? home?.area.name ?? 'Near you';
  const subtitle = town
    ? (ownTown?.here || (home && home.area.key === town.key) ? 'You’re here' : distanceWords(ownTown?.distanceM ?? 0, false, fmt))
    : home ? 'Your town' : 'Areas around you';
  const listing = fresh.status === 'listing' || (fresh.status === 'idle' && !fresh.build);
  const cardLayout: CardLayout = wide
    ? { kind: 'side', width: 400, height: screen.h }
    : { kind: 'sheet', screenH: screen.h };

  const grid = (list: Listed[], drill: boolean) => {
    const rows: Listed[][] = [];
    for (let i = 0; i < list.length; i += cols) rows.push(list.slice(i, i + cols));
    return rows.map((row) => (
      <View key={row[0].area.key} style={styles.row}>
        {row.map((l) => {
          const r = ringOf.get(l.area.key);
          return (
            <AtlasTile
              key={l.area.key}
              listed={l}
              fam={famOf.get(l.area.key) ?? NEW_FAM}
              walked={fresh.walked}
              waiting={r?.waiting ?? NONE}
              finds={r?.finds ?? NONE}
              here={from}
              selected={selected === l.area.key}
              drill={drill}
              onPress={drill ? enter : pick}
            />
          );
        })}
        {Array.from({ length: cols - row.length }, (_, i) => <View key={`gap${i}`} style={styles.spacer} />)}
      </View>
    ));
  };

  const mapPane = (
    <View style={[styles.map, { height: mapH, width: mapW }, wide && styles.mapWide]}>
      {/* Only while Explore is in front (NV4): one map is live at a time. */}
      {focused && (
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
          ring={sel ? { center: sel.area.at, radiusM: ATLAS_RULES.ringM } : null}
          borders={borders}
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
          onPress={() => spot && setSpot(null)}
          onViewChange={setView}
          fitBounds={fit.bounds}
          fitKey={fit.key}
          onFitSettled={onFitSettled}
          fitPadding={{ top: insets.top + 84, right: 24, bottom: spot ? 80 : 24, left: 24 }}
          initialCenter={savedCamera?.center ?? from ?? WORLD.center}
          initialZoom={savedCamera?.zoom ?? (from ? 13 : WORLD.zoom)}
          onCameraChange={onCameraChange}
          scaleInset={{ bottom: 6, left: 8 }}
        />
      )}
      {/* The page's title floats over the map, lifted by a shadow; near you, it is the way into your own town.
          On a town's page it has no back arrow: the pill low on the screen is the one way back (decision 0077). */}
      <View style={[styles.titleWrap, { top: insets.top + 8, left: titleLeft }]} pointerEvents="box-none">
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
      {focused && !spot && <CompassButton bearing={bearing} onPress={() => mapRef.current?.resetNorth()} bottom={8 + 44 + 12} />}
      {toast ? <View style={styles.toast} accessibilityLiveRegion="polite"><Text style={styles.toastText}>{toast}</Text></View> : null}
    </View>
  );

  return (
    <View style={[styles.screen, wide && styles.screenWide]} onLayout={(e) => setScreen({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {mapPane}
      <View style={styles.listPane}>
        <ScrollView style={styles.grid} contentContainerStyle={[styles.gridContent, { maxWidth: gridMax }, town && styles.gridWithBack]} testID="atlas-grid">
          {!pressSeen && !spot && from ? (
            <Text style={styles.hint} testID="atlas-press-hint">Press and hold the map to look anywhere.</Text>
          ) : null}
          {error && (
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
          )}
          {looking && (
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
          )}
          {notice && (
            <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>
              {notice.message}
            </Banner>
          )}

          {!from ? (
            <View style={styles.empty} testID="atlas-empty">
              <Icon name="locate-outline" size={22} color={theme.muted} />
              <Text style={styles.emptyText}>Find where you are to see the areas around you.</Text>
              <Button testID="atlas-locate" label="Find me" variant="secondary" onPress={locate} busy={locating} busyLabel="Finding you…" />
            </View>
          ) : town && ownTown ? (
            <>
              {/* AT2: a town's own page: its picture and marks around its centre, then its own neighborhoods. */}
              <AtlasTile
                listed={ownTown}
                fam={famOf.get(ownTown.area.key) ?? NEW_FAM}
                walked={fresh.walked}
                waiting={ringOf.get(ownTown.area.key)?.waiting ?? NONE}
                finds={ringOf.get(ownTown.area.key)?.finds ?? NONE}
                here={from}
                selected={selected === ownTown.area.key}
                wide
                onPress={pick}
              />
              <Text style={styles.section} accessibilityRole="header" testID="atlas-town-section">Neighborhoods of {town.name}</Text>
              {neighborhoods.length ? grid(neighborhoods, false) : (
                <View style={styles.empty} testID="atlas-empty">
                  {listing ? <ActivityIndicator color={theme.muted} /> : null}
                  <Text style={styles.emptyText}>{listing ? `Reading ${town.name}…` : `No neighborhoods are named on the map in ${town.name}. It is one area.`}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.section} accessibilityRole="header">Neighborhoods near you</Text>
              {neighborhoods.length ? grid(neighborhoods, false) : (
                <View style={styles.empty} testID="atlas-empty">
                  {listing ? <ActivityIndicator color={theme.muted} /> : null}
                  <Text style={styles.emptyText}>
                    {listing ? 'Reading the map around you…'
                      : fresh.status === 'offline' ? 'Couldn’t read the map. It will try again in a moment.'
                        : 'No neighborhoods are named on the map here.'}
                  </Text>
                </View>
              )}
              {towns.length > 0 && (
                <>
                  <Text style={styles.section} accessibilityRole="header">Other towns</Text>
                  {grid(towns, true)}
                </>
              )}
            </>
          )}
        </ScrollView>
        {/* On a town's page, the way back also sits low, where a thumb reaches (round 3). */}
        {town ? (
          <Pressable testID="atlas-back-pill" accessibilityRole="button" accessibilityLabel={`Back to ${home?.area.name ?? 'near you'}`} onPress={leave} style={styles.backPill}>
            <Icon name="chevron-back" size={18} color={theme.ink} />
            <Text style={styles.backPillText} numberOfLines={1}>{home?.area.name ?? 'Near you'}</Text>
          </Pressable>
        ) : null}
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
          starting={walkStart.starting}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  screenWide: { flexDirection: 'row' },
  map: { borderBottomWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  mapWide: { borderBottomWidth: 0, borderRightWidth: 1 },
  listPane: { flex: 1, minWidth: 0 },
  titleWrap: { position: 'absolute', right: 12, alignItems: 'flex-start' },
  titleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.surface, borderRadius: 14, paddingVertical: 8, paddingLeft: 14, paddingRight: 14,
    maxWidth: 616, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  titleText: { flexShrink: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  title: { fontSize: 22, fontWeight: '800', color: theme.ink, flexShrink: 1 },
  subtitle: { fontSize: 13, color: theme.muted, marginTop: 1 },
  grid: { flex: 1 },
  gridContent: { padding: 12, gap: 10, paddingBottom: 24, width: '100%', alignSelf: 'center' },
  gridWithBack: { paddingBottom: 80 },
  hint: { fontSize: 13, color: theme.muted, paddingHorizontal: 4 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: theme.muted, paddingHorizontal: 4, paddingTop: 6 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  spacer: { flex: 1 },
  empty: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line, padding: 16, gap: 10, alignItems: 'center' },
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
