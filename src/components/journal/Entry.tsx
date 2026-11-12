import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatElapsed } from '../../lib/format';
import { dateline, entrySpoken } from '../../lib/journal/lines';
import { facedAt, hasMore } from '../../lib/moment';
import { parseRefs } from '../../lib/refs';
import type { ContextEntry } from '../../lib/resurface/shell';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine } from '../../lib/resurface/views';
import type { Capture, Walk } from '../../lib/types';
import { MomentPicture } from '../chronicle/MomentPicture';
import { Icon } from '../icons';
import { NoteText } from '../threads/NoteText';
import { theme } from '../ui';
import { OWNER_FONT } from './type';

export type NoFix = 'denied' | 'timeout' | 'unavailable';

/**
 * One entry on the journal's page (chronicle journal JN3-JN7): its dateline in the app's voice, then every piece
 * in the order captured, with no card around it. The owner's words are in the serif; a memo's line, the walk it
 * came from and what it answers are the app's, in its sans. `writing` is the piece the open line holds: it is
 * drawn there, not here.
 */
export function Entry(props: {
  moment: MomentView;
  walk: Walk | undefined;
  context?: ContextEntry;
  now: number;
  reason?: NoFix | null;
  answering?: string | null;
  writing?: string | null;
  onOpen: () => void;
  /** Shows the moment on Chronicle's Map (JN6); given only for a placed one. */
  onMap?: () => void;
  onWalk: (walkId: string) => void;
  onMore: () => void;
  onOpenRef: (v: MomentView) => void;
}) {
  const { moment: m, walk } = props;
  const c = m.capture;
  const placed = c.lat != null && c.lon != null;
  const line = dateline({
    t: m.t,
    now: props.now,
    placed,
    context: props.context?.state === 'done' ? { place: props.context.place, into: props.context.into } : null,
    reason: props.reason,
  });
  const from = fromLine(walk);
  const pieces = c.pieces.filter((p) => p.id !== props.writing);
  const lineText = <Text style={styles.app} testID="entry-dateline">{line}</Text>;
  return (
    <View style={styles.entry} testID="moment-card">
      {placed && props.onMap ? (
        <Pressable testID="entry-map" accessibilityRole="button" accessibilityLabel={`${line}. Show on the map`} onPress={props.onMap} style={styles.dateline}>
          {lineText}
        </Pressable>
      ) : (
        <View style={styles.dateline}>{lineText}</View>
      )}
      {pieces.length > 0 && (
        <Pressable testID="moment-open" accessibilityRole="button" accessibilityLabel={`${entrySpoken(m.kind, m.words, line, hasMore(c))}. Open`} onPress={props.onOpen} style={styles.pieces}>
          {pieces.map((p) => (
            <Piece key={p.id} piece={p} moment={m} onOpenRef={props.onOpenRef} />
          ))}
        </Pressable>
      )}
      {props.answering ? <Text style={styles.app} testID="moment-answering">{props.answering}</Text> : null}
      <View style={styles.foot}>
        {from && walk ? (
          <Pressable testID="moment-walk" accessibilityRole="button" accessibilityLabel={`${from}. Replay the walk`} onPress={() => props.onWalk(walk.id)} style={styles.from}>
            <Text style={styles.app} numberOfLines={1}>{from}</Text>
          </Pressable>
        ) : <View style={styles.from} />}
        <Pressable testID="moment-more" accessibilityRole="button" accessibilityLabel="More about this moment" onPress={props.onMore} style={styles.more}>
          <Icon name="ellipsis-horizontal" size={18} color={theme.muted} />
        </Pressable>
      </View>
    </View>
  );
}

function Piece({ piece: p, moment: m, onOpenRef }: { piece: Capture; moment: MomentView; onOpenRef: (v: MomentView) => void }) {
  if (p.kind === 'text') {
    const body = p.body ?? '';
    if (!body.trim()) return null;
    // A reference is drawn as the moment it names (JN16, RF4); the words around it stay the owner's.
    return (
      <View testID="entry-piece-text">
        {parseRefs(body).some((x) => 'ref' in x) ? (
          <View testID="entry-words"><NoteText body={body} style={styles.words} onOpen={onOpenRef} /></View>
        ) : (
          <Text style={styles.words} testID="entry-words">{body}</Text>
        )}
      </View>
    );
  }
  if (p.kind === 'voice') {
    const ms = Number(p.body);
    return (
      <View style={styles.memo} testID="entry-piece-voice">
        <Icon name="play-circle-outline" size={22} color={theme.ink} />
        <Text style={styles.memoText}>{Number.isFinite(ms) && ms > 0 ? `Voice note, ${formatElapsed(ms)}` : 'Voice note'}</Text>
      </View>
    );
  }
  return (
    <View testID={`entry-piece-${p.kind}`} style={styles.plate}>
      <MomentPicture capture={facedAt(m.capture, p.id)} style={styles.picture} iconSize={36} />
      {p.caption?.trim() ? <Text style={styles.words} testID="entry-words">{p.caption.trim()}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  entry: { paddingBottom: 6 },
  // A thumb's target for the map (JN6), and the breath between entries.
  dateline: { minHeight: 44, justifyContent: 'flex-end', paddingBottom: 6 },
  app: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  pieces: { gap: 10 },
  words: { color: theme.ink, fontFamily: OWNER_FONT, fontSize: 19, lineHeight: 28 },
  plate: { gap: 8 },
  picture: { height: 200, width: '100%' },
  memo: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  memoText: { color: theme.ink, fontSize: 15 },
  foot: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  from: { flex: 1, minHeight: 44, justifyContent: 'center' },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
});
