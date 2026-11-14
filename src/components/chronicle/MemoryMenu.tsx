import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactionId, ReactionSet } from '../../lib/reactions/core';
import { ReactionPanel } from '../reactions/ReactionPanel';
import { Modal } from '../Modal';
import { theme } from '../ui';

/** A moment's More menu (RM20): bring it up less, never bring it back, or open it. */
export function MemoryMenu(props: { open: boolean; onClose: () => void; /** The moment's reactions (RX10): Reaction in the list, the families in this same sheet. */ reaction?: { set: ReactionSet; onPick: (id: ReactionId) => void }; /** Open on the reactions, with nothing else (RX9). */ onlyType?: boolean; onLess: () => void; onHide: () => void; onOpen: () => void; /** Given for the resurfaced slip (chronicle journal JN20). */ onRelive?: () => void; onAnother?: () => void; /** Given for a placed moment (chronicle journal JN6, ui 3). */ onMap?: () => void }) {
  const item = (testID: string, label: string, hint: string, fn: () => void) => (
    <Pressable testID={testID} accessibilityRole="button" onPress={fn} style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </Pressable>
  );
  // Reaction (RX10): the three families, in this same sheet; never a second Modal. A choice leaves them open.
  const [typing, setTyping] = useState(false);
  const type = props.reaction;
  // Opened from the sign on an entry's row (RX9): the reactions at once.
  const grid = (typing || !!props.onlyType) && !!type;
  // Closed by anything (an item, the host), it opens on its list again (note-types audit 63).
  if (!props.open && typing) setTyping(false);
  const close = () => {
    setTyping(false);
    props.onClose();
  };
  return (
    <Modal visible={props.open} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.back}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        <View style={styles.sheet} testID="memory-menu" accessibilityViewIsModal>
          {grid && type ? (
            <>
            <Text style={styles.heading} accessibilityRole="header">Reaction</Text>
            <ReactionPanel set={type.set} onPick={type.onPick} />
            </>
          ) : null}
          {grid ? null : (
            <>
          {!typing && type ? item('menu-reaction', 'Reaction', 'How it felt, what you made of it', () => setTyping(true)) : null}
          {props.onRelive && item('resurfaced-relive', 'Relive it', 'Replays the walk or the day it came from', props.onRelive)}
          {props.onAnother && item('resurfaced-another', 'Another', 'Brings back a different moment', props.onAnother)}
          {item('menu-less', 'Show less like this', 'Brings this kind of thing up less often', props.onLess)}
          {item('menu-hide', 'Not this one', 'Keeps it, but never brings it back up', props.onHide)}
          {props.onMap && item('menu-map', 'Show on the map', 'Where this moment was made', props.onMap)}
          {item('menu-open', 'Open the moment', 'Full screen, with its own menu', props.onOpen)}
            </>
          )}
          <Pressable testID="menu-cancel" accessibilityRole="button" onPress={close} style={styles.item}>
            <Text style={[styles.label, { color: theme.muted }]}>{grid ? 'Done' : 'Cancel'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(20,24,32,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 12, paddingBottom: 24, gap: 2, width: '100%', maxWidth: 640, alignSelf: 'center' },
  item: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  label: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  heading: { color: theme.ink, fontSize: 16, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 10 },
  hint: { color: theme.muted, fontSize: 13 },
});
