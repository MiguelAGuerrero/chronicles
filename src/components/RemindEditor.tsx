import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Recall, RecallFrequency } from '../lib/discovery/types';
import { Button, theme } from './ui';

const DAY = 86_400_000;
const FREQUENCIES: { id: RecallFrequency; label: string }[] = [
  { id: 'once', label: 'Once' },
  { id: 'visit', label: 'Every visit' },
  { id: 'weekly', label: 'Weekly at most' },
  { id: 'monthly', label: 'Monthly at most' },
];
/** The until-date, as a few spans from now: no date picker to fight on three platforms. */
const UNTIL: { id: string; label: string; days: number | null }[] = [
  { id: 'none', label: 'No end', days: null },
  { id: 'month', label: '1 month', days: 30 },
  { id: 'season', label: '3 months', days: 91 },
  { id: 'year', label: '1 year', days: 365 },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Remind me here (R1, R8): how often a capture comes back when a later walk
 * passes it, and until when. Drawn inside the viewer's Modal, never as a
 * second one (iOS can't present a Modal over a Modal).
 */
export function RemindEditor(props: {
  current: Recall | null;
  /** How often, and the until-date (null: no end). */
  onSave: (frequency: RecallFrequency, until: number | null) => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const [frequency, setFrequency] = useState<RecallFrequency>(props.current?.frequency ?? 'once');
  // An end already set is its own chip, "Ends Nov 2", kept to the day unless another is picked.
  const kept = props.current?.until ?? null;
  const [until, setUntil] = useState<string>(kept != null ? 'kept' : 'none');
  const items = kept != null
    ? [{ id: 'kept', label: `Ends ${MONTHS[new Date(kept).getMonth()]} ${new Date(kept).getDate()}` }, ...UNTIL]
    : UNTIL;
  const save = () => {
    if (until === 'kept') return props.onSave(frequency, kept);
    const span = UNTIL.find((x) => x.id === until)?.days ?? null;
    props.onSave(frequency, span == null ? null : Date.now() + span * DAY);
  };
  return (
    <View style={[StyleSheet.absoluteFill, styles.back]}>
      <View testID="remind-editor" style={styles.card} accessibilityViewIsModal>
        <Text style={styles.title} accessibilityRole="header">Remind me here</Text>
        <Text style={styles.sub}>When a later walk passes within 75 m, this comes back.</Text>
        <Group label="How often" items={FREQUENCIES} value={frequency} onChange={(v) => setFrequency(v as RecallFrequency)} />
        <Group label="Until" items={items} value={until} onChange={setUntil} />
        <View style={styles.actions}>
          {props.current && <Button testID="remind-stop" variant="secondary" label="Stop reminding me" onPress={props.onStop} />}
          <View style={{ flex: 1 }} />
          <Button variant="ghost" label="Cancel" onPress={props.onClose} />
          <Button testID="remind-save" label={props.current ? 'Save' : 'Remind me'} onPress={save} />
        </View>
      </View>
    </View>
  );
}

function Group(props: { label: string; items: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.groupLabel}>{props.label}</Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={props.label}>
        {props.items.map((it) => {
          const on = it.id === props.value;
          return (
            <Pressable
              key={it.id}
              testID={`remind-${it.id}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              onPress={() => props.onChange(it.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 14, color: theme.muted },
  groupLabel: { fontSize: 13, fontWeight: '700', color: theme.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: theme.edge, justifyContent: 'center' },
  chipOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  chipText: { fontSize: 14, fontWeight: '600', color: theme.ink },
  chipTextOn: { color: '#ffffff' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
