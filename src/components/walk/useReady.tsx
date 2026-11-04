import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { CaptureViewer } from '../CaptureView';
import { LocateButton } from '../LocateButton';
import { MomentBar } from '../MomentBar';
import { StartSettings } from '../StartSettings';
import { Icon } from '../icons';
import { Banner, theme } from '../ui';
import { useUnits } from '../../lib/useUnits';
import { applyPatch, captureBus } from '../../lib/captureBus';
import { MOMENT_PIN_ZOOM, placedMoments, upsertMoment } from '../../lib/momentPins';
import { useVisible } from '../../lib/deletion/useDeletions';
import { type Kind } from '../../lib/explore/explore';
import { findForMoment } from '../../lib/explore/momentFind';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ExploreSettings } from '../../lib/explore/settings';
import { boundsOf, type Bounds } from '../../lib/geo';
import { getLastFix, setLastFix } from '../../lib/lastFix';
import { locateOnce } from '../../lib/locate';
import { loadPendingDest, savePendingDest } from '../../lib/nav/store';
import type { Waypoint } from '../../lib/nav/types';
import { ready } from '../../lib/ready';
import { type StartMode } from '../../lib/startPlan';
import type { Capture, LngLat } from '../../lib/types';
import type { MomentState } from '../../lib/useCaptures';
import { LOCATE_FIT_M, useLocate } from '../../lib/useLocate';
import { useStartWalk } from '../../lib/useStartWalk';
import { BAR_H, CAP, raisedHeight, useStackLayout } from './layout';
import { ReadyBar } from './ReadyBar';

const NONE: never[] = [];
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** The fix on opening frames this far around you (NV17). */
const OPEN_FIT_M = 250;

/**
 * The walk screen's ready state (NR1, NR5-NR13): what Navigate shows with no
 * walk open. The walk screen calls this at every render and, while no walk is
 * open, gives its one map `mapProps` and draws `overlay`: a map around you from
 * one fix read as it opens (nothing tracks after, NV17), your moments' pins,
 * the destination you long-pressed, the capture stack keeping moments, Locate
 * and the ready bar (Start, or pulled up, the walk's settings). The map is the
 * walk's own, so when Start records it stays mounted and nothing moves (NR6).
 */
export function useReady(props: {
  /** No walk is open: read the choices and one fix as the screen comes to the front. */
  active: boolean;
  /** The tab beneath, or Explore (NR4). */
  onClose: () => void;
  /** Start was pressed: hold the walk back until its plan is written. */
  onStarting: () => void;
  /** The walk is recording, with its notice params (`error` when its plan failed); `null` if it didn't start. */
  onStarted: (params: Record<string, string> | null) => void;
}) {
  // The destination line and the zero distance follow the units setting (QL16).
  useUnits();
  const at = useStackLayout();
  const { height: screenH } = useWindowDimensions();
  const walkStart = useStartWalk();
  const [momentError, setMomentError] = useState<{ message: string; openSettings?: boolean } | null>(null);
  const error = walkStart.error ?? momentError;
  const [fix, setFix] = useState<LngLat | null>(() => getLastFix()?.at ?? null);
  const [fit, setFit] = useState<{ bounds: Bounds | null; key: number }>({ bounds: null, key: 0 });
  const centred = useRef(false);
  const [firstWalk, setFirstWalk] = useState(false);
  const [webNoteOff, setWebNoteOff] = useState(true);
  const [mode, setModeState] = useState<StartMode>('quiet');
  const [dest, setDest] = useState<Waypoint | null>(null);
  const [settings, setSettings] = useState<ExploreSettings>(DEFAULT_SETTINGS);
  const [up, setUp] = useState(false);
  const [memoOn, setMemoOn] = useState(false);
  // Leaving mid-memo saves it (tabs audit 3).
  const focused = useIsFocused();
  // Moments outside walks, as pins where they were made (M16): gone from view while their delete waits (D5).
  const [storedMoments, setMoments] = useState<Capture[]>([]);
  const moments = useVisible(storedMoments);
  const [viewing, setViewing] = useState<Capture[] | null>(null);
  const [pinZoom, setPinZoom] = useState(() => (fix ? 16 : WORLD.zoom) >= MOMENT_PIN_ZOOM);
  const momentPins = useMemo(() => (pinZoom ? moments : NONE), [moments, pinZoom]);

  // Each time the screen comes to the front: the choices, the moments, the first-walk note; and one fix.
  const { active } = props;
  useFocusEffect(
    useCallback(() => {
      // With a walk open its recorder watches; nothing of this is read (U2's rule, kept).
      if (!active) return;
      let live = true;
      (async () => {
        const [choices, d, s] = await Promise.all([ready.load(), loadPendingDest(), loadSettings().catch(() => DEFAULT_SETTINGS)]);
        if (!live) return;
        if (choices.captures) setMoments(placedMoments(choices.captures));
        setModeState(choices.mode);
        setDest(d);
        setSettings(s);
        setFirstWalk(choices.firstWalk);
        setWebNoteOff(choices.webNoteOff);
      })().catch(() => {});
      // One fix, which ends its own watch (NV17): the first frames the map around you.
      locateOnce().then((r) => {
        if (!live || !r.at) return;
        setLastFix(r.at);
        setFix(r.at);
        if (centred.current) return;
        centred.current = true;
        const box = boundsOf([r.at], OPEN_FIT_M);
        if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
      }, () => {});
      return () => {
        live = false;
      };
    }, [active]),
  );

  const pickMode = (m: StartMode) => {
    setModeState(m);
    ready.setMode(m).catch(() => {});
  };
  const changeSettings = (next: ExploreSettings) => {
    setSettings(next);
    saveSettings(next).catch(() => {});
  };
  const toggleKind = (k: Kind, on: boolean) => {
    const hidden = new Set(settings.hidden);
    if (on) hidden.delete(k);
    else hidden.add(k);
    changeSettings({ ...settings, hidden });
  };
  const chooseDest = (d: Waypoint | null) => {
    setDest(d);
    savePendingDest(d).catch(() => {});
  };
  const dismissWebNote = () => {
    setWebNoteOff(true);
    ready.dismissWebNote().catch(() => {});
  };
  const onMoment = useCallback((c: Capture, state: MomentState) => {
    if (state !== 'placed') return;
    findForMoment(c).catch(() => {});
    if (placedMoments([c]).length) setMoments((prev) => upsertMoment(prev, c));
  }, []);
  const onMomentError = useCallback((e: { message: string; openSettings?: boolean }) => setMomentError(e), []);
  // Locate me (QL9-QL12): a fresh fix on a tap, framed 250 m around; nothing tracks after.
  const { busy: locating, locate } = useLocate({
    onFix: (p) => {
      setFix(p);
      centred.current = true;
      const box = boundsOf([p], LOCATE_FIT_M);
      if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
    },
    onError: setMomentError,
  });

  const start = async () => {
    if (memoOn) return;
    setUp(false);
    props.onStarting();
    const params = await walkStart.start(dest, mode, { inPlace: true });
    props.onStarted(params);
  };
  // The chevron and Back (NR4): the raised bar lowers first. Mid-memo the chevron still closes, and the
  // memo is saved as the screen goes (useCaptures finishes it on unmount, NR10); Back does nothing then.
  const { onClose } = props;
  const close = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    if (!active || up || memoOn) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => back.remove();
  }, [active, up, memoOn, close]);

  const ring = up && mode === 'explore' && fix ? { center: fix, radiusM: settings.rangeM } : null;
  // The ring is framed in the map left above the raised bar (audit 1), refit as it appears or changes.
  const raisedH = raisedHeight(screenH, BAR_H + at.insets.bottom);
  const ringBox = ring ? boundsOf([ring.center], ring.radiusM * 1.15) : null;
  const ringKey = ring ? 100000 + ring.radiusM : 0;

  /** The walk screen's one map, while no walk is open. */
  const mapProps = {
    trace: NONE,
    walked: NONE,
    fog: NONE,
    captures: momentPins,
    // Mid-memo, pins do nothing, so a memo is never cut short (moments audit).
    // Nor with the bar up: one Escape would close the viewer and the bar (audit 12).
    onPinPress: (cs: Capture[]) => !memoOn && !up && setViewing(cs),
    onViewChange: (v: { zoom: number }) => setPinZoom(v.zoom >= MOMENT_PIN_ZOOM),
    walker: fix,
    marks: dest ? [dest.at] : undefined,
    ring,
    // The destination is a long press on the ready map (NV23), never mid-memo or with the bar up.
    onLongPress: (p: LngLat) => {
      if (memoOn || up) return;
      chooseDest({ at: p, label: 'Your spot', kind: 'point' });
    },
    fitBounds: ringBox ?? fit.bounds,
    fitKey: ringBox ? ringKey : fit.key,
    fitPadding: ringBox
      ? { top: at.insets.top + 64, right: 24, bottom: raisedH - BAR_H - at.insets.bottom + 16, left: 24 }
      : { top: at.insets.top + 72, right: 24 + CAP, bottom: 24, left: 24 },
    // Read once, as the map mounts: around the last fix, or the world.
    initialCenter: fix ?? WORLD.center,
    initialZoom: fix ? 16 : WORLD.zoom,
  };

  const overlay = (
    <>
      {/* The strip's place in the column: the map ends where the walk's does. */}
      <View style={{ height: BAR_H + at.insets.bottom }} />

      <View style={[styles.top, { top: at.insets.top + 12, left: at.sideInset, right: at.sideInset }]} pointerEvents="box-none">
        {/* The chevron (NR4): where the walk's Minimize sits, back to the tab you came from. */}
        <View style={styles.closeRow} pointerEvents="box-none">
          <Pressable
            testID="ready-close"
            accessibilityRole="button"
            accessibilityLabel="Close Navigate"
            accessibilityHint="Back to the tab you came from."
            onPress={close}
            // Not while Start is on its way: the walk would open minimized, with nothing said (audit 10).
            disabled={walkStart.starting}
            accessibilityState={{ disabled: walkStart.starting }}
            style={({ pressed }) => [styles.edgeBtn, walkStart.starting && styles.dim, pressed && styles.pressed]}
          >
            <Icon name="chevron-down" size={24} color={theme.ink} />
          </Pressable>
        </View>
        {error && (
          <Banner
            tone="error"
            onDismiss={() => {
              walkStart.setError(null);
              setMomentError(null);
            }}
            action={error.openSettings ? { label: 'Open Settings', onPress: () => Linking.openSettings() } : undefined}
          >
            {error.message}
          </Banner>
        )}
        {firstWalk && !webNoteOff && !ready.background() && (
          // Said once, and gone for good once dismissed (U9).
          <Banner onDismiss={dismissWebNote}>On the web, a walk is traced while this page is open and on screen.</Banner>
        )}
      </View>

      {/* Locate (QL9), in the stack's column where Recenter sits on the walk (NR9). */}
      <LocateButton busy={locating} onPress={locate} bottom={at.edgeBottom('locate')} right={at.edgeRight} />
      {/* The capture stack keeping moments (NR9), and its pills. */}
      <MomentBar disabled={walkStart.starting} onMoment={onMoment} onError={onMomentError} onRecording={setMemoOn} focused={focused} />

      <ReadyBar
        up={up}
        onUp={(u) => setUp(u && !memoOn)}
        areaHeight={screenH}
        dest={dest}
        fix={fix}
        starting={walkStart.starting}
        startDisabled={memoOn}
        locked={memoOn}
        onStart={() => void start()}
      >
        <StartSettings
          mode={mode}
          dest={dest}
          fix={fix}
          settings={settings}
          onMode={pickMode}
          onClearDest={() => chooseDest(null)}
          onSettings={changeSettings}
          onToggleKind={toggleKind}
        />
      </ReadyBar>

      {/* A moment's pin opens it here, as Chronicle's pins do (M16): view, caption, edit the note, delete. */}
      <CaptureViewer
        key={`moment:${viewing?.[0]?.id ?? 'none'}`}
        captures={viewing && viewing.map((v) => moments.find((c) => c.id === v.id) ?? v)}
        onClose={() => setViewing(null)}
        remind
        onSaveCaption={async (c, caption, y) => {
          await ready.saveCaption(c.id, caption, y);
          setMoments((prev) => applyPatch(prev, c.id, { caption, caption_y: caption ? y : null }));
        }}
        onSaveNote={async (c, body) => {
          await ready.saveNote(c.id, body);
          setMoments((prev) => applyPatch(prev, c.id, { body }));
          captureBus.patch(c.walk_id, c.id, { body }, null);
        }}
      />
    </>
  );
  return { mapProps, overlay };
}

const styles = StyleSheet.create({
  top: { position: 'absolute', gap: 8, alignItems: 'center', maxWidth: 640, alignSelf: 'center', zIndex: 2 },
  closeRow: { alignSelf: 'stretch', flexDirection: 'row' },
  edgeBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  pressed: { opacity: 0.8 },
  dim: { opacity: 0.5 },
});
