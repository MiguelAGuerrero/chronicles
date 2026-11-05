import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dayPartLine } from '../../lib/resurface/context';
import { BRING_BACK, NOTHING_HIDDEN } from '../../lib/resurface/copy';
import type { HiddenItems } from '../../lib/resurface/hidden';
import type { MomentView } from '../../lib/resurface/types';
import { Icon, KIND_LABEL } from '../icons';
import { theme } from '../ui';

/**
 * Hidden (MC8): everything the owner hid or asked for less of, to read and bring back. A moment shows as its
 * kind and its day, with no picture, no words and no place until it is opened; hiding is not privacy.
 */
export function HiddenScreen(props: {
  items: HiddenItems;
  moments: Map<string, MomentView>;
  names: Record<string, string>;
  now: number;
  onBack: () => void;
  onOpen: (m: MomentView) => void;
  onMoment: (id: string) => void;
  onThread: (term: string) => void;
  onWord: (term: string) => void;
}) {
  const { items } = props;
  const empty = !items.moments.length && !items.threads.length && !items.words.length;
  const row = (key: string, testID: string, title: string, sub: string | null, bring: () => void, open?: () => void) => (
    <View key={key} style={styles.row} testID="hidden-row">
      <Pressable style={styles.text} accessibilityRole={open ? 'button' : undefined} onPress={open} disabled={!open} testID={testID}>
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </Pressable>
      <Pressable testID="hidden-bring-back" accessibilityRole="button" accessibilityLabel={`${BRING_BACK}: ${title}`} onPress={bring} style={styles.bring}>
        <Text style={styles.bringText}>{BRING_BACK}</Text>
      </Pressable>
    </View>
  );
  return (
    <View style={styles.wrap} testID="hidden-screen">
      <View style={styles.top}>
        <Pressable testID="hidden-back" accessibilityRole="button" accessibilityLabel="Back to Memories" onPress={props.onBack} style={styles.back}>
          <Icon name="chevron-back" size={20} color={theme.ink} />
        </Pressable>
        <Text style={styles.h} accessibilityRole="header">Hidden</Text>
      </View>
      {empty && <Text style={styles.hint} testID="hidden-empty">{NOTHING_HIDDEN}</Text>}
      {items.moments.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.gh} accessibilityRole="header">Moments</Text>
          {items.moments.map(({ id, mode }) => {
            const m = props.moments.get(id);
            if (!m) return null;
            const kind = `${KIND_LABEL[m.kind]}${mode === 'fewer' ? ' · fewer like this' : ''}`;
            return row(id, 'hidden-moment', kind, dayPartLine(m.t, props.now), () => props.onMoment(id), () => props.onOpen(m));
          })}
        </View>
      )}
      {items.threads.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.gh} accessibilityRole="header">Threads</Text>
          {items.threads.map((term) => row(term, 'hidden-thread', props.names[term] ?? term, 'Not a thread', () => props.onThread(term)))}
        </View>
      )}
      {items.words.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.gh} accessibilityRole="header">Words</Text>
          {items.words.map(({ term, shown }) => row(term, 'hidden-word', shown, 'word, brought up less', () => props.onWord(term)))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  h: { color: theme.ink, fontSize: 24, fontWeight: '700' },
  hint: { color: theme.muted, fontSize: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line, borderRadius: 14, padding: 12 },
  group: { gap: 8 },
  gh: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.line, paddingLeft: 14 },
  text: { flex: 1, minHeight: 52, justifyContent: 'center', paddingVertical: 8 },
  title: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  sub: { color: theme.muted, fontSize: 13 },
  bring: { minWidth: 44, minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  bringText: { color: theme.accent, fontSize: 14, fontWeight: '700' },
});
