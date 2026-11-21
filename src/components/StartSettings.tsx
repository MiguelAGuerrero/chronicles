import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { YOUR_DATA, YOUR_DATA_NOTE } from '../lib/backup/core';
import { canBuzz } from '../lib/canBuzz';
import { clampPass, clampRange, intoRowShown, POCKET_ALERT_NOTE } from '../lib/explore/explore';
import type { ExploreSettings as Settings } from '../lib/explore/settings';
import type { Waypoint } from '../lib/nav/types';
import { destLine } from '../lib/startPlan';
import { saveUnits } from '../lib/unitsStore';
import { useDistance } from '../lib/useUnits';
import type { LngLat } from '../lib/types';
import { PASS_SCALE, passNote, RangeSlider, walkNote } from './ExploreSettings';
import { IntoRow } from './IntoRow';
import { PageRow } from './PageRow';
import { routeLeanings } from '../lib/routeLeanings';
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
 * destination first; Explore's range and the row to What I'm into's page
 * (decision 0192) only with Explore chosen; then reminders and alerts, and distances. Each choice saves as it
 * changes (NV22); Start stays at the bar's foot below.
 */
export function StartSettings(props: {
  dest: Waypoint | null;
  fix: LngLat | null;
  settings: Settings;
  onClearDest: () => void;
  onSettings: (s: Settings) => void;
  /** The map's layers: what each one that is on shows, here and not over the map. */
  layers?: ReturnType<typeof useLayers>;
}) {
  const { dest, fix, settings } = props;
  const grouping = useStore(momentPill.store, (st) => st.grouping);
  const sightsOn = useStore(routeLeanings.store, (s) => s.includes('sights'));
  // Distances in km or miles (QL16): saved as it changes, every screen redraws at once. Every line below takes the
  // units as an input, so the React Compiler builds it again on a switch (tend map 23).
  const { units, range } = useDistance();
  return (
    <View testID="start-settings" style={styles.content}>
      <Text style={styles.title} accessibilityRole="header">Walk settings</Text>
      <Text style={styles.section} accessibilityRole="header">Destination</Text>
      {dest ? (
        <View style={styles.destRow}>
          <Icon name="flag-outline" size={20} color={theme.ink} />
          <Text testID="drawer-dest" style={styles.destText} numberOfLines={2}>{destLine(dest, fix, units)}</Text>
          <Pressable testID="dest-clear" accessibilityRole="button" accessibilityLabel="Clear the destination" onPress={props.onClearDest} style={styles.clear}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.sub}>None: Start wanders from where you are.</Text>
      )}
      <Text style={styles.sub}>Long-press the map to pick a spot (lower this first).</Text>
      <RouteLeaningSettings />

      {(
        <>
          <Text style={styles.section} accessibilityRole="header">“?” range</Text>
          <Text style={styles.sub}>
            With Places on, a “?” shows for places within {range(settings.rangeM)} of you, {walkNote(settings.rangeM)}.
            {fix ? ' The ring on the map shows how far that is.' : ' The ring shows on the map once there’s a position.'}
          </Text>
          <RangeSlider value={settings.rangeM} onChange={(m) => props.onSettings({ ...settings, rangeM: clampRange(m) })} />
          <Text style={styles.section} accessibilityRole="header">Passing a place</Text>
          <Text style={styles.sub}>{passNote(settings.passM, units)}</Text>
          <RangeSlider scale={PASS_SCALE} value={settings.passM} onChange={(m) => props.onSettings({ ...settings, passM: clampPass(m) })} />
        </>
      )}
      {/* WI1: one row where the list was; the kinds and Complexes are on its page (decision 0192). Scenic routes' Sights
          read the kinds too, so it shows with Explore or Sights on (what-im-into-page audit 6, the owner, Nov 18). */}
      {intoRowShown({ places: !!props.layers?.on.places, sights: sightsOn }) && <IntoRow />}

      {props.layers ? <LayersKey map="navigate" layers={props.layers} heading="On the map" headingStyle={styles.section} /> : null}

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

      {/* Your data (BK1, BK13; decisions 0241, 0249): the drawer's last row, its words in ink and a chevron, its second line
          saying what is there; a page pushed on the stack. Navigate goes to the page already up, never a second copy. */}
      <View style={styles.rule} />
      <PageRow testID="your-data-row" label={YOUR_DATA} note={YOUR_DATA_NOTE} onOpen={() => router.navigate('/your-data?from=ready')} />
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
