import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaptureViewer } from '../components/CaptureView';
import { ExploreSettings } from '../components/ExploreSettings';
import { HomeSheet, SHEET_PEEK, type SheetMode } from '../components/HomeSheet';
import type { MarkPin } from '../components/MarkPinView';
import { WalkMap } from '../components/map/WalkMap';
import type { WalkMapHandle } from '../components/map/types';
import { Icon } from '../components/icons';
import { Banner, Button, theme } from '../components/ui';
import type { Area, WalkArea } from '../lib/areas/types';
import { db } from '../lib/db';
import { perfCount } from '../lib/perfCount';
import { categoryOf } from '../lib/discovery/categories';
import { countLine, EXPLORE_KEY, exploredKey, placeCount, type ChecklistArea, type ChecklistItem, type Find } from '../lib/explore/explore';
import { takeRecallOpen } from '../lib/discovery/recallCheck';
import { readArea, rememberArea } from '../lib/landing/read';
import { landingView, type LandingRow } from '../lib/landing/view';
import { ensureTileBuild } from '../lib/tiles';
import { placeBacklog } from '../lib/backlog';
import { boundsOf, pausedMs, type Bounds } from '../lib/geo';
import { levelForZoom, placesIndex, starsFor, unplacedWalks, type Star } from '../lib/places';
import { recorder } from '../lib/recorder';
import { RecorderError } from '../lib/recorder/types';
import { saveNav } from '../lib/nav/store';
import type { Waypoint } from '../lib/nav/types';
import { startWalk } from '../lib/session';
import { formatDuration } from '../lib/summary';
import type { Capture, LngLat, Pause, Walk, WalkSummary } from '../lib/types';

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
  perfCount('render:home');
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
  const [spot, setSpot] = useState<{ at: LngLat; zoom: number } | null>(null);
  // What's good here (v1.5): remembered areas, and the one being read.
  const [landings, setLandings] = useState<LandingRow[]>([]);
  const [looking, setLooking] = useState(false);
  const lookCancelled = useRef(false);
  const [build, setBuild] = useState<string | null>(null);
  // The map refits only when the places walked change (a new walk, a pass),
  // never just for coming back: a replay keeps the view you left (H5).
  const fittedTo = useRef('');
  // The map's camera, kept while the map is down (a walk, a replay) and restored when it returns.
  const focused = useIsFocused();
  const cameraNow = useRef<{ center: LngLat; zoom: number } | null>(null);
  const [savedCamera, setSavedCamera] = useState<{ center: LngLat; zoom: number } | null>(null);
  useFocusEffect(
    useCallback(
      () => () => {
        setSavedCamera(cameraNow.current);
      },
      [],
    ),
  );
  // Explore (E10, E21): checklist counts for the place view, and the range preview while settings are open.
  const [checklists, setChecklists] = useState<ChecklistArea[]>([]);
  const [finds, setFinds] = useState<Find[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState<{ center: LngLat; radiusM: number } | null>(null);
  const [previewItems, setPreviewItems] = useState<ChecklistItem[]>([]);
  const [panelH, setPanelH] = useState(0);
  const [recalled, setRecalled] = useState<Capture[] | null>(null);
  const [scanNotice, setScanNotice] = useState<{ message: string; tone?: 'info' | 'error' } | null>(null);
  useEffect(() => {
    if (!scanNotice) return;
    const t = setTimeout(() => setScanNotice(null), 6000);
    return () => clearTimeout(t);
  }, [scanNotice]);
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
        // A reminder notification tapped with no walk open lands here (R4).
        const recalled = openWalk ? [] : await takeRecallOpen().catch(() => [] as Capture[]);
        if (!live) return null;
        setChecklists(await db.listChecklistAreas().catch(() => [] as ChecklistArea[]));
        setFinds(await db.listFinds().catch(() => [] as Find[]));
        setLandings(await db.listLandings().catch(() => [] as LandingRow[]));
        // The served build, once it's known (the launch's own check may still be running), for marking stale areas.
        setBuild(await ensureTileBuild().then((b) => (b === 'unknown' ? null : b), () => null));
        if (recalled.length) setRecalled(recalled);
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
  /** Starts a walk; with a destination, the walk screen navigates there as it opens; `explore` starts it exploring (E1). */
  const start = async (dest?: Waypoint, explore = false) => {
    setError(null);
    setStarting(true);
    try {
      const { walk, warning } = await startWalk();
      if (explore) {
        await db.setMeta(EXPLORE_KEY, walk.id);
        await db.setMeta(exploredKey(walk.id), String(Date.now()));
      }
      if (dest) await saveNav(walk.id, dest);
      // A walk started by "Walk here" says so as it opens: it is recording, not just a route.
      router.push(warning ? { pathname: '/walk', params: { warning } } : dest ? { pathname: '/walk', params: { started: '1' } } : '/walk');
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e), openSettings: e instanceof RecorderError && e.openSettings });
    } finally {
      setStarting(false);
    }
  };

  // Remembered areas show from street zoom (L11), stale ones too, offline.
  // Built once per change of the areas, not per zoom, so the markers aren't remade on every gesture (audit).
  const landingAll = useMemo(() => landingView(landings, build), [landings, build]);
  const streetZoom = (view?.zoom ?? 0) >= 12;
  const landingShown = streetZoom ? landingAll : null;

  const lookHere = async (at: LngLat) => {
    if (looking) return;
    lookCancelled.current = false;
    setLooking(true);
    setSelected(null);
    setMode({ kind: 'summary' });
    try {
      const r = await readArea(at, () => lookCancelled.current);
      if (lookCancelled.current) return;
      if (!r.ok) {
        if (r.reason === 'failed') setScanNotice({ message: 'Couldn’t read the map here', tone: 'error' });
        return;
      }
      const tile = await db.getMeta('tile_build').catch(() => null);
      const row = await rememberArea(r.centre, r.analysis, tile ?? 'unknown');
      setLandings((rows) => [...rows.filter((x) => x.key !== row.key), row]);
      setBuild(tile);
      const pts = [...r.analysis.pockets.flatMap((p) => p.hull), ...(r.analysis.landing ? [r.analysis.landing.at] : [])];
      // Fitted with room around it, so the pockets sit in their streets rather than fill the screen.
      // Nothing to frame: zoom to the centre at street zoom (audit).
      const box = boundsOf(pts.length ? pts : [r.centre], pts.length ? 250 : 600);
      if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
      const top = r.analysis.pockets[0]?.name ?? r.analysis.landing?.street;
      const message = `${r.analysis.reason}${r.analysis.basis === 'density' && top ? `: ${top}` : ''}. A best guess from the map.`;
      setScanNotice({ message });
      AccessibilityInfo.announceForAccessibility(
        r.analysis.strips.length ? `${message} Strips: ${r.analysis.strips.map((x) => x.name).join(', ')}.` : message,
      );
    } finally {
      if (!lookCancelled.current) setLooking(false);
    }
  };

  // The place view's count and found places (E10): never on the overview.
  const placeExtra = useMemo(() => {
    if (mode.kind !== 'place') return null;
    const a = index.areas.get(mode.key);
    const got = a ? placeCount(a, checklists, finds) : null;
    return got ? { count: countLine(got.count), found: got.found.map((f) => f.name) } : null;
  }, [mode, index, checklists, finds]);

  // The range preview (E21): around where your last walk was (the home has no position of its own),
  // else the middle of the map, with the "?" places that would fall inside it.
  const previewAt = (): LngLat | null => {
    const last = data?.walks.filter((w) => !w.open).sort((x, y) => y.started_at - x.started_at)[0];
    const row = last ? data?.rows.filter((r) => r.walk_id === last.id).sort((x, y) => y.metres - x.metres)[0] : null;
    return row ? [row.lon, row.lat] : (cameraNow.current?.center ?? null);
  };
  const previewCenter = useRef<LngLat | null>(null);
  const onPreview = (m: number | null) => {
    if (m == null) {
      previewCenter.current = null;
      setPreview(null);
      setPreviewItems([]);
      return;
    }
    const center = (previewCenter.current ??= previewAt());
    if (!center) return;
    setPreview({ center, radiusM: m });
    const box = boundsOf([center], m * 1.15);
    if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
  };
  const onPreviewRef = useRef(onPreview);
  useEffect(() => {
    onPreviewRef.current = onPreview;
  });
  const stablePreview = useCallback((m: number | null) => onPreviewRef.current(m), []);
  useEffect(() => {
    if (!preview) return;
    let alive = true;
    db.checklistItemsIn(boundsOf([preview.center], preview.radiusM)!).then((items) => alive && setPreviewItems(items), () => {});
    return () => {
      alive = false;
    };
  }, [preview]);
  const previewPins = useMemo<MarkPin[]>(() => {
    if (!preview) return [];
    return previewItems
      .filter((i) => Math.hypot((i.at[0] - preview.center[0]) * Math.cos((preview.center[1] * Math.PI) / 180), i.at[1] - preview.center[1]) * 111320 <= preview.radiusM)
      .map((i) => ({ id: i.key, at: i.at, revealed: false, icon: categoryOf(i.category).icon as MarkPin['icon'], name: i.name, category: categoryOf(i.category).label }));
  }, [preview, previewItems]);

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
            // Two ways in (the owner's call, after the audit): a quiet walk, or one that explores from the first step.
            <View style={styles.startPair}>
              <Button testID="start" label="Start walk" onPress={() => start()} busy={starting} busyLabel="Starting…" disabled={placing != null || looking} tall style={styles.startBtn} />
              <Button
                testID="start-explore"
                variant="secondary"
                // The label is what a screen reader says; the button shows "Explore".
                label="Explore: start a walk that shows places to find as you get close"
                onPress={() => start(undefined, true)}
                disabled={placing != null || looking || starting}
                tall
                style={styles.exploreBtn}
              >
                <View style={styles.recordingRow}>
                  <Icon name="compass-outline" size={20} color={theme.ink} />
                  <Text style={styles.exploreText}>Explore</Text>
                </View>
              </Button>
            </View>
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
          placeExtra={placeExtra}
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
        {scanNotice && (
          <Banner tone={scanNotice.tone} onDismiss={() => setScanNotice(null)}>
            {scanNotice.message}
          </Banner>
        )}
        {empty && !recorder.capabilities.background && (
          <Banner>On the web, a walk is traced while this page is open and on screen.</Banner>
        )}
      </View>

      {spot && (
        <View style={[styles.startRow, styles.over, { bottom: sheetH + 16 }]} pointerEvents="box-none">
          <View style={styles.spotStack}>
            {/* Walk here only at street zoom; what's good here from z10 (L1). */}
            {spot.zoom >= 12 && (
              <Button
                testID="walk-here"
                label="Walk here"
                disabled={looking}
                onPress={() => {
                  const at = spot.at;
                  setSpot(null);
                  start({ at, label: 'Your spot', kind: 'point' });
                }}
              />
            )}
            <Button
              testID="look-here"
              variant="secondary"
              label="What's good here?"
              disabled={looking}
              onPress={() => {
                const at = spot.at;
                setSpot(null);
                lookHere(at);
              }}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSpot(null)} style={styles.spotClose} hitSlop={8}>
              <Icon name="close" size={22} color={theme.ink} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Settings: what I'm into, the "?" range, the pocket alert (E16, E19-E21). */}
      {!placing && !settingsOpen && (
        <Pressable
          testID="settings-open"
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => {
            setSpot(null);
            setSelected(null);
            setMode({ kind: 'summary' });
            setSettingsOpen(true);
          }}
          style={({ pressed }) => [styles.prefsBtn, styles.over, { top: insets.top + 8 }, pressed && { opacity: 0.7 }]}
        >
          <Icon name="settings-outline" size={22} color={theme.ink} />
        </Pressable>
      )}
      <CaptureViewer key={recalled?.[0]?.id ?? 'none'} captures={recalled} onClose={() => setRecalled(null)} autoPlay remind />
      <View style={[StyleSheet.absoluteFill, styles.over]} pointerEvents="box-none">
        <ExploreSettings
          visible={settingsOpen}
          bottomInset={insets.bottom}
          onHeight={setPanelH}
          onClose={() => setSettingsOpen(false)}
          onPreview={stablePreview}
        />
      </View>

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
        {/* Only while the home is on screen: during a walk or a replay its map is taken down, so a
            phone's browser holds one live map, not two, and it comes back where it was (perf, Nov 1). */}
        {focused && (
        <WalkMap
          ref={mapRef}
          trace={NONE}
          walked={NONE}
          fog={NONE}
          captures={NONE}
          stars={stars}
          // The home shows no "?" marks (E10), except inside the range preview (E21).
          discoveries={previewPins}
          ring={preview}
          selectedStar={selected?.id ?? null}
          // Only zoomed in to streets: a press on a zoomed-out map lands kilometres from anywhere walkable.
          // Only from z10: a press on a zoomed-out map lands kilometres from anywhere walkable.
          onLongPress={(at) => {
            const zoom = view?.zoom ?? 0;
            if (open || placing != null || looking || settingsOpen || zoom < 10) return;
            setSpot({ at, zoom });
          }}
          landing={open ? null : landingShown}
          onStarPress={pressStar}
          onViewChange={setView}
          fitBounds={fit.bounds}
          fitKey={fit.key}
          fitPadding={{ top: insets.top + 60, right: 48, bottom: (settingsOpen ? panelH : sheetH) + (settingsOpen ? 24 : 96), left: 48 }}
          initialCenter={savedCamera?.center ?? WORLD.center}
          initialZoom={savedCamera?.zoom ?? WORLD.zoom}
          onCameraChange={(c) => (cameraNow.current = c)}
          covered={placing != null}
          attributionTop
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
  // Clear of the preferences button at the top left, and balanced on the right.
  top: { position: 'absolute', left: 64, right: 64, gap: 8, maxWidth: 640, alignSelf: 'center' },
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
  spotWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  // Up to three actions: stacked, full width, so none wraps alone at 390 px (audit).
  spotStack: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 10, gap: 8, width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  startCard: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 8, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  startTitle: { fontSize: 16, fontWeight: '700', color: theme.ink },
  startSub: { fontSize: 14, color: theme.muted },
  markText: { fontSize: 15, fontWeight: '600', color: theme.ink, paddingLeft: 10 },
  prefsBtn: {
    position: 'absolute', left: 12, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
  },
  scanning: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 6, paddingLeft: 14, paddingRight: 6,
  },
  scanningText: { fontSize: 15, fontWeight: '600', color: theme.ink },
  scanCancel: { minHeight: 36, paddingHorizontal: 12, justifyContent: 'center' },
  scanCancelText: { fontSize: 15, fontWeight: '600', color: theme.accent },
  startBtn: { minWidth: 180, borderRadius: 999, paddingHorizontal: 24 },
  startPair: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  exploreBtn: { borderRadius: 999, paddingHorizontal: 18 },
  exploreText: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accentInk },
  resumeText: { color: theme.accentInk, fontSize: 16, fontWeight: '600' },
});
