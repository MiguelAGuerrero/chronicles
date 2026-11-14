import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ContextEntry } from '../../lib/resurface/shell';
import type { MomentView } from '../../lib/resurface/types';
import type { ReactionInfo } from '../../lib/reactions/core';
import type { Walk } from '../../lib/types';
import { MomentCard } from '../chronicle/MomentCard';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

/**
 * A lens (RX24, RX25; decision 0172): every kept moment with one reaction, oldest first, each a moment in its context
 * (its picture or kind, its words, its date, place and walk). One list: no map, no grouping by place or period, no
 * count. A tap opens the moment, and the viewer steps through the lens.
 */
export function LensScreen(props: {
  reaction: ReactionInfo;
  moments: MomentView[] | null;
  walks: Record<string, Walk>;
  context: Record<string, ContextEntry | undefined>;
  now: number;
  onBack: () => void;
  onOpen: (m: MomentView) => void;
  onWalk: (walkId: string) => void;
  onMore: (m: MomentView) => void;
}) {
  return (
    <View style={styles.wrap} testID="lens-screen">
      <Pressable testID="lens-back" accessibilityRole="button" accessibilityLabel="Back to Reactions" onPress={props.onBack} style={styles.back}>
        <Icon name="chevron-back" size={20} color={theme.ink} />
        <Text style={styles.backText}>Reactions</Text>
      </Pressable>
      <View style={styles.head}>
        <Icon name={props.reaction.glyph as IconName} size={26} color={theme.ink} />
        <Text style={styles.title} accessibilityRole="header" testID="lens-title">{props.reaction.lens}</Text>
      </View>
      {props.moments && props.moments.length === 0 ? <Text style={styles.hint}>Nothing here now.</Text> : null}
      {(props.moments ?? []).map((m) => (
        <MomentCard
          key={m.id}
          moment={m}
          walk={m.walkId ? props.walks[m.walkId] : undefined}
          context={props.context[m.id]}
          now={props.now}
          onOpen={() => props.onOpen(m)}
          onWalk={props.onWalk}
          onMore={() => props.onMore(m)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  backText: { color: theme.ink, fontSize: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: theme.ink, fontSize: 28, fontWeight: '700' },
  hint: { color: theme.muted, fontSize: 15 },
});
