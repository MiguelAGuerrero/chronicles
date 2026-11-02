import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KindSwitches, RangeSlider, walkNote } from '../../components/ExploreSettings';
import { SwitchRow } from '../../components/SwitchRow';
import { SheetFrame, type SheetSize } from '../../components/HomeSheet';
import { CaptureRow, MomentBar } from '../../components/MomentBar';
import { NotificationSettings } from '../../components/NotificationSettings';
import { useOpenWalk, useOpenWalkInfo } from '../../components/OpenWalk';
import { WalkMap } from '../../components/map/WalkMap';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import { db } from '../../lib/db';
import { useVisible } from '../../lib/deletion/useDeletions';
import { clampRange, type Kind } from '../../lib/explore/explore';
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
import { useStartWalk } from '../../lib/useStartWalk';
import { useTabMap } from '../../lib/useTabMap';

const NONE: never[] = [];
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** The drawer's grip: the handle and a strip under it, one thumb tall. */
const GRIP_H = 44;
/** The drawer's foot, docked at its bottom at every height: Start and the line under it (U1, AllTrails' sticky Start). */
const FOOT_H = 92;
/** The drawer's peek: its grip and its foot (NV19). */
const DRAWER_PEEK = GRIP_H + FOOT_H;
/** The capture row's gap above the peeking drawer. It stays there at every height (U1). */
const ROW_GAP = 12;
/** The capture row's own height. */
const ROW_H = 52;
/** Opened, the drawer keeps a band under the row, so its settings scroll above the row and Start, never under them (U1). */
const ROW_BAND = GRIP_H + ROW_GAP + ROW_H + 10;
/** A new fix this far from the last recentres the map; a nearer one only moves the dot (NV3, NV17). */
const RECENTER_M = 100;
/** Meta: the web's "keep this page open" note was dismissed (U9). */
const WEB_NOTE_KEY = 'web_note_dismissed';

/**
 * Navigate (NV17-NV28): a map around where you are, from one fix read each
 * time the tab comes to the front (nothing tracks in between), quick capture,
 * and the pre-start drawer. Start sits at the drawer's foot and starts at once
 * with the saved choices; the drawer holds the extras, each saved as it changes
 * to the meta the walk reads. Start and the capture row stay docked low at
 * every height; the settings scroll above them (U1).
 *
 * With a walk open and minimized, it is a live view of that walk (U2): its
 * growing trace, the walker, its captures and its destination, and the
 * capture row keeps captures for it. The recording bar is the way back; the
 * drawer stays at its peek. Only the live layers follow the walk: this screen
 * re-renders when the walk starts, pauses, resumes or stops (perf).
 */
export default function Navigate() {
  perfCount('render:navigate');
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
  const [chosenSize, setSize] = useState<SheetSize>('peek');
  // With a walk open the drawer stays at its peek: its choices are for the next walk (U2).
  const size: SheetSize = open ? 'peek' : chosenSize;
  const [sheetH, setSheetH] = useState(DRAWER_PEEK);
  const [memoOn, setMemoOn] = useState(false);

  // Each time the tab comes to the front: the choices (the walk's options card may have changed them).
  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        const [m, d, s, walks, note] = await Promise.all([
          db.getMeta(START_MODE_KEY).catch(() => null),
          loadPendingDest(),
          loadSettings().catch(() => DEFAULT_SETTINGS),
          db.listWalks().catch(() => [] as Walk[]),
          db.getMeta(WEB_NOTE_KEY).catch(() => null),
        ]);
        if (!live) return;
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
    if (state === 'placed') findForMoment(c).catch(() => {});
  }, []);
  const onMomentError = useCallback((e: { message: string; openSettings?: boolean }) => setMomentError(e), []);

  // Mid-memo, or with a walk open, the drawer stays down (audit, U2).
  const resize = (s: SheetSize) => {
    if ((memoOn || open) && s !== 'peek') return;
    setSize(s);
  };
  const ringShown = size === 'full' && mode === 'explore' && fix && !open;
  // At the peek, the mode and the destination; opened, the mode is on show above, so only the destination (U12).
  const peekLine = open
    ? walkDest
      ? `Your walk · to ${walkDest.label}`
      : 'Your walk is recording'
    : [size === 'peek' ? (mode === 'explore' ? 'Explore' : 'Quiet') : null, dest ? destLine(dest, fix) : null].filter(Boolean).join(' · ');

  const mapBase: MapBase = {
    // The destination is set only here, and only before a walk (NV23): a long press, with its ring.
    onLongPress: (at) => {
      if (open || memoOn) return;
      chooseDest({ at, label: 'Your spot', kind: 'point' });
    },
    fitBounds: fit.bounds,
    fitKey: fit.key,
    onFitSettled,
    fitPadding: { top: insets.top + 60, right: 48, bottom: sheetH + ROW_GAP + ROW_H + 60, left: 48 },
    initialZoom: savedCamera?.zoom ?? (fix || open ? 15 : WORLD.zoom),
    onCameraChange,
    attributionTop: true,
  };
  const rowStyle = [styles.floatRow, styles.row, { bottom: DRAWER_PEEK + ROW_GAP }];

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
                captures={NONE}
                walker={fix}
                marks={dest ? [dest.at] : undefined}
                ring={ringShown ? { center: fix, radiusM: settings.rangeM } : null}
                initialCenter={savedCamera?.center ?? fix ?? WORLD.center}
              />
            )}
          </View>
        </>
      )}

      <View style={[StyleSheet.absoluteFill, styles.over]} pointerEvents="box-none">
        <SheetFrame
          testID="navigate-drawer"
          dragTestID="drawer-drag"
          size={size}
          onSize={resize}
          peek={DRAWER_PEEK}
          bottomInset={0}
          areaHeight={areaH}
          onHeight={setSheetH}
          // The grip: the handle and a strip under it, so the drawer is easy to take hold of.
          header={<View style={styles.grip} />}
        >
          <View style={styles.body}>
            {size !== 'peek' && (
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                {/* At half: the mode and the destination (NV20). */}
                <Text style={styles.section} accessibilityRole="header">Mode</Text>
                <View style={styles.segment} accessibilityRole="radiogroup">
                  {(['quiet', 'explore'] as const).map((m) => (
                    <Pressable
                      key={m}
                      testID={`mode-${m}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: mode === m }}
                      aria-checked={mode === m}
                      accessibilityLabel={m === 'quiet' ? 'Quiet: the way and your captures' : 'Explore: shows places to find as you get close'}
                      onPress={() => pickMode(m)}
                      style={[styles.segmentBtn, mode === m && styles.segmentOn]}
                    >
                      <Icon name={m === 'quiet' ? 'walk-outline' : 'compass-outline'} size={18} color={mode === m ? '#ffffff' : theme.ink} />
                      <Text style={[styles.segmentText, mode === m && styles.segmentTextOn]}>{m === 'quiet' ? 'Quiet' : 'Explore'}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.section} accessibilityRole="header">Destination</Text>
                {dest ? (
                  <View style={styles.destRow}>
                    <Icon name="flag-outline" size={20} color={theme.ink} />
                    <Text testID="drawer-dest" style={styles.destText} numberOfLines={2}>{destLine(dest, fix)}</Text>
                    <Pressable testID="dest-clear" accessibilityRole="button" accessibilityLabel="Clear the destination" onPress={() => chooseDest(null)} style={styles.clear} hitSlop={6}>
                      <Text style={styles.clearText}>Clear</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.sub}>None: Start wanders from where you are.</Text>
                )}
                <Text style={styles.sub}>Long-press the map to pick a spot.</Text>

                {/* At full: what I'm into and the range, only for Explore (NV21); then reminders and alerts. */}
                {size === 'full' && (
                  <>
                    {mode === 'explore' && (
                      <>
                        <Text style={styles.section} accessibilityRole="header">“?” range</Text>
                        <Text style={styles.sub}>
                          A “?” shows for places within {settings.rangeM} m of you, {walkNote(settings.rangeM)}.
                          {fix ? ' The ring on the map shows how far that is.' : ' The ring shows on the map once there’s a position.'}
                        </Text>
                        <RangeSlider value={settings.rangeM} onChange={(m) => changeSettings({ ...settings, rangeM: clampRange(m) })} />
                        <Text style={styles.section} accessibilityRole="header">What I’m into</Text>
                        <KindSwitches hidden={settings.hidden} onToggle={toggleKind} />
                      </>
                    )}
                    <Text style={styles.section} accessibilityRole="header">Reminders and alerts</Text>
                    {/* The pocket alert is a tap you feel; a browser has none to give (E19). */}
                    {Platform.OS !== 'web' && (
                      <SwitchRow
                        testID="pocket-alert"
                        label="Pocket alert"
                        note="A soft tap when a “?” comes into range. Never on a quiet walk."
                        value={settings.haptic}
                        onChange={(haptic) => changeSettings({ ...settings, haptic })}
                      />
                    )}
                    {/* Each switch saves as it changes, and turning one on asks permission from that tap (NV24). Its
                        own heading would repeat this one (U12). */}
                    <NotificationSettings heading={false} />
                  </>
                )}
              </ScrollView>
            )}
          </View>
          {/* Opened, a band under the capture row, so nothing scrolls under it (U1). */}
          {size !== 'peek' && <View style={styles.band} />}
          {/* The foot: Start, docked at the drawer's bottom at every height (NV19, U1). */}
          <View testID="drawer-foot" style={styles.foot}>
            {open ? null : (
              // Start just starts, where you are, with the saved choices (NV19, NV25); never waits on a fix (NV28).
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
            )}
            {peekLine ? <Text testID="peek-choices" style={styles.peekLine} numberOfLines={1}>{peekLine}</Text> : null}
          </View>
        </SheetFrame>
      </View>

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
  'onLongPress' | 'fitBounds' | 'fitKey' | 'onFitSettled' | 'fitPadding' | 'initialZoom' | 'onCameraChange' | 'attributionTop'
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
  band: { height: ROW_BAND },
  foot: { height: FOOT_H, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center', gap: 6, maxWidth: 640, width: '100%', alignSelf: 'center' },
  peekLine: { fontSize: 14, color: theme.muted, maxWidth: '100%' },
  startBtn: { minWidth: 220, borderRadius: 999, paddingHorizontal: 24 },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  section: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 6 },
  sub: { fontSize: 13, color: theme.muted },
  label: { fontSize: 15, color: theme.ink },
  segment: { flexDirection: 'row', borderRadius: 22, borderWidth: 1, borderColor: theme.edge, overflow: 'hidden', alignSelf: 'flex-start' },
  segmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 18, backgroundColor: theme.surface },
  segmentOn: { backgroundColor: theme.ink },
  segmentText: { fontSize: 15, fontWeight: '600', color: theme.ink },
  segmentTextOn: { color: '#ffffff' },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  destText: { flex: 1, fontSize: 15, color: theme.ink },
  clear: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: theme.edge },
  clearText: { fontSize: 15, fontWeight: '600', color: theme.ink },
});
