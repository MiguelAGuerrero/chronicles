import { Pressable, StyleSheet, Text } from 'react-native';
import { memoWords } from '../../lib/voiceTrim';
import { plainNote } from '../../lib/refs';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine } from '../../lib/resurface/views';
import { answeringLine, entryLine } from '../../lib/threads/lines';
import type { Walk } from '../../lib/types';
import { MomentPicture } from '../chronicle/MomentPicture';
import { theme } from '../ui';

const KIND_WORD = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' } as const;
const timeOf = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * One entry in a moment's responses sheet (RT4, RT5, RT10): plain ink, the same for every entry, whoever wrote it;
 * its time, place and walk line, and its content. The sheet's own moment is short: its line and a few words.
 */
export function ResponseEntry(props: {
  moment: MomentView;
  /** The response it answers, when that is not the sheet's own moment (RT4). */
  answering: MomentView | null;
  walks: ReadonlyMap<string, Walk>;
  /** The sheet's own moment: its line and a few words (decision 0131). */
  first?: boolean;
  now: number;
  onPress: () => void;
}) {
  const { moment: m, now } = props;
  const walk = m.walkId ? props.walks.get(m.walkId) : undefined;
  const line = entryLine({ t: m.t, time: timeOf(m.t), place: m.place, hasFix: m.capture.lat != null, walkLine: fromLine(walk), now });
  const words = m.kind === 'text' ? plainNote(m.capture.body, m.capture.body_format) : m.words;
  const parent = props.answering;
  const answering = parent ? answeringLine({ place: parent.place, t: parent.t, walkLine: fromLine(parent.walkId ? props.walks.get(parent.walkId) : undefined) }, now) : null;
  return (
    <Pressable
      testID={props.first ? 'response-first' : 'response-entry'}
      accessibilityRole="button"
      accessibilityLabel={[KIND_WORD[m.kind], words, answering, line].filter(Boolean).join(', ')}
      accessibilityHint={props.first ? 'Lowers the responses' : 'Opens this moment'}
      onPress={props.onPress}
      style={({ pressed }) => [styles.entry, pressed && styles.dim]}
    >
      <Text style={styles.line} testID="response-line">{line}</Text>
      {answering ? <Text style={styles.line} testID="response-answering">{answering}</Text> : null}
      {!props.first && (m.kind === 'photo' || m.kind === 'video') ? <MomentPicture capture={m.capture} style={styles.picture} iconSize={28} /> : null}
      {m.kind === 'voice' ? <Text style={styles.text}>{memoWords(m.capture)}</Text> : null}
      {words ? (
        <Text style={styles.text} numberOfLines={props.first ? 2 : undefined} testID="response-words">{words}</Text>
      ) : m.kind !== 'voice' ? (
        <Text style={styles.kind}>{KIND_WORD[m.kind]}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entry: { paddingVertical: 12, paddingHorizontal: 16, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.line },
  dim: { opacity: 0.6 },
  line: { color: theme.muted, fontSize: 13 },
  text: { color: theme.ink, fontSize: 16, lineHeight: 22 },
  kind: { color: theme.ink, fontSize: 15 },
  picture: { height: 160, width: '100%', borderRadius: 10 },
});
