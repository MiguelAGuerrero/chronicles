import { Pressable, StyleSheet, Text, View } from 'react-native';
import { refIds } from '../../lib/refs';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine } from '../../lib/resurface/views';
import type { Walk } from '../../lib/types';
import { contextText, momentSpoken } from '../chronicle/MomentCard';
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
  const body = m.capture.body ?? '';
  // Only a note that mentions a moment reads the moment pool (audit 1): a thread of plain notes reads nothing more.
  const mentions = refIds(body).length > 0;
  return (
    <View testID="note-bubble">
      <View style={styles.foot}>
        <View style={styles.lines}>
          {/* A plain note and its time are one named group, said as a card says itself, the time once (audit 2, 7, 9);
              a note with a mention leaves each mention its own button. */}
          <View role={mentions ? undefined : 'group'} accessible={!mentions} accessibilityLabel={mentions ? undefined : momentSpoken(m, props.now)} style={styles.said}>
            <View style={styles.bubble}>
              {mentions ? <NoteText body={body} style={styles.text} onOpen={props.onOpenRef} /> : <Text style={styles.text}>{body}</Text>}
            </View>
            <Text style={[styles.meta, styles.when]} numberOfLines={2} testID="moment-context">{contextText(undefined, m, props.now)}</Text>
          </View>
          {from && walk ? (
            <Pressable testID="moment-walk" accessibilityRole="button" accessibilityLabel={`${from}. Replay the walk`} onPress={() => props.onWalk(walk.id)} hitSlop={8} style={styles.from}>
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
  // The plain surface with no border, unlike the buttons above it, and never an accent fill (restraint); the squarer
  // corner points back up the thread.
  bubble: { maxWidth: '92%', alignSelf: 'flex-start', backgroundColor: theme.surface, borderRadius: 18, borderTopLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  text: { color: theme.ink, fontSize: 17, lineHeight: 24 },
  // More at the row's end on every note, clear of the time (audit 4).
  foot: { flexDirection: 'row', alignItems: 'flex-end' },
  lines: { flex: 1, gap: 2 },
  said: { gap: 6 },
  when: { paddingLeft: 14 },
  // The walk line is as tall a target as a card's (audit 3).
  from: { minHeight: 32, justifyContent: 'center', paddingLeft: 14 },
  meta: { color: theme.muted, fontSize: 13 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
