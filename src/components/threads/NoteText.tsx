import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useHidden } from '../../lib/deletion/useDeletions';
import { formatElapsed } from '../../lib/format';
import { GONE, keywordPlain, parseRefs } from '../../lib/refs';
import { useRefValues } from '../../lib/refValues/useRefValues';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine } from '../../lib/resurface/views';
import { refCardLine } from '../../lib/threads/lines';
import { useMomentPool } from './useMomentPool';
import { MomentPicture } from '../chronicle/MomentPicture';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

const KIND_WORD = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' } as const;
const KIND_ICON: Record<MomentView['kind'], IconName> = { photo: 'camera', video: 'videocam', voice: 'mic', text: 'document-text-outline' };

/**
 * A note's text in the viewer (moment references RF4, RF5): its own words, with each moment it mentions drawn as a
 * card of that moment: its first piece, its kind, date and place, and its walk (steward S1). A tap opens it; a moment
 * gone or waiting in Undo reads "a moment no longer kept" and opens nothing.
 */
export function NoteText(props: {
  body: string;
  style: StyleProp<TextStyle>;
  onOpen: (v: MomentView) => void;
  /** A tap on a keyword reference, by its place among the note's keywords: the viewer opens the resolution picker (RK10). */
  onKeyword?: (index: number) => void;
}) {
  const parts = parseRefs(props.body);
  const pool = useMomentPool(props.body);
  const hidden = useHidden();
  const [now] = useState(() => Date.now());
  const showValues = useRefValues();
  if (!parts.some((p) => 'ref' in p || 'key' in p)) return <Text style={props.style}>{props.body}</Text>;
  // Words, keywords and a pointer to a moment that is gone read inline, as one paragraph; a moment still kept is a card.
  let keywordAt = -1;
  const blocks: ({ inline: ReactNode[] } | { card: Extract<(typeof parts)[number], { ref: string }> })[] = [];
  const inline = () => {
    const last = blocks[blocks.length - 1];
    if (last && 'inline' in last) return last.inline;
    const fresh: ReactNode[] = [];
    blocks.push({ inline: fresh });
    return fresh;
  };
  parts.forEach((p, i) => {
    if ('text' in p) inline().push(p.text);
    else if ('key' in p) {
      keywordAt++;
      const index = keywordAt;
      inline().push(
        <Text
          key={i}
          testID="ref-keyword"
          style={styles.keyword}
          // A place can be corrected (RK10); a time is the moment's own and is not.
          accessibilityRole={props.onKeyword && p.key !== 'time' ? 'button' : undefined}
          onPress={props.onKeyword && p.key !== 'time' ? () => props.onKeyword?.(index) : undefined}
        >
          {keywordPlain(p, showValues)}
        </Text>,
      );
    } else {
      const v = pool.byId.get(p.ref);
      // A moment gone or waiting in Undo: only the pointer is gone; a reference that carries its words reads them (RK20).
      if ((!v || hidden.has(v.id)) && p.label) inline().push(p.label);
      else blocks.push({ card: p });
    }
  });
  return (
    <View style={styles.col} testID="note-with-refs">
      {blocks.map((b, bi) => {
        if ('inline' in b) return <Text key={bi} style={props.style}>{b.inline}</Text>;
        const p = b.card;
        const i = bi;
        const v = pool.byId.get(p.ref);
        if (!v || hidden.has(v.id)) {
          return (
            <View key={i} style={[styles.card, styles.gone]} testID="ref-card-gone">
              <Text style={styles.sub}>{pool.ready ? GONE[0].toUpperCase() + GONE.slice(1) : p.label ?? ''}</Text>
            </View>
          );
        }
        const line = refCardLine({ place: v.place, t: v.t, walkLine: fromLine(v.walkId ? pool.walks.get(v.walkId) : undefined) }, now);
        const what = v.kind === 'text' ? (v.words ?? KIND_WORD.text) : v.kind === 'voice' ? `${KIND_WORD.voice}, ${formatElapsed(Number(v.capture.body) || 0)}` : (v.words ?? KIND_WORD[v.kind]);
        return (
          <Pressable
            key={i}
            testID="ref-card"
            accessibilityRole="button"
            accessibilityLabel={`${KIND_WORD[v.kind]}: ${what}. ${line}. Open`}
            onPress={() => props.onOpen(v)}
            style={({ pressed }) => [styles.card, pressed && styles.dim]}
          >
            {v.kind === 'photo' || v.kind === 'video' ? (
              <MomentPicture capture={v.capture} style={styles.pic} iconSize={22} />
            ) : (
              <View style={[styles.pic, styles.icon]}>
                <Icon name={KIND_ICON[v.kind]} size={22} color={theme.ink} />
              </View>
            )}
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={2}>{what}</Text>
              <Text style={styles.sub} numberOfLines={2}>{line}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bg },
  gone: { justifyContent: 'center' },
  keyword: { textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  pic: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
  icon: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  text: { flex: 1, gap: 2 },
  name: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  sub: { color: theme.muted, fontSize: 13 },
  dim: { opacity: 0.6 },
});
