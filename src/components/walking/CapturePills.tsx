import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EditOfferPill } from '../edit/EditOffer';
import { SpaceLine } from '../SpaceLine';
import { AddToMomentPill } from '../walk/AddToMomentPill';
import { theme } from '../ui';
import { momentPill } from '../../lib/momentPill';
import { heldLabel } from '../../lib/space/core';
import type { WalkCaptures } from './useWalkCaptures';

/**
 * The captures' pills, left of the stack and above the strip, so the stack never moves (NR10): Add to
 * this moment (MS1-MS6), Edit after a photo (ME23), the memo's Undo and Retry, what is held for Retry
 * (SA8) and the room left (SA3). The heads-up line sits between the first two (`aheadLine`).
 */
export function AddToMomentPills(props: { captures: WalkCaptures; walking: boolean; hidden: boolean }) {
  const { photo, startVoice, note } = props.captures;
  if (!props.walking) return null;
  return (
    <AddToMomentPill
      hidden={props.hidden}
      onPhoto={() => void photo(momentPill.target())}
      onVoice={() => void startVoice(momentPill.target())}
      onNote={() => note.openFor(momentPill.target())}
    />
  );
}

/** Edit, Undo, Retry, held captures and the space line: none while a memo records or a card is open. */
export function CapturePills(props: { captures: WalkCaptures; walking: boolean; covered: boolean }) {
  const { cap, editOffer, captures, setEditingKept, recordingVoice } = props.captures;
  const shown = !recordingVoice && !props.covered;
  return (
    <>
      {editOffer.offer && shown && (
        <EditOfferPill
          offer={editOffer.offer}
          where="here"
          onEdit={() => {
            const id = editOffer.offer?.id;
            setEditingKept(captures.find((c) => c.id === id) ?? null);
            editOffer.clear();
          }}
        />
      )}
      {cap.discarded && shown && (
        <View style={styles.undo} accessibilityLiveRegion="polite">
          <Text style={styles.undoText}>Voice memo discarded</Text>
          <Pressable testID="voice-undo" accessibilityRole="button" onPress={() => cap.undoDiscard()} hitSlop={10} style={styles.undoBtn}>
            <Text style={styles.undoBtnText}>Undo</Text>
          </Pressable>
        </View>
      )}
      {cap.unsaved && shown && (
        <View style={styles.undo} accessibilityLiveRegion="polite">
          <Text style={styles.undoText}>Voice memo not saved</Text>
          <Pressable accessibilityRole="button" onPress={() => cap.retrySave()} hitSlop={10} style={styles.undoBtn}>
            <Text style={styles.undoBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}
      {props.walking && cap.held.length > 0 && shown && (
        <View testID="held-captures" style={styles.undo} accessibilityLiveRegion="polite">
          <Text style={styles.undoText}>{heldLabel(cap.held)}</Text>
          <Pressable testID="held-retry" accessibilityRole="button" onPress={() => cap.retryHeld()} hitSlop={10} style={styles.undoBtn}>
            <Text style={styles.undoBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}
      {props.walking && shown && <SpaceLine />}
    </>
  );
}

const styles = StyleSheet.create({
  undo: {
    flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: theme.ink, borderRadius: 999, maxWidth: '100%',
    paddingVertical: 8, paddingLeft: 16, paddingRight: 8,
  },
  undoText: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  undoBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  undoBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
