import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { answeringLine, headingOf, threadLine } from '../../lib/threads/lines';
import { buildTimeline } from '../../lib/threads/timeline';
import type { Link, Thread } from '../../lib/threads/types';
import type { MomentView } from '../../lib/resurface/types';
import { fromLine } from '../../lib/resurface/views';
import type { Walk } from '../../lib/types';
import { MomentCard } from '../chronicle/MomentCard';
import { Icon } from '../icons';
import { Button, theme } from '../ui';

/**
 * One of the owner's threads (OT9, OT13, OT14): a plain timeline, oldest first, read like a conversation with
 * yourself. A reply sits under what it answers, saying so. Every moment shows its place and time and the walk it came
 * from; the thread's size and span are in words. Naming is optional and the owner's; Delete asks once.
 */
export function OwnThreadScreen(props: {
  thread: Thread;
  moments: MomentView[];
  links: Link[];
  walks: Record<string, Walk>;
  now: number;
  onBack: () => void;
  onOpen: (m: MomentView) => void;
  onWalk: (walkId: string) => void;
  onMore: (m: MomentView) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(props.thread.name ?? '');
  const rows = buildTimeline(props.moments, props.links);
  const oldest = rows.reduce<MomentView | null>((o, r) => (!o || r.moment.t < o.t ? r.moment : o), null);
  const heading = oldest ? headingOf({ name: props.thread.name, place: oldest.place, t: oldest.t, words: oldest.words }, props.now) : { title: 'Thread', sub: null };
  return (
    <View style={styles.wrap} testID="own-thread">
      <View style={styles.top}>
        <Pressable testID="own-thread-back" accessibilityRole="button" accessibilityLabel="Back to Memories" onPress={props.onBack} style={styles.back}>
          <Icon name="chevron-back" size={20} color={theme.ink} />
        </Pressable>
        <Text style={styles.eyebrow}>Your thread</Text>
      </View>
      {renaming ? (
        <View style={styles.rename}>
          <TextInput testID="own-thread-name" value={name} onChangeText={setName} autoFocus maxLength={40} style={styles.input} accessibilityLabel="Thread name" placeholder="A name for this thread" placeholderTextColor={theme.muted} />
          <View style={styles.row}>
            <Button testID="own-thread-save" label="Save" onPress={() => { props.onRename(name); setRenaming(false); }} />
            <Button label="Cancel" variant="secondary" onPress={() => { setName(props.thread.name ?? ''); setRenaming(false); }} />
          </View>
        </View>
      ) : (
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header" testID="own-thread-title">{heading.title}</Text>
          {heading.sub ? <Text style={styles.subline} numberOfLines={2}>{heading.sub}</Text> : null}
          {oldest ? <Text style={styles.line} testID="own-thread-line">{threadLine(rows.length, oldest.t, props.now)}</Text> : null}
          <View style={styles.row}>
            <Button testID="own-thread-rename" label={props.thread.name ? 'Rename' : 'Name this thread'} variant="secondary" onPress={() => { setName(props.thread.name ?? ''); setRenaming(true); }} />
            <Button testID="own-thread-delete" label="Delete this thread" variant="secondary" onPress={props.onDelete} />
          </View>
        </View>
      )}
      <View style={styles.sec}>
        {rows.map((r) => {
          const m = r.moment;
          const parent = r.answering;
          return (
            <View key={m.id} style={[styles.item, r.depth === 1 && styles.reply]} testID={r.depth === 1 ? 'own-thread-reply' : 'own-thread-moment'}>
              {parent ? (
                <Text style={styles.answering} testID="own-thread-answering">
                  {answeringLine({ place: parent.place, t: parent.t, walkLine: fromLine(parent.walkId ? props.walks[parent.walkId] : undefined) }, props.now)}
                </Text>
              ) : null}
              <MomentCard moment={m} walk={m.walkId ? props.walks[m.walkId] : undefined} now={props.now} onOpen={() => props.onOpen(m)} onWalk={props.onWalk} onMore={() => props.onMore(m)} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  head: { gap: 8 },
  title: { color: theme.ink, fontSize: 28, fontWeight: '700' },
  subline: { color: theme.ink, fontSize: 16, lineHeight: 22 },
  line: { color: theme.muted, fontSize: 14 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  rename: { gap: 10 },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, color: theme.ink, fontSize: 18 },
  sec: { gap: 10 },
  item: { gap: 4 },
  reply: { marginLeft: 20, borderLeftWidth: 2, borderLeftColor: theme.line, paddingLeft: 10 },
  answering: { color: theme.muted, fontSize: 13 },
});
