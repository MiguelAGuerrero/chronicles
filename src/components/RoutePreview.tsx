import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rowWords } from '../lib/nav/scenic';
import type { RoutePreview as Preview } from '../lib/nav/useNavigation';
import { Icon } from './icons';
import { Button, theme } from './ui';

/**
 * Scenic routes' preview (SR2, SR3, SR8, SR14): Direct and the scenic routes offered, one row
 * each, in words. A tap on a row shows its route on the map; Go starts it; Cancel sets nothing.
 * The walk records throughout.
 */
export function RoutePreview(props: { preview: Preview; onSelect: (i: number) => void; onGo: (i: number) => void; onCancel: () => void }) {
  const { preview } = props;
  const direct = preview.options[0];
  return (
    <View testID="route-preview" style={styles.card} accessibilityViewIsModal>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          Ways to {preview.dest.label}
        </Text>
        <Pressable testID="route-cancel" accessibilityRole="button" accessibilityLabel="Cancel: no route" onPress={props.onCancel} style={styles.close} hitSlop={8}>
          <Icon name="close" size={22} color={theme.ink} />
        </Pressable>
      </View>
      {preview.options.map((o, i) => {
        const w = rowWords(o, direct);
        const on = i === preview.selected;
        return (
          <View key={i} style={[styles.row, on && styles.rowOn]}>
            <Pressable
              testID={`route-row-${i}`}
              accessibilityRole="button"
              accessibilityLabel={w.label}
              accessibilityState={{ selected: on }}
              aria-selected={on}
              onPress={() => props.onSelect(i)}
              style={styles.rowText}
              // The e2e reads which row is highlighted (react-native-web drops aria-selected on a button).
              {...{ dataSet: { selected: on ? '1' : '0', route: o.route.source } }}
            >
              <Text style={styles.rowTitle} numberOfLines={1}>{w.title}</Text>
              {/* Direct says how far; a scenic route its detour in words and what it passes: never minutes compared. */}
              <Text style={styles.rowMeta} numberOfLines={2}>
                {w.distance ?? [w.detour, w.passes].filter(Boolean).join(' · ')}
              </Text>
            </Pressable>
            <Button testID={`route-go-${i}`} label="Go" variant={on ? 'primary' : 'secondary'} accessibilityHint={`Start: ${w.title}`} onPress={() => props.onGo(i)} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 12, gap: 6, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.ink },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 8, borderWidth: 2, borderColor: 'transparent' },
  rowOn: { borderColor: theme.ink },
  rowText: { flex: 1, minHeight: 44, justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: theme.ink },
  rowMeta: { fontSize: 14, color: theme.ink },
});
