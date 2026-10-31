import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeSheet, SHEET_PEEK, type SheetMode } from '../components/HomeSheet';
import { WalkMap } from '../components/map/WalkMap';
import { planViews, type WalkMapHandle } from '../components/map/types';
import { Banner, Button, theme } from '../components/ui';
import type { Area, WalkArea } from '../lib/areas/types';
import { db } from '../lib/db';
import { snapWalk } from '../lib/finish';
import { pausedMs } from '../lib/geo';
import { levelForZoom, placeAll, placesIndex, starsFor, unplacedWalks } from '../lib/places';
import { recorder } from '../lib/recorder';
import { RecorderError } from '../lib/recorder/types';
import { startWalk } from '../lib/session';
import { formatDuration } from '../lib/summary';
import type { Pause, Walk, WalkSummary } from '../lib/types';

const NONE: never[] = [];
/** With nothing walked yet: the world, and one line. */
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** Walks a pass already tried this session; a failure waits for the next launch (criterion 25). */
const tried = new Set<string>();

/**
 * Home is the places map (the owner's call, after AllTrails and Strava): stars
 * where you have walked, a sheet that peeks with a summary and lists walks,
 * and one Start button. It reads only walks, summaries, Area and WalkArea,
 * never a trace or a file.
 */
export default function Home() {
  const insets = useSafeAreaInsets();
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
  const [fitKey, setFitKey] = useState(0);
  const [placing, setPlacing] = useState<{ done: number; of: number } | null>(null);

  const load = useCallback(async () => {
    const [walks, summaries, areas, rows] = await Promise.all([db.listWalks(), db.listSummaries(), db.listAreas(), db.listWalkAreas()]);
    const openWalk = walks.find((w) => w.open) ?? null;
    const openPauses = openWalk ? await db.getPauses(openWalk.id) : [];
    return { walks, summaries, areas, rows, openWalk, openPauses };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      const apply = (d: Awaited<ReturnType<typeof load>>, fit: boolean) => {
        if (!live) return;
        setData({ walks: d.walks, summaries: d.summaries, areas: d.areas, rows: d.rows });
        setOpen(d.openWalk);
        setPauses(d.openPauses);
        setNow(Date.now());
        if (fit) setFitKey((k) => k + 1);
      };
      load()
        .then(async (d) => {
          apply(d, true);
          // Walks with no places yet (from before v0.5, or offline at stop) are
          // placed in one pass, behind a cover, while the map reads their tiles.
          const todo = unplacedWalks(d.walks, d.rows).filter((w) => !tried.has(w.id));
          if (!todo.length || !live) return;
          todo.forEach((w) => tried.add(w.id));
          setPlacing({ done: 0, of: todo.length });
          const byId = new Map(todo.map((w) => [w.id, w]));
          await placeAll(
            todo.map((w) => w.id),
            async (id) => {
              const map = mapRef.current;
              if (!map) throw new Error('No map');
              await snapWalk(byId.get(id)!, {
                plan: (bounds, trace) => {
                  const { width, height } = map.size();
                  return planViews(bounds, width, height, trace);
                },
                collect: (centers) => map.collect(centers),
                collectPlaces: (center) => map.collectPlaces(center),
              });
            },
            (done) => live && setPlacing({ done, of: todo.length }),
            () => !live,
          );
          if (live) {
            setPlacing(null);
            apply(await load(), true);
          }
        })
        .catch((e) => {
          if (!live) return;
          setPlacing(null);
          setError({ message: e instanceof Error ? e.message : String(e) });
        });
      return () => {
        live = false;
      };
    }, [load]),
  );

  const index = useMemo(() => placesIndex(data?.areas ?? [], data?.rows ?? [], data?.walks ?? []), [data]);
  const summaries = useMemo(() => new Map((data?.summaries ?? []).map((s) => [s.walk_id, s])), [data]);
  const unplaced = useMemo(() => unplacedWalks(data?.walks ?? [], data?.rows ?? []), [data]);
  const stars = useMemo(() => {
    if (!view) return [];
    return starsFor(index, levelForZoom(view.zoom, index.multiCountry), view.zoom, view.lat);
  }, [index, view]);

  const start = async () => {
    setError(null);
    setStarting(true);
    try {
      const { warning } = await startWalk();
      router.push(warning ? { pathname: '/walk', params: { warning } } : '/walk');
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e), openSettings: e instanceof RecorderError && e.openSettings });
    } finally {
      setStarting(false);
    }
  };

  const empty = data != null && index.walkCount === 0 && !open;
  const paused = pauses.some((p) => p.ended_at == null);

  return (
    <View style={styles.screen}>
      <WalkMap
        ref={mapRef}
        trace={NONE}
        walked={NONE}
        fog={NONE}
        captures={NONE}
        stars={stars}
        onStarPress={(s) => setMode({ kind: 'place', key: s.keys[0] })}
        onViewChange={setView}
        fitBounds={index.bounds}
        fitKey={fitKey}
        fitPadding={{ top: insets.top + 60, right: 48, bottom: sheetH + 96, left: 48 }}
        initialCenter={WORLD.center}
        initialZoom={WORLD.zoom}
        covered={placing != null}
      />

      <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
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

      {(empty || placing) && (
        <View style={styles.center} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text style={styles.centerText}>
            {placing ? `Placing your walks (${placing.done} of ${placing.of})` : 'Walk somewhere and it is starred here'}
          </Text>
        </View>
      )}

      {(mode.kind === 'summary' || open) && (
        <View style={[styles.startRow, { bottom: sheetH + 16 }]} pointerEvents="box-none">
          {open ? (
            <Button testID="resume" label="Return to your walk" onPress={() => router.push('/walk')} tall style={styles.startBtn}>
              <View style={styles.recordingRow}>
                <View style={styles.dot} />
                <Text style={styles.resumeText}>
                  {paused ? 'Paused' : 'Recording'} · {formatDuration(now - open.started_at - pausedMs(pauses, open.started_at, now))} · Return
                </Text>
              </View>
            </Button>
          ) : (
            <Button testID="start" label="Start walk" onPress={start} busy={starting} busyLabel="Starting…" tall style={styles.startBtn} />
          )}
        </View>
      )}

      <HomeSheet index={index} summaries={summaries} unplaced={unplaced} mode={mode} onMode={setMode} onHeight={setSheetH} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { position: 'absolute', left: 12, right: 12, gap: 8, maxWidth: 640, alignSelf: 'center' },
  center: { position: 'absolute', left: 24, right: 24, top: '38%', alignItems: 'center' },
  centerText: {
    backgroundColor: 'rgba(255,255,255,0.94)', color: theme.ink, fontSize: 16, fontWeight: '600',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', textAlign: 'center',
  },
  startRow: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  startBtn: { minWidth: 220, borderRadius: 999, paddingHorizontal: 28 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accentInk },
  resumeText: { color: theme.accentInk, fontSize: 16, fontWeight: '600' },
});
