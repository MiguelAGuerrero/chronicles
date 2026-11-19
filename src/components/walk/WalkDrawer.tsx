import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SECTIONS, type DetailKey, type SectionId } from '../../lib/walkDrawer';
import { Icon } from '../icons';
import { useSecondClock } from '../Ticking';
import { theme } from '../ui';

/**
 * The walk's drawer's three views (specs/walk-drawer-sections): This walk, the walk's details in words (WD5), with
 * "Walk settings ›" at its foot (WD9); the menu of four sections, each with its state in words (WD1); and a section's
 * header, "‹ Walk settings" over its name (WD3). The controls of each section are the screen's own.
 */

/** WD5, WD8: the lines, read again each second while shown, so the time keeps step with the strip's. */
export function WalkDetails(props: { linesAt: (now: number) => { key: DetailKey; text: string }[]; onSettings: () => void }) {
  // The strip's clock, so the two times tick together (WD8).
  const now = useSecondClock();
  return (
    <View testID="walk-details">
      <Text style={styles.title} accessibilityRole="header">This walk</Text>
      <View style={styles.lines}>
        {props.linesAt(now).map((l) => (
          <Text key={l.key} testID={`detail-${l.key}`} style={[styles.line, (l.key === 'gaps' || l.key === 'recording') && styles.low]}>
            {l.text}
          </Text>
        ))}
      </View>
      <View style={styles.rule} />
      <Row testID="details-settings" label="Walk settings" said="Walk settings" onPress={props.onSettings}>
        <View style={styles.rowWords}>
          <Text style={styles.name} numberOfLines={1}>Walk settings</Text>
        </View>
      </Row>
    </View>
  );
}

/** WD1: the menu, a row per section: its name in ink, how it is set now in a muted line, a chevron. */
export function WalkSettingsMenu(props: { lines: Record<SectionId, string>; onPick: (id: SectionId) => void }) {
  return (
    <View testID="walk-menu">
      <Text style={styles.title} accessibilityRole="header">Walk settings</Text>
      {SECTIONS.map((s) => (
        <Row
          key={s.id}
          testID={`section-row-${s.id}`}
          label={s.name}
          said={props.lines[s.id] ? `${s.name}, ${props.lines[s.id]}` : s.name}
          onPress={() => props.onPick(s.id)}
        >
          <View style={styles.rowWords}>
            <Text testID={`section-name-${s.id}`} style={styles.name} numberOfLines={1}>{s.name}</Text>
            {/* The state may take a second line on a narrow phone rather than lose its end (WD15 holds the names). */}
            {!!props.lines[s.id] && <Text style={styles.state}>{props.lines[s.id]}</Text>}
          </View>
        </Row>
      ))}
    </View>
  );
}

/** WD3, WD12: a section's top: the back control in ink, "‹ Walk settings", then the section's name as a heading. */
export function SectionHeader(props: { id: SectionId; onBack: () => void }) {
  const name = SECTIONS.find((s) => s.id === props.id)?.name ?? '';
  return (
    <View>
      <Pressable
        testID="section-back"
        accessibilityRole="button"
        accessibilityLabel="Back to walk settings"
        onPress={props.onBack}
        hitSlop={4}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Icon name="chevron-back" size={20} color={theme.ink} />
        <Text style={styles.backText} numberOfLines={1}>Walk settings</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">{name}</Text>
    </View>
  );
}

function Row(props: { testID: string; label: string; said: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.said}
      onPress={props.onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {props.children}
      <Icon name="chevron-forward" size={20} color={theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: theme.ink, marginBottom: 4 },
  lines: { gap: 6, paddingVertical: 4 },
  // The drawer's body size: no figure larger than the words around it (WD7).
  line: { fontSize: 15, color: theme.ink },
  low: { color: theme.muted },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.edge, marginTop: 8 },
  // 48 pt, the switch rows' height (X0); the chevron in ink (Found before quiet, decision 0167).
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingVertical: 4 },
  rowWords: { flex: 1, gap: 2 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: theme.ink },
  state: { fontSize: 14, color: theme.muted },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, alignSelf: 'flex-start', paddingRight: 8 },
  backText: { fontSize: 15, fontWeight: '600', color: theme.ink },
  pressed: { opacity: 0.7 },
});
