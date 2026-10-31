import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Recall, RecallFrequency } from '../lib/discovery/types';
import { Button, theme } from './ui';

const DAY = 86_400_000;
const FREQUENCIES: { id: RecallFrequency; label: string }[] = [
  { id: 'once', label: 'Once' },
  { id: 'visit', label: 'Every visit' },
  { id: 'weekly', label: 'At most weekly' },
  { id: 'monthly', label: 'At most monthly' },
];
/** The until-date, as a few spans from now: no date picker to fight on three platforms. */
const UNTIL: { id: string; label: string; days: number | null }[] = [
  { id: 'none', label: 'No end', days: null },
  { id: 'month', label: '1 month', days: 30 },
  { id: 'season', label: '3 months', days: 91 },
  { id: 'year', label: '1 year', days: 365 },
];

/** The span chip closest to an existing until-date. */
function nearestSpan(until: number): string {
  const days = (until - Date.now()) / DAY;
  return UNTIL.filter((x) => x.days != null).reduce((a, b) => (Math.abs(b.days! - days) < Math.abs(a.days! - days) ? b : a)).id;
}

/**
 * Remind me here (R1, R8): how often a capture comes back when a later walk
 * passes it, and until when. Drawn inside the viewer's Modal, never as a
 * second one (iOS can't present a Modal over a Modal).
 */
export function RemindEditor(props: {
  captureId: string;
  current: Recall | null;
  onSave: (r: Recall) => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const [frequency, setFrequency] = useState<RecallFrequency>(props.current?.frequency ?? 'once');
  const [until, setUntil] = useState<string>(() => (props.current?.until == null ? 'none' : nearestSpan(props.current.until)));
  // An until-date left as it was keeps its exact day.
  const [untilTouched, setUntilTouched] = useState(false);
  const save = () => {
    const span = UNTIL.find((x) => x.id === until)?.days ?? null;
    props.onSave({
      capture_id: props.captureId,
      frequency,
      until: !untilTouched && props.current ? props.current.until : span == null ? null : Date.now() + span * DAY,
      last_fired_at: props.current?.last_fired_at ?? null,
      fired_count: props.current?.fired_count ?? 0,
      last_walk_id: props.current?.last_walk_id ?? null,
    });
  };
  return (
    <View style={[StyleSheet.absoluteFill, styles.back]}>
      <View testID="remind-editor" style={styles.card} accessibilityViewIsModal>
        <Text style={styles.title} accessibilityRole="header">Remind me here</Text>
        <Text style={styles.sub}>When a later walk passes within 75 m, this comes back.</Text>
        <Group label="How often" items={FREQUENCIES} value={frequency} onChange={(v) => setFrequency(v as RecallFrequency)} />
        <Group label="Until" items={UNTIL} value={until} onChange={(v) => {
          setUntil(v);
          setUntilTouched(true);
        }} />
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
