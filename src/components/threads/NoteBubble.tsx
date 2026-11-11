import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine } from '../../lib/resurface/views';
import type { Walk } from '../../lib/types';
import { contextText } from '../chronicle/MomentCard';
import { Icon } from '../icons';
import { theme } from '../ui';
import { NoteText } from './NoteText';

/**
 * A note in one of the owner's threads, read where it is (fix thread-log): its whole text in a bubble, a mention drawn
 * as a card that opens its moment (RF4), and under it its time and the walk it came from (OT9), with More. A tap on the
 * text opens nothing: the words are all there. More's "Open the moment" is the way to Respond and Edit.
 */
export function NoteBubble(props: {
  moment: MomentView;
  walk: Walk | undefined;
  now: number;
  onWalk: (walkId: string) => void;
  onMore: () => void;
  onOpenRef: (v: MomentView) => void;
}) {
  const { moment: m, walk } = props;
  const from = fromLine(walk);
  return (
    <View style={styles.wrap} testID="note-bubble">
      <View style={styles.bubble}>
        <NoteText body={m.capture.body ?? ''} style={styles.text} onOpen={props.onOpenRef} />
      </View>
      <View style={styles.foot}>
        <View style={styles.lines}>
          <Text style={styles.meta} numberOfLines={2} testID="moment-context">{contextText(undefined, m, props.now)}</Text>
          {from && walk ? (
            <Pressable testID="moment-walk" accessibilityRole="button" accessibilityLabel={`${from}. Replay the walk`} onPress={() => props.onWalk(walk.id)} hitSlop={8}>
              <Text style={styles.meta} numberOfLines={1}>{from}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable testID="moment-more" accessibilityRole="button" accessibilityLabel="More about this note" onPress={props.onMore} style={styles.more} hitSlop={6}>
          <Icon name="ellipsis-horizontal" size={20} color={theme.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '92%', alignSelf: 'flex-start', gap: 2 },
  // The plain surface, never an accent fill (restraint); the squarer corner points back up the thread.
  bubble: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, borderRadius: 18, borderTopLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  text: { color: theme.ink, fontSize: 17, lineHeight: 24 },
  foot: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, minHeight: 44 },
  lines: { flexShrink: 1, gap: 2 },
  meta: { color: theme.muted, fontSize: 13 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
