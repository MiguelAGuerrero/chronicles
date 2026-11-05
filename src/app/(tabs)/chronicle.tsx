import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemoriesScreen } from '../../components/chronicle/MemoriesScreen';
import { SectionBar } from '../../components/chronicle/SectionBar';
import { chronicleSection } from '../../lib/resurface/sectionStore';
import { useStore } from '../../lib/useStore';
import { CaptureViewer } from '../../components/CaptureView';
import { HomeSheet, SHEET_PEEK, type SheetMode } from '../../components/HomeSheet';
import { WalkMap } from '../../components/map/WalkMap';
import type { WalkMapHandle } from '../../components/map/types';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import type { Area, WalkArea } from '../../lib/areas/types';
import { db } from '../../lib/db';
import { applyPatch, captureBus } from '../../lib/captureBus';
import { captureEdits } from '../../lib/captureEdits';
import { perfCount } from '../../lib/perfCount';
import { buildDays } from '../../lib/days';
import { countLine, placeCount, type ChecklistArea, type Find } from '../../lib/explore/explore';
import { onRecallOpen, recallWaiting, takeRecallOpen } from '../../lib/discovery/recallCheck';
import { zoomOutFor } from '../../lib/zoomOut';
import { placeBacklog } from '../../lib/backlog';
import type { Bounds } from '../../lib/geo';
import { bordersFor, outlineIdsOf, townPlaces } from '../../lib/areas/borders';
import { BORDER_ZOOM } from '../../lib/areas/outlines';
import { useOutlineSet } from '../../lib/areas/useOutlineSet';
import { levelForZoom, placesIndex, starsFor, unplacedWalks, type Star } from '../../lib/places';
import type { Capture, LngLat, Walk, WalkSummary } from '../../lib/types';
import { deletions } from '../../lib/deletion';
import { useHidden, useOnDeleted } from '../../lib/deletion/useDeletions';
import { fitWithMoments, MOMENT_PIN_ZOOM, placedMoments } from '../../lib/momentPins';
import { useStartWalk } from '../../lib/useStartWalk';
import { showWalk } from '../../lib/walkNav';
import { useTabMap } from '../../lib/useTabMap';
import { UndoToast } from '../../components/UndoToast';
import { WalkActions } from '../../components/WalkActions';
import { useOpenWalkInfo } from '../../components/OpenWalk';

const NONE: never[] = [];
/** With nothing walked yet: the world, and one line. */
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** Walks a pass began this session; one that failed waits for the next launch (criterion 25). */
const tried = new Set<string>();
const boundsKey = (b: Bounds | null) => (b ? b.map((v) => v.toFixed(5)).join(',') : '');
/** The closest any of Chronicle's fits may zoom (tabs audit U15). */
const FIT_MAX_ZOOM = 15;
/** Every capture, loose or in a walk, for the days (M7): rows only, never media. */
const allCaptures = () => db.capturesBetween(0, Number.MAX_SAFE_INTEGER);

/**
 * Chronicle (NV11-NV13): review. Stars where you have walked, a sheet that
 * peeks with a summary and lists walks and days, and the replays. Start,
 * Explore, What's good here and quick capture live on the other tabs. It reads
 * only walks, summaries, Area, WalkArea and capture rows; placing old walks
 * (which reads their traces) lives in lib/backlog.
 */
function ChronicleMap({ section }: { section: 'walks' | 'days' | 'map' }) {
  perfCount('render:home');
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const mapRef = useRef<WalkMapHandle>(null);
  const [stored, setData] = useState<{ walks: Walk[]; summaries: WalkSummary[]; areas: Area[]; rows: WalkArea[] } | null>(null);
  // Deleted walks and moments leave at once, while Undo waits and after (D5, D8); a stored delete reads again (D9).
  const hidden = useHidden();
  const data = useMemo(() => {
    if (!stored || !stored.walks.some((w) => hidden.has(w.id))) return stored;
    return {
      walks: stored.walks.filter((w) => !hidden.has(w.id)),
      summaries: stored.summaries.filter((x) => !hidden.has(x.walk_id)),
      areas: stored.areas,
      rows: stored.rows.filter((r) => !hidden.has(r.walk_id)),
    };
  }, [stored, hidden]);
  // Read again while in front once a delete reached storage (D9): counts, stars, places.
  const reload = useRef<(() => void) | null>(null);
  useOnDeleted(() => reload.current?.());
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const walkStart = useStartWalk();
  const [loadError, setLoadError] = useState<{ message: string; openSettings?: boolean } | null>(null);
  const error = walkStart.error ?? loadError;
  // Walks and Days open the sheet on that list (RM2); Map is the sheet at rest.
  const [mode, setMode] = useState<SheetMode>(() => (section === 'map' ? { kind: 'summary' } : { kind: section }));
  const [sheetH, setSheetH] = useState(SHEET_PEEK);
  // The sheet's live height: the spot card rides on it as it moves.
  const [sheetAnim] = useState(() => new Animated.Value(SHEET_PEEK));
  const [aboveSheet] = useState(() => ({ bottom: Animated.add(sheetAnim, 16) }));
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  // A fit may bring its own frame (the walks list's zoom-out, framed above the sheet it opens to).
  const [fit, setFit] = useState<{ bounds: Bounds | null; key: number; padding?: { top: number; right: number; bottom: number; left: number }; maxZoom?: number }>({ bounds: null, key: 0 });
  const { focused, cameraNow, savedCamera, onCameraChange, areaH, onFitSettled } = useTabMap({ key: fit.key, refit: () => setFit((f) => ({ ...f, key: f.key + 1 })) });
  const screenH = areaH;
  const [placing, setPlacing] = useState<{ done: number; of: number } | null>(null);
  const [selected, setSelected] = useState<Star | null>(null);
  // A long press at street zoom: Walk here, a one-tap start (NV12).
  const [spot, setSpot] = useState<LngLat | null>(null);
  // The map refits only when the places walked change (a new walk, a pass),
  // never just for coming back: a replay keeps the view you left (H5).
  const fittedTo = useRef('');
  // The place view's found places (E10).
  const [checklists, setChecklists] = useState<ChecklistArea[]>([]);
  const [finds, setFinds] = useState<Find[]>([]);
  const [recalled, setRecalled] = useState<Capture[] | null>(null);
  // Moments (M7-M9, M16): every capture's row, and the viewer for a timeline row or a pin.
  const [storedCaptures, setCaptures] = useState<Capture[]>([]);
  const captures = useMemo(
    () => storedCaptures.filter((c) => !hidden.has(c.id) && !(c.walk_id && hidden.has(c.walk_id))),
    [storedCaptures, hidden],
  );
  const [viewing, setViewing] = useState<Capture[] | null>(null);
  // A reminder tapped with no walk open opens here at once (audit 1, NV13); with a walk open, the walk
  // screen opens it, and Chronicle declines. Whether a walk is open is decided when the tap comes, from
  // the open walk's keeper, never from what this tab read when it last came to the front: a walk started
  // or minimized since then once had the tap open here instead (tabs audit 2). Until the keeper knows,
  // it declines too: on a cold open the tap came before that (2 viewers).
  const openInfo = useOpenWalkInfo();
  const openRef = useRef(openInfo);
  useEffect(() => {
    openRef.current = openInfo;
  });
  useEffect(() => onRecallOpen((found) => {
    if (!openRef.current.known || openRef.current.walk) return false;
    setRecalled(found);
    // Taken while another tab is in front: Chronicle comes forward to show it (NV13).
    router.navigate('/chronicle');
    return true;
  }), []);
  const skip = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      skip.current = false;
      const load = async () => {
        const [walks, summaries, areas, rows] = await Promise.all([db.listWalks(), db.listSummaries(), db.listAreas(), db.listWalkAreas()]);
        const openWalk = walks.find((w) => w.open) ?? null;
        if (!live) return null;
        // A reminder notification tapped with no walk open lands here (R4, NV13).
        // With a walk open, a tapped reminder waiting from a cold start opens on the walk (audit 2).
        if (openWalk && (await recallWaiting().catch(() => false))) {
          showWalk();
          return null;
        }
        const recalled = openWalk ? [] : await takeRecallOpen().catch(() => [] as Capture[]);
        if (!live) return null;
        setChecklists(await db.listChecklistAreas().catch(() => [] as ChecklistArea[]));
        setFinds(await db.listFinds().catch(() => [] as Find[]));
        const caps = await allCaptures().catch(() => [] as Capture[]);
        setCaptures(caps);
        if (recalled.length) setRecalled(recalled);
        setData({ walks, summaries, areas, rows });
        setNow(Date.now());
        // The places walked and the placed moments (M16, moment pins 3): a moment far from any walk, or
        // one made before any walk, is framed too, so its pin is in view. A moment being deleted isn't.
        const gone = deletions.hidden();
        const bounds = fitWithMoments(placesIndex(areas, rows, walks).bounds, caps.filter((c) => !gone.has(c.id)));
        if (boundsKey(bounds) !== fittedTo.current) {
          fittedTo.current = boundsKey(bounds);
          setFit((f) => ({ bounds, key: f.key + 1 }));
        }
        return { walks, rows };
      };
      reload.current = () => {
        load().catch(() => {});
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
        .catch((e) => live && setLoadError({ message: e instanceof Error ? e.message : String(e) }))
        .finally(() => live && setPlacing(null));
      return () => {
        live = false;
        reload.current = null;
        setPlacing(null);
      };
    }, []),
  );

  const days = useMemo(() => buildDays(data?.walks ?? [], captures), [data, captures]);
  // Recomputed when crossing the pin zoom, not on every camera step (audit).
  const pinZoom = (view?.zoom ?? 0) >= MOMENT_PIN_ZOOM;
  const momentPins = useMemo(
    () => (pinZoom ? placedMoments(captures) : NONE),
    [captures, pinZoom],
  );
  const index = useMemo(() => placesIndex(data?.areas ?? [], data?.rows ?? [], data?.walks ?? []), [data]);
  // TB3: the towns your walks were in, as regions in one tint behind the stars (from z8, BORDER.minZoom).
  const walkedTowns = useMemo(() => townPlaces([...index.byArea.keys()].map((k) => index.areas.get(k)!).filter(Boolean)), [index]);
  const drawn = useOutlineSet(walkedTowns.map((t) => t.at), BORDER_ZOOM, focused);
  const borders = useMemo(() => bordersFor(drawn, { tinted: outlineIdsOf(walkedTowns, drawn), lined: false }), [drawn, walkedTowns]);
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
    setSpot(null);
    setSelected(s);
    setMode({ kind: 'place', key: s.keys[0] });
    // Above the sheet, which opens to half the screen.
    mapRef.current?.showPoint(s.at, { top: insets.top + 48, right: 24, bottom: Math.round(screenH * 0.5) + 24, left: 24 });
  };

  // The place view's count and found places (E10): never on the overview.
  const placeExtra = useMemo(() => {
    if (mode.kind !== 'place') return null;
    const a = index.areas.get(mode.key);
    const got = a ? placeCount(a, checklists, finds) : null;
    return got ? { count: countLine(got.count), found: got.found.map((f) => f.name) } : null;
  }, [mode, index, checklists, finds]);

  const busy = placing != null || walkStart.starting;

  return (
    <View style={styles.screen}>
      <View style={[StyleSheet.absoluteFill, styles.over]} pointerEvents="box-none">
        <HomeSheet
          index={index}
          summaries={summaries}
          unplaced={unplaced}
          mode={mode}
          onMode={(m) => {
            if (m.kind !== 'place') setSelected(null);
            setSpot(null);
            // Opening the walks list zooms out to every place walked (M6), at once, framed above the
            // half-height sheet it opens to; only when they aren't all in view already, and never
            // closer than now (audit 7).
            if (m.kind === 'walks' && mode.kind === 'summary' && index.bounds) {
              const padding = { top: insets.top + 60, right: 48, bottom: Math.round(screenH * 0.5) + 96, left: 48 };
              const z = zoomOutFor({ camera: cameraNow.current, size: { width: screenW, height: screenH }, padding, places: index.bounds });
              if (z) setFit((f) => ({ bounds: z.bounds, key: f.key + 1, padding, maxZoom: z.maxZoom }));
            }
            setMode(m);
          }}
          onHeight={setSheetH}
          height={sheetAnim}
          bottomInset={0}
          areaHeight={areaH}
          busy={busy}
          // A one-tap start to the place (NV12): the saved choices, never the drawer.
          onGoToPlace={selected ? () => walkStart.start({ at: selected.at, label: selected.label, kind: 'place' }) : undefined}
          placeExtra={placeExtra}
          days={days}
          onOpenMoments={setViewing}
          onWalkActions={setActionsFor}
          now={now}
          onNavigate={() => showWalk()}
        />
      </View>

      <View style={[styles.top, styles.over, { top: insets.top + 8 }]} pointerEvents="box-none">
        {error && (
          <Banner
            tone="error"
            onDismiss={() => {
              walkStart.setError(null);
              setLoadError(null);
            }}
            action={error.openSettings ? { label: 'Open Settings', onPress: () => Linking.openSettings() } : undefined}
          >
            {error.message}
          </Banner>
        )}
      </View>

      {spot && (
        <Animated.View style={[styles.spotRow, styles.over, aboveSheet]} pointerEvents="box-none">
          <View style={styles.spotStack}>
            <Button
              testID="walk-here"
              label="Walk here"
              busy={walkStart.starting}
              busyLabel="Starting…"
              onPress={() => {
                const at = spot;
                setSpot(null);
                walkStart.start({ at, label: 'Your spot', kind: 'point' });
              }}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setSpot(null)} style={styles.spotClose} hitSlop={8}>
              <Icon name="close" size={22} color={theme.ink} />
            </Pressable>
          </View>
        </Animated.View>
      )}

      <CaptureViewer
        key={recalled?.[0]?.id ?? 'none'}
        captures={recalled}
        onClose={() => setRecalled(null)}
        autoPlay
        remind
        onSaveNote={async (c, body) => {
          // Stored first; Chronicle's pins and any open view of the walk then show it (QL25).
          await db.updateCapture(c.id, { body });
          setCaptures((prev) => applyPatch(prev, c.id, { body }));
          captureBus.patch(c.walk_id, c.id, { body }, null);
        }}
      />
      <CaptureViewer
        key={`moment:${viewing?.[0]?.id ?? 'none'}`}
        captures={viewing && viewing.map((v) => captures.find((c) => c.id === v.id) ?? v)}
        onClose={() => setViewing(null)}
        remind
        onSaveEdit={async (c, patch) => {
          // Stored and told on the bus first (ME21); Chronicle's pins then show it.
          await captureEdits.save(c, patch);
          setCaptures((prev) => applyPatch(prev, c.id, patch));
        }}
        onSaveNote={async (c, body) => {
          // Stored first; Chronicle's pins and any open view of the walk then show it (QL25).
          await db.updateCapture(c.id, { body });
          setCaptures((prev) => applyPatch(prev, c.id, { body }));
          captureBus.patch(c.walk_id, c.id, { body }, null);
        }}
      />
      <WalkActions
        walkId={actionsFor}
        onClose={() => setActionsFor(null)}
        // The row, a place's walks and a day's timeline show the new name at once (QL23).
        onRenamed={(walkId, patch) =>
          setData((d) => d && { ...d, walks: d.walks.map((w) => (w.id === walkId ? { ...w, ...patch } : w)) })
        }
      />
      <UndoToast style={{ top: insets.top + 64 }} />

      {placing && (
        <View style={[styles.center, styles.over]} pointerEvents="box-none" accessibilityLiveRegion="polite">
          <Text style={styles.centerText}>
            {`Placing your walks (${Math.min(placing.done + 1, placing.of)} of ${placing.of})`}
          </Text>
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
        </View>
      )}

      <View style={[StyleSheet.absoluteFill, styles.under]}>
        {/* Only while Chronicle is in front: another tab, a walk or a replay takes its map down, so
            one map is live at a time, and it comes back where it was (NV4). */}
        {focused && (
          <WalkMap
            ref={mapRef}
            trace={NONE}
            walked={NONE}
            fog={NONE}
            captures={momentPins}
            onPinPress={setViewing}
            stars={stars}
            borders={borders}
            selectedStar={selected?.id ?? null}
            marks={spot ? [spot] : undefined}
            // Walk here only at street zoom (NV12): a press on a zoomed-out map lands far from anywhere walkable.
            onLongPress={(at) => {
              const zoom = view?.zoom ?? 0;
              if (placing != null || zoom < 12) return;
              setSelected(null);
              setMode({ kind: 'summary' });
              setSpot(at);
            }}
            onPress={() => spot && setSpot(null)}
            onStarPress={pressStar}
            onViewChange={setView}
            fitBounds={fit.bounds}
            fitKey={fit.key}
            onFitSettled={onFitSettled}
            fitPadding={fit.padding ?? { top: insets.top + 60, right: 48, bottom: sheetH + 96, left: 48 }}
            // A fit to one short walk stops around z15, not at street-sign zoom (tabs audit U15).
            fitMaxZoom={Math.min(fit.maxZoom ?? FIT_MAX_ZOOM, FIT_MAX_ZOOM)}
            initialCenter={savedCamera?.center ?? WORLD.center}
            initialZoom={savedCamera?.zoom ?? WORLD.zoom}
            onCameraChange={onCameraChange}
            covered={placing != null}
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
  body: { flex: 1 },
  under: { zIndex: 0 },
  over: { zIndex: 1 },
  top: { position: 'absolute', left: 16, right: 16, gap: 8, maxWidth: 640, alignSelf: 'center' },
  center: { position: 'absolute', left: 24, right: 24, top: '38%', alignItems: 'center', gap: 10 },
  centerText: {
    backgroundColor: 'rgba(255,255,255,0.94)', color: theme.ink, fontSize: 16, fontWeight: '600',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, overflow: 'hidden', textAlign: 'center',
  },
  skip: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 22, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge },
  skipText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  spotRow: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  spotClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  spotStack: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 10, gap: 8, width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
});

/**
 * Chronicle (RM1-RM4): Memories first (what you kept, brought back), then the
 * walks list, the days list and the map, each as it was (RM2). The map and its
 * sheet are mounted only for their sections, so Memories carries no map.
 */
export default function Chronicle() {
  const insets = useSafeAreaInsets();
  const section = useStore(chronicleSection.store, (s) => s);
  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top, backgroundColor: theme.bg }}>
        <SectionBar section={section} onChange={chronicleSection.set} />
      </View>
      <View style={styles.body}>
        {section === 'memories' ? (
          <MemoriesScreen />
        ) : (
          // The bar above has taken the safe area's top: the map's own offsets start below it.
          <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
            <ChronicleMap key={section} section={section} />
          </SafeAreaInsetsContext.Provider>
        )}
      </View>
    </View>
  );
}
