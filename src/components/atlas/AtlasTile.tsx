import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { distanceWords, familiarityWords, tileLabel, type Familiarity, type Listed } from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import { formatDistance } from '../../lib/format';
import type { LngLat } from '../../lib/types';
import { COLORS } from '../map/types';
import { Icon } from '../icons';
import { theme } from '../ui';
import { KindStrip } from './KindStrip';
import { MiniMap } from './MiniMap';

/** One area on the atlas (AT3, AT5, AT6, AT13): its picture, name, how far, your familiarity and its eight kinds. */
export const AtlasTile = memo(function AtlasTile(props: {
  listed: Listed;
  fam: Familiarity;
  walked: Set<string>;
  waiting: { category: CategoryId; at: LngLat }[];
  finds: { category: CategoryId; at: LngLat }[];
  here: LngLat | null;
  selected: boolean;
  onPress: (key: string) => void;
}) {
  const { listed, fam } = props;
  const a = listed.area;
  const reading = !a.profile;
  return (
    <Pressable
      testID="atlas-tile"
      accessibilityRole="button"
      accessibilityLabel={tileLabel(listed, fam, (m) => formatDistance(m))}
      accessibilityState={{ selected: props.selected }}
      onPress={() => props.onPress(a.key)}
      style={({ pressed }) => [styles.tile, props.selected && styles.selected, pressed && styles.pressed]}
      {...{ dataSet: { name: a.name, read: reading ? '0' : '1' } }}
    >
      <View style={[styles.map, reading && styles.dim]}>
        <MiniMap area={a} walked={props.walked} waiting={props.waiting} finds={props.finds} here={listed.here ? props.here : null} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{a.name}</Text>
        {reading ? (
          <View style={styles.meta}>
            <ActivityIndicator size="small" color={theme.muted} />
            <Text style={styles.metaText} numberOfLines={1}>Reading this area…</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.metaText, listed.here && styles.here]} numberOfLines={1}>{distanceWords(listed.distanceM, listed.here, (m) => formatDistance(m))}</Text>
            <View style={styles.meta}>
              {fam.walks ? <Icon name="footsteps-outline" size={12} color={COLORS.trace} /> : null}
              <Text style={[styles.metaText, fam.walks ? styles.known : null]} numberOfLines={1}>{familiarityWords(fam)}</Text>
            </View>
          </>
        )}
        <View style={reading && styles.dim}>
          <KindStrip steps={a.profile?.steps ?? null} />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { flex: 1, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line, overflow: 'hidden', minWidth: 0 },
  selected: { borderColor: theme.accent, borderWidth: 2 },
  pressed: { opacity: 0.85 },
  map: { width: '100%', aspectRatio: 4 / 3 },
  dim: { opacity: 0.4 },
  body: { paddingHorizontal: 9, paddingTop: 7, paddingBottom: 9, gap: 3 },
  name: { fontSize: 17, fontWeight: '700', color: theme.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 16 },
  metaText: { fontSize: 12, color: theme.muted, flexShrink: 1 },
  here: { color: COLORS.route, fontWeight: '700' },
  known: { color: COLORS.trace, fontWeight: '600' },
});
