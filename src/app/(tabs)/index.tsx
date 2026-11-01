import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KindSwitches, RangeSlider, walkNote } from '../../components/ExploreSettings';
import { SheetFrame, type SheetSize } from '../../components/HomeSheet';
import { MomentBar } from '../../components/MomentBar';
import { NotificationSettings } from '../../components/NotificationSettings';
import { WalkMap } from '../../components/map/WalkMap';
import { Icon } from '../../components/icons';
import { Banner, Button, theme } from '../../components/ui';
import { db } from '../../lib/db';
import { clampRange, type Kind } from '../../lib/explore/explore';
import { findForMoment } from '../../lib/explore/momentFind';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ExploreSettings } from '../../lib/explore/settings';
import { boundsOf, distanceM, type Bounds } from '../../lib/geo';
import { getLastFix, setLastFix } from '../../lib/lastFix';
import { locateOnce } from '../../lib/locate';
import { loadPendingDest, savePendingDest } from '../../lib/nav/store';
import type { Waypoint } from '../../lib/nav/types';
import { perfCount } from '../../lib/perfCount';
import { recorder } from '../../lib/recorder';
import { destLine, parseStartMode, START_MODE_KEY, type StartMode } from '../../lib/startPlan';
import type { Capture, LngLat, Walk } from '../../lib/types';
import type { MomentState } from '../../lib/useCaptures';
import { useStartWalk } from '../../lib/useStartWalk';
import { useTabMap } from '../../lib/useTabMap';

const NONE: never[] = [];
const WORLD = { center: [-40, 30] as [number, number], zoom: 1.2 };
/** The drawer's peek: Start, the mode and the destination (NV19). */
const DRAWER_PEEK = 112;
/** Room above the drawer at every height for the capture row (52 px) and its gap: it is always one tap away (rev 34). */
const ROW_RESERVE = 84;
/** A new fix this far from the last recentres the map; a nearer one only moves the dot (NV3, NV17). */
const RECENTER_M = 100;

/**
 * Navigate (NV17-NV28): a map around where you are, from one fix read each
 * time the tab comes to the front (nothing tracks in between), quick capture,
 * and the pre-start drawer. Start sits at the drawer's peek and starts at once
 * with the saved choices; the drawer holds the extras, each saved as it changes
 * to the meta the walk reads.
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
  const [open, setOpen] = useState<Walk | null>(null);
  const [paused, setPaused] = useState(false);
  const [firstWalk, setFirstWalk] = useState(false);
  // The drawer's choices (NV20-NV22), read from meta and saved as they change.
  const [mode, setModeState] = useState<StartMode>('quiet');
  const [dest, setDest] = useState<Waypoint | null>(null);
  const [settings, setSettings] = useState<ExploreSettings>(DEFAULT_SETTINGS);
  const [size, setSize] = useState<SheetSize>('peek');
  const [sheetAnim] = useState(() => new Animated.Value(DRAWER_PEEK));
  const [aboveSheet] = useState(() => ({ bottom: Animated.add(sheetAnim, 16) }));
  const [sheetH, setSheetH] = useState(DRAWER_PEEK);
  const [memoOn, setMemoOn] = useState(false);

  // Each time the tab comes to the front: the choices (the walk's options card may have changed
  // them), whether a walk is open, and one fix (NV17), which ends its own watch.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        const [m, d, s, w, walks] = await Promise.all([
          db.getMeta(START_MODE_KEY).catch(() => null),
          loadPendingDest(),
          loadSettings().catch(() => DEFAULT_SETTINGS),
          db.getOpenWalk().catch(() => null),
          db.listWalks().catch(() => [] as Walk[]),
        ]);
        if (!live) return;
        setModeState(parseStartMode(m));
        setDest(d);
        setSettings(s);
        setOpen(w);
        setFirstWalk(walks.length === 0);
        if (w) db.getPauses(w.id).then((p) => live && setPaused(p.some((x) => x.ended_at == null)), () => {});
      })().catch(() => {});
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
    }, []),
  );

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

  const onMoment = useCallback((c: Capture, state: MomentState) => {
    // A moment finds a place as a walk's capture does (M4); Chronicle reads it when it comes to the front.
    if (state === 'placed') findForMoment(c).catch(() => {});
  }, []);
  const onMomentError = useCallback((e: { message: string; openSettings?: boolean }) => setMomentError(e), []);

  // Mid-memo the drawer stays down: opening it would hide the memo's controls (audit).
  const resize = (s: SheetSize) => {
    if (memoOn && s !== 'peek') return;
    setSize(s);
  };
  const ringShown = size === 'full' && mode === 'explore' && fix && !open;
  const peekLine = [mode === 'explore' ? 'Explore' : 'Quiet', dest ? destLine(dest, fix) : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.screen}>
      {/* The capture row rides on the drawer, one tap away at every height (NV18, NV19, rev 34): the
          drawer never grows over it. */}
      {!open && (
        <Animated.View style={[styles.floatRow, styles.over, aboveSheet]} pointerEvents="box-none">
          <MomentBar disabled={walkStart.starting} onMoment={onMoment} onError={onMomentError} onRecording={setMemoOn} />
        </Animated.View>
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
          topReserve={ROW_RESERVE}
          height={sheetAnim}
          onHeight={setSheetH}
          header={
            <View style={styles.peek}>
              {open ? (
                // A walk is open (it is usually in front): the way back to it.
                <Button
                  testID="resume"
                  label={`Return to your walk, ${paused ? 'paused' : 'recording'}`}
                  onPress={() => router.push('/walk')}
                  tall
                  style={styles.startBtn}
                >
                  <View style={styles.recordingRow}>
                    <View style={styles.dot} />
                    <Text style={styles.resumeText}>{paused ? 'Paused' : 'Recording'} · Return</Text>
                  </View>
                </Button>
              ) : (
                <>
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
                  <Text testID="peek-choices" style={styles.peekLine} numberOfLines={1}>{peekLine}</Text>
                </>
              )}
            </View>
          }
        >
          {!open && size !== 'peek' && (
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
                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Pocket alert</Text>
                        <Text style={styles.sub}>A soft tap when a “?” comes into range. Never on a quiet walk.</Text>
                      </View>
                      <Switch testID="pocket-alert" accessibilityLabel="Pocket alert" value={settings.haptic} onValueChange={(haptic) => changeSettings({ ...settings, haptic })} />
                    </View>
                  )}
                  {/* Each switch saves as it changes, and turning one on asks permission from that tap (NV24). */}
                  <NotificationSettings />
                </>
              )}
            </ScrollView>
          )}
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
        {firstWalk && !open && !recorder.capabilities.background && (
          <Banner>On the web, a walk is traced while this page is open and on screen.</Banner>
        )}
      </View>

      <View style={[StyleSheet.absoluteFill, styles.under]}>
        {/* Only while Navigate is in front (NV4): one map is live at a time. */}
        {focused && (
          <WalkMap
            trace={NONE}
            walked={NONE}
            fog={NONE}
            captures={NONE}
            walker={fix}
            marks={dest ? [dest.at] : undefined}
            ring={ringShown ? { center: fix, radiusM: settings.rangeM } : null}
            // The destination is set only here (NV23): a long press, with its ring.
            onLongPress={(at) => {
              if (open || memoOn) return;
              chooseDest({ at, label: 'Your spot', kind: 'point' });
            }}
            fitBounds={fit.bounds}
            fitKey={fit.key}
            onFitSettled={onFitSettled}
            fitPadding={{ top: insets.top + 60, right: 48, bottom: sheetH + 120, left: 48 }}
            initialCenter={savedCamera?.center ?? fix ?? WORLD.center}
            initialZoom={savedCamera?.zoom ?? (fix ? 15 : WORLD.zoom)}
            onCameraChange={onCameraChange}
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
  top: { position: 'absolute', left: 16, right: 16, gap: 8, maxWidth: 640, alignSelf: 'center' },
  floatRow: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  peek: { paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center', gap: 6, maxWidth: 640, width: '100%', alignSelf: 'center' },
  peekLine: { fontSize: 14, color: theme.muted, maxWidth: '100%' },
  startBtn: { minWidth: 220, borderRadius: 999, paddingHorizontal: 24 },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accentInk },
  resumeText: { color: theme.accentInk, fontSize: 16, fontWeight: '600' },
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
});
