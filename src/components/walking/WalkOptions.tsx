import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { KindSwitches, RangeSlider, walkNote } from '../ExploreSettings';
import { Icon } from '../icons';
import { LayersKey } from '../LayersControl';
import { NotificationSettings } from '../NotificationSettings';
import { RouteLeaningSettings } from '../RouteLeaningSettings';
import { SwitchRow } from '../SwitchRow';
import { theme } from '../ui';
import { canBuzz } from '../../lib/canBuzz';
import { clampRange, POCKET_ALERT_NOTE } from '../../lib/explore/explore';
import { askMotion } from '../../lib/walkMotion';
import type { WalkExplore } from './useWalkExplore';
import type { WalkLayers } from './useWalkLayers';

/**
 * The walk's options, the strip's drawer (A2, the owner, Nov 4): Explore and, with it on, the "?" range
 * and what I'm into; the layers' key; the pocket alert; route leanings; reminders; motion; Share GPS log.
 */
export function WalkOptions(props: {
  exploring: boolean;
  onExplore: (on: boolean) => void;
  ex: WalkExplore;
  layers: WalkLayers;
  hasHere: boolean;
  motionAccess: string;
  onShareLog: () => void;
}) {
  const { exploring, ex, motionAccess } = props;
  const { loaded, settings, changeSettings, toggleKind } = ex;
  const { layers } = props.layers;
  return (
    <View testID="options-card" style={styles.drawer}>
      <Text style={styles.spotTitle} accessibilityRole="header">This walk</Text>
      <View style={styles.optionRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionLabel}>Explore</Text>
          <Text style={styles.markSub}>
            {exploring
              ? 'Places to find show as “?” when they’re close, with busy streets and reminders.'
              : 'Off: a quiet walk, just navigation and your captures. Captures still find places.'}
          </Text>
        </View>
        <Switch testID="explore-walk" accessibilityLabel="Explore" value={exploring} onValueChange={props.onExplore} />
      </View>
      {exploring && loaded && (
        <>
          <Text style={styles.optionSection} accessibilityRole="header">“?” range</Text>
          <Text style={styles.markSub}>
            A “?” shows for places within {settings.rangeM} m of you, {walkNote(settings.rangeM)}.
            {props.hasHere ? ' The ring on the map shows how far that is.' : ' The ring shows on the map once there’s a position.'}
          </Text>
          <RangeSlider value={settings.rangeM} onChange={(m) => changeSettings({ ...settings, rangeM: clampRange(m) })} />
          <Text style={styles.optionSection} accessibilityRole="header">What I’m into</Text>
          <KindSwitches hidden={settings.hidden} onToggle={toggleKind} />
        </>
      )}
      {Object.values(layers.on).some(Boolean) && (
        <>
          <Text style={styles.optionSection} accessibilityRole="header">On the map</Text>
          <LayersKey layers={layers} />
        </>
      )}
      {/* The pocket alert is a nudge you feel: on every phone, and on a touch-screen browser (E19, PA6). */}
      {canBuzz() && loaded && (
        <SwitchRow
          testID="pocket-alert"
          label="Pocket alert"
          note={POCKET_ALERT_NOTE}
          value={settings.haptic}
          onChange={(haptic) => changeSettings({ ...settings, haptic })}
        />
      )}
      <RouteLeaningSettings sectionStyle={styles.optionSection} />
      <NotificationSettings heading={false} />
      {motionAccess !== 'on' && (
        // Without motion the walk goes on, on the GPS filters alone (Motion, MO2).
        <View testID="motion-off" style={styles.optionRow}>
          <Icon name="walk-outline" size={20} color={theme.ink} />
          <Text style={[styles.markSub, { flex: 1 }]}>
            {motionAccess === 'unavailable'
              ? 'Motion isn’t available here: standing still may drift.'
              : motionAccess === 'denied'
                ? Platform.OS === 'web'
                  ? 'Motion is blocked: allow Motion & Orientation Access in Settings › Safari. Standing still may drift.'
                  : 'Motion is blocked: allow Motion & Fitness for Chronicles in Settings. Standing still may drift.'
                : 'Motion off: standing still may drift.'}
          </Text>
          {(motionAccess === 'off' || motionAccess === 'denied') && (
            <Pressable testID="motion-on" accessibilityRole="button" accessibilityLabel="Turn on motion" onPress={() => void askMotion()} hitSlop={8}>
              <Text style={styles.optionLabel}>Turn on</Text>
            </Pressable>
          )}
        </View>
      )}
      <Pressable
        testID="share-gps-log"
        accessibilityRole="button"
        accessibilityLabel="Share this walk’s GPS log, to help fix location problems"
        onPress={props.onShareLog}
        style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
      >
        <Icon name="share-outline" size={20} color={theme.ink} />
        <Text style={[styles.optionLabel, { flex: 1 }]}>Share GPS log</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  spotTitle: { fontSize: 16, fontWeight: '700', color: theme.ink },
  markSub: { fontSize: 14, color: theme.muted },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: theme.ink },
  optionSection: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 8 },
  drawer: { paddingHorizontal: 16, paddingBottom: 8, gap: 4, maxWidth: 640, width: '100%', alignSelf: 'center' },
  pressed: { opacity: 0.8 },
});
