import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AtlasCard } from '../../components/atlas/AtlasCard';
import { AtlasTile } from '../../components/atlas/AtlasTile';
import { LocateButton } from '../../components/LocateButton';
import { WalkMap } from '../../components/map/WalkMap';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import {
  ATLAS_RULES, canWalkTo, familiarity, findsIn, nextDoor, townReachM, waitingMarks, walkTarget,
  type AtlasArea, type Familiarity, type Listed,
} from '../../lib/atlas/atlas';
import { nearReads } from '../../lib/atlas/read';
import { useAtlas } from '../../lib/atlas/useAtlas';
import { db } from '../../lib/db';
import type { Find } from '../../lib/explore/explore';
import { boundsOf, type Bounds } from '../../lib/geo';
import { readArea, rememberArea } from '../../lib/landing/read';
import { getLastFix } from '../../lib/lastFix';
import { perfCount } from '../../lib/perfCount';
import type { LngLat } from '../../lib/types';
import { useLocate, type LocateError } from '../../lib/useLocate';
import { useStartWalk } from '../../lib/useStartWalk';
import { useTabMap } from '../../lib/useTabMap';

const NONE: never[] = [];
const NEW_FAM: Familiarity = { walks: 0, last: null };
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };

/**
 * Explore as an atlas (AT1-AT16): the map runs to the top of the screen with
 * the page's title floating over it; below, the neighborhoods near you, then
 * the towns nearby. A town opens its own page (its picture and its own
 * neighborhoods) with a way back (AT2). A neighborhood opens its card. Rings
 * are read by themselves while the tab is open. The long press on the map
 * keeps What's good here and Walk here. It never tracks you: it starts from
 * your last fix, or a Locate tap.
 */
export default function Explore() {
  perfCount('render:explore');
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const walkStart = useStartWalk();
  // Where the atlas measures from: the last fix as the tab opened, then wherever a Locate tap found you.
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
  // Kept stable unless the lists themselves change, so the tiles' memo holds (explore-atlas audit 9).
  const neighborhoods = useMemo(() => (stale ? fresh.neighborhoods.map((x) => ({ ...x, here: false })) : fresh.neighborhoods), [fresh.neighborhoods, stale]);
  const towns = useMemo(() => (stale ? fresh.towns.map((x) => ({ ...x, here: false })) : fresh.towns), [fresh.towns, stale]);
  const home = stale ? null : fresh.home;
  // Back on the tab, a newer fix from Navigate moves the atlas with you (explore-atlas audit 1).
  const fixSeen = useRef(getLastFix()?.t ?? 0);
  useFocusEffect(
    useCallback(() => {
      const fix = getLastFix();
      if (fix && fix.t > fixSeen.current) {
        fixSeen.current = fix.t;
        setFrom(fix.at);
        setStale(false);
      }
      // A card left open never keeps Back and Escape from the other tabs (explore-atlas audit 8).
      return () => setOpen(null);
    }, []),
  );
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  const [spot, setSpot] = useState<{ at: LngLat; zoom: number } | null>(null);
  const [looking, setLooking] = useState(false);
  const [notice, setNotice] = useState<{ message: string; tone?: 'info' | 'error' } | null>(null);
  const [locError, setLocError] = useState<LocateError | null>(null);
  const cancelled = useRef(false);
  const [screenH, setScreenH] = useState(height);

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

  const ownTown: Listed | null = useMemo(() => {
    if (!town) return null;
    return towns.find((x) => x.area.key === town.key) ?? { area: town, distanceM: 0, here: false };
  }, [town, towns]);
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

  const points = useMemo(() => (town ? [town.at, ...neighborhoods.map((l) => l.area.at)] : neighborhoods.map((l) => l.area.at)), [town, neighborhoods]);
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
    setSelected(key);
    setOpen(key);
    frame([l.area.at], ATLAS_RULES.ringM);
  }, [frame, setOpen, setSelected]);
  // AT2: a town's tile opens its page; Back, Escape and the title's arrow return.
  const enter = useCallback((key: string) => {
    const l = shownRef.current.find((x) => x.area.key === key);
    if (!l) return;
    setTownSeen(l.area);
    setSelected(null);
    frame([l.area.at], townReachM(l.area) * 0.6);
  }, [frame, setSelected]);
  const leave = useCallback(() => {
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
      await rememberArea(r.centre, r.analysis, tile ?? 'unknown');
      const top = r.analysis.pockets[0]?.name ?? r.analysis.landing?.street;
      const message = `${r.analysis.reason}${r.analysis.basis === 'density' && top ? `: ${top}` : ''}. A best guess from the map.`;
      setNotice({ message });
      AccessibilityInfo.announceForAccessibility(message);
    } finally {
      if (!cancelled.current) setLooking(false);
    }
  };

  // The map runs under the status bar to the top of the screen, so no band of it is left empty.
  const mapH = insets.top + Math.round(Math.min(260, Math.max(170, height * 0.26)));
  const error = walkStart.error ?? locError;
  const title = town?.name ?? home?.area.name ?? 'Near you';
  const subtitle = town ? `Its neighborhoods` : home ? 'Neighborhoods near you' : 'Neighborhoods and towns near you';

  const grid = (list: Listed[], drill: boolean) => {
    const rows: Listed[][] = [];
    for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
    return rows.map((pair) => (
      <View key={pair[0].area.key} style={styles.pair}>
        {pair.map((l) => {
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
        {pair.length === 1 && <View style={styles.spacer} />}
      </View>
    ));
  };
  const listing = fresh.status === 'listing' || (fresh.status === 'idle' && !fresh.build);

  return (
    <View style={styles.screen} onLayout={(e) => setScreenH(e.nativeEvent.layout.height)}>
      <View style={[styles.map, { height: mapH }]}>
        {/* Only while Explore is in front (NV4): one map is live at a time. */}
        {focused && (
          <WalkMap
            trace={NONE}
            walked={NONE}
            fog={NONE}
            captures={NONE}
            walker={from}
            marks={spot ? [spot.at] : points}
            ring={sel ? { center: sel.area.at, radiusM: ATLAS_RULES.ringM } : null}
            onLongPress={(at) => {
              if (looking || (view?.zoom ?? 0) < 10) return;
              setSpot({ at, zoom: view?.zoom ?? 0 });
            }}
            onPress={() => spot && setSpot(null)}
            onViewChange={setView}
            fitBounds={fit.bounds}
            fitKey={fit.key}
            onFitSettled={onFitSettled}
            fitPadding={{ top: insets.top + 84, right: 24, bottom: 24, left: 24 }}
            initialCenter={savedCamera?.center ?? from ?? WORLD.center}
            initialZoom={savedCamera?.zoom ?? (from ? 13 : WORLD.zoom)}
            onCameraChange={onCameraChange}
            scaleInset={{ bottom: 6, left: 8 }}
          />
        )}
        {/* The page's title floats over the map, lifted by a shadow (the owner's call, Nov 3). */}
        <View style={[styles.titleWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
          <View style={styles.titleCard}>
            {town ? (
              <Pressable testID="atlas-back" accessibilityRole="button" accessibilityLabel="Back to near you" onPress={leave} style={styles.back}>
                <Icon name="chevron-back" size={22} color={theme.ink} />
              </Pressable>
            ) : null}
            <View style={styles.titleText}>
              <Text testID="explore-area" style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
              <Text testID="explore-subtitle" style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            </View>
          </View>
        </View>
        {!spot && <LocateButton busy={locating} onPress={locate} bottom={8} />}
      </View>

      <ScrollView style={styles.grid} contentContainerStyle={styles.gridContent} testID="atlas-grid">
        {spot ? (
          <View style={styles.spot}>
            {/* Explore's long press keeps What's good here and Walk here (the owner's default for the atlas). */}
            <Button
              testID="look-here"
              label="What's good here?"
              disabled={looking}
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
                onPress={() => {
                  const at = spot.at;
                  setSpot(null);
                  walkStart.start({ at, label: 'Your spot', kind: 'point' });
                }}
              />
            )}
            <Button variant="ghost" label="Close" onPress={() => setSpot(null)} />
          </View>
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
            {/* AT2: a town's own page: its picture and bars around its centre, then its own neighborhoods. */}
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
            <Text style={styles.section} accessibilityRole="header">Neighborhoods of {town.name}</Text>
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
                <Text style={styles.section} accessibilityRole="header">Towns nearby</Text>
                {grid(towns, true)}
              </>
            )}
          </>
        )}
      </ScrollView>

      {card && (
        <AtlasCard
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
          frame={{ top: Math.round(screenH * 0.12), height: screenH - Math.round(screenH * 0.12) }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  map: { width: '100%', borderBottomWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  titleWrap: { position: 'absolute', left: 12, right: 12, alignItems: 'flex-start' },
  titleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.surface, borderRadius: 14, paddingVertical: 8, paddingLeft: 14, paddingRight: 16,
    maxWidth: 616, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  back: { width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  titleText: { flexShrink: 1, minWidth: 0 },
  title: { fontSize: 22, fontWeight: '800', color: theme.ink },
  subtitle: { fontSize: 13, color: theme.muted, marginTop: 1 },
  grid: { flex: 1 },
  gridContent: { padding: 12, gap: 10, paddingBottom: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: theme.muted, paddingHorizontal: 4, paddingTop: 6 },
  pair: { flexDirection: 'row', gap: 10 },
  spacer: { flex: 1 },
  empty: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line, padding: 16, gap: 10, alignItems: 'center' },
  emptyText: { fontSize: 15, color: theme.muted, textAlign: 'center' },
  spot: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 10, gap: 8, borderWidth: 1, borderColor: theme.line },
  scanning: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', backgroundColor: theme.surface, borderRadius: 999, paddingVertical: 6, paddingLeft: 14, paddingRight: 6 },
  scanningText: { fontSize: 15, fontWeight: '600', color: theme.ink },
  scanCancel: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  scanCancelText: { fontSize: 15, fontWeight: '600', color: theme.accent },
});
