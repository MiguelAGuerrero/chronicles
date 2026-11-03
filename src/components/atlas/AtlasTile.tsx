import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { characterLine, distanceWords, familiarityWords, tileLabel, type Familiarity, type Listed } from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import { formatDistance } from '../../lib/format';
import type { LngLat } from '../../lib/types';
import { COLORS, HOTSPOT, HOTSPOT_INK } from '../map/types';
import { Icon } from '../icons';
import { theme } from '../ui';
import { KindStrip } from './KindStrip';
import { MiniMap } from './MiniMap';

const fmt = (m: number) => formatDistance(m);

/**
 * One area on the atlas (AT3, AT5, AT6, AT13, AT16): its picture, name, how
 * far and your familiarity, its character in words, its busiest street, and
 * its eight kinds. A town's tile (`drill`) opens the town; a wide tile heads a
 * town's own page.
 */
export const AtlasTile = memo(function AtlasTile(props: {
  listed: Listed;
  fam: Familiarity;
  walked: Set<string>;
  waiting: { category: CategoryId; at: LngLat }[];
  finds: { category: CategoryId; at: LngLat }[];
  here: LngLat | null;
  selected: boolean;
  /** A town: the tile opens its neighborhoods. */
  drill?: boolean;
  wide?: boolean;
  onPress: (key: string) => void;
}) {
  const { listed, fam } = props;
  const a = listed.area;
  const reading = !a.profile;
  const label = tileLabel(listed, fam, fmt) + (props.drill ? ' Opens its neighborhoods.' : '');
  return (
    <Pressable
      testID={props.wide ? 'atlas-town-head' : 'atlas-tile'}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: props.selected }}
      onPress={() => props.onPress(a.key)}
      style={({ pressed }) => [styles.tile, props.wide && styles.wide, props.selected && styles.selected, pressed && styles.pressed]}
      {...{ dataSet: { name: a.name, read: reading ? '0' : '1', level: a.level } }}
    >
      <View style={[props.wide ? styles.mapWide : styles.map, reading && styles.dim]}>
        <MiniMap area={a} walked={props.walked} waiting={props.waiting} finds={props.finds} here={listed.here ? props.here : null} />
      </View>
      <View style={[styles.body, props.wide && styles.bodyWide]}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, props.wide && styles.nameWide]} numberOfLines={1}>{a.name}</Text>
          {props.drill ? <Icon name="chevron-forward" size={16} color={theme.muted} /> : null}
        </View>
        {/* How far and your familiarity each get a line: side by side they were cut off at phone width. */}
        <Text style={[styles.metaText, listed.here && styles.here]} numberOfLines={1}>
          {distanceWords(listed.distanceM, listed.here, fmt)}
        </Text>
        <View style={styles.meta}>
          {fam.walks ? <Icon name="footsteps-outline" size={12} color={COLORS.trace} /> : null}
          <Text style={[styles.metaText, styles.shrink, fam.walks ? styles.known : null]} numberOfLines={1}>{familiarityWords(fam)}</Text>
        </View>
        {reading ? (
          <View style={styles.meta}>
            <ActivityIndicator size="small" color={theme.muted} />
            <Text style={styles.metaText} numberOfLines={1}>Reading this area…</Text>
          </View>
        ) : (
          <>
            <Text style={styles.character} numberOfLines={1} testID="atlas-character">{characterLine(a.profile!.steps)}</Text>
            {a.profile!.strips[0] ? (
              <View style={styles.meta}>
                <View style={styles.busyLine} />
                <Text style={styles.busy} numberOfLines={1}>{a.profile!.strips[0]}</Text>
              </View>
            ) : null}
          </>
        )}
        <View style={[styles.kinds, reading && styles.dim]}>
          <KindStrip steps={a.profile?.steps ?? null} />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { flex: 1, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line, overflow: 'hidden', minWidth: 0 },
  wide: { flexDirection: 'row' },
  selected: { borderColor: theme.accent, borderWidth: 2 },
  pressed: { opacity: 0.85 },
  map: { width: '100%', aspectRatio: 4 / 3 },
  mapWide: { width: '46%', aspectRatio: 4 / 3, alignSelf: 'center' },
  dim: { opacity: 0.4 },
  body: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 3 },
  bodyWide: { flex: 1, minWidth: 0, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 17, fontWeight: '700', color: theme.ink, flexShrink: 1 },
  nameWide: { fontSize: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 16 },
  metaText: { fontSize: 12, color: theme.muted },
  shrink: { flexShrink: 1 },
  here: { color: COLORS.route, fontWeight: '700' },
  known: { color: COLORS.trace, fontWeight: '600' },
  character: { fontSize: 13, fontWeight: '600', color: theme.ink },
  busyLine: { width: 10, height: 3, borderRadius: 2, backgroundColor: HOTSPOT },
  busy: { fontSize: 12, fontWeight: '600', color: HOTSPOT_INK, flexShrink: 1 },
  kinds: { marginTop: 4 },
});
