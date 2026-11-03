import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetFrame, type SheetSize } from '../../components/HomeSheet';
import { LocateButton } from '../../components/LocateButton';
import type { MarkPin } from '../../components/MarkPinView';
import { WalkMap } from '../../components/map/WalkMap';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import { db } from '../../lib/db';
import { areaInView, tabMarks, VIEW_REACH_M } from '../../lib/explore/exploreTab';
import type { ChecklistArea, ChecklistItem, Find, Kind } from '../../lib/explore/explore';
import { loadSettings, onSettings } from '../../lib/explore/settings';
import { boundsOf, distanceM, type Bounds } from '../../lib/geo';
import { readArea, rememberArea } from '../../lib/landing/read';
import { landingView, type LandingRow } from '../../lib/landing/view';
import { getLastFix, launchFix, setLastFix } from '../../lib/lastFix';
import { locateOnce } from '../../lib/locate';
import { perfCount } from '../../lib/perfCount';
import { ensureTileBuild } from '../../lib/tiles';
import type { LngLat } from '../../lib/types';
import { LOCATE_FIT_M, useLocate, type LocateError } from '../../lib/useLocate';
import { useStartWalk } from '../../lib/useStartWalk';
import { useTabMap } from '../../lib/useTabMap';

const NONE: never[] = [];
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** Room for the area's name and the hint under it (tabs audit U5). */
const PEEK = 88;
/** Places to find and finds are read for the view from this zoom, and again once the middle moves this far. */
const MARKS_ZOOM = 12;
const REREAD_M = 500;

/**
 * Explore (NV14-NV16): remembered busy areas (magenta), each area's places to
 * find and its finds, with no counts (nothing is a score); a long press from
 * z10 runs What's good here. It never tracks you: it reads one fix as the app
 * opens (it is the first tab), then opens on your last fix or where you left it.
 */
export default function Explore() {
  perfCount('render:explore');
  const insets = useSafeAreaInsets();
  const walkStart = useStartWalk();
  const [landings, setLandings] = useState<LandingRow[]>([]);
  const [build, setBuild] = useState<string | null>(null);
  const [areas, setAreas] = useState<ChecklistArea[]>([]);
  const [finds, setFinds] = useState<Find[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  // "What I'm into", as the walk shows it: a "?" here is one an exploring walk can show (E16).
  const [hidden, setHidden] = useState<Set<Kind>>(() => new Set());
  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => alive && setHidden(s.hidden), () => {});
    const off = onSettings((s) => setHidden(s.hidden));
    return () => {
      alive = false;
      off();
    };
  }, []);
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  const [center, setCenter] = useState<LngLat | null>(() => getLastFix()?.at ?? null);
  // The dot: the last fix as the tab opened, then wherever a Locate tap found you (QL10).
  const [locFix, setLocFix] = useState<LngLat | null>(() => getLastFix()?.at ?? null);
  const readAt = useRef<LngLat | null>(null);
  const [fit, setFit] = useState<{ bounds: Bounds | null; key: number }>({ bounds: null, key: 0 });
  const { focused, cameraNow, savedCamera, onCameraChange, areaH, onFitSettled } = useTabMap({ key: fit.key, refit: () => setFit((f) => ({ ...f, key: f.key + 1 })) });
  const [spot, setSpot] = useState<{ at: LngLat; zoom: number } | null>(null);
  const [looking, setLooking] = useState(false);
  const lookCancelled = useRef(false);
  const [notice, setNotice] = useState<{ message: string; tone?: 'info' | 'error' } | null>(null);
  const [size, setSize] = useState<SheetSize>('peek');
  const [sheetAnim] = useState(() => new Animated.Value(PEEK));
  const [aboveSheet] = useState(() => ({ bottom: Animated.add(sheetAnim, 16) }));
  const [sheetH, setSheetH] = useState(PEEK);
  // The map opens where you were last seen; with no fix yet, the launch's one fix frames it below (NV16).
  const [initial] = useState(() => {
    const fix = getLastFix()?.at;
    return fix ? { center: fix, zoom: 15 } : null;
  });

  const readItems = useCallback((at: LngLat) => {
    readAt.current = at;
    const box = boundsOf([at], VIEW_REACH_M);
    if (box) db.checklistItemsIn(box).then(setItems, () => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        const [l, a, f] = await Promise.all([
          db.listLandings().catch(() => [] as LandingRow[]),
          db.listChecklistAreas().catch(() => [] as ChecklistArea[]),
          db.listFinds().catch(() => [] as Find[]),
        ]);
        if (!live) return;
        setLandings(l);
        setAreas(a);
        setFinds(f);
        setBuild(await ensureTileBuild().then((b) => (b === 'unknown' ? null : b), () => null));
        // With no view of its own yet (the world it opened on), it frames Navigate's last fix, else the
        // area last remembered (NV16). Explore opens first (NV2), before Navigate has read a fix, so
        // this is asked on every focus, not only when the map first opens.
        const newest = [...l].sort((x, y) => y.analyzed_at - x.analyzed_at)[0];
        if ((cameraNow.current?.zoom ?? 0) < 3) {
          const fix = getLastFix()?.at;
          const box = fix ? boundsOf([fix], LOCATE_FIT_M) : newest ? boundsOf([newest.centre], 800) : null;
          if (box) setFit((v) => ({ bounds: box, key: v.key + 1 }));
        }
        const at = cameraNow.current?.center ?? getLastFix()?.at;
        if (at && (cameraNow.current?.zoom ?? 15) >= MARKS_ZOOM) readItems(at);
      })().catch(() => {});
      return () => {
        live = false;
      };
    }, [cameraNow, readItems]),
  );

  // One fix as the app opens, framed (NV16, the owner's call, Nov 3): Explore is the first tab (NV2),
  // so it can't wait for Navigate's. Once per launch; nothing tracks after.
  useEffect(() => {
    if (!focused || !launchFix.take(!!getLastFix())) return;
    locateOnce().then((r) => {
      if (!r.at) return;
      setLastFix(r.at);
      setLocFix(r.at);
      const box = boundsOf([r.at], LOCATE_FIT_M);
      if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
    }, () => {});
  }, [focused]);

  const onCamera = (c: { center: LngLat; zoom: number }) => {
    onCameraChange(c);
    setCenter(c.center);
    if (c.zoom >= MARKS_ZOOM && (!readAt.current || distanceM(readAt.current, c.center) > REREAD_M)) readItems(c.center);
  };

  const streetZoom = (view?.zoom ?? 0) >= MARKS_ZOOM;
  const landingAll = useMemo(() => landingView(landings, build), [landings, build]);
  const marks = useMemo<MarkPin[]>(() => (streetZoom ? (tabMarks(items, finds, hidden) as MarkPin[]) : NONE), [items, finds, hidden, streetZoom]);
  const here = useMemo(() => (center ? areaInView(center, areas, landings, items, finds, hidden) : null), [center, areas, landings, items, finds, hidden]);

  const lookHere = async (at: LngLat) => {
    if (looking) return;
    lookCancelled.current = false;
    setLooking(true);
    try {
      const r = await readArea(at, () => lookCancelled.current);
      if (lookCancelled.current) return;
      if (!r.ok) {
        if (r.reason === 'failed') setNotice({ message: 'Couldn’t read the map here', tone: 'error' });
        return;
      }
      const tile = await db.getMeta('tile_build').catch(() => null);
      const row = await rememberArea(r.centre, r.analysis, tile ?? 'unknown');
      setLandings((rows) => [...rows.filter((x) => x.key !== row.key), row]);
      setBuild(tile);
      const pts = [...r.analysis.pockets.flatMap((p) => p.hull), ...(r.analysis.landing ? [r.analysis.landing.at] : [])];
      // Fitted with room around it, so the pockets sit in their streets rather than fill the screen.
      const box = boundsOf(pts.length ? pts : [r.centre], pts.length ? 250 : 600);
      if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
      const top = r.analysis.pockets[0]?.name ?? r.analysis.landing?.street;
      const message = `${r.analysis.reason}${r.analysis.basis === 'density' && top ? `: ${top}` : ''}. A best guess from the map.`;
      setNotice({ message });
      AccessibilityInfo.announceForAccessibility(
        r.analysis.strips.length ? `${message} Strips: ${r.analysis.strips.map((x) => x.name).join(', ')}.` : message,
      );
    } finally {
      if (!lookCancelled.current) setLooking(false);
    }
  };

  // Locate me (QL9-QL12): one fix on a tap, the dot there, and the map framed 250 m around it; nothing
  // tracks after, and the map keeps later pans. No fix: the banner, with Open Settings where it helps.
  const [locError, setLocError] = useState<LocateError | null>(null);
  const { busy: locating, locate } = useLocate({
    onFix: (at) => {
      setLocFix(at);
      const box = boundsOf([at], LOCATE_FIT_M);
      if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
    },
    onError: setLocError,
  });
  const error = walkStart.error ?? locError;
  return (
    <View style={styles.screen}>
      <View style={[StyleSheet.absoluteFill, styles.over]} pointerEvents="box-none">
        <SheetFrame
          testID="explore-drawer"
          dragTestID="explore-drag"
          size={size}
          onSize={setSize}
          peek={PEEK}
          bottomInset={0}
          areaHeight={areaH}
          height={sheetAnim}
          onHeight={setSheetH}
          header={
            <View style={styles.header}>
              <Text testID="explore-area" style={styles.title} accessibilityRole="header" numberOfLines={1}>
                {here?.name ?? 'Look around'}
              </Text>
              {/* At rest too, not only opened (tabs audit U5): the peek says how Explore is used. */}
              <Text testID="explore-hint" style={styles.hint} numberOfLines={1}>Press and hold the map to see what’s good there.</Text>
            </View>
          }
        >
          {size !== 'peek' && (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {here?.streets.length ? (
                <>
                  <Text style={styles.section} accessibilityRole="header">Busy streets</Text>
                  <Text testID="explore-streets" style={styles.line}>{here.streets.join(' · ')}</Text>
                </>
              ) : null}
              {here?.toFind.length ? (
                <>
                  <Text style={styles.section} accessibilityRole="header">Places to find</Text>
                  <Text testID="explore-to-find" style={styles.line}>{here.toFind.join(' · ')}</Text>
                </>
              ) : null}
              {here?.found.length ? (
                <>
                  <Text style={styles.section} accessibilityRole="header">Found here</Text>
                  <Text testID="explore-found" style={styles.line}>{here.found.join(' · ')}</Text>
                </>
              ) : null}
            </ScrollView>
          )}
        </SheetFrame>
        {/* Locate me (QL9): above the sheet at every height. The long press's card takes its place. */}
        {!spot && <LocateButton busy={locating} onPress={locate} bottom={sheetH + 12} />}
      </View>

      <View style={[styles.top, styles.over, { top: insets.top + 8 }]} pointerEvents="box-none">
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
                // Gone at once; the read stops its fetches and writes nothing (audit).
                lookCancelled.current = true;
                setLooking(false);
              }}
              style={styles.scanCancel}
              hitSlop={8}
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
      </View>

      {spot && (
        <Animated.View style={[styles.spotRow, styles.over, aboveSheet]} pointerEvents="box-none">
          <View style={styles.spotStack}>
            {/* Explore's own question is the filled button (tabs audit U6). Walk here, still a one-tap start
                that never fills the drawer (NV15, NV12), is secondary and only at street zoom; what's good
                here from z10 (L1). */}
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
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSpot(null)} style={styles.spotClose} hitSlop={8}>
              <Icon name="close" size={22} color={theme.ink} />
            </Pressable>
          </View>
        </Animated.View>
      )}

      <View style={[StyleSheet.absoluteFill, styles.under]}>
        {/* Only while Explore is in front (NV4): one map is live at a time. */}
        {focused && (
          <WalkMap
            trace={NONE}
            walked={NONE}
            fog={NONE}
            captures={NONE}
            walker={locFix}
            discoveries={marks}
            landing={streetZoom ? landingAll : null}
            marks={spot ? [spot.at] : undefined}
            onLongPress={(at) => {
              const zoom = view?.zoom ?? 0;
              if (looking || zoom < 10) return;
              setSize('peek');
              setSpot({ at, zoom });
            }}
            onPress={() => spot && setSpot(null)}
            onViewChange={setView}
            fitBounds={fit.bounds}
            fitKey={fit.key}
            onFitSettled={onFitSettled}
            fitPadding={{ top: insets.top + 60, right: 48, bottom: sheetH + 96, left: 48 }}
            initialCenter={savedCamera?.center ?? initial?.center ?? WORLD.center}
            initialZoom={savedCamera?.zoom ?? initial?.zoom ?? WORLD.zoom}
            onCameraChange={onCamera}
            attributionTop
            // The scale bar above the sheet at its resting height (QL8).
            scaleInset={{ bottom: sheetH + 12, left: 12 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  under: { zIndex: 0 },
  over: { zIndex: 1 },
  top: { position: 'absolute', left: 16, right: 16, gap: 8, maxWidth: 640, alignSelf: 'center' },
  header: { justifyContent: 'center', gap: 2, paddingHorizontal: 16, paddingBottom: 8, minHeight: 56, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: theme.ink },
  hint: { fontSize: 13, color: theme.muted },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 8, maxWidth: 640, width: '100%', alignSelf: 'center' },
  section: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 6 },
  line: { fontSize: 15, color: theme.ink, lineHeight: 21 },
  scanning: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 6, paddingLeft: 14, paddingRight: 6,
  },
  scanningText: { fontSize: 15, fontWeight: '600', color: theme.ink },
  scanCancel: { minHeight: 36, paddingHorizontal: 12, justifyContent: 'center' },
  scanCancelText: { fontSize: 15, fontWeight: '600', color: theme.accent },
  spotRow: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  spotClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  spotStack: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 10, gap: 8, width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
});
