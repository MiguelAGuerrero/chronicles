import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labelFor } from '../../lib/resurface/lines';
import type { ContextEntry } from '../../lib/resurface/shell';
import type { Pick } from '../../lib/resurface/types';
import { Icon } from '../icons';
import { Button, theme } from '../ui';
import { contextText, momentSpoken } from './MomentCard';
import { MomentPicture } from './MomentPicture';
import { hasMore } from '../../lib/moment';
import { StackMark } from '../StackMark';

/**
 * The moment brought back (RM5-RM9): a label that says why it is here, its own
 * words, where and when. Relive it opens the walk's replay (or the day's);
 * Another steps to the next; the card opens the moment.
 */
export function Resurfaced(props: {
  pick: Pick;
  now: number;
  context?: ContextEntry;
  onOpen: () => void;
  onRelive: () => void;
  onAnother: () => void;
  onMore: () => void;
}) {
  const { moment: m, reason } = props.pick;
  const label = labelFor(reason, m.t, props.now);
  const hasPicture = m.kind === 'photo' || m.kind === 'video';
  return (
    <View style={styles.card} testID="resurfaced">
      <Pressable
        testID="resurfaced-open"
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${momentSpoken(m, props.now, props.context, false)}. Open`}
        onPress={props.onOpen}
      >
        {hasPicture && <MomentPicture capture={m.capture} style={styles.picture} iconSize={44} />}
        {hasMore(m.capture) && <StackMark style={styles.mark} light={!hasPicture} />}
        <View style={styles.body}>
          <Text style={styles.eyebrow} testID="resurfaced-label">{label}</Text>
          {m.words ? <Text style={[styles.quote, styles.owner]} numberOfLines={8}>{m.words}</Text> : <Text style={styles.quote}>{m.kind === 'voice' ? 'A voice memo' : 'A moment you kept'}</Text>}
          <Text style={styles.meta} numberOfLines={2} testID="resurfaced-context">{contextText(props.context, m, props.now)}</Text>
        </View>
      </Pressable>
      <View style={styles.acts}>
        <Button testID="resurfaced-relive" label="Relive it" onPress={props.onRelive} />
        <Button testID="resurfaced-another" label="Another" variant="secondary" onPress={props.onAnother} />
        <Pressable testID="resurfaced-more" accessibilityRole="button" accessibilityLabel="More about this moment" onPress={props.onMore} style={styles.more} hitSlop={6}>
          <Icon name="ellipsis-horizontal" size={22} color={theme.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', top: 12, right: 12 },
  card: { backgroundColor: theme.surface, borderRadius: 22, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  picture: { height: 230, width: '100%' },
  body: { padding: 16, gap: 8 },
  eyebrow: { color: theme.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  quote: { color: theme.ink, fontSize: 21, lineHeight: 28 },
  owner: { fontStyle: 'italic' },
  meta: { color: theme.muted, fontSize: 13 },
  acts: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  more: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
