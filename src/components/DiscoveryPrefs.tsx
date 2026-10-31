import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { CATEGORIES } from '../lib/discovery/categories';
import { loadAutoScan, saveAutoScan } from '../lib/discovery/runScan';
import type { Pref, Prefs } from '../lib/discovery/scan';
import { Icon, type IconName } from './icons';
import { Button, theme } from './ui';

const CHOICES: { id: Pref; label: string }[] = [
  { id: 'less', label: 'Less' },
  { id: 'normal', label: 'Normal' },
  { id: 'more', label: 'More' },
];

/**
 * What a scan leans toward: eight rows of less, normal and more, all normal
 * to begin with (S14). There is no "never": a wildcard can still land anywhere.
 */
export function DiscoveryPrefs(props: {
  visible: boolean;
  initial: Prefs | null;
  /** "Scan" at the first scan, "Save" from the home. */
  actionLabel: string;
  onDone: (prefs: Prefs) => void;
  onClose: () => void;
}) {
  const [prefs, setPrefs] = useState<Prefs>(() => props.initial ?? {});
  // Auto-scan (A2): kept beside the preferences, saved with them.
  // Null until read, so a quick Done can't overwrite a saved "on" (audit).
  const [auto, setAuto] = useState<boolean | null>(null);
  useEffect(() => {
    if (!props.visible) return;
    let alive = true;
    loadAutoScan().then((v) => alive && setAuto(v), () => alive && setAuto(false));
    return () => {
      alive = false;
    };
  }, [props.visible]);
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.back}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">What would you like to find?</Text>
          <Text style={styles.sub}>A scan hides about six marks within 500 m. Every scan also has one or two surprises.</Text>
          <ScrollView style={styles.rows} contentContainerStyle={{ gap: 6 }}>
            {CATEGORIES.map((c) => {
              const v = prefs[c.id] ?? 'normal';
              return (
                <View key={c.id} style={styles.row}>
                  <Icon name={c.icon as IconName} size={20} color={theme.ink} />
                  <Text style={styles.cat} numberOfLines={2}>{c.label}</Text>
                  <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={c.label}>
                    {CHOICES.map((ch) => (
                      <Pressable
                        key={ch.id}
                        testID={`pref-${c.id}-${ch.id}`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: v === ch.id }}
                        aria-checked={v === ch.id}
                        accessibilityLabel={`${ch.label} ${c.label}`}
                        onPress={() => setPrefs((p) => ({ ...p, [c.id]: ch.id }))}
                        style={[styles.choice, v === ch.id && styles.choiceOn]}
                      >
                        <Text style={[styles.choiceText, v === ch.id && styles.choiceTextOn]}>{ch.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.row}>
            <Text style={styles.cat} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>Scan when a walk starts</Text>
            <Switch testID="auto-scan" accessibilityLabel="Scan when a walk starts" value={!!auto} disabled={auto == null} onValueChange={setAuto} />
          </View>
          <View style={styles.actions}>
            <Button variant="ghost" label="Cancel" onPress={props.onClose} />
            <Button testID="prefs-done" label={props.actionLabel} onPress={() => {
              if (auto != null) saveAutoScan(auto).catch(() => {});
              props.onDone(prefs);
            }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 10, maxWidth: 520, width: '100%', alignSelf: 'center', maxHeight: '90%' },
  title: { fontSize: 18, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 14, color: theme.muted },
  rows: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  cat: { flex: 1, fontSize: 15, color: theme.ink },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: theme.edge, borderRadius: 10, overflow: 'hidden' },
  choice: { minWidth: 60, minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  choiceOn: { backgroundColor: theme.ink },
  choiceText: { fontSize: 13, fontWeight: '600', color: theme.ink },
  choiceTextOn: { color: '#ffffff' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
