import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatElapsed } from '../../lib/format';
import { whenLine } from '../../lib/resurface/lines';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine } from '../../lib/resurface/views';
import type { Walk } from '../../lib/types';
import type { ContextEntry } from '../../lib/resurface/shell';
import { Icon } from '../icons';
import { theme } from '../ui';
import { MomentPicture } from './MomentPicture';

const KIND_WORD = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' } as const;

/** The line under a card: the arrival line once read, else only when, so no place is claimed that is not known (MC17). */
export function contextText(context: ContextEntry | undefined, m: MomentView, now: number): string {
  return context?.state === 'done' ? context.line : whenLine(m.t, now);
}

/** What a moment says about itself in one line, for a screen reader (RM25). */
export function momentSpoken(m: MomentView, now: number, context?: ContextEntry): string {
  return [KIND_WORD[m.kind], m.words, contextText(context, m, now)].filter(Boolean).join(', ');
}

/**
 * One moment in Lately and in a thread (RM18): its picture, its own words, a
 * memo's length, "place · when", and the walk it came from.
 */
export function MomentCard(props: {
  moment: MomentView;
  walk: Walk | undefined;
  /** The arrival line, once read (MC1-MC5); until then the card claims no place (MC17). */
  context?: ContextEntry;
  now: number;
  onOpen: () => void;
  onWalk: (walkId: string) => void;
  onMore: () => void;
}) {
  const { moment: m, walk, now } = props;
  const from = fromLine(walk);
  const memo = m.kind === 'voice' ? Number(m.capture.body) : NaN;
  return (
    <View style={styles.card} testID="moment-card">
      <Pressable testID="moment-open" accessibilityRole="button" accessibilityLabel={`${momentSpoken(m, now, props.context)}. Open`} onPress={props.onOpen}>
        {(m.kind === 'photo' || m.kind === 'video') && <MomentPicture capture={m.capture} style={styles.picture} iconSize={36} />}
        <View style={styles.body}>
          {m.kind === 'voice' && (
            <View style={styles.memo}>
              <View style={styles.play}><Icon name="play" size={14} color={theme.accentInk} /></View>
              <Text style={styles.memoText}>{Number.isFinite(memo) && memo > 0 ? `Voice memo, ${formatElapsed(memo)}` : 'Voice memo'}</Text>
            </View>
          )}
          {m.words ? <Text style={[styles.words, styles.owner, m.kind === 'text' && styles.note]} numberOfLines={10}>{m.words}</Text> : null}
          <Text style={styles.meta} testID="moment-context">{contextText(props.context, m, now)}</Text>
        </View>
      </Pressable>
      <View style={styles.foot}>
        {from && walk ? (
          <Pressable testID="moment-walk" accessibilityRole="button" accessibilityLabel={`${from}. Replay the walk`} onPress={() => props.onWalk(walk.id)} hitSlop={8} style={styles.from}>
            <Text style={styles.fromText} numberOfLines={1}>{from}</Text>
          </Pressable>
        ) : <View style={styles.from} />}
        <Pressable testID="moment-more" accessibilityRole="button" accessibilityLabel="More about this moment" onPress={props.onMore} style={styles.more} hitSlop={6}>
          <Icon name="ellipsis-horizontal" size={20} color={theme.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  picture: { height: 170, width: '100%' },
  body: { paddingHorizontal: 14, paddingTop: 12, gap: 6 },
  words: { color: theme.ink, fontSize: 16, lineHeight: 22 },
  owner: { fontStyle: 'italic' },
  note: { fontSize: 17 },
  meta: { color: theme.muted, fontSize: 13 },
  memo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  play: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  memoText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  foot: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, minHeight: 44 },
  from: { flex: 1, minHeight: 32, justifyContent: 'center' },
  fromText: { color: theme.muted, fontSize: 13 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
