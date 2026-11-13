import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ATLAS_ORDER, characterLine, distanceWords, familiarityWords, tileLabel, type Familiarity, type Listed, type Steps } from '../../lib/atlas/atlas';
import { cardFooter } from '../../lib/atlas/carousel';
import { formatDistance } from '../../lib/format';
import { COLORS, HOTSPOT, HOTSPOT_INK } from '../map/types';
import { Icon } from '../icons';
import { theme } from '../ui';
import { KindStrip } from './KindStrip';

/** A thin ring's tile shows no kinds (AG3). */
const NO_KINDS = Object.fromEntries(ATLAS_ORDER.map((c) => [c, 0])) as Steps;

const fmt = (m: number) => formatDistance(m);

/**
 * One area as a card of the row (AT3, AT5, AT13, AT16, EC15; decision 0124). Reading order:
 * the name, what it's like in words, one quiet line of how far and your
 * familiarity, its busiest street, then the kinds it has as icons with dots. No
 * picture: the area's own card has it. A town's card (`drill`) says it opens the
 * town's neighborhoods, in a footer that looks like a way in; the card heading a
 * town's page (`wide`) says it opens what's there. The selected card says what a
 * tap does; the others say they select.
 */
export const AtlasTile = memo(function AtlasTile(props: {
  listed: Listed;
  fam: Familiarity;
  selected: boolean;
  /** A town: the tile opens its neighborhoods. */
  drill?: boolean;
  wide?: boolean;
  /** While looking, a distance is yours, said so: "4 km from you" (free-look ui 3). */
  fromYou?: boolean;
  onPress: (key: string) => void;
}) {
  const { listed, fam } = props;
  const a = listed.area;
  const reading = !a.profile;
  // EC13: the selected card's label ends in what a tap does, the others' in "Selects it".
  const label = `${tileLabel(listed, fam, fmt)} ${props.selected ? (props.drill ? 'Opens its page' : 'Opens its card') : 'Selects it'}`;
  // Only the selected card promises a way in (explore-carousel audit 4): a tap on another only selects it.
  const footer = cardFooter({ drill: !!props.drill, wide: !!props.wide, selected: props.selected });
  return (
    <View style={[styles.outer, props.drill && styles.stack]}>
      <Pressable
        testID={props.wide ? 'atlas-town-head' : 'atlas-tile'}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: props.selected }}
        onPress={() => props.onPress(a.key)}
        style={({ pressed }) => [styles.tile, props.selected && styles.selected, pressed && styles.pressed]}
        {...{ dataSet: { name: a.name, read: reading ? '0' : '1', level: a.level, selected: props.selected ? '1' : '0' } }}
      >
        <View style={styles.grow}>
          <View style={[styles.body, reading && styles.dim]}>
            <Text style={styles.name}>{a.name}</Text>
            {/* Each line is a slot of its full height, filled or not, so no card's height depends on what it has to say. */}
            <View style={styles.characterSlot}>
              {reading ? (
                <View style={styles.meta}>
                  <ActivityIndicator size="small" color={theme.muted} />
                  <Text style={styles.metaText} numberOfLines={1}>Reading this area…</Text>
                </View>
              ) : a.profile!.thin ? null : (
                // AG3: a ring the map knows almost nothing about says nothing about its kinds.
                <Text style={styles.character} numberOfLines={2} testID="atlas-character">{characterLine(a.profile!.steps)}</Text>
              )}
            </View>
            <Text style={[styles.metaText, styles.metaSlot]} numberOfLines={2}>
              {listed.unplaced ? null : <Text style={listed.here ? styles.here : null}>{props.fromYou ? distanceWords(listed.distanceM, listed.here, fmt).replace(/ away$/, ' from you') : distanceWords(listed.distanceM, listed.here, fmt)}</Text>}
              {listed.unplaced ? null : ' · '}
              <Text style={fam.walks ? styles.known : null}>{familiarityWords(fam)}</Text>
            </Text>
            <View style={styles.meta}>
              {a.profile?.strips[0] ? (
                <>
                  <View style={styles.busyLine} />
                  <Text style={styles.busy} numberOfLines={1}>{a.profile.strips[0]}</Text>
                </>
              ) : null}
            </View>
            <KindStrip nowrap steps={a.profile?.thin ? NO_KINDS : a.profile?.steps ?? null} />
          </View>
        </View>
        {/* A card that can show a footer (a town, a town's head) keeps its room when unselected, so selecting never moves the
            row's height; a neighborhood never has one and takes no room for it. */}
        {footer || props.drill || props.wide ? (
          <View style={[styles.footer, !footer && styles.footerEmpty]}>
            {footer ? (
              <>
                <Text style={styles.footerText}>{footer}</Text>
                <Icon name="chevron-forward" size={16} color={theme.accent} />
              </>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  // The row sizes a card: it fills its slot, as tall as the row's tallest card (fix card-heights). A grow, never `flex: 1`
  // or `flex: 0`, which react-native-web writes with a 0% basis.
  outer: { flexGrow: 1, flexShrink: 0, minWidth: 0 },
  // The body takes the height left, so a footer sits at the card's bottom.
  grow: { flexGrow: 1 },
  // A town reads as a stack of places: a second card's edge shows beneath it.
  stack: { paddingBottom: 4, borderRadius: 18, backgroundColor: '#e8e4dc' },
  tile: { flexGrow: 1, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  selected: { borderColor: theme.accent, borderWidth: 2 },
  pressed: { opacity: 0.85 },
  dim: { opacity: 0.4 },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, gap: 4 },
  name: { fontSize: 18, fontWeight: '700', color: theme.ink, lineHeight: 22 },
  character: { fontSize: 14, color: theme.ink, lineHeight: 18 },
  // Two lines of the character line and of the distance line, the most each says (their `numberOfLines`).
  characterSlot: { minHeight: 36 },
  metaSlot: { minHeight: 32 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 16 },
  metaText: { fontSize: 12, color: theme.muted, lineHeight: 16 },
  here: { color: COLORS.route, fontWeight: '700' },
  known: { color: COLORS.trace, fontWeight: '600' },
  busyLine: { width: 10, height: 3, borderRadius: 2, backgroundColor: HOTSPOT },
  busy: { fontSize: 12, fontWeight: '600', color: HOTSPOT_INK, flexShrink: 1 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 10,
    borderTopWidth: 1, borderTopColor: theme.line,
  },
  footerEmpty: { borderTopColor: 'transparent' },
  footerText: { fontSize: 13, fontWeight: '600', color: theme.accent },
});
