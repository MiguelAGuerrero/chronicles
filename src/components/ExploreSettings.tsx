import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, type LayoutChangeEvent } from 'react-native';
import { clampRange, EXPLORE_RULES, KINDS, type Kind } from '../lib/explore/explore';
import { loadSettings, saveSettings, type ExploreSettings as Settings } from '../lib/explore/settings';
import { Icon, type IconName } from './icons';
import { NotificationSettings } from './NotificationSettings';
import { Button, theme } from './ui';

/** About how long the range takes to walk, at 1.3 m/s. */
export const walkNote = (m: number) => {
  const min = Math.max(1, Math.round(m / 1.3 / 60));
  return `about ${min} min walk`;
};

/**
 * Settings (E16, E19-E21, NT4-NT6): what I'm into, the "?" range with a live
 * preview, the pocket alert, and notifications. A panel over the lower part of the screen, not a
 * modal: the map above it shows the range as a ring around you (the host
 * draws it from `onPreview`), so no second map is ever made.
 */
export function ExploreSettings(props: {
  visible: boolean;
  onClose: () => void;
  /** The range to preview on the host's map while the panel is open; null when it closes. */
  onPreview: (rangeM: number | null) => void;
  bottomInset: number;
  /** Whether there is a position to draw the ring around. */
  hasRing?: boolean;
  /** The panel's height, for the host to fit the ring above it. */
  onHeight?: (h: number) => void;
}) {
  const [s, setS] = useState<Settings | null>(null);
  const { visible, onPreview } = props;
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    loadSettings().then(
      (v) => {
        if (!alive) return;
        setS(v);
        onPreview(v.rangeM);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [visible, onPreview]);
  if (!visible) return null;
  const close = () => {
    props.onPreview(null);
    props.onClose();
  };
  const setRange = (m: number) => {
    if (!s) return;
    const rangeM = clampRange(m);
    if (rangeM === s.rangeM) return;
    setS({ ...s, rangeM });
    props.onPreview(rangeM);
  };
  const toggle = (k: Kind, on: boolean) => {
    if (!s) return;
    const hidden = new Set(s.hidden);
    if (on) hidden.delete(k);
    else hidden.add(k);
    setS({ ...s, hidden });
  };
  return (
    <View
      testID="settings"
      style={[styles.panel, { paddingBottom: props.bottomInset + 12 }]}
      accessibilityViewIsModal
      onLayout={(e) => props.onHeight?.(e.nativeEvent.layout.height)}
    >
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">Settings</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={close} hitSlop={8} style={styles.close}>
          <Icon name="close" size={22} color={theme.ink} />
        </Pressable>
      </View>
      {!s ? null : (
        <ScrollView style={styles.body} contentContainerStyle={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text style={styles.section}>“?” range</Text>
            <Text style={styles.sub}>
              A “?” shows for places within {s.rangeM} m of you, {walkNote(s.rangeM)}.
              {props.hasRing === false ? ' The ring shows on the map once there’s a position.' : ' The ring on the map shows how far that is.'}
            </Text>
            <RangeSlider value={s.rangeM} onChange={setRange} />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.section}>What I’m into</Text>
            <Text style={styles.sub}>Switch a kind off to hide its “?” marks for a while. It stays on your lists, and your counts don’t change.</Text>
            <KindSwitches hidden={s.hidden} onToggle={toggle} />
          </View>
          {/* The pocket alert is a tap you feel; a browser has none to give (E19). Kept with the explore settings. */}
          {Platform.OS !== 'web' && (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Pocket alert</Text>
                <Text style={styles.sub}>A soft tap when a “?” comes into range. Never on a quiet walk.</Text>
              </View>
              <Switch testID="pocket-alert" accessibilityLabel="Pocket alert" value={s.haptic} onValueChange={(haptic) => setS({ ...s, haptic })} />
            </View>
          )}
          <NotificationSettings />
        </ScrollView>
      )}
      <View style={styles.actions}>
        <Button variant="ghost" label="Cancel" onPress={close} />
        <Button
          testID="settings-done"
          label="Done"
          disabled={!s}
          onPress={() => {
            if (s) saveSettings(s).catch(() => {});
            close();
          }}
        />
      </View>
    </View>
  );
}

/** What I'm into (E16): a switch per kind, on unless hidden. Shared with Navigate's drawer (NV21). */
export function KindSwitches({ hidden, onToggle }: { hidden: Set<Kind>; onToggle: (k: Kind, on: boolean) => void }) {
  return (
    <>
      {KINDS.map((k) => (
        <View key={k.id} style={styles.row}>
          <Icon name={k.icon as IconName} size={20} color={theme.ink} />
          <Text style={styles.label} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>{k.label}</Text>
          <Switch testID={`kind-${k.id}`} accessibilityLabel={k.label} value={!hidden.has(k.id)} onValueChange={(v) => onToggle(k.id, v)} />
        </View>
      ))}
    </>
  );
}

const STEPS = (EXPLORE_RULES.rangeMax - EXPLORE_RULES.rangeMin) / EXPLORE_RULES.rangeStep;

/** A stepped slider for the range (E20): drag, tap the track, or use − and +; adjustable for screen readers. */
export function RangeSlider({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  const [width, setWidth] = useState(0);
  const latest = useRef({ width, onChange });
  useEffect(() => {
    latest.current = { width, onChange };
  });
  const at = (x: number) => {
    const w = latest.current.width;
    if (!w) return;
    const f = Math.max(0, Math.min(1, x / w));
    latest.current.onChange(EXPLORE_RULES.rangeMin + Math.round(f * STEPS) * EXPLORE_RULES.rangeStep);
  };
  const f = (value - EXPLORE_RULES.rangeMin) / (EXPLORE_RULES.rangeMax - EXPLORE_RULES.rangeMin);
  const step = EXPLORE_RULES.rangeStep;
  return (
    <View style={styles.sliderRow}>
      <Pressable testID="range-minus" accessibilityRole="button" accessibilityLabel="Smaller range" onPress={() => onChange(value - step)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="remove" size={20} color={theme.ink} />
      </Pressable>
      <View
        testID="range-slider"
        style={styles.track}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => at(e.nativeEvent.locationX)}
        onResponderMove={(e) => at(e.nativeEvent.locationX)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Question mark range"
        accessibilityValue={{ min: EXPLORE_RULES.rangeMin, max: EXPLORE_RULES.rangeMax, now: value, text: `${value} metres` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
      >
        <View style={styles.rail} pointerEvents="none" />
        <View style={[styles.fill, { width: `${f * 100}%` }]} pointerEvents="none" />
        <View style={[styles.thumb, { left: `${f * 100}%` }]} pointerEvents="none" />
      </View>
      <Pressable testID="range-plus" accessibilityRole="button" accessibilityLabel="Larger range" onPress={() => onChange(value + step)} style={styles.stepBtn} hitSlop={6}>
        <Icon name="add" size={20} color={theme.ink} />
      </Pressable>
      <Text testID="range-value" style={styles.value}>{value} m</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '58%', backgroundColor: theme.surface,
    borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingTop: 12, gap: 10,
    maxWidth: 640, width: '100%', alignSelf: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.ink },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  section: { fontSize: 15, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 13, color: theme.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  label: { flex: 1, fontSize: 15, color: theme.ink },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.edge, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 44, justifyContent: 'center' },
  rail: { height: 4, borderRadius: 2, backgroundColor: theme.edge },
  fill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: '#1a73e8' },
  thumb: {
    position: 'absolute', width: 24, height: 24, marginLeft: -12, borderRadius: 12, backgroundColor: '#ffffff',
    borderWidth: 2, borderColor: '#1a73e8',
  },
  value: { width: 56, textAlign: 'right', fontSize: 15, fontWeight: '700', color: theme.ink },
});
