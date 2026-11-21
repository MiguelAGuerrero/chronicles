import type { Faced } from '../../lib/moment';
import { notePatch } from '../../lib/noteEdit';
import { useUnits } from '../../lib/useUnits';
import { foundLine, passedLine, replayFound } from '../../lib/explore/explore';
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
import { NextMoment } from '../../components/ceremony/NextMoment';
import { useReplay } from '../../components/ceremony/useCeremonyLoop';
import { useRevealed } from '../../components/ceremony/useRevealed';
import { TOP_BUTTON, topRow, WHOLE_TOP, type StageCtx } from '../../components/ceremony/layout';
import { ceremonyFor } from '../../lib/ceremony/registry';
import { linksWithHops } from '../../lib/ceremony/reveal';
import { chronicleSection } from '../../lib/resurface/sectionStore';
import { storySteps, walkStory } from '../../lib/ceremony/story';
import { FIT_MAX_ZOOM, FIT_PADDING, planViews, QUIET_TRACE_OPACITY, type WalkMapHandle } from '../../components/map/types';
import { Button, theme } from '../../components/ui';
import { db } from '../../lib/db';
import { applyPatch, captureBus } from '../../lib/captureBus';
import { captureEdits } from '../../lib/captureEdits';
import { snapWalk } from '../../lib/finish';
import { decide, gapsAsked, keepAllOffers, noteAsked } from '../../lib/gaps';
import { emptyGapAt, emptyGaps, gapKey, keepAllWords, offersOf, stretchAt, type Gap } from '../../lib/gaps/infer';
import type { DrawnLine } from '../../lib/gaps/draw';
import { useGapDraw } from '../../lib/gaps/useGapDraw';
import { GapDraw } from '../../components/GapDraw';
import { tileCollector } from '../../lib/tileCollector';
import { GapCard } from '../../components/GapCard';
import { KeepGapsCard } from '../../components/KeepGapsCard';
import { ensureTileBuild } from '../../lib/tiles';
import { setAudioMode } from '../../lib/audioMode';
import { backFrom, beatWords, cardTitle, fieldsAfterRename, FOG_LIT_MS, FOG_MS, keepAskPlace, pinHint, replayArrivals, wordsTyped } from '../../lib/replay';
import { formatCaptures, formatDistance, formatDuration, loadReplay, suggestTitle, type ReplayData } from '../../lib/summary';
import { renamePatch } from '../../lib/rename';
import type { LngLat } from '../../lib/types';
import { perfCount } from '../../lib/perfCount';
import { summaryLess } from '../../lib/deletion/core';
import { useHidden } from '../../lib/deletion/useDeletions';
import { UndoToast } from '../../components/UndoToast';
import { WalkActions } from '../../components/WalkActions';
import { pausedMs } from '../../lib/geo';
import { moreFor, newStreetsLine, walkCardStreets } from '../../lib/quietLines';
import { capturesHere, type HereResult } from '../../lib/here';
import { launchRoute } from '../../lib/launchRoute';

type Beat = 'reading' | 'fog' | 'path' | 'card' | 'name';
/** While the path is told the map is given no trace: the replay's frames reveal the line on it (replay ceremony RC3). */

// A screen that throws shows what broke, with Try again, never a blank page (bug, Nov 1).
export { ReplayScreenError as ErrorBoundary } from '../../components/ScreenError';

export default function Replay() {
  useUnits();
  // Counted for the e2e and the harness (only when measuring): the path renders it for what arrives or leaves, never
  // because time passed (replay ceremony RC2).
  perfCount('render:replay');
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
  const [fitKey, setFitKey] = useState(0);
  const [sheetH, setSheetH] = useState(0);
  const [title, setTitle] = useState('');
  // The suggestion Name it was filled with, if it was one: kept as it was, it stores no title (tend chronicle audit 1).
  const [offered, setOffered] = useState<string | null>(null);
  const [epilogue, setEpilogue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Leaving the first replay with words typed in Name it asks first, in Rename's words (tend replay 15).
  const [asking, setAsking] = useState(false);
  const keepEditing = () => setAsking(false);
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
  // Settled at walk's end (G15): the first replay asks once whether to keep every offered way. Asked once
  // per walk, stored when it is shown (audit 1); shown only once the gaps are read (audit 3).
  const [keepAsked, setKeepAsked] = useState(false);
  const [askedBefore, setAskedBefore] = useState<boolean | null>(null);
  const [gapsRead, setGapsRead] = useState(false);
  const [keepError, setKeepError] = useState<string | null>(null);
  const keepThem = async () => {
    if (!data) return;
    setGapBusy(true);
    setKeepError(null);
    // Whatever was stored is followed by the walk and the screen, even when a write failed (audit 2).
    const failed = await keepAllOffers(data.walk.id, offersOf(data.stretches)).catch(() => 1);
    await snapWalk(data.walk, tileCollector()).catch(() => db.updateWalk(data.walk.id, { snapped_build: null }).catch(() => {}));
    const d = await loadReplay(id).catch(() => null);
    if (d) setData(d);
    if (failed) setKeepError('Couldn’t save all of them. Try again.');
    else setKeepAsked(true);
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
  const rewatchRef = useRef(rewatch);
  const [watched, setWatched] = useState(false);
  // A screen reader hears the captures, not the animation: no fog, no path.
  const [srMode, setSrMode] = useState(false);
  const beat = phase.beat;

  // A capture of this walk kept after the replay opened (a memo still being saved through the bar's Stop), or a change
  // to one, is taken in (tend replay T41): the walk is read again on the card, where it is pinned, and the next Watch
  // again plays it; while the walk is told it waits for the card (`replayArrivals`, told each beat in `go`).
  const arrive = useMemo(() => replayArrivals(() => loadReplay(id), setData), [id]);
  const [self] = useState(() => ({}));
  useEffect(() => {
    if (!id) return;
    return captureBus.subscribe(id, self, arrive.heard, arrive.heard);
  }, [id, self, arrive]);

  const go = useCallback((b: Beat) => {
    setPhase({ beat: b, t0: Date.now() });
    if (b === 'fog' || b === 'card') setFitKey((k) => k + 1);
    arrive.moved(b);
  }, [arrive]);

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
  // The words typed in Name it, as Keep it would store them, and whether the ask is up, as Back reads them (tend replay 15).
  const wordsNow = useRef<{ typed: boolean; asking: boolean }>({ typed: false, asking: false });
  useEffect(() => {
    wordsNow.current = { typed: !rewatch && !!data && wordsTyped(data.walk, title, epilogue, offered), asking };
  }, [rewatch, data, title, epilogue, offered, asking]);
  // One way back, read once (tend replay 4, 5, T21): Android's Back, Escape and the name sheet's Back. True when it was
  // taken here; false when the beat is left as Not now or Done leaves it. Words typed ask first, with the fields and
  // their words above the ask (tend replay 15).
  const stepBack = useCallback((): boolean => {
    const way = backFrom(beatNow.current, wordsNow.current);
    if (way === 'leave') return false;
    if (way === 'keep-editing') setAsking(false);
    else if (way === 'ask') {
      setAsking(true);
      go('name');
    } else go('card');
    return true;
  }, [go]);
  // Not now leaves as Back and Escape leave the card: with words typed it asks first, else at once (tend replay audit
  // 15; the owner's answer, Nov 17, "Ask there too").
  const leaveCard = () => {
    if (backFrom('card', wordsNow.current) !== 'ask') toChronicle();
    else {
      setAsking(true);
      go('name');
    }
  };
  useEffect(() => {
    if (rewatch) return;
    // However it is left, the first replay ends on Chronicle's Memories (RM3).
    chronicleSection.set('memories');
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      // Back on the name step returns to the card, the words typed kept (tend replay 4).
      if (!stepBack()) toChronicle();
      return true;
    });
    return () => {
      back.remove();
      if (!leftForChronicle.current) setTimeout(() => router.navigate('/'), 0);
    };
  }, [rewatch, toChronicle, stepBack]);
  // Escape on the web is Back's sibling (tend replay 5): the name step returns to the card; anywhere else the replay
  // is left as Not now or Done leaves it. Nothing while a viewer, the walk's menu or a gap's card holds the key.
  const held = viewing != null || here != null || actionsOpen || gapOpen != null || isDrawing;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || held) return;
    const onKey = (e: KeyboardEvent) => {
      // A held key's repeats are not more presses: the name step's Escape stops at the card (tend replay audit 4).
      if (e.key !== 'Escape' || e.repeat) return;
      if (stepBack()) return;
      if (!rewatch) toChronicle();
      else if (router.canGoBack()) router.back();
      else router.dismissTo('/');
    };
    // In the capture phase: react-native-web's TextInput stops a key's propagation (the name step's fields).
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [held, rewatch, toChronicle, stepBack]);

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
      if (!rewatchRef.current) gapsAsked(id).then((was) => alive && setAskedBefore(was), () => alive && setAskedBefore(false));
      // A new tile build drops the street cache and marks walks for re-snapping.
      const build = await ensureTileBuild().catch(() => 'unknown');
      if (!alive) return;
      if (build !== 'unknown') {
        d = (await loadReplay(id, { readGaps: true }).catch(() => null)) ?? d;
        if (!alive) return;
        // Shown even when no snap follows: in a new session, gaps are only filled once read (audit 2).
        setData(d);
      }
      setGapsRead(true);
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
  // The screen's size is the ceremony's to know (replay ceremony RC11-RC16): its camera is worked out for this screen,
  // once per telling. By its numbers, so the safe-area object's identity never rebuilds a telling.
  const { top: insetTop, bottom: insetBottom, left: insetLeft, right: insetRight } = insets;
  const screen = useMemo(
    () => ({ width, height, insets: { top: insetTop, bottom: insetBottom, left: insetLeft, right: insetRight } }),
    [width, height, insetTop, insetBottom, insetLeft, insetRight],
  );
  // The whole walk and its room (RC23, RC24): the path opens from the first beat's own view (the map's fit, with the
  // map's own room) and closes on the view the card's fit asks for, above the card's sheet. The sheet's height is
  // learnt ahead (the card is laid out unseen below), so the card then arrives on a map that does not move.
  // (Under the top row and a picture's height, so no control sits on the walk or on what stands on it: `WHOLE_TOP`.)
  const sheetPad = useMemo(() => ({ top: insetTop + WHOLE_TOP, right: 32, bottom: sheetH + 24, left: 32 }), [insetTop, sheetH]);
  const bounds = data?.bounds ?? null;
  const whole = useMemo(() => (bounds ? { bounds, open: FIT_PADDING, close: sheetPad, maxZoom: FIT_MAX_ZOOM } : null), [bounds, sheetPad]);
  const showing = useMemo(() => (story ? ceremonyFor(style).show(story, { reduceMotion, screen, whole, namePassed: true }) : null), [story, reduceMotion, style, screen, whole]);
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
  // The path is told by a loop outside this screen's rendering (replay ceremony RC2, decision 0206): each frame goes
  // straight to the map and the stage. The screen reads only what it shows itself: the pins, Pause, whether Next is there.
  const play = useReplay({ epoch: phase.t0, telling, paused: viewing != null || waits.size > 0, story, showing, map: mapRef, onEnd: () => go('card') });
  // The screen stays awake while the replay plays, until the card (RR24).
  useAwakeWhile(beat === 'reading' || beat === 'fog' || beat === 'path');

  // The first beat: the map lights the walked streets itself (`lightUp`, replay ceremony RC23); when its time is up
  // the path begins. Nothing here renders as that time passes.
  useEffect(() => {
    if (beat !== 'fog') return;
    const timer = setTimeout(() => go('path'), Math.max(0, phase.t0 + FOG_MS - Date.now()));
    return () => clearTimeout(timer);
  }, [beat, phase.t0, go]);

  // Words for screen readers at each beat, once as it begins, not again when the walk is read anew (tend replay 9).
  const saidAt = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    const words = beatWords(beat, phase.t0, saidAt.current, headline(data.summary, data).spoken);
    if (!words) return;
    saidAt.current = phase.t0;
    AccessibilityInfo.announceForAccessibility(words);
  }, [beat, phase.t0, data]);

  // The whole trace outside the path beat; while the path is told the map reveals the line itself, frame by frame, as
  // far as the ceremony has drawn each path. The camera is the ceremony's to say too (audit 10), in each frame.
  const ctx: StageCtx = {
    width, height, insets, live: play.live,
    held: play.held, paused: viewing != null, reduceMotion, open: setViewing, wait,
  };

  // Beat one: the walked streets light up out of the grey, in the order walked. The map is given them whole and lights
  // them as the beat's time passes (replay ceremony RC23); while the streets are read they are all fog.
  const lightKey = phase.t0;
  const lightUp = useMemo(() => (beat === 'reading' ? ('dark' as const) : beat === 'fog' && !reduceMotion ? { key: lightKey, over: FOG_LIT_MS } : undefined), [beat, reduceMotion, lightKey]);

  // Captures are pinned as the ceremony reaches them; on the card every pin opens its captures.
  const pinned = useRevealed(story, telling ? play.pins : beat === 'card' || beat === 'name' || srMode ? 'all' : 'none');

  // Stretches across gaps (Filling gaps, G6, G9): offered ones faint on the card, a tapped one's card.
  const faint = useMemo(() => (data && (beat === 'card' || beat === 'name') ? data.stretches.filter((x) => x.how === 'offer').map((x) => x.path) : []), [data, beat]);
  const openGap = gapOpen && data ? data.stretches.find((x) => gapKey(x) === gapOpen) ?? null : null;
  const openGapOf = gapOpen && data ? data.gaps.find((x) => gapKey(x) === gapOpen) ?? null : null;
  // The walk's-end question (G15): first replay only, once the gaps are read, nothing else open.
  // `askWords`: it will be asked on this replay's card, known before the card comes; `keepWords`: it is asked now.
  const askWords = !rewatch && !keepAsked && askedBefore === false && gapsRead && data ? keepAllWords(offersOf(data.stretches).length) : null;
  const keepWords = askWords && beat === 'card' && !gapOpen && !isDrawing && !here && !viewing ? askWords : null;
  const keepShown = keepWords != null;
  useEffect(() => {
    if (keepShown) void noteAsked(id);
  }, [keepShown, id]);
  // Where it is asked (replay-ceremony ui 11, the UI review's U2): over the map above the sheet, or, where that would
  // leave the walk no room in view (a short phone), inside the sheet as its first block. Decided from the room, once
  // the question's own height is known (it is laid out unseen for that, before the card comes): the sheet laid out
  // ahead then holds the question too, so the close frames the walk above it and the card's arrival moves nothing (RC24).
  // By the sheet's height without the question (`baseH`): with it inside the sheet is another height, and a decision
  // that read that one could change its mind.
  const [askH, setAskH] = useState<number | null>(null);
  const [baseH, setBaseH] = useState(0);
  const askAt = askWords && askH != null && baseH > 0 ? keepAskPlace({ height, top: sheetPad.top, sheetH: baseH, askH }) : null;
  const askInside = askWords != null && askAt === 'sheet';
  // With the question inside, the sheet is no taller than half the screen (or the question and a little of the card,
  // at the most its usual 70%): the walk keeps its room over it, and the card's own lines scroll under the question.
  const sheetCap = askInside && askH != null ? { maxHeight: Math.min(height * 0.7, Math.max(height * 0.5, askH + 120)) } : null;
  // Gaps with no line across them, joined by grey dots on the card beats (GW2), and with them the hops the path drew
  // across its other breaks (a pause, a break too long to be a gap), which stay on the map through the card (replay
  // ceremony RC21). A gap keeps the card's own way of drawing it. While the path is told the replay's own frames draw
  // the hops in that layer.
  const hops = showing?.hops;
  const links = useMemo(
    () => (data && (beat === 'card' || beat === 'name') ? linksWithHops(emptyGaps(data.gaps, data.stretches), data.gaps, hops ?? []) : []),
    [data, beat, hops],
  );
  // The walk's clock, so a pin of several says how far in it was (tend map T14).
  const clocks = useMemo(() => (data ? [{ id: data.walk.id, started_at: data.walk.started_at, pauses: data.pauses }] : undefined), [data]);

  if (failure) throw failure;
  if (status !== 'ready' || !data || !story) {
    return (
      <View style={[styles.screen, styles.center, { paddingHorizontal: 24 }]}>
        {status === 'missing' ? (
          <>
            <Text style={styles.missing}>This walk could not be found.</Text>
            <Button label="Back to Chronicle" onPress={() => router.dismissTo('/')} />
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
  const finds = replayFound(data.found);
  const passed = passedLine(data.passed);
  // Streets walked and new, in words (tend replay T31), one clause when all are new (tend replay audit 14).
  // The name typed in Name it, unsaved, until Keep it or leaving (tend replay audit 16, the owner's "Show the typed name").
  const shownTitle = cardTitle(data.walk, title, offered);
  const streetsLine = walkCardStreets(s?.streets_walked ?? 0, s?.streets_read ? data.newStreets : null);

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
  const leaveGaps = () => {
    setKeepError(null);
    setKeepAsked(true);
  };
  // The top row's words (replay-ceremony ui 10): Skip says where it goes wherever the row has room for it.
  const top = topRow(width);
  /**
   * The walk's card. `measure` lays it out unseen, its controls as room of their size that no hand, key or test can
   * reach: the sheet's height is known before the path ends, so the close can frame the walk above it (RC24).
   */
  const cardBody = (measure: boolean) => {
    const id = (name: string) => (measure ? undefined : name);
    const hint = pinHint(measure ? story.captures : pinned);
    return (
      <>
        <View style={styles.titleRow}>
          <Text style={[styles.cardTitle, styles.flex]} accessibilityRole={measure ? undefined : 'header'}>{shownTitle}</Text>
          {!data.walk.open && (measure ? (
            <View style={styles.more} />
          ) : (
            <Pressable
              testID="card-more"
              accessibilityRole="button"
              // Named by the title the card shows, as the walk's row names it (tend tabs 11).
              accessibilityLabel={moreFor(shownTitle)}
              onPress={() => setActionsOpen(true)}
              style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}
              hitSlop={4}
            >
              <Icon name="ellipsis-horizontal" size={22} color={theme.ink} />
            </Pressable>
          ))}
        </View>
        {/* New streets are a clause in the line, never a big orange number (tabs audit U13). */}
        <Text testID={id('card-line')} style={styles.cardLine}>
          <Text testID={id('card-distance')}>{formatDistance(s?.distance_m ?? 0)}</Text> · {formatDuration(s?.duration_ms ?? Math.max(0, (data.walk.ended_at ?? data.walk.started_at) - data.walk.started_at - pausedMs(data.pauses, data.walk.started_at, data.walk.ended_at ?? data.walk.started_at)))}
          {streetsLine ? ` · ${streetsLine}` : ''}
        </Text>
        {/* A ride on its own line, so the card's line doesn't say "walked" twice (rides audit, UI). */}
        {rideM >= 1 ? <Text testID={id('card-ride')} style={styles.cardMuted}>+ {formatDistance(rideM)} by ride</Text> : null}
        {/* What was kept, a clause (tend replay T19). */}
        {s && formatCaptures(s) ? <Text testID={id('card-kept')} style={styles.cardMuted}>{formatCaptures(s)}</Text> : null}
        {finds ? <Text testID={id('card-finds')} style={styles.cardMuted}>{finds}</Text> : null}
        {/* The lows stay in (E11): what came within view and wasn't stopped for. */}
        {passed ? <Text testID={id('card-low')} style={styles.cardMuted}>{passed}</Text> : null}
        {data.walk.epilogue ? <Text style={styles.epilogue}>“{data.walk.epilogue}”</Text> : null}
        {/* The one hint, the card's last line before its buttons, as on the day's card (tend replay T19, audit 10);
            no pin, no hint (audit 11). */}
        {hint ? <Text style={styles.cardMuted}>{hint}</Text> : null}
        {measure ? (
          <View style={[styles.row, styles.buttonRoom]} />
        ) : (
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
        )}
        {!rewatch && (measure ? (
          <View style={styles.notNow} />
        ) : (
          // A quiet way out (tabs audit U14): the walk stays unnamed, and Chronicle comes up.
          <Pressable
            testID="not-now"
            accessibilityRole="button"
            accessibilityHint="Keeps the walk without a name and goes to Chronicle"
            onPress={leaveCard}
            style={({ pressed }) => [styles.notNow, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.notNowText}>Not now</Text>
          </Pressable>
        ))}
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <WalkMap
        ref={mapRef}
        borders={borders}
        // The whole trace in every beat. Through the path the map draws it only as far as the frames say: faint as
        // the first beat left it, fading out as the path opens (replay-ceremony ui 7), while the map reveals the
        // walked line itself, frame by frame.
        trace={data.runs}
        rides={data.rideRuns}
        replay={telling}
        traceOpacity={beat === 'fog' || beat === 'reading' || telling ? QUIET_TRACE_OPACITY : 1}
        walked={data.walked}
        fog={data.fog}
        lightUp={lightUp}
        captures={pinned}
        clocks={clocks}
        // While drawing, a tap on a pin is a point along the way like any other (gap-drawing audit 8).
        onPinPress={(beat === 'card' || beat === 'name') && !isDrawing ? setViewing : undefined}
        onPress={beat === 'card' || beat === 'name' ? pressCard : undefined}
        faint={faint}
        gapLinks={isDrawing ? undefined : links}
        drawing={drawing.line}
        fitBounds={data.bounds}
        fitKey={fitKey}
        // The first beat's fit turns a map turned by hand north-up: the path is told so (RC15; replay-ceremony ui 8).
        fitNorth={beat === 'reading' || beat === 'fog'}
        fitPadding={beat === 'card' || beat === 'name' ? sheetPad : undefined}
        animate={!reduceMotion}
        initialCenter={data.fixes[0] ? [data.fixes[0].lon, data.fixes[0].lat] : undefined}
        covered={beat === 'reading'}
        veil
        // The town borders over the veil, at a lighter fill (decision 0199).
        bordersOverVeil
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
        // Below the top row, so Skip never covers its words, and 16 px in from each edge (tend replay 1): 8 px under
        // Skip's foot (12 in, 48 tall; tend replay audit 6).
        <View testID="replay-headline" style={[styles.headline, { top: insets.top + 12 + 48 + 8, maxWidth: Math.min(340, width - 32) }]} pointerEvents="none">
          <Text style={styles.headlineLabel}>{head.line}</Text>
          {head.note ? <Text style={styles.headlineNote}>{head.note}</Text> : null}
        </View>
      )}

      {telling && (
        <>
          {/* A tap anywhere pauses the replay, and another goes on (RR7). */}
          <Pressable testID="replay-stage" style={StyleSheet.absoluteFill} onPress={play.toggleHold} accessible={false} />
          <Stage ctx={ctx} />
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
          setData((d) => d && { ...d, captures: applyPatch(d.captures, c.id, patch, c.piece_id) });
        }}
        onSaveNote={async (c, body) => {
          // Stored first; the replay's own list and any open view of the walk then show it (QL25).
          const change = notePatch(body);
          await db.updatePiece(c.piece_id, change);
          setData((d) => d && { ...d, captures: applyPatch(d.captures, c.id, change, c.piece_id) });
          captureBus.patch(c.walk_id, c.id, change, null, c.piece_id);
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
          const change = notePatch(body);
          await db.updatePiece(c.piece_id, change);
          setData((d) => d && { ...d, captures: applyPatch(d.captures, c.id, change, c.piece_id) });
          captureBus.patch(c.walk_id, c.id, change, null, c.piece_id);
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

      {/* Over the map, where that leaves the walk its room (replay-ceremony ui 11); and laid out unseen, whatever the
          beat, until its height is known, which is what says where it is asked. */}
      {askWords && (askAt == null || (keepShown && askAt !== 'sheet')) && (
        <KeepGapsCard
          words={askWords}
          busy={gapBusy}
          error={keepError}
          unseen={askAt == null}
          onLayout={askAt == null ? (e) => setAskH(e.nativeEvent.layout.height) : undefined}
          style={[{ bottom: sheetH + 12, zIndex: 5 }, askAt == null && UNSEEN]}
          onKeep={() => void keepThem()}
          onLeave={leaveGaps}
        />
      )}

      {(beat === 'fog' || beat === 'path') && (
        <View style={[styles.skip, { top: insets.top + 12 }]}>
          <Button testID="skip" variant="secondary" label={top.skip} spokenLabel={top.skipSpoken} style={TOP_BUTTON} onPress={() => go('card')} />
          {/* Under Skip, at the same edge: the clock sits between Pause and Skip, and the three do not fit one row on a 375 px phone (RY12). */}
          {telling && play.canNext && <NextMoment onPress={play.next} />}
        </View>
      )}
      {telling && (
        <View style={[styles.hold, { top: insets.top + 12 }]}>
          <Button
            testID="hold"
            variant="secondary"
            label={play.held ? 'Play' : 'Pause'}
            accessibilityHint={play.held ? 'Goes on with the replay' : 'Pauses the replay where it is'}
            style={TOP_BUTTON}
            onPress={play.toggleHold}
          />
        </View>
      )}

      {/* The card's sheet, laid out unseen before the path ends: its height is the room the close leaves under the walk,
          so the card then arrives on a map that does not move (replay ceremony RC24). */}
      {(beat === 'reading' || beat === 'fog' || beat === 'path') && (
        <View
          style={[styles.sheetWrap, sheetCap, UNSEEN]}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (Math.abs(h - sheetH) > 8) setSheetH(h);
            if (!askInside && Math.abs(h - baseH) > 8) setBaseH(h);
          }}
        >
          <View style={styles.sheet}>
            <View style={[styles.sheetContent, { paddingBottom: 16 + insets.bottom }]}>
              {/* The question's room too, where it will be asked inside the sheet (replay-ceremony ui 11). */}
              {askWords && askInside && <KeepGapsCard inline unseen words={askWords} onKeep={NOTHING} onLeave={NOTHING} />}
              {cardBody(true)}
            </View>
          </View>
        </View>
      )}

      {/* Low, where the card's sheet was, clear of the Undo pill at the top (audit, UI). */}
      {isDrawing && <GapDraw drawing={drawing} style={{ bottom: insets.bottom + 24, zIndex: 6 }} />}

      {/* The card steps aside while a gap's way is drawn, so the map is free to tap (GW3). */}
      {(beat === 'card' || beat === 'name') && !isDrawing && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheetWrap, beat === 'card' && keepShown && sheetCap]}
          pointerEvents="box-none"
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (Math.abs(h - sheetH) > 8) {
              setSheetH(h);
              setFitKey((k) => k + 1);
            }
            if (!askInside && beat === 'card' && Math.abs(h - baseH) > 8) setBaseH(h);
          }}
        >
          {/* The sheet's ground is this view's, never the scroller's own: a scroller with an opaque ground whose
              content overflows (the question inside it on a short phone, replay-ceremony ui 11) made Chromium leave the
              map above the sheet undrawn (its compositor took the scroller's whole content for what covers the map). */}
          <View style={[styles.sheet, styles.sheetFrame]}>
          <ScrollView
            contentContainerStyle={[styles.sheetContent, { paddingBottom: 16 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {beat === 'card' ? (
              <>
                {/* The gap question, where over the map it would cover the walk it asks about (replay-ceremony ui 11). */}
                {keepWords && askInside && (
                  <KeepGapsCard
                    inline
                    words={keepWords}
                    busy={gapBusy}
                    error={keepError}
                    onKeep={() => void keepThem()}
                    onLeave={leaveGaps}
                  />
                )}
                {cardBody(false)}
              </>
            ) : (
              <>
                {/* A quiet way back to the card, the words kept, where Back and Escape go (tend replay T21, decision 0165):
                    an iPhone has neither. While the ask shows, its two answers are the ways on (tend replay 15). */}
                {!asking && (
                  <Pressable
                    testID="name-back"
                    accessibilityRole="button"
                    // The owner's "Add the chevron", Nov 17 (tend replay audit 16): a muted back chevron, and where it goes.
                    accessibilityHint="Returns to the card, your words kept"
                    onPress={stepBack}
                    style={({ pressed }) => [styles.nameBack, pressed && { opacity: 0.6 }]}
                  >
                    <Icon name="chevron-back" size={18} color={theme.muted} />
                    <Text style={styles.notNowText}>Back</Text>
                  </Pressable>
                )}
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
                  // While the ask shows, Done is Keep editing, never a hidden save (as tend chronicle audit 5).
                  onSubmitEditing={asking ? keepEditing : save}
                  maxLength={200}
                  style={styles.input}
                />
                {saveError ? <Text style={styles.error} accessibilityRole="alert">Could not save: {saveError}</Text> : null}
                {asking ? (
                  // Rename's ask, in its words, in Keep it's place (tend chronicle 9; tend replay 15).
                  <View testID="name-ask" style={styles.ask} accessibilityLiveRegion="polite">
                    <Text style={styles.askText}>Discard these edits?</Text>
                    <View style={styles.askRow}>
                      <Button testID="name-keep" label="Keep editing" variant="secondary" onPress={keepEditing} style={styles.flex} />
                      <Button testID="name-discard" label="Discard" variant="danger" onPress={toChronicle} style={styles.flex} />
                    </View>
                  </View>
                ) : (
                  <Button testID="save" label="Keep it" onPress={save} busy={saving} busyLabel="Saving…" />
                )}
              </>
            )}
          </ScrollView>
          </View>
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
          // Only what Rename changed, so a line typed in Name it stays (tend replay audit 15).
          const fields = fieldsAfterRename(data.walk, patch, { title, epilogue, offered });
          setTitle(fields.title);
          setOffered(fields.offered);
          setEpilogue(fields.epilogue);
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
/** What a control laid out unseen does: it is room of its size, and no hand reaches it. */
const NOTHING = () => {};
/** Laid out and never seen: out of what a browser reads as the page's text, too. */
const UNSEEN = Platform.OS === 'web' ? ({ visibility: 'hidden' } as object) : { opacity: 0 };

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
    position: 'absolute', alignSelf: 'center', alignItems: 'center', backgroundColor: theme.glass,
    borderRadius: 20, paddingVertical: 12, paddingHorizontal: 24,
  },
  headlineLabel: { fontSize: 17, color: theme.ink, fontWeight: '600', textAlign: 'center' },
  headlineNote: { fontSize: 14, color: theme.muted, textAlign: 'center', marginTop: 6 },
  skip: { position: 'absolute', right: 12, alignItems: 'flex-end', gap: 8 },
  hold: { position: 'absolute', left: 12 },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70%' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  // Around the card's scroller: as tall as its content up to the wrap's cap, its corners cutting what scrolls.
  sheetFrame: { flexShrink: 1, overflow: 'hidden' },
  sheetContent: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  cardTitle: { fontSize: 22, fontWeight: '700', color: theme.ink },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  more: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  cardLine: { fontSize: 16, color: theme.ink, fontVariant: ['tabular-nums'] },
  cardMuted: { fontSize: 15, color: theme.muted },
  epilogue: { fontSize: 15, fontStyle: 'italic', color: theme.ink },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  // A button's height (`components/ui` `btn`), where the card is laid out unseen.
  buttonRoom: { height: 48 },
  notNow: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  notNowText: { fontSize: 15, fontWeight: '600', color: theme.muted },
  // Not now's quiet text, at the name sheet's leading edge, its words in line with the labels below.
  nameBack: {
    minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 12, paddingRight: 16,
    marginLeft: -16, marginTop: -10,
  },
  flex: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: theme.muted },
  input: { borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 12, fontSize: 16, color: theme.ink },
  error: { color: theme.danger, fontSize: 14 },
  // Rename's ask (components/WalkActions).
  ask: { gap: 10, marginTop: 8 },
  askText: { fontSize: 16, color: theme.ink, textAlign: 'center' },
  askRow: { flexDirection: 'row', gap: 8 },
});

