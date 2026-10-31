import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeSheet, SHEET_PEEK, type SheetMode } from '../components/HomeSheet';
import { WalkMap } from '../components/map/WalkMap';
import type { WalkMapHandle } from '../components/map/types';
import { Icon } from '../components/icons';
import { Banner, Button, theme } from '../components/ui';
import type { Area, WalkArea } from '../lib/areas/types';
import { db } from '../lib/db';
import { placeBacklog } from '../lib/backlog';
import { pausedMs, type Bounds } from '../lib/geo';
import { levelForZoom, placesIndex, starsFor, unplacedWalks, type Star } from '../lib/places';
import { recorder } from '../lib/recorder';
import { RecorderError } from '../lib/recorder/types';
import { saveNav } from '../lib/nav/store';
import type { Waypoint } from '../lib/nav/types';
import { startWalk } from '../lib/session';
import { formatDuration } from '../lib/summary';
import type { LngLat, Pause, Walk, WalkSummary } from '../lib/types';

const NONE: never[] = [];
/** With nothing walked yet: the world, and one line. */
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** Walks a pass began this session; one that failed waits for the next launch (criterion 25). */
const tried = new Set<string>();
const boundsKey = (b: Bounds | null) => (b ? b.map((v) => v.toFixed(5)).join(',') : '');

/**
 * Home is the places map (the owner's call, after AllTrails and Strava): stars
 * where you have walked, a sheet that peeks with a summary and lists walks,
 * and one Start button. It reads only walks, summaries, Area and WalkArea;
 * placing old walks (which reads their traces) lives in lib/backlog.
 */
export default function Home() {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const mapRef = useRef<WalkMapHandle>(null);
  const [data, setData] = useState<{ walks: Walk[]; summaries: WalkSummary[]; areas: Area[]; rows: WalkArea[] } | null>(null);
  const [open, setOpen] = useState<Walk | null>(null);
  const [pauses, setPauses] = useState<Pause[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<{ message: string; openSettings?: boolean } | null>(null);
  const [mode, setMode] = useState<SheetMode>({ kind: 'summary' });
  const [sheetH, setSheetH] = useState(SHEET_PEEK + insets.bottom);
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  const [fit, setFit] = useState<{ bounds: Bounds | null; key: number }>({ bounds: null, key: 0 });
  const [placing, setPlacing] = useState<{ done: number; of: number } | null>(null);
  const [selected, setSelected] = useState<Star | null>(null);
  // A long press on the home map: walk there (N11).
  const [spot, setSpot] = useState<LngLat | null>(null);
  // The map refits only when the places walked change (a new walk, a pass),
  // never just for coming back: a replay keeps the view you left (H5).
  const fittedTo = useRef('');
  const skip = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      skip.current = false;
      const load = async () => {
        const [walks, summaries, areas, rows] = await Promise.all([db.listWalks(), db.listSummaries(), db.listAreas(), db.listWalkAreas()]);
        const openWalk = walks.find((w) => w.open) ?? null;
        const openPauses = openWalk ? await db.getPauses(openWalk.id) : [];
        if (!live) return null;
        setData({ walks, summaries, areas, rows });
        setOpen(openWalk);
        setPauses(openPauses);
        setNow(Date.now());
        const bounds = placesIndex(areas, rows, walks).bounds;
        if (boundsKey(bounds) !== fittedTo.current) {
          fittedTo.current = boundsKey(bounds);
          setFit((f) => ({ bounds, key: f.key + 1 }));
        }
        return { walks, rows };
      };
      load()
        .then(async (d) => {
          if (!d) return;
          // Walks with no places yet are placed in one pass, behind a cover
          // that Skip lifts; leaving the screen stops the pass after the walk at hand.
          const todo = unplacedWalks(d.walks, d.rows).filter((w) => !tried.has(w.id));
          if (!todo.length) return;
          setPlacing({ done: 0, of: todo.length });
          await placeBacklog(todo, () => mapRef.current, {
            onAttempt: (id) => tried.add(id),
            onProgress: (done) => live && !skip.current && setPlacing({ done, of: todo.length }),
            stopped: () => !live || skip.current,
          });
          if (live) await load();
        })
        .catch((e) => live && setError({ message: e instanceof Error ? e.message : String(e) }))
        .finally(() => live && setPlacing(null));
      return () => {
        live = false;
        setPlacing(null);
      };
    }, []),
  );

  // The open walk's time keeps counting while it shows.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const index = useMemo(() => placesIndex(data?.areas ?? [], data?.rows ?? [], data?.walks ?? []), [data]);
  const summaries = useMemo(() => new Map((data?.summaries ?? []).map((s) => [s.walk_id, s])), [data]);
  const unplaced = useMemo(() => unplacedWalks(data?.walks ?? [], data?.rows ?? []), [data]);
  const stars = useMemo(() => {
    if (!view) return [];
    return starsFor(index, levelForZoom(view.zoom, index.multiCountry), view.zoom, view.lat);
  }, [index, view]);

  const pressStar = (s: Star) => {
    if (s.count > 1) {
      // A merged star zooms in to the places it stands for, as map clusters do.
      const xs = s.points.map((p) => p[0]);
      const ys = s.points.map((p) => p[1]);
      setFit((f) => ({ bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], key: f.key + 1 }));
      return;
    }
    setSelected(s);
    setMode({ kind: 'place', key: s.keys[0] });
    // Above the sheet, which opens to half the screen.
    mapRef.current?.showPoint(s.at, { top: insets.top + 48, right: 24, bottom: Math.round(screenH * 0.5) + 24, left: 24 });
  };

  /** Starts a walk; with a destination, the walk screen navigates there as it opens. */
  const start = async (dest?: Waypoint) => {
    setError(null);
    setStarting(true);
    try {
      const { walk, warning } = await startWalk();
      if (dest) await saveNav(walk.id, dest);
      router.push(warning ? { pathname: '/walk', params: { warning } } : '/walk');
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e), openSettings: e instanceof RecorderError && e.openSettings });
    } finally {
      setStarting(false);
    }
  };

  const empty = data != null && index.walkCount === 0 && !open;
  const paused = pauses.some((p) => p.ended_at == null);
  const elapsed = open ? formatDuration(now - open.started_at - pausedMs(pauses, open.started_at, now)) : '';

  return (
    <View style={styles.screen}>
      {/* Start and the sheet come first, for a screen reader or a keyboard; the map draws beneath them. */}
      {(mode.kind === 'summary' || open) && !spot && (
        <View style={[styles.startRow, styles.over, { bottom: sheetH + 16 }]} pointerEvents="box-none">
          {open ? (
            <Button
              testID="resume"
              label={`Return to your walk, ${paused ? 'paused' : 'recording'}, ${elapsed}`}
              onPress={() => router.push('/walk')}
              tall
              style={styles.startBtn}
            >
              <View style={styles.recordingRow}>
                <View style={styles.dot} />
                <Text style={styles.resumeText}>
                  {paused ? 'Paused' : 'Recording'} · {elapsed} · Return
                </Text>
              </View>
            </Button>
          ) : (
            <Button testID="start" label="Start walk" onPress={() => start()} busy={starting} busyLabel="Starting…" disabled={placing != null} tall style={styles.startBtn} />
          )}
        </View>
      )}

      <View style={[StyleSheet.absoluteFill, styles.over]} pointerEvents="box-none">
        <HomeSheet
          index={index}
          summaries={summaries}
          unplaced={unplaced}
          mode={mode}
          onMode={(m) => {
            if (m.kind !== 'place') setSelected(null);
            setMode(m);
          }}
          onHeight={setSheetH}
          busy={placing != null || starting}
          onGoToPlace={selected && !open ? () => start({ at: selected.at, label: selected.label, kind: 'place' }) : undefined}
        />
      </View>

      <View style={[styles.top, styles.over, { top: insets.top + 8 }]} pointerEvents="box-none">
        {error && (
          <Banner
            tone="error"
            onDismiss={() => setError(null)}
            action={error.openSettings ? { label: 'Open Settings', onPress: () => Linking.openSettings() } : undefined}
          >
            {error.message}
          </Banner>
        )}
        {empty && !recorder.capabilities.background && (
          <Banner>On the web, a walk is traced while this page is open and on screen.</Banner>
        )}
      </View>

      {spot && (
        <View style={[styles.startRow, styles.over, { bottom: sheetH + 16 }]} pointerEvents="box-none">
          <View style={styles.spot}>
            <Button
              testID="walk-here"
              label="Walk here"
              onPress={() => {
                const at = spot;
                setSpot(null);
                start({ at, label: 'Your spot', kind: 'point' });
              }}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSpot(null)} style={styles.spotClose} hitSlop={8}>
              <Icon name="close" size={22} color={theme.ink} />
            </Pressable>
          </View>
        </View>
      )}

      {(empty || placing) && (
        <View style={[styles.center, styles.over]} pointerEvents="box-none" accessibilityLiveRegion="polite">
          <Text style={styles.centerText}>
            {placing ? `Placing your walks (${Math.min(placing.done + 1, placing.of)} of ${placing.of})` : 'Walk somewhere and it is starred here'}
          </Text>
          {placing && (
            <Pressable
              testID="skip-placing"
              accessibilityRole="button"
              accessibilityLabel="Skip placing your walks for now"
              onPress={() => {
                skip.current = true;
                setPlacing(null);
              }}
              style={styles.skip}
              hitSlop={8}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={[StyleSheet.absoluteFill, styles.under]}>
        <WalkMap
          ref={mapRef}
          trace={NONE}
          walked={NONE}
          fog={NONE}
          captures={NONE}
          stars={stars}
          selectedStar={selected?.id ?? null}
          onLongPress={(at) => !open && placing == null && setSpot(at)}
          onStarPress={pressStar}
          onViewChange={setView}
          fitBounds={fit.bounds}
          fitKey={fit.key}
          fitPadding={{ top: insets.top + 60, right: 48, bottom: sheetH + 96, left: 48 }}
          initialCenter={WORLD.center}
          initialZoom={WORLD.zoom}
          covered={placing != null}
          attributionTop
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  under: { zIndex: 0 },
  over: { zIndex: 1 },
  top: { position: 'absolute', left: 12, right: 12, gap: 8, maxWidth: 640, alignSelf: 'center' },
  center: { position: 'absolute', left: 24, right: 24, top: '38%', alignItems: 'center', gap: 10 },
  centerText: {
    backgroundColor: 'rgba(255,255,255,0.94)', color: theme.ink, fontSize: 16, fontWeight: '600',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', textAlign: 'center',
  },
  skip: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 22, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge },
  skipText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  startRow: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  spot: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999, padding: 6, paddingLeft: 6,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  spotClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  startBtn: { minWidth: 220, borderRadius: 999, paddingHorizontal: 28 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accentInk },
  resumeText: { color: theme.accentInk, fontSize: 16, fontWeight: '600' },
});
