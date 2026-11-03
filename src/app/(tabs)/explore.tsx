import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AtlasCard } from '../../components/atlas/AtlasCard';
import { AtlasTile } from '../../components/atlas/AtlasTile';
import { LocateButton } from '../../components/LocateButton';
import { WalkMap } from '../../components/map/WalkMap';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import {
  ATLAS_RULES, canWalkTo, familiarity, findsIn, nearList, nextDoor, waitingMarks, walkTarget,
  type AtlasLevel, type Familiarity,
} from '../../lib/atlas/atlas';
import { lastNear } from '../../lib/atlas/read';
import { useAtlas } from '../../lib/atlas/useAtlas';
import type { Find } from '../../lib/explore/explore';
import { db } from '../../lib/db';
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
const LEVELS: { id: AtlasLevel; label: string }[] = [
  { id: 'neighborhood', label: 'Neighborhoods' },
  { id: 'town', label: 'Towns' },
];

/**
 * Explore as an atlas (AT1-AT14): the areas near you as a grid of same-scale
 * tiles, each a picture of its ring and its eight kinds, under a small map.
 * Rings are read by themselves while the tab is open, nearest first. A tile
 * opens the area's card. The long press on the map keeps What's good here and
 * Walk here. It never tracks you: it starts from your last fix, or a Locate tap.
 */
export default function Explore() {
  perfCount('render:explore');
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const walkStart = useStartWalk();
  const [level, setLevel] = useState<AtlasLevel>('neighborhood');
  // Where the atlas measures from: the last fix as the tab opened, then wherever a Locate tap found you.
  const [from, setFrom] = useState<LngLat | null>(() => getLastFix()?.at ?? null);
  // With no fix since launch (a reload), the atlas opens where it last listed areas, never saying "You're here" (AT1).
  const [stale, setStale] = useState(() => !getLastFix());
  useEffect(() => {
    if (from) return;
    let live = true;
    lastNear('neighborhood').then((n) => live && n && setFrom((f) => f ?? n.at), () => {});
    return () => {
      live = false;
    };
  }, [from]);
  const [fit, setFit] = useState<{ bounds: Bounds | null; key: number }>({ bounds: null, key: 0 });
  const { focused, savedCamera, onCameraChange, onFitSettled } = useTabMap({ key: fit.key, refit: () => setFit((f) => ({ ...f, key: f.key + 1 })) });
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const fresh = useAtlas(focused, level, from);
  // Kept stable unless the list itself changes, so the tiles' memo holds (explore-atlas audit 9).
  const list = useMemo(() => (stale ? fresh.list.map((l) => ({ ...l, here: false })) : fresh.list), [fresh.list, stale]);
  const atlas = useMemo(() => ({ ...fresh, list }), [fresh, list]);
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

  const famOf = useMemo(() => {
    const m = new Map<string, Familiarity>();
    for (const l of atlas.list) m.set(l.area.key, familiarity(l.area, atlas.areas, atlas.walkAreas));
    return m;
  }, [atlas.list, atlas.areas, atlas.walkAreas]);
  const found = useMemo(() => new Set(atlas.finds.map((f) => f.key)), [atlas.finds]);
  const ringOf = useMemo(() => {
    const m = new Map<string, { waiting: ReturnType<typeof waitingMarks>; finds: Find[] }>();
    for (const l of atlas.list) {
      const a = l.area;
      m.set(a.key, {
        waiting: a.profile ? waitingMarks(a.profile.marks, found, a.at, atlas.hidden) : [],
        finds: findsIn(atlas.finds, a.at),
      });
    }
    return m;
  }, [atlas.list, atlas.finds, atlas.hidden, found]);

  // The town you're in names the page, when the towns have been read.
  const town = useMemo(() => (from && !stale ? nearList(atlas.rows, from, 'town', atlas.build).find((l) => l.here)?.area.name ?? null : null), [atlas.rows, from, atlas.build, stale]);
  const points = useMemo(() => atlas.list.map((l) => l.area.at), [atlas.list]);
  const sel = atlas.list.find((l) => l.area.key === selected) ?? null;
  // A card is only ever one of the listed areas, with its real distance (explore-atlas audit 7).
  const card = focused ? atlas.list.find((l) => l.area.key === open) ?? null : null;
  const listRef = useRef(atlas.list);
  useEffect(() => {
    listRef.current = atlas.list;
  }, [atlas.list]);
  const pick = useCallback((key: string) => {
    const l = listRef.current.find((x) => x.area.key === key);
    if (!l) return;
    setSelected(key);
    setOpen(key);
    frame([l.area.at], ATLAS_RULES.ringM);
  }, [frame, setOpen, setSelected]);
  // Each level is framed once its areas are first listed (AT9): the map shows them all.
  const framed = useRef<string | null>(null);
  useEffect(() => {
    const key = `${level}:${atlas.build}`;
    if (!points.length || framed.current === key) return;
    framed.current = key;
    frame(from ? [from, ...points] : points, 150);
  }, [points, level, atlas.build, from, frame]);

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

  const mapH = Math.round(Math.min(240, Math.max(150, height * 0.24)));
  const error = walkStart.error ?? locError;
  const heading = level === 'neighborhood' ? 'Neighborhoods near you' : 'Towns near you';
  const rows: (typeof atlas.list)[] = [];
  for (let i = 0; i < atlas.list.length; i += 2) rows.push(atlas.list.slice(i, i + 2));

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <View style={styles.titleRow}>
          <Text testID="explore-area" style={styles.title} accessibilityRole="header" numberOfLines={1}>{town ?? 'Near you'}</Text>
        </View>
        <View style={styles.seg} accessibilityRole="tablist">
          {LEVELS.map((l) => (
            <Pressable
              key={l.id}
              testID={`atlas-level-${l.id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: level === l.id }}
              onPress={() => {
                setLevel(l.id);
                setSelected(null);
                setOpen(null);
              }}
              style={[styles.segBtn, level === l.id && styles.segOn]}
            >
              <Text style={[styles.segText, level === l.id && styles.segTextOn]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

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
            fitPadding={{ top: 24, right: 24, bottom: 24, left: 24 }}
            initialCenter={savedCamera?.center ?? from ?? WORLD.center}
            initialZoom={savedCamera?.zoom ?? (from ? 13 : WORLD.zoom)}
            onCameraChange={onCameraChange}
            scaleInset={{ bottom: 6, left: 8 }}
          />
        )}
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

        <View style={styles.gridHead}>
          <Text style={styles.gridTitle} accessibilityRole="header">{heading}</Text>
          {atlas.list.length > 1 && <Text style={styles.gridNote}>nearest first</Text>}
        </View>

        {!from ? (
          <View style={styles.empty} testID="atlas-empty">
            <Icon name="locate-outline" size={22} color={theme.muted} />
            <Text style={styles.emptyText}>Find where you are to see the areas around you.</Text>
            <Button testID="atlas-locate" label="Find me" variant="secondary" onPress={locate} busy={locating} busyLabel="Finding you…" />
          </View>
        ) : atlas.list.length === 0 ? (
          <View style={styles.empty} testID="atlas-empty">
            {atlas.status === 'listing' || (atlas.status === 'idle' && !atlas.build) ? (
              <>
                <ActivityIndicator color={theme.muted} />
                <Text style={styles.emptyText}>Reading the map around you…</Text>
              </>
            ) : atlas.status === 'offline' ? (
              <Text style={styles.emptyText}>Couldn’t read the map. It will try again in a moment.</Text>
            ) : level === 'neighborhood' ? (
              <>
                <Text style={styles.emptyText}>No neighborhoods are named on the map here. The town is one area.</Text>
                <Button testID="atlas-to-towns" label="See towns" variant="secondary" onPress={() => setLevel('town')} />
              </>
            ) : (
              <Text style={styles.emptyText}>No towns are named on the map near here.</Text>
            )}
          </View>
        ) : (
          rows.map((pair) => (
            <View key={pair[0].area.key} style={styles.pair}>
              {pair.map((l) => {
                const r = ringOf.get(l.area.key);
                return (
                  <AtlasTile
                    key={l.area.key}
                    listed={l}
                    fam={famOf.get(l.area.key) ?? NEW_FAM}
                    walked={atlas.walked}
                    waiting={r?.waiting ?? NONE}
                    finds={r?.finds ?? NONE}
                    here={from}
                    selected={selected === l.area.key}
                    onPress={pick}
                  />
                );
              })}
              {pair.length === 1 && <View style={styles.spacer} />}
            </View>
          ))
        )}
      </ScrollView>

      {card && (
        <AtlasCard
          area={card.area}
          parent={card.area.level === 'neighborhood' ? town : null}
          distanceM={card.distanceM}
          here={card.here}
          fam={famOf.get(card.area.key) ?? familiarity(card.area, atlas.areas, atlas.walkAreas)}
          walked={atlas.walked}
          waiting={ringOf.get(card.area.key)?.waiting ?? NONE}
          finds={ringOf.get(card.area.key)?.finds ?? NONE}
          you={from}
          nextDoor={nextDoor(card.area, atlas.list.map((l) => l.area), atlas.build)}
          walkTo={!card.here && canWalkTo(card.distanceM) ? walkTarget(card.area) : null}
          starting={walkStart.starting}
          onWalk={() => {
            const t = walkTarget(card.area);
            setOpen(null);
            walkStart.start({ at: t.at, label: t.label, kind: 'point' });
          }}
          onPick={pick}
          onClose={() => setOpen(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { paddingHorizontal: 16, paddingBottom: 10, gap: 10, width: '100%', maxWidth: 640, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 28, fontWeight: '800', color: theme.ink },
  seg: { flexDirection: 'row', backgroundColor: '#e2ded6', borderRadius: 11, padding: 3 },
  segBtn: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 14, fontWeight: '600', color: theme.muted },
  segTextOn: { color: theme.ink },
  map: { width: '100%', borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  grid: { flex: 1 },
  gridContent: { padding: 12, gap: 10, paddingBottom: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  gridHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, paddingTop: 2 },
  gridTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: theme.muted },
  gridNote: { fontSize: 12, color: theme.muted },
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
