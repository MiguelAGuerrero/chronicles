import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { focusOn } from '../../lib/focus';
import { moreFor } from '../../lib/quietLines';
import { HINT_NOT_A_THREAD, HINT_RENAME_THREAD } from '../../lib/resurface/copy';
import { threadLine, whenLine } from '../../lib/resurface/lines';
import type { MomentView, Thread } from '../../lib/resurface/types';
import type { Walk } from '../../lib/types';
import { Icon } from '../icons';
import { Modal } from '../Modal';
import { Button, theme } from '../ui';
import { ThreadMark } from '../threads/ThreadMark';
import { MomentCard } from './MomentCard';

/**
 * One thread (RM15, RM16): its name, a couple of the user's own sentences from
 * it, and every moment in it, newest first. Rename changes the name shown;
 * Not a thread takes it off the rail for good. Neither touches a moment.
 * Keep as my thread is the screen's one button; Rename and Not a thread are in
 * its More, beside the "Thread" label, so nothing wraps at 320 px (tend chronicle 13).
 */
export function ThreadScreen(props: {
  thread: Thread;
  moments: MomentView[];
  walks: Record<string, Walk>;
  now: number;
  onBack: () => void;
  onOpen: (m: MomentView) => void;
  onWalk: (walkId: string) => void;
  onMore: (m: MomentView) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  /** Copies this thread's moments into a thread of the owner's (OT19); this one is untouched. */
  onKeep: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(props.thread.name);
  const [menu, setMenu] = useState(false);
  const nameInput = useRef<ComponentRef<typeof TextInput>>(null);
  // Rename from the More: the sheet's focus trap gives focus back to the More as it closes, after the field's
  // autoFocus, so the field takes it again once the sheet is gone (react-native-web).
  useEffect(() => {
    if (renaming) focusOn(nameInput);
  }, [renaming]);
  const quotes = props.moments.filter((m) => m.words && (m.kind === 'text' || m.kind === 'photo')).slice(0, 2);
  return (
    <View style={styles.wrap} testID="thread-screen">
      <View style={styles.top}>
        <Pressable testID="thread-back" accessibilityRole="button" accessibilityLabel="Back to Memories" onPress={props.onBack} style={styles.back}>
          <Icon name="chevron-back" size={20} color={theme.ink} />
        </Pressable>
        <ThreadMark kind="found" />
        <Text style={styles.eyebrow}>Thread</Text>
        {/* Not offered while the name is being written: Save or Cancel ends that first (tend chronicle audit 7). */}
        {renaming ? null : (
          <Pressable testID="thread-more" accessibilityRole="button" accessibilityLabel={moreFor(props.thread.name)} accessibilityState={{ expanded: menu }} onPress={() => setMenu(true)} style={styles.more} hitSlop={4}>
            <Icon name="ellipsis-horizontal" size={22} color={theme.ink} />
          </Pressable>
        )}
      </View>
      {renaming ? (
        <View style={styles.rename}>
          <TextInput ref={nameInput} testID="thread-name" value={name} onChangeText={setName} autoFocus maxLength={40} style={styles.input} accessibilityLabel="Thread name" />
          <View style={styles.row}>
            <Button testID="thread-save" label="Save" onPress={() => { props.onRename(name); setRenaming(false); }} />
            <Button label="Cancel" variant="secondary" onPress={() => { setName(props.thread.name); setRenaming(false); }} />
          </View>
        </View>
      ) : (
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header" testID="thread-title">{props.thread.name}</Text>
          <Text style={styles.line}>{threadLine(props.thread, props.now)}. Named from your own words.</Text>
          <View style={styles.row}>
            <Button testID="thread-keep" label="Keep as my thread" onPress={props.onKeep} />
          </View>
        </View>
      )}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <View style={styles.sheetBack}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} accessible={false} />
          <View style={styles.sheet} testID="thread-menu" accessibilityViewIsModal>
            <Pressable testID="thread-rename" accessibilityRole="button" onPress={() => { setMenu(false); setName(props.thread.name); setRenaming(true); }} style={styles.item}>
              <Text style={styles.label}>Rename</Text>
              <Text style={styles.hint}>{HINT_RENAME_THREAD}</Text>
            </Pressable>
            <Pressable testID="thread-remove" accessibilityRole="button" onPress={() => { setMenu(false); props.onRemove(); }} style={styles.item}>
              <Text style={styles.label}>Not a thread</Text>
              <Text style={styles.hint}>{HINT_NOT_A_THREAD}</Text>
            </Pressable>
            <Pressable testID="thread-more-cancel" accessibilityRole="button" onPress={() => setMenu(false)} style={styles.item}>
              <Text style={[styles.label, { color: theme.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {quotes.length > 0 && (
        <View style={styles.sec}>
          <Text style={styles.h} accessibilityRole="header">In your words</Text>
          {quotes.map((q) => (
            <View key={q.id} style={styles.quote} testID="thread-quote">
              <Text style={styles.qtext}>{q.words}</Text>
              <Text style={styles.qmeta}>{whenLine(q.t, props.now)}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.sec}>
        <Text style={styles.h} accessibilityRole="header">Every moment</Text>
        {props.moments.map((m) => (
          <MomentCard key={m.id} moment={m} walk={m.walkId ? props.walks[m.walkId] : undefined} now={props.now} onOpen={() => props.onOpen(m)} onWalk={props.onWalk} onMore={() => props.onMore(m)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.ink, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  more: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  head: { gap: 8 },
  title: { color: theme.ink, fontSize: 30, fontWeight: '700' },
  line: { color: theme.muted, fontSize: 14 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  rename: { gap: 10 },
  input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, color: theme.ink, fontSize: 18 },
  sec: { gap: 10 },
  h: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  quote: { borderLeftWidth: 2, borderLeftColor: theme.ink, paddingLeft: 12, gap: 2 },
  qtext: { color: theme.ink, fontSize: 18, lineHeight: 25, fontStyle: 'italic' },
  qmeta: { color: theme.muted, fontSize: 12.5 },
  // The app's More sheet (MemoryMenu, ThreadMomentMenu).
  sheetBack: { flex: 1, backgroundColor: 'rgba(20,24,32,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 12, paddingBottom: 24, gap: 2, width: '100%', maxWidth: 640, alignSelf: 'center' },
  item: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  label: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  hint: { color: theme.muted, fontSize: 13 },
});
