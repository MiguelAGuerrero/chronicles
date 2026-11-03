import { useEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { clampRange, type Kind } from '../lib/explore/explore';
import type { ExploreSettings as Settings } from '../lib/explore/settings';
import type { Waypoint } from '../lib/nav/types';
import { destLine, type StartMode } from '../lib/startPlan';
import { saveUnits } from '../lib/unitsStore';
import { useUnits } from '../lib/useUnits';
import type { LngLat } from '../lib/types';
import { KindSwitches, RangeSlider, walkNote } from './ExploreSettings';
import { Icon } from './icons';
import { Modal } from './Modal';
import { NotificationSettings } from './NotificationSettings';
import { SwitchRow } from './SwitchRow';
import { Button, theme } from './ui';

/**
 * Navigate's walk settings as one dialog, in one scroll (the owner, Nov 3,
 * after AllTrails' Start dialog: the settings were split between the peek and
 * a drawer pulled up beyond it). Mode and destination first; Explore's range
 * and what I'm into only with Explore chosen; then reminders and alerts. Each
 * choice saves as it changes, so Done only closes. Start walk inside starts as
 * the peek's Start does.
 */
export function StartDialog(props: {
  visible: boolean;
  mode: StartMode;
  dest: Waypoint | null;
  fix: LngLat | null;
  settings: Settings;
  starting: boolean;
  startDisabled: boolean;
  onMode: (m: StartMode) => void;
  onClearDest: () => void;
  onSettings: (s: Settings) => void;
  onToggleKind: (k: Kind, on: boolean) => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const { mode, dest, fix, settings, visible } = props;
  // Distances in km or miles (QL16): saved as it changes, every screen redraws at once.
  const units = useUnits();
  // Escape on the web: react-native-web's Modal doesn't send it to onRequestClose.
  const closeRef = useRef(props.onClose);
  useEffect(() => {
    closeRef.current = props.onClose;
  });
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      closeRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.back}>
        <Pressable testID="start-dialog-back" style={StyleSheet.absoluteFill} onPress={props.onClose} accessible={false} />
        <View testID="start-dialog" style={styles.sheet} accessibilityViewIsModal>
          {/* The grip, as on the peek below: a tap on it closes, as Done does. */}
          <Pressable testID="start-dialog-done" accessibilityRole="button" accessibilityLabel="Done" onPress={props.onClose} style={styles.gripHit}>
            <View style={styles.grip} />
          </Pressable>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Text style={styles.title} accessibilityRole="header">Walk settings</Text>
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
                  onPress={() => props.onMode(m)}
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
                <Pressable testID="dest-clear" accessibilityRole="button" accessibilityLabel="Clear the destination" onPress={props.onClearDest} style={styles.clear}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.sub}>None: Start wanders from where you are.</Text>
            )}
            <Text style={styles.sub}>Long-press the map to pick a spot (close this first).</Text>

            {mode === 'explore' && (
              <>
                <Text style={styles.section} accessibilityRole="header">“?” range</Text>
                <Text style={styles.sub}>
                  A “?” shows for places within {settings.rangeM} m of you, {walkNote(settings.rangeM)}.
                  {fix ? ' The ring on the map shows how far that is.' : ' The ring shows on the map once there’s a position.'}
                </Text>
                <RangeSlider value={settings.rangeM} onChange={(m) => props.onSettings({ ...settings, rangeM: clampRange(m) })} />
                <Text style={styles.section} accessibilityRole="header">What I’m into</Text>
                <KindSwitches hidden={settings.hidden} onToggle={props.onToggleKind} />
              </>
            )}

            <View style={styles.rule} />
            <Text style={styles.title} accessibilityRole="header">Reminders and alerts</Text>
            {/* The pocket alert is a tap you feel; a browser has none to give (E19). */}
            {Platform.OS !== 'web' && (
              <SwitchRow
                testID="pocket-alert"
                label="Pocket alert"
                note="A soft tap when a “?” comes into range. Never on a quiet walk."
                value={settings.haptic}
                onChange={(haptic) => props.onSettings({ ...settings, haptic })}
              />
            )}
            {/* Each switch saves as it changes, and turning one on asks permission from that tap (NV24). */}
            <NotificationSettings heading={false} />

            <View style={styles.rule} />
            <Text style={styles.title} accessibilityRole="header">Distances</Text>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {(['km', 'mi'] as const).map((u) => (
                <Pressable
                  key={u}
                  testID={`units-${u}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: units === u }}
                  aria-checked={units === u}
                  accessibilityLabel={u === 'km' ? 'Kilometres and metres' : 'Miles and feet'}
                  onPress={() => void saveUnits(u)}
                  style={[styles.segmentBtn, units === u && styles.segmentOn]}
                >
                  <Text style={[styles.segmentText, units === u && styles.segmentTextOn]}>{u === 'km' ? 'km' : 'miles'}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.foot}>
            <Button
              testID="start-dialog-start"
              label="Start walk"
              onPress={props.onStart}
              busy={props.starting}
              busyLabel="Starting…"
              disabled={props.startDisabled}
              tall
              style={styles.startBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', alignItems: 'center' },
  // Nearly the full height, as AllTrails' Start sheet (Nov 3): the settings read as one list above a wide Start.
  sheet: {
    width: '100%', maxWidth: 640, height: '92%', backgroundColor: theme.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
  },
  gripHit: { height: 44, alignItems: 'center', justifyContent: 'center' },
  grip: { width: 40, height: 5, borderRadius: 3, backgroundColor: theme.muted, opacity: 0.6 },
  title: { fontSize: 22, fontWeight: '700', color: theme.ink, marginTop: 4 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.edge, marginTop: 8 },
  foot: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  startBtn: { alignSelf: 'stretch', borderRadius: 999 },
  section: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 6 },
  sub: { fontSize: 13, color: theme.muted },
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
