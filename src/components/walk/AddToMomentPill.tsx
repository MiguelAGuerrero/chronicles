import { Pressable, StyleSheet, Text, View } from 'react-native';
import { momentPill } from '../../lib/momentPill';
import { useStore } from '../../lib/useStore';
import { Icon, KIND_ICON } from '../icons';
import { LiftIn, theme } from '../ui';

/**
 * Add to this moment (moment stacks MS2, MS6; decision 0106): after a capture, a quiet pill left of the capture
 * stack offers the camera, the mic and a note, one tap each; what it keeps joins the moment just made. Ink, never the
 * accent; it enters by `LiftIn` (a `motionTokens` timing) with no pulse, sound or haptic of its own; its words never
 * change with the moment's size. It shows while `momentPill` says a moment is open; × dismisses it for that moment.
 */
export function AddToMomentPill(props: { hidden?: boolean; onPhoto: () => void; onVoice: () => void; onNote: () => void }) {
  const open = useStore(momentPill.store, (s) => s.id);
  if (!open || props.hidden) return null;
  const btn = (label: string, icon: Parameters<typeof Icon>[0]['name'], onPress: () => void, testID: string) => (
    <Pressable key={testID} testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={styles.btn}>
      <Icon name={icon} size={20} color="#ffffff" />
    </Pressable>
  );
  return (
    <LiftIn testID="add-to-moment" style={styles.pill} accessibilityLiveRegion="polite">
      <Text style={styles.text}>Add to this moment</Text>
      <View style={styles.row}>
        {btn('Add a photo to this moment', KIND_ICON.photo, props.onPhoto, 'add-photo')}
        {btn('Add a voice memo to this moment', KIND_ICON.voice, props.onVoice, 'add-voice')}
        {btn('Add a note to this moment', KIND_ICON.text, props.onNote, 'add-note')}
        {btn('Not now', 'close', () => momentPill.dismiss(), 'add-dismiss')}
      </View>
    </LiftIn>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.ink, borderRadius: 999, maxWidth: '100%',
    paddingVertical: 4, paddingLeft: 14, paddingRight: 4,
  },
  text: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  row: { flexDirection: 'row', gap: 4 },
  btn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
});
