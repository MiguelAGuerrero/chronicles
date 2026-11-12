import { Pressable, StyleSheet, Text, View } from 'react-native';
import { canBuzz } from '../lib/canBuzz';
import { clampPass, clampRange, POCKET_ALERT_NOTE, type Kind } from '../lib/explore/explore';
import type { ExploreSettings as Settings } from '../lib/explore/settings';
import type { Waypoint } from '../lib/nav/types';
import { formatRange } from '../lib/format';
import { destLine, type StartMode } from '../lib/startPlan';
import { saveUnits } from '../lib/unitsStore';
import { useUnits } from '../lib/useUnits';
import type { LngLat } from '../lib/types';
import { ComplexKindSwitches, KindSwitches, PASS_SCALE, passNote, RangeSlider, walkNote } from './ExploreSettings';
import { Icon } from './icons';
import { LayersKey } from './LayersControl';
import type { useLayers } from '../lib/layers/useLayers';
import { NotificationSettings } from './NotificationSettings';
import { RouteLeaningSettings } from './RouteLeaningSettings';
import { SwitchRow } from './SwitchRow';
import { momentPill } from '../lib/momentPill';
import { useStore } from '../lib/useStore';

import { theme } from './ui';

/** What Group captures does, and what it costs (MS18): said plainly, never sold. */
const GROUP_NOTE = 'Captures join the moment just made; a separate moment takes New moment first.';

/**
 * The walk's settings, inside the ready bar pulled up (NR7; the owner, Nov 3:
 * "You pull up the drawer. The bar should be a quick start"). Mode and
 * destination first; Explore's range and what I'm into only with Explore
 * chosen; then reminders and alerts, and distances. Each choice saves as it
 * changes (NV22); Start stays at the bar's foot below.
 */
export function StartSettings(props: {
  mode: StartMode;
  dest: Waypoint | null;
  fix: LngLat | null;
  settings: Settings;
  onMode: (m: StartMode) => void;
  onClearDest: () => void;
  onSettings: (s: Settings) => void;
  onToggleKind: (k: Kind, on: boolean) => void;
  /** The map's layers: what each one that is on shows, here and not over the map. */
  layers?: ReturnType<typeof useLayers>;
}) {
  const { mode, dest, fix, settings } = props;
  const grouping = useStore(momentPill.store, (st) => st.grouping);
  // Distances in km or miles (QL16): saved as it changes, every screen redraws at once.
  const units = useUnits();
  return (
    <View testID="start-settings" style={styles.content}>
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
      <Text style={styles.sub}>Long-press the map to pick a spot (lower this first).</Text>
      <RouteLeaningSettings />

      {mode === 'explore' && (
        <>
          <Text style={styles.section} accessibilityRole="header">“?” range</Text>
          <Text style={styles.sub}>
            A “?” shows for places within {formatRange(settings.rangeM)} of you, {walkNote(settings.rangeM)}.
            {fix ? ' The ring on the map shows how far that is.' : ' The ring shows on the map once there’s a position.'}
          </Text>
          <RangeSlider value={settings.rangeM} onChange={(m) => props.onSettings({ ...settings, rangeM: clampRange(m) })} />
          <Text style={styles.section} accessibilityRole="header">Passing a place</Text>
          <Text style={styles.sub}>{passNote(settings.passM)}</Text>
          <RangeSlider scale={PASS_SCALE} value={settings.passM} onChange={(m) => props.onSettings({ ...settings, passM: clampPass(m) })} />
          <Text style={styles.section} accessibilityRole="header">What I’m into</Text>
          <KindSwitches hidden={settings.hidden} onToggle={props.onToggleKind} />
          <ComplexKindSwitches sectionStyle={styles.section} />
        </>
      )}

      {props.layers && Object.values(props.layers.on).some(Boolean) ? (
        <>
          <Text style={styles.section} accessibilityRole="header">On the map</Text>
          <LayersKey layers={props.layers} />
        </>
      ) : null}

      <View style={styles.rule} />
      <Text style={styles.title} accessibilityRole="header">Reminders and alerts</Text>
      {/* The pocket alert is a nudge you feel: on every phone, and on a touch-screen browser that can vibrate (E19, PA6). */}
      {canBuzz() && (
        <SwitchRow
          testID="pocket-alert"
          label="Pocket alert"
          note={POCKET_ALERT_NOTE}
          value={settings.haptic}
          onChange={(haptic) => props.onSettings({ ...settings, haptic })}
        />
      )}
      {/* Moment stacks (MS18): off by default; its line says the cost plainly. */}
      <SwitchRow
        testID="group-captures"
        label="Group captures into one moment"
        note={GROUP_NOTE}
        value={grouping}
        onChange={(on) => void momentPill.setGrouping(on)}
      />
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
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: theme.ink, marginTop: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.edge, marginTop: 8 },
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
