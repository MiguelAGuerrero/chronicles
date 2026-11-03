import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaptureViewer } from '../../components/CaptureView';
import { StartDialog } from '../../components/StartDialog';
import { SheetFrame, type SheetSize } from '../../components/HomeSheet';
import { LocateButton } from '../../components/LocateButton';
import { CaptureRow, MomentBar } from '../../components/MomentBar';
import { useOpenWalk, useOpenWalkInfo } from '../../components/OpenWalk';
import { WalkMap } from '../../components/map/WalkMap';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import { useUnits } from '../../lib/useUnits';
import { db } from '../../lib/db';
import { applyPatch, captureBus } from '../../lib/captureBus';
import { MOMENT_PIN_ZOOM, placedMoments, upsertMoment } from '../../lib/momentPins';
import { useVisible } from '../../lib/deletion/useDeletions';
import { type Kind } from '../../lib/explore/explore';
import { findForMoment } from '../../lib/explore/momentFind';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ExploreSettings } from '../../lib/explore/settings';
import { boundsOf, distanceM, type Bounds } from '../../lib/geo';
import { getLastFix, setLastFix } from '../../lib/lastFix';
import { locateOnce } from '../../lib/locate';
import { loadNav, loadPendingDest, savePendingDest } from '../../lib/nav/store';
import type { Waypoint } from '../../lib/nav/types';
import { perfCount } from '../../lib/perfCount';
import { recorder } from '../../lib/recorder';
import { destLine, parseStartMode, START_MODE_KEY, type StartMode } from '../../lib/startPlan';
import type { Capture, LngLat, Walk } from '../../lib/types';
import { useCaptures, type MomentState } from '../../lib/useCaptures';
import { LOCATE_FIT_M, useLocate } from '../../lib/useLocate';
import { useStartWalk } from '../../lib/useStartWalk';
import { useTabMap } from '../../lib/useTabMap';

const NONE: never[] = [];
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** The drawer's grip: the handle and a strip under it, one thumb tall. */
const GRIP_H = 44;
/** The drawer's foot: Start and the line under it, which opens the settings dialog (Nov 3). */
const FOOT_H = 92;
/** The drawer's peek: its grip and its foot (NV19). */
const DRAWER_PEEK = GRIP_H + FOOT_H;
/** The capture row's gap above the peeking drawer. It stays there at every height (U1). */
const ROW_GAP = 12;
/** The capture row's own height. */
const ROW_H = 52;
/** A new fix this far from the last recentres the map; a nearer one only moves the dot (NV3, NV17). */
const RECENTER_M = 100;
/** Meta: the web's "keep this page open" note was dismissed (U9). */
const WEB_NOTE_KEY = 'web_note_dismissed';

/**
 * Navigate (NV17-NV28): a map around where you are, from one fix read each
 * time the tab comes to the front (nothing tracks in between), quick capture,
 * and the pre-start drawer. Start sits at the drawer's foot and starts at once
 * with the saved choices; a summary line under it opens the settings dialog
 * (Nov 3), each choice saved as it changes to the meta the walk reads. Start
 * and the capture row stay docked low (U1).
 *
 * With a walk open and minimized, it is a live view of that walk (U2): its
 * growing trace, the walker, its captures and its destination, and the
 * capture row keeps captures for it. The recording bar is the way back; the
 * drawer stays at its peek. Only the live layers follow the walk: this screen
 * re-renders when the walk starts, pauses, resumes or stops (perf).
 */
export default function Navigate() {
  perfCount('render:navigate');
  // The peek's destination line follows the units setting (QL16).
  useUnits();
  const insets = useSafeAreaInsets();
  const walkStart = useStartWalk();
  const [momentError, setMomentError] = useState<{ message: string; openSettings?: boolean } | null>(null);
  const error = walkStart.error ?? momentError;
  const [fix, setFix] = useState<LngLat | null>(() => getLastFix()?.at ?? null);
  const [fit, setFit] = useState<{ bounds: Bounds | null; key: number }>({ bounds: null, key: 0 });
  const { focused, savedCamera, onCameraChange, areaH, onFitSettled } = useTabMap({ key: fit.key, refit: () => setFit((f) => ({ ...f, key: f.key + 1 })) });
  const centredOn = useRef<LngLat | null>(null);
  // The open walk, from its keeper above the tabs: no fix-by-fix renders here (U2).
  const openInfo = useOpenWalkInfo();
  const open = openInfo.walk;
  const [firstWalk, setFirstWalk] = useState(false);
  const [webNoteOff, setWebNoteOff] = useState(true);
  // The drawer's choices (NV20-NV22), read from meta and saved as they change.
  const [mode, setModeState] = useState<StartMode>('quiet');
  const [dest, setDest] = useState<Waypoint | null>(null);
  // The open walk's own destination, shown on its live view (U2).
  const [walkDest, setWalkDest] = useState<Waypoint | null>(null);
  const [settings, setSettings] = useState<ExploreSettings>(DEFAULT_SETTINGS);
  // The settings dialog (Nov 3): the drawer no longer pulls up; its settings are one dialog, opened
  // from the peek's summary line or a pull on its grip.
  const [dialog, setDialog] = useState(false);
  const [sheetH, setSheetH] = useState(DRAWER_PEEK);
  const [memoOn, setMemoOn] = useState(false);
  // Moments outside walks, as pins where they were made (M16, moment pins 1-2): read as the tab comes to
  // the front, and a new one added once its fix places it. Gone from view while their delete waits (D5).
  const [storedMoments, setMoments] = useState<Capture[]>([]);
  const moments = useVisible(storedMoments);
  const [viewing, setViewing] = useState<Capture[] | null>(null);
  // Pins from neighbourhood zoom, as on Chronicle; re-rendered only when the zoom crosses it.
  const [pinZoom, setPinZoom] = useState(() => (savedCamera?.zoom ?? (fix ? 15 : WORLD.zoom)) >= MOMENT_PIN_ZOOM);
  const momentPins = useMemo(() => (pinZoom ? moments : NONE), [moments, pinZoom]);

  // Each time the tab comes to the front: the choices (the walk's options card may have changed them).
  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        const [m, d, s, walks, note, caps] = await Promise.all([
          db.getMeta(START_MODE_KEY).catch(() => null),
          loadPendingDest(),
          loadSettings().catch(() => DEFAULT_SETTINGS),
          db.listWalks().catch(() => [] as Walk[]),
          db.getMeta(WEB_NOTE_KEY).catch(() => null),
          // Rows only, never media (as Chronicle reads them for its days).
          db.capturesBetween(0, Number.MAX_SAFE_INTEGER).catch(() => null),
        ]);
        if (!live) return;
        if (caps) setMoments(placedMoments(caps));
        setModeState(parseStartMode(m));
        setDest(d);
        setSettings(s);
        setFirstWalk(walks.length === 0);
        setWebNoteOff(!!note);
      })().catch(() => {});
      return () => {
        live = false;
      };
    }, []),
  );
  // One fix each time the tab comes to the front (NV17), which ends its own watch. Never while a walk
  // is open: its recorder already watches, and the live view shows where it is (U2).
  const openId = open?.id ?? null;
  const known = openInfo.known;
  useEffect(() => {
    if (!focused || !known || openId) return;
    let live = true;
    locateOnce().then((r) => {
      if (!live || !r.at) return;
      setLastFix(r.at);
      setFix(r.at);
      // The first fix, or one somewhere else, frames the map around you; a nearby one only moves the dot,
      // so the view you left is kept (NV3).
      if (!centredOn.current || distanceM(centredOn.current, r.at) > RECENTER_M) {
        centredOn.current = r.at;
        const box = boundsOf([r.at], 250);
        if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
      }
    }, () => {});
    return () => {
      live = false;
    };
  }, [focused, known, openId]);
  // The open walk's destination, read as the tab comes to the front (Walk here may have set it).
  useEffect(() => {
    if (!focused || !openId) return;
    let live = true;
    loadNav(openId).then((d) => live && setWalkDest(d), () => {});
    return () => {
      live = false;
    };
  }, [focused, openId]);

  const pickMode = (m: StartMode) => {
    setModeState(m);
    db.setMeta(START_MODE_KEY, m).catch(() => {});
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
    db.setMeta(WEB_NOTE_KEY, '1').catch(() => {});
  };

  const onMoment = useCallback((c: Capture, state: MomentState) => {
    // A moment finds a place as a walk's capture does (M4); Chronicle reads it when it comes to the front.
    if (state !== 'placed') return;
    findForMoment(c).catch(() => {});
    // Its pin, where it was made (M16, moment pins 2).
    if (placedMoments([c]).length) setMoments((prev) => upsertMoment(prev, c));
  }, []);
  const onMomentError = useCallback((e: { message: string; openSettings?: boolean }) => setMomentError(e), []);
  // Locate me (QL9-QL12): one fix on a tap, the dot there, and the map framed 250 m around it whatever
  // the distance from the last fix (unlike the fix on focus); nothing tracks after. No fix: the banner.
  const { busy: locating, locate } = useLocate({
    onFix: (at) => {
      setFix(at);
      centredOn.current = at;
      const box = boundsOf([at], LOCATE_FIT_M);
      if (box) setFit((f) => ({ bounds: box, key: f.key + 1 }));
    },
    onError: setMomentError,
  });

  // A pull on the grip opens the dialog instead; the drawer itself stays at its peek. Mid-memo, or with a
  // walk open, nothing opens (audit, U2).
  const resize = (s: SheetSize) => {
    if (s !== 'peek' && !memoOn && !open) setDialog(true);
  };
  const dialogOn = dialog && !open && !memoOn;
  const ringShown = dialogOn && mode === 'explore' && fix;
  // The peek's summary: the mode, and the destination if one is set.
  const peekLine = open ? null : [mode === 'explore' ? 'Explore' : 'Quiet', dest ? destLine(dest, fix) : null].filter(Boolean).join(' · ');

  const mapBase: MapBase = {
    // The destination is set only here, and only before a walk (NV23): a long press, with its ring.
    onLongPress: (at) => {
      if (open || memoOn) return;
      chooseDest({ at, label: 'Your spot', kind: 'point' });
    },
    fitBounds: fit.bounds,
    fitKey: fit.key,
    onFitSettled,
    fitPadding: { top: insets.top + 60, right: 48, bottom: (open ? 0 : sheetH) + ROW_GAP + ROW_H + 60, left: 48 },
    initialZoom: savedCamera?.zoom ?? (fix || open ? 15 : WORLD.zoom),
    onCameraChange,
    attributionTop: true,
    // The scale bar above the drawer and the capture row at their resting height (QL8).
    scaleInset: { bottom: (open ? 0 : sheetH) + ROW_GAP + ROW_H + 12, left: 12 },
  };
  // With a walk minimized there is no drawer (the owner, Nov 3): the row sits low on the map.
  const rowStyle = [styles.floatRow, styles.row, { bottom: (open ? 0 : DRAWER_PEEK) + ROW_GAP }];

  return (
    <View style={styles.screen}>
      {open ? (
        // A live view of the open walk while Navigate is in front (U2); under another tab nothing of it is drawn here.
        focused && (
          <LiveWalk
            walk={open}
            mapBase={mapBase}
            initialCenter={savedCamera?.center ?? null}
            dest={walkDest}
            rowStyle={rowStyle}
            onError={onMomentError}
            onRecording={setMemoOn}
          />
        )
      ) : (
        <>
          {/* The capture row, docked above the drawer's peek at every height (NV18, NV19, U1). */}
          <View style={rowStyle} pointerEvents="box-none">
            <MomentBar disabled={walkStart.starting} onMoment={onMoment} onError={onMomentError} onRecording={setMemoOn} focused={focused} />
          </View>
          <View style={[StyleSheet.absoluteFill, styles.under]}>
            {/* Only while Navigate is in front (NV4): one map is live at a time. */}
            {focused && (
              <WalkMap
                {...mapBase}
                trace={NONE}
                walked={NONE}
                fog={NONE}
                captures={momentPins}
                // Mid-memo, pins do nothing, so a memo is never cut short (moments audit).
                onPinPress={(cs) => !memoOn && setViewing(cs)}
                onViewChange={(v) => setPinZoom(v.zoom >= MOMENT_PIN_ZOOM)}
                walker={fix}
                marks={dest ? [dest.at] : undefined}
                ring={ringShown ? { center: fix, radiusM: settings.rangeM } : null}
                initialCenter={savedCamera?.center ?? fix ?? WORLD.center}
              />
            )}
          </View>
        </>
      )}

      {/* No drawer with a walk minimized (the owner, Nov 3): its settings are for starting one, and the
          recording bar below is the walk's own strip. */}
      {!open && (
      <View style={[StyleSheet.absoluteFill, styles.over]} pointerEvents="box-none">
        <SheetFrame
          testID="navigate-drawer"
          dragTestID="drawer-drag"
          size="peek"
          onSize={resize}
          peek={DRAWER_PEEK}
          bottomInset={0}
          areaHeight={areaH}
          onHeight={setSheetH}
          // The grip: the handle and a strip under it, so the drawer is easy to take hold of.
          header={<View style={styles.grip} />}
        >
          {/* The foot: Start, docked at the drawer's bottom (NV19, U1). */}
          <View testID="drawer-foot" style={styles.foot}>
            {/* Start just starts, where you are, with the saved choices (NV19, NV25); never waits on a fix (NV28). */}
            <Button
              testID="start"
              label="Start walk"
              onPress={() => walkStart.start(dest, mode)}
              busy={walkStart.starting}
              busyLabel="Starting…"
              disabled={memoOn}
              tall
              style={styles.startBtn}
            />
            {/* What Start will use; a tap opens all of it in the dialog. */}
            <Pressable
              testID="start-options"
              accessibilityRole="button"
              accessibilityLabel={`Walk settings: ${peekLine}`}
              onPress={() => !memoOn && setDialog(true)}
              style={styles.summary}
            >
              <Text testID="peek-choices" style={styles.peekLine} numberOfLines={1}>{peekLine}</Text>
              <Icon name="chevron-up" size={16} color={theme.muted} />
            </Pressable>
          </View>
        </SheetFrame>
        {/* Locate me (QL9): above the drawer and the capture row at every height; gone with a walk open. */}
        <LocateButton busy={locating} onPress={locate} bottom={sheetH + ROW_GAP + ROW_H + 12} />
      </View>
      )}

      {/* A moment's pin opens it here, as Chronicle's pins do (M16): view, caption, edit the note, delete. */}
      <CaptureViewer
        key={`moment:${viewing?.[0]?.id ?? 'none'}`}
        captures={viewing && viewing.map((v) => moments.find((c) => c.id === v.id) ?? v)}
        onClose={() => setViewing(null)}
        remind
        onSaveCaption={async (c, caption, y) => {
          await db.updateCapture(c.id, { caption, caption_y: caption ? y : null });
          setMoments((prev) => applyPatch(prev, c.id, { caption, caption_y: caption ? y : null }));
        }}
        onSaveNote={async (c, body) => {
          // Stored first; the pin and any other view of it then show it (QL25).
          await db.updateCapture(c.id, { body });
          setMoments((prev) => applyPatch(prev, c.id, { body }));
          captureBus.patch(c.walk_id, c.id, { body }, null);
        }}
      />

      <StartDialog
        visible={dialogOn}
        mode={mode}
        dest={dest}
        fix={fix}
        settings={settings}
        starting={walkStart.starting}
        startDisabled={memoOn}
        onMode={pickMode}
        onClearDest={() => chooseDest(null)}
        onSettings={changeSettings}
        onToggleKind={toggleKind}
        onStart={() => {
          setDialog(false);
          walkStart.start(dest, mode);
        }}
        onClose={() => setDialog(false)}
      />

      <View style={[styles.top, styles.over, { top: insets.top + 8 }]} pointerEvents="box-none">
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
        {firstWalk && !open && !webNoteOff && !recorder.capabilities.background && (
          // Said once, and gone for good once dismissed (U9).
          <Banner onDismiss={dismissWebNote}>On the web, a walk is traced while this page is open and on screen.</Banner>
        )}
      </View>
    </View>
  );
}

type MapBase = Pick<
  ComponentProps<typeof WalkMap>,
  'onLongPress' | 'fitBounds' | 'fitKey' | 'onFitSettled' | 'fitPadding' | 'initialZoom' | 'onCameraChange' | 'attributionTop' | 'scaleInset'
>;

/**
 * The open walk, minimized, seen from Navigate (U2): its growing trace, the
 * walker's dot, its captures and its destination, and the capture row,
 * keeping captures for the walk. Its captures reach the walk screen through
 * the capture bus, as the recording bar's camera's do, so none is lost or
 * shown twice on Return. Only this follows the walk fix by fix; it is mounted
 * only while Navigate is in front, and leaving mid-memo saves the memo
 * (useCaptures saves one on unmount).
 */
function LiveWalk(props: {
  walk: Walk;
  mapBase: MapBase;
  initialCenter: LngLat | null;
  dest: Waypoint | null;
  rowStyle: ComponentProps<typeof View>['style'];
  onError: (e: { message: string; openSettings?: boolean }) => void;
  onRecording: (on: boolean) => void;
}) {
  perfCount('render:navigate-walk');
  const { live } = useOpenWalk();
  const cap = useCaptures(props.walk.id, live.here, live.lastFixAt, props.onError);
  const captures = useVisible(cap.captures);
  const [toast, setToast] = useState<string | null>(null);
  // Where the map opens: where it was left, else the walker (read once, at mount).
  const [center] = useState<LngLat>(() => props.initialCenter ?? live.here ?? WORLD.center);
  const { onRecording } = props;
  // Gone with a memo on (another tab, the walk): the memo is saved, and the drawer is free again.
  useEffect(() => () => onRecording(false), [onRecording]);
  return (
    <>
      <View style={props.rowStyle} pointerEvents="box-none">
        <CaptureRow cap={cap} toast={toast} setToast={setToast} walk onRecording={onRecording} />
      </View>
      <View style={[StyleSheet.absoluteFill, styles.under]}>
        <WalkMap
          {...props.mapBase}
          trace={live.runs}
          rides={live.rides}
          walked={NONE}
          fog={NONE}
          captures={captures}
          walker={live.here}
          walkerSource={live.dot}
          walkerHeading={live.heading}
          glideWalker
          marks={props.dest ? [props.dest.at] : undefined}
          initialCenter={center}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  under: { zIndex: 0 },
  over: { zIndex: 1 },
  top: { position: 'absolute', left: 16, right: 16, gap: 8, maxWidth: 640, alignSelf: 'center' },
  floatRow: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  // Over the drawer: the row is never hidden by it (U1).
  row: { zIndex: 2 },
  grip: { height: GRIP_H - 25 },
  foot: { height: FOOT_H, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center', gap: 6, maxWidth: 640, width: '100%', alignSelf: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44, maxWidth: '100%' },
  peekLine: { fontSize: 14, color: theme.muted, flexShrink: 1 },
  startBtn: { minWidth: 220, borderRadius: 999, paddingHorizontal: 24 },
});
