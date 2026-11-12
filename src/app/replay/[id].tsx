import type { Faced } from '../../lib/moment';
import { notePatch } from '../../lib/noteEdit';
import { useUnits } from '../../lib/useUnits';
import { foundLine, foundList, passedLine } from '../../lib/explore/explore';
import { router, useLocalSearchParams } from 'expo-router';
import { useWalkBorders } from '../../lib/areas/useOutlineSet';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalkMap } from '../../components/map/WalkMap';
import { Icon } from '../../components/icons';
import { CaptureViewer } from '../../components/CaptureView';
import { Stage } from '../../components/ceremony/Stage';
import { StepThrough } from '../../components/ceremony/StepThrough';
import { useAwakeWhile } from '../../components/ceremony/useAwakeWhile';
import { useCeremonyClock } from '../../components/ceremony/useCeremonyClock';
import { useRevealed } from '../../components/ceremony/useRevealed';
import { STAGE_TOP, type StageCtx } from '../../components/ceremony/layout';
import { ceremonyFor } from '../../lib/ceremony/registry';
import { chronicleSection } from '../../lib/resurface/sectionStore';
import { pathDrawnAt, storySteps, walkStory } from '../../lib/ceremony/story';
import { planViews, type WalkMapHandle } from '../../components/map/types';
import { Button, theme } from '../../components/ui';
import { db } from '../../lib/db';
import { applyPatch, captureBus } from '../../lib/captureBus';
import { captureEdits } from '../../lib/captureEdits';
import { snapWalk } from '../../lib/finish';
import { decide } from '../../lib/gaps';
import { emptyGapAt, emptyGaps, gapKey, stretchAt, type Gap } from '../../lib/gaps/infer';
import type { DrawnLine } from '../../lib/gaps/draw';
import { useGapDraw } from '../../lib/gaps/useGapDraw';
import { GapDraw } from '../../components/GapDraw';
import { tileCollector } from '../../lib/tileCollector';
import { GapCard } from '../../components/GapCard';
import { ensureTileBuild } from '../../lib/tiles';
import { setAudioMode } from '../../lib/audioMode';
import { backFrom, FOG_MS } from '../../lib/replay';
import { formatCaptures, formatDistance, formatDuration, loadReplay, suggestTitle, type ReplayData } from '../../lib/summary';
import { renamePatch } from '../../lib/rename';
import type { LngLat } from '../../lib/types';
import { summaryLess } from '../../lib/deletion/core';
import { useHidden } from '../../lib/deletion/useDeletions';
import { UndoToast } from '../../components/UndoToast';
import { WalkActions } from '../../components/WalkActions';
import { pausedMs } from '../../lib/geo';
import { newStreetsLine } from '../../lib/quietLines';
import { capturesHere, type HereResult } from '../../lib/here';
import { launchRoute } from '../../lib/launchRoute';

type Beat = 'reading' | 'fog' | 'path' | 'card' | 'name';
const FRAME_MS = 33; // ~30 fps for the fog's streets lighting up
/** The drawn trace is rebuilt at most this often; the walker dot moves every frame. */
const TRACE_STEP_MS = 66;

// A screen that throws shows what broke, with Try again, never a blank page (bug, Nov 1).
export { ScreenError as ErrorBoundary } from '../../components/ScreenError';

export default function Replay() {
  useUnits();
  // `ceremony=0` is a re-watch (from the log, or Watch again); `style` names the ceremony that tells it (RR21, audit 25).
  const { id, ceremony, style } = useLocalSearchParams<{ id: string; ceremony?: string; style?: string }>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<WalkMapHandle>(null);
  // The name's Next goes on to the line, as in Rename (tend chronicle 5).
  const lineInput = useRef<ComponentRef<typeof TextInput>>(null);
  const [stored, setData] = useState<ReplayData | null>(null);
  // Town borders (TB5): the towns this walk was in tinted, read again once the walk is placed.
  const borders = useWalkBorders(id ? [id] : [], stored?.walk.snapped_build ?? '');
  // A deleted moment leaves the pins, the stops and the counts at once (D3, D9).
  const hidden = useHidden();
  const data = useMemo(() => {
    if (!stored || !stored.captures.some((c) => hidden.has(c.id))) return stored;
    const gone = stored.captures.filter((c) => hidden.has(c.id));
    return {
      ...stored,
      captures: stored.captures.filter((c) => !hidden.has(c.id)),
      summary: stored.summary && summaryLess(stored.summary, gone),
    };
  }, [stored, hidden]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [status, setStatus] = useState<'loading' | 'missing' | 'ready'>('loading');
  // A load that threw is shown by the screen's error boundary, with Try again, never as a missing walk (NV2).
  const [failure, setFailure] = useState<unknown>(null);
  // The beat and its start time change together, so no render ever sees one
  // beat with another beat's clock.
  const [phase, setPhase] = useState<{ beat: Beat; t0: number }>(() => ({ beat: 'reading', t0: Date.now() }));
  const [now, setNow] = useState(() => Date.now());
  const [fitKey, setFitKey] = useState(0);
  const [sheetH, setSheetH] = useState(0);
  const [title, setTitle] = useState('');
  // The suggestion Name it was filled with, if it was one: kept as it was, it stores no title (tend chronicle audit 1).
  const [offered, setOffered] = useState<string | null>(null);
  const [epilogue, setEpilogue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const { width, height } = useWindowDimensions();
  const [viewing, setViewing] = useState<Faced[] | null>(null);
  // What happened here: a tap on the card's map shows every capture near that spot, on any walk.
  const [here, setHere] = useState<HereResult | null>(null);
  const hereTaps = useRef(0);
  const [hereKey, setHereKey] = useState(0);
  const [gapOpen, setGapOpen] = useState<string | null>(null);
  const [gapBusy, setGapBusy] = useState(false);
  const [gapError, setGapError] = useState<string | null>(null);
  // Drawing a gap's way (GW3-GW7): kept like Keep, as the line drawn, then the walk is snapped again.
  const drawing = useGapDraw(
    useCallback(
      async (gap: Gap, line: DrawnLine) => {
        if (!data) return;
        await decide(data.walk.id, { t0: gap.t0, t1: gap.t1, path: line.path, lengthM: line.lengthM, street: null, how: 'kept' }, 'kept');
        await snapWalk(data.walk, tileCollector()).catch(() => db.updateWalk(data.walk.id, { snapped_build: null }).catch(() => {}));
        const d = await loadReplay(id).catch(() => null);
        if (d) setData(d);
      },
      [data, id],
    ),
  );
  const isDrawing = drawing.gap != null;
  /**
   * A tap on the card's map: while drawing, a point along the way (GW3); else a
   * stretch, or a gap's dotted join, opens its card (G9, GW2); anywhere else,
   * what happened here.
   */
  const pressCard = (at: LngLat, radiusM?: number) => {
    if (isDrawing) {
      drawing.tap(at);
      return;
    }
    // A line's reach is about 20 px, narrower than a pin's 44: taps beside the trace stay what happened here (audit 8).
    const reach = Math.max(10, (radiusM ?? 30) * 0.45);
    const hit = data && !here && !viewing ? stretchAt(data.stretches, at, reach) ?? emptyGapAt(emptyGaps(data.gaps, data.stretches), at, reach) : null;
    setGapOpen(hit ? gapKey(hit) : null);
    setGapError(null);
    if (!hit) showHere(at, radiusM);
  };
  /**
   * Keep or Not this way (G10, G12): stored with the walk, then the walk is
   * snapped again from the tiles in code (the map stays put) so the card,
   * streets and places follow, and read again.
   */
  const decideGap = async (state: 'kept' | 'dismissed') => {
    const s = gapOpen && data ? data.stretches.find((x) => gapKey(x) === gapOpen) : null;
    if (!s || !data) return;
    setGapBusy(true);
    setGapError(null);
    try {
      await decide(data.walk.id, s, state);
    } catch {
      // Nothing was stored: the card stays, to try again (audit 14).
      setGapError('Couldn’t save that. Try again.');
      setGapBusy(false);
      return;
    }
    // The card stays, busy, until the card's numbers have followed (audit 14).
    await snapWalk(data.walk, tileCollector()).catch(() => db.updateWalk(data.walk.id, { snapped_build: null }).catch(() => {}));
    const d = await loadReplay(id).catch(() => null);
    if (d) setData(d);
    setGapOpen(null);
    setGapBusy(false);
  };
  const showHere = (at: LngLat, radiusM?: number) => {
    if (here || viewing) return;
    const tap = ++hereTaps.current;
    capturesHere(at, [], radiusM)
      .then((r) => {
        if (tap !== hereTaps.current || !r.captures.length) return;
        setHereKey(tap);
        setHere(r);
      })
      .catch(() => {});
  };
  // Opened from the log, or watched again. Only the screen reader's steps move on by themselves (RR17).
  const rewatch = ceremony === '0';
  const [watched, setWatched] = useState(false);
  // A screen reader hears the captures, not the animation: no fog, no path.
  const [srMode, setSrMode] = useState(false);
  const beat = phase.beat;
  const clock = now - phase.t0;

  const go = useCallback((b: Beat, skipPathMs = 0) => {
    const t = Date.now();
    setPhase({ beat: b, t0: t - skipPathMs });
    setNow(t);
    if (b === 'fog' || b === 'card') setFitKey((k) => k + 1);
  }, []);

  // The first replay after a walk always ends on Chronicle (NV27), however it is left: Keep it, Not now
  // (tabs audit U14), Android's back, or the browser's (tabs audit 6), never the tab the walk began on.
  // A browser's back restores the stack from before the replay, so the way out is taken when the
  // replay goes, unless one of its own buttons already took it.
  const leftForChronicle = useRef(false);
  const toChronicle = useCallback(() => {
    leftForChronicle.current = true;
    router.dismissTo('/');
  }, []);
  // The beat as Back reads it, outside render (tend replay 4).
  const beatNow = useRef<Beat>('reading');
  useEffect(() => {
    beatNow.current = phase.beat;
  }, [phase.beat]);
  useEffect(() => {
    if (rewatch) return;
    // However it is left, the first replay ends on Chronicle's Memories (RM3).
    chronicleSection.set('memories');
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      // Back on the name step returns to the card, the words typed kept (tend replay 4).
      if (backFrom(beatNow.current) === 'card') go('card');
      else toChronicle();
      return true;
    });
    return () => {
      back.remove();
      if (!leftForChronicle.current) setTimeout(() => router.navigate('/'), 0);
    };
  }, [rewatch, toChronicle, go]);

  // Memos and videos play with the ringer switch off, as the voice is the point.
  useEffect(() => {
    setAudioMode({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const a = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => a.remove();
  }, []);

  // Load, then snap behind the first beat if the walk has not been snapped
  // against the current tile build. The map is covered while its camera
  // steps through the area.
  useEffect(() => {
    let alive = true;
    (async () => {
      // The walk opens from the device first: the network is only asked
      // after, behind "Reading the streets" (bug, Nov 1: an iPhone sat on a
      // blank screen after Stop while the TileJSON fetch stalled).
      let d: ReplayData | null;
      try {
        d = await loadReplay(id);
      } catch (e) {
        if (alive) setFailure(e ?? new Error('This walk could not be opened.'));
        return;
      }
      if (!alive) return;
      if (!d) {
        // Opened on a walk that is no longer kept (a Home Screen app reopening on a stale link):
        // straight to Chronicle at / (NV2, HC5).
        if (launchRoute.isLaunch(`/replay/${id}`)) {
          leftForChronicle.current = true;
          router.dismissTo('/');
          return;
        }
        setStatus('missing');
        return;
      }
      setData(d);
      setTitle(d.walk.title ?? suggestTitle(d.walk));
      setOffered(d.walk.title ? null : suggestTitle(d.walk));
      setEpilogue(d.walk.epilogue ?? '');
      setStatus('ready');
      // A new tile build drops the street cache and marks walks for re-snapping.
      const build = await ensureTileBuild().catch(() => 'unknown');
      if (!alive) return;
      if (build !== 'unknown') {
        d = (await loadReplay(id, { readGaps: true }).catch(() => null)) ?? d;
        if (!alive) return;
        // Shown even when no snap follows: in a new session, gaps are only filled once read (audit 2).
        setData(d);
      }
      const stale = build !== 'unknown' && d.walk.snapped_build !== build;
      if (!d.summary || !d.walk.snapped_build || stale) {
        await snapWalk(d.walk, {
          plan: (bounds, trace) => {
            const { width, height } = mapRef.current?.size() ?? { width: 0, height: 0 };
            return planViews(bounds, width, height, trace);
          },
          collect: (centers) => mapRef.current!.collect(centers),
          collectPlaces: (center) => mapRef.current!.collectPlaces(center),
        }).catch(() => null);
        d = (await loadReplay(id).catch(() => null)) ?? d;
        if (!alive) return;
        setData(d);
        setTitle(d.walk.title ?? suggestTitle(d.walk));
        setOffered(d.walk.title ? null : suggestTitle(d.walk));
      }
      // With a screen reader the animation says nothing: it goes straight to
      // the captures, one after another, then the card. (react-native-web
      // always answers yes, so the web keeps the animation and announces.)
      const sr = Platform.OS !== 'web' && (await AccessibilityInfo.isScreenReaderEnabled().catch(() => false));
      if (sr) {
        setSrMode(true);
        go('path');
      } else go('fog');
    })();
    return () => {
      alive = false;
    };
  }, [id, go]);


  // What happened, read once; the ceremony tells it (RR20, RR21, decision 0086).
  const story = useMemo(() => (data ? walkStory(data) : null), [data]);
  const showing = useMemo(() => (story ? ceremonyFor(style).show(story, { reduceMotion }) : null), [story, reduceMotion, style]);
  const telling = beat === 'path' && !srMode && showing != null;
  // A memo or video catching up holds the clock (not the medium itself, audit 20).
  const [waits, setWaits] = useState<ReadonlySet<string>>(() => new Set());
  const wait = useCallback((k: string, on: boolean) => {
    setWaits((w) => {
      if (w.has(k) === on) return w;
      const next = new Set(w);
      if (on) next.add(k);
      else next.delete(k);
      return next;
    });
  }, []);
  const play = useCeremonyClock({ epoch: phase.t0, running: telling, paused: viewing != null || waits.size > 0, showing, onEnd: () => go('card') });
  const frame = telling ? showing.frame(play.ms) : null;
  // The screen stays awake while the replay plays, until the card (RR24).
  useAwakeWhile(beat === 'reading' || beat === 'fog' || beat === 'path');

  // The fog beat lights the streets, then the path begins.
  useEffect(() => {
    if (beat !== 'fog') return;
    const timer = setInterval(() => {
      const t = Date.now();
      if (t - phase.t0 >= FOG_MS) go('path');
      else setNow(t);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [beat, phase.t0, go]);

  // Words for screen readers at each beat.
  useEffect(() => {
    if (!data) return;
    const s = data.summary;
    if (beat === 'reading') AccessibilityInfo.announceForAccessibility('Reading the streets you walked');
    if (beat === 'fog') AccessibilityInfo.announceForAccessibility(headline(s, data).spoken);
    if (beat === 'card') AccessibilityInfo.announceForAccessibility('Summary');
  }, [beat, data]);

  // The trace as far as the ceremony has drawn each path; whole outside the path beat.
  const traceBucket = telling ? Math.floor(play.ms / TRACE_STEP_MS) : -1;
  // The trace is rebuilt on TRACE_STEP_MS buckets, not every frame: from the frame at the bucket's time.
  const traceFrame = useMemo(() => (telling && traceBucket >= 0 ? showing.frame(traceBucket * TRACE_STEP_MS) : null), [telling, showing, traceBucket]);
  const drawn = useMemo(
    () => {
      if (!data) return { trace: [], rides: [] };
      if (!traceFrame || !story) return { trace: data.runs, rides: data.rideRuns };
      const trace: LngLat[][] = [];
      const rides: LngLat[][] = [];
      for (const [pid, t] of Object.entries(traceFrame.drawn)) {
        const p = story.paths[pid];
        if (!p) continue;
        const d = pathDrawnAt(p, t);
        trace.push(...d.trace);
        rides.push(...d.rides);
      }
      return { trace, rides };
    },
    [data, story, traceFrame],
  );
  // The camera is the ceremony's to say (audit 10).
  const follow = frame?.camera.center ?? null;
  const followZoom = follow ? frame?.camera.zoom ?? null : null;
  const ctx: StageCtx = {
    width, height, insets, center: follow, zoom: followZoom ?? 0,
    held: play.held, paused: viewing != null, reduceMotion, open: setViewing, wait,
  };

  // Beat one: the walked streets light up out of the grey, in the order walked.
  const lit = !data ? 0 : beat !== 'fog' || reduceMotion ? data.walked.length : Math.ceil(data.walked.length * Math.min(1, clock / (FOG_MS * 0.8)));
  const shownWalked = useMemo(() => (data ? (beat === 'reading' ? [] : data.walked.slice(0, lit)) : []), [data, beat, lit]);
  const fog = useMemo(() => {
    if (!data) return [];
    if (beat !== 'fog' && beat !== 'reading') return data.fog;
    return [...data.fog, ...data.walked.slice(lit)];
  }, [data, beat, lit]);

  // Captures are pinned as the ceremony reaches them; on the card every pin opens its captures.
  const pinned = useRevealed(story, frame ? frame.pins : beat === 'card' || beat === 'name' || srMode ? 'all' : 'none');

  // Stretches across gaps (Filling gaps, G6, G9): offered ones faint on the card, a tapped one's card.
  const faint = useMemo(() => (data && (beat === 'card' || beat === 'name') ? data.stretches.filter((x) => x.how === 'offer').map((x) => x.path) : []), [data, beat]);
  const openGap = gapOpen && data ? data.stretches.find((x) => gapKey(x) === gapOpen) ?? null : null;
  const openGapOf = gapOpen && data ? data.gaps.find((x) => gapKey(x) === gapOpen) ?? null : null;
  // Gaps with no line across them, joined by grey dots on the card beats (GW2).
  const links = useMemo(
    () => (data && (beat === 'card' || beat === 'name') ? emptyGaps(data.gaps, data.stretches).map((g) => [g.from, g.to]) : []),
    [data, beat],
  );

  if (failure) throw failure;
  if (status !== 'ready' || !data || !story) {
    return (
      <View style={[styles.screen, styles.center, { paddingHorizontal: 24 }]}>
        {status === 'missing' ? (
          <>
            <Text style={styles.missing}>This walk could not be found.</Text>
            <Button label="Back to walks" onPress={() => router.dismissTo('/')} />
          </>
        ) : (
          <Text style={styles.muted}>Opening your walk…</Text>
        )}
      </View>
    );
  }

  const s = data.summary;
  // Ridden distance (R6): the summary's, else the trace's for a summary written before rides.
  const rideM = s?.ride_m ?? data.rideM;
  const head = headline(s, data);
  const finds = foundList(data.found.map((f) => f.name));
  const passed = passedLine(data.passed);
  const freshLine = s?.streets_read ? newStreetsLine(data.newStreets) : null;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      // The suggestion kept as it was stores no title, so it follows the walk's area (tend chronicle T1).
      await db.updateWalk(data.walk.id, renamePatch(data.walk, title, epilogue, offered));
      toChronicle();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };
  const close = () => (router.canGoBack() ? router.back() : router.dismissTo('/'));
  const sheetPad = { top: 48 + insets.top, right: 32, bottom: sheetH + 24, left: 32 };

  return (
    <View style={styles.screen}>
      <WalkMap
        ref={mapRef}
        borders={borders}
        trace={drawn.trace}
        rides={drawn.rides}
        traceOpacity={beat === 'fog' || beat === 'reading' ? 0.3 : 1}
        walked={shownWalked}
        fog={fog}
        captures={pinned}
        // While drawing, a tap on a pin is a point along the way like any other (gap-drawing audit 8).
        onPinPress={(beat === 'card' || beat === 'name') && !isDrawing ? setViewing : undefined}
        onPress={beat === 'card' || beat === 'name' ? pressCard : undefined}
        faint={faint}
        gapLinks={isDrawing ? undefined : links}
        drawing={drawing.line}
        walker={frame?.walker ?? null}
        follow={follow}
        followZoom={followZoom}
        fitBounds={data.bounds}
        fitKey={fitKey}
        fitPadding={beat === 'card' || beat === 'name' ? sheetPad : undefined}
        animate={!reduceMotion}
        initialCenter={data.fixes[0] ? [data.fixes[0].lon, data.fixes[0].lat] : undefined}
        covered={beat === 'reading'}
        veil
        // The walk has ended: its last point is marked (QL2), where the whole trace ends in every beat, never at
        // the tip of the path being told (tend replay 2).
        ended={data.runs}
        // Above the card once it is up; before that nothing sits at the bottom (Skip is at the top) (QL8).
        scaleInset={beat === 'card' || beat === 'name' ? { bottom: sheetH + 12, left: 12 } : { bottom: insets.bottom + 12, left: 12 }}
      />

      {beat === 'reading' && (
        <View style={[styles.center, StyleSheet.absoluteFill]} pointerEvents="none">
          {/* 16 px in from each edge on a 320 px phone (tend replay 1). */}
          <View testID="replay-reading" style={[styles.headline, { maxWidth: Math.min(340, width - 32) }]}>
            <Text style={styles.reading}>Reading the streets you walked…</Text>
          </View>
        </View>
      )}

      {beat === 'fog' && (
        // Below the top row, so Skip never covers its words, and 16 px in from each edge (tend replay 1).
        <View testID="replay-headline" style={[styles.headline, { top: insets.top + STAGE_TOP, maxWidth: Math.min(340, width - 32) }]} pointerEvents="none">
          <Text style={styles.headlineLabel}>{head.line}</Text>
          {head.note ? <Text style={styles.headlineNote}>{head.note}</Text> : null}
        </View>
      )}

      {frame && (
        <>
          {/* A tap anywhere holds the replay, and another goes on (RR7). */}
          <Pressable testID="replay-stage" style={StyleSheet.absoluteFill} onPress={play.toggleHold} accessible={false} />
          <Stage frame={frame} ctx={ctx} />
        </>
      )}
      {beat === 'path' && srMode && (
        <StepThrough
          key={phase.t0}
          steps={storySteps(story)}
          auto={rewatch || watched}
          onDone={() => go('card')}
          footer={(c) => {
            const f = data.found.find((x) => x.capture_id === c.id);
            return f ? foundLine(f) : null;
          }}
          hint="Shows the next capture, or carries on along the walk"
          testID="moment"
          topInset={insets.top}
        />
      )}

      <CaptureViewer
        key={viewing?.[0]?.id ?? 'none'}
        captures={viewing && viewing.map((v) => data.captures.find((c) => c.id === v.id) ?? v)}
        onClose={() => setViewing(null)}
        remind
        onSaveEdit={async (c, patch) => {
          // A failed write throws to the viewer, which says so; the screen only changes once it is stored (ME21).
          await captureEdits.save(c, patch);
          setData((d) => d && { ...d, captures: applyPatch(d.captures, c.id, patch) });
        }}
        onSaveNote={async (c, body) => {
          // Stored first; the replay's own list and any open view of the walk then show it (QL25).
          await db.updatePiece(c.piece_id, notePatch(body));
          setData((d) => d && { ...d, captures: applyPatch(d.captures, c.id, notePatch(body)) });
          captureBus.patch(c.walk_id, c.id, notePatch(body), null);
        }}
      />
      <CaptureViewer
        key={`here:${hereKey}`}
        title="What happened here"
        remind
        captures={here?.captures ?? null}
        context={here?.context}
        onClose={() => setHere(null)}
        onSaveNote={async (c, body) => {
          // Stored first; the replay's own list and any open view of the walk then show it (QL25).
          await db.updatePiece(c.piece_id, notePatch(body));
          setData((d) => d && { ...d, captures: applyPatch(d.captures, c.id, notePatch(body)) });
          captureBus.patch(c.walk_id, c.id, notePatch(body), null);
        }}
      />

      {openGapOf && !isDrawing && (beat === 'card' || beat === 'name') && !here && !viewing && (
        <GapCard
          stretch={openGap}
          gap={openGapOf}
          onDraw={() => {
            setGapOpen(null);
            drawing.start(openGapOf);
          }}
          busy={gapBusy}
          error={gapError}
          // Above the card's sheet, clear of the Undo pill at the top (audit, UI).
          style={{ bottom: sheetH + 12, zIndex: 5 }}
          onClose={() => setGapOpen(null)}
          onKeep={() => void decideGap('kept')}
          onDismiss={() => void decideGap('dismissed')}
        />
      )}

      {(beat === 'fog' || beat === 'path') && (
        <View style={[styles.skip, { top: insets.top + 12 }]}>
          <Button testID="skip" variant="secondary" label="Skip" onPress={() => go('card')} />
        </View>
      )}
      {frame && (
        <View style={[styles.hold, { top: insets.top + 12 }]}>
          <Button
            testID="hold"
            variant="secondary"
            label={play.held ? 'Play' : 'Hold'}
            accessibilityHint={play.held ? 'Goes on with the replay' : 'Holds the replay where it is'}
            onPress={play.toggleHold}
          />
        </View>
      )}

      {/* Low, where the card's sheet was, clear of the Undo pill at the top (audit, UI). */}
      {isDrawing && <GapDraw drawing={drawing} style={{ bottom: insets.bottom + 24, zIndex: 6 }} />}

      {/* The card steps aside while a gap's way is drawn, so the map is free to tap (GW3). */}
      {(beat === 'card' || beat === 'name') && !isDrawing && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (Math.abs(h - sheetH) > 8) {
              setSheetH(h);
              setFitKey((k) => k + 1);
            }
          }}
        >
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={[styles.sheetContent, { paddingBottom: 16 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {beat === 'card' ? (
              <>
                <View style={styles.titleRow}>
                  <Text style={[styles.cardTitle, styles.flex]} accessibilityRole="header">{data.walk.title ?? suggestTitle(data.walk)}</Text>
                  {!data.walk.open && (
                    <Pressable
                      testID="card-more"
                      accessibilityRole="button"
                      accessibilityLabel="More for this walk"
                      onPress={() => setActionsOpen(true)}
                      style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}
                      hitSlop={4}
                    >
                      <Icon name="ellipsis-horizontal" size={22} color={theme.ink} />
                    </Pressable>
                  )}
                </View>
                {/* New streets are a clause in the line, never a big orange number (tabs audit U13). */}
                <Text testID="card-line" style={styles.cardLine}>
                  <Text testID="card-distance">{formatDistance(s?.distance_m ?? 0)}</Text> · {formatDuration(s?.duration_ms ?? Math.max(0, (data.walk.ended_at ?? data.walk.started_at) - data.walk.started_at - pausedMs(data.pauses, data.walk.started_at, data.walk.ended_at ?? data.walk.started_at)))}
                  {s && s.streets_walked > 0 ? ` · ${s.streets_walked} ${s.streets_walked === 1 ? 'street' : 'streets'} walked` : ''}
                  {freshLine ? `, ${freshLine}` : ''}
                </Text>
                {/* A ride on its own line, so the card's line doesn't say "walked" twice (rides audit, UI). */}
                {rideM >= 1 ? <Text testID="card-ride" style={styles.cardMuted}>+ {formatDistance(rideM)} by ride</Text> : null}
                {s && formatCaptures(s) ? <Text style={styles.cardMuted}>{formatCaptures(s)} · tap a pin to open</Text> : null}
                {finds ? <Text testID="card-finds" style={styles.cardMuted}>{finds}</Text> : null}
                {/* The lows stay in (E11): what came within view and wasn't stopped for. */}
                {passed ? <Text testID="card-low" style={styles.cardMuted}>{passed}</Text> : null}
                {data.walk.epilogue ? <Text style={styles.epilogue}>“{data.walk.epilogue}”</Text> : null}
                <View style={styles.row}>
                  <Button
                    variant="secondary"
                    style={styles.flex}
                    label="Watch again"
                    onPress={() => {
                      setWatched(true);
                      go(srMode ? 'path' : 'fog');
                    }}
                  />
                  {rewatch ? (
                    <Button testID="done" style={styles.flex} label="Done" onPress={close} />
                  ) : (
                    <Button testID="to-name" style={styles.flex} label="Name it" onPress={() => go('name')} />
                  )}
                </View>
                {!rewatch && (
                  // A quiet way out (tabs audit U14): the walk stays unnamed, and Chronicle comes up.
                  <Pressable
                    testID="not-now"
                    accessibilityRole="button"
                    accessibilityHint="Keeps the walk without a name and goes to Chronicle"
                    onPress={toChronicle}
                    style={({ pressed }) => [styles.notNow, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.notNowText}>Not now</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <Text style={styles.label} nativeID="title-label">Name this walk</Text>
                <TextInput
                  testID="title-input"
                  value={title}
                  onChangeText={setTitle}
                  accessibilityLabel="Name this walk"
                  accessibilityLabelledBy="title-label"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => lineInput.current?.focus()}
                  maxLength={60}
                  style={styles.input}
                />
                <Text style={styles.label} nativeID="epilogue-label">One line, while the feeling is fresh</Text>
                <TextInput
                  ref={lineInput}
                  testID="epilogue-input"
                  value={epilogue}
                  onChangeText={setEpilogue}
                  accessibilityLabel="One line, while the feeling is fresh"
                  accessibilityLabelledBy="epilogue-label"
                  placeholder="e.g. The bakery was closed, the river was not."
                  placeholderTextColor={theme.muted}
                  returnKeyType="done"
                  onSubmitEditing={save}
                  maxLength={200}
                  style={styles.input}
                />
                {saveError ? <Text style={styles.error} accessibilityRole="alert">Could not save: {saveError}</Text> : null}
                <Button testID="save" label="Keep it" onPress={save} busy={saving} busyLabel="Saving…" />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      <WalkActions
        walkId={actionsOpen ? data.walk.id : null}
        onClose={() => setActionsOpen(false)}
        // A deleted walk has nothing left to replay; Undo shows on the home (D5).
        onDone={(kind) => kind === 'walk' && toChronicle()}
        // The card shows the new name at once, and the name beat's fields with it (QL23).
        onRenamed={(walkId, patch) => {
          setData((d) => (d && d.walk.id === walkId ? { ...d, walk: { ...d.walk, ...patch } } : d));
          setTitle(patch.title ?? suggestTitle(data.walk));
          setOffered(patch.title ? null : suggestTitle(data.walk));
          setEpilogue(patch.epilogue ?? '');
        }}
      />
      <UndoToast style={{ top: insets.top + 12 }} />
    </View>
  );
}

/**
 * The fog beat's headline, honest about walks whose streets could not be read.
 * Words, not a big number (tabs audit U13): the streets new to you, or familiar ground.
 */
function headline(s: ReplayData['summary'], d: ReplayData) {
  const distance = formatDistance(s?.distance_m ?? 0);
  if (!s || !s.streets_read) {
    return {
      line: `${distance} walked`,
      note: 'Streets fill in when the map can load. Open this walk again when you are online.',
      spoken: `${distance} walked. The streets could not be read yet.`,
    };
  }
  const fresh = newStreetsLine(d.newStreets);
  if (!fresh) return { line: 'Familiar ground', note: null, spoken: 'Familiar ground.' };
  const line = fresh.charAt(0).toUpperCase() + fresh.slice(1);
  return { line, note: null, spoken: line };
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  muted: { color: theme.muted, fontSize: 16 },
  missing: { color: theme.ink, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  reading: { color: theme.ink, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  headline: {
    position: 'absolute', alignSelf: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20, paddingVertical: 12, paddingHorizontal: 24,
  },
  headlineLabel: { fontSize: 17, color: theme.ink, fontWeight: '600', textAlign: 'center' },
  headlineNote: { fontSize: 14, color: theme.muted, textAlign: 'center', marginTop: 6 },
  skip: { position: 'absolute', right: 12 },
  hold: { position: 'absolute', left: 12 },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70%' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetContent: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  cardTitle: { fontSize: 22, fontWeight: '700', color: theme.ink },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  more: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  cardLine: { fontSize: 16, color: theme.ink, fontVariant: ['tabular-nums'] },
  cardMuted: { fontSize: 15, color: theme.muted },
  epilogue: { fontSize: 15, fontStyle: 'italic', color: theme.ink },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  notNow: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  notNowText: { fontSize: 15, fontWeight: '600', color: theme.muted },
  flex: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: theme.muted },
  input: { borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 12, fontSize: 16, color: theme.ink },
  error: { color: theme.danger, fontSize: 14 },
});

