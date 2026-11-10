import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { noteText, NOTE_MAX } from '../../lib/noteEdit';
import { useCaptures } from '../../lib/useCaptures';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

/**
 * Respond (OT1, OT3): the capture row's own kinds on the viewer's face, one tap each. The new moment is kept by the
 * capture's own path, with its own time and place; once kept it is linked to the moment it answers and joins its
 * thread (`useCaptures` `replyTo`). Outside a walk it is a moment of its own, placed by one fix (OT24); on a walk it
 * belongs to the walk. One bar serves every moment the viewer shows, so swiping builds no new recorder (audit 10); the
 * note being written belongs to one moment and is the viewer's to close with Back (`composeFor`, audit 9).
 *
 * It stands just above the moment it answers (the photo's strip, the note's card), as a reply sits under what it
 * answers, so no label says "Respond" (the owner, Nov 10). `bottom` is how far that moment reaches up from the
 * screen's foot; null until the viewer has measured it, when the bar is laid out but not shown. A note being written
 * rises with the keyboard (iOS; Android resizes the window itself).
 */
export function RespondBar(props: {
  answeredId: string;
  threadId?: string | null;
  walkId?: string | null;
  bottom: number | null;
  composeFor: string | null;
  setComposeFor: (id: string | null) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  // A permission refusal is only fixable in Settings: it stays longer and offers the way there (the web has none).
  const [settings, setSettings] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = (m: string, openSettings?: boolean) => {
    setMessage(m);
    setSettings(!!openSettings && Platform.OS !== 'web');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), openSettings ? 8000 : 3500);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const replyTo = useMemo(() => ({ answeredId: props.answeredId, from: props.threadId ?? null }), [props.answeredId, props.threadId]);
  const walkId = props.walkId ?? null;
  const cap = useCaptures(walkId, null, null, (e) => say(e.message, e.openSettings), {
    loose: !walkId,
    replyTo,
    onMoment: (_c, state) => {
      if (state === 'kept') say('Reply kept');
    },
  });
  const recording = cap.voiceStartedAt != null;
  const composing = props.composeFor === props.answeredId;
  const tool = (testID: string, icon: IconName, label: string, onPress: () => void, disabled?: boolean) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.tool, (pressed || disabled) && styles.dim]}
    >
      <Icon name={icon} size={22} color={theme.ink} />
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, styles.anchor]} pointerEvents="box-none">
    <View
      style={[styles.wrap, { marginBottom: (props.bottom ?? 0) + 12 }, props.bottom == null && styles.unmeasured]}
      pointerEvents={props.bottom == null ? 'none' : 'box-none'}
      aria-hidden={props.bottom == null}
      testID="respond-bar"
      accessibilityLabel="Respond to this moment"
    >
      {message ? (
        <View style={styles.messageRow}>
          <Text style={styles.message} accessibilityLiveRegion="polite" testID="respond-message">{message}</Text>
          {settings ? (
            <Pressable testID="respond-settings" accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.settings} hitSlop={8}>
              <Text style={styles.toolText}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {composing ? (
        <ReplyNote
          key={props.answeredId}
          onCancel={() => props.setComposeFor(null)}
          onKeep={(text) => {
            props.setComposeFor(null);
            void cap.saveNote(text);
          }}
          tool={tool}
        />
      ) : (
        <View style={styles.row}>
          {recording ? (
            tool('respond-voice-stop', 'stop', 'Stop and keep', () => void cap.finishVoice())
          ) : (
            <>
              {tool('respond-photo', 'camera', 'Photo', () => void cap.takePhoto(), cap.busy != null)}
              {tool('respond-voice', 'mic', 'Voice', () => void cap.startVoice(), cap.busy != null)}
              {tool('respond-note', 'create-outline', 'Note', () => props.setComposeFor(props.answeredId), cap.busy != null)}
            </>
          )}
        </View>
      )}
    </View>
    </KeyboardAvoidingView>
  );
}

/** The note being written as a reply: its text is its own, and is gone with the moment it was for. */
function ReplyNote(props: {
  onCancel: () => void;
  onKeep: (text: string) => void;
  tool: (testID: string, icon: IconName, label: string, onPress: () => void, disabled?: boolean) => ReactNode;
}) {
  const [text, setText] = useState('');
  const kept = noteText(text);
  return (
    <View style={styles.compose}>
      <TextInput
        testID="respond-note-input"
        autoFocus
        multiline
        value={text}
        onChangeText={setText}
        placeholder="Your reply"
        placeholderTextColor={theme.muted}
        accessibilityLabel="Your reply"
        maxLength={NOTE_MAX}
        style={styles.input}
      />
      <View style={styles.row}>
        {props.tool('respond-note-cancel', 'close', 'Cancel', props.onCancel)}
        {props.tool('respond-note-save', 'checkmark', 'Keep reply', () => {
          if (kept) props.onKeep(kept);
        }, !kept)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // In the flow, not absolute: the keyboard's padding must lift it.
  anchor: { justifyContent: 'flex-end' },
  wrap: { marginHorizontal: 12, gap: 8, alignItems: 'center' },
  unmeasured: { opacity: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)' },
  toolText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  dim: { opacity: 0.4 },
  message: { color: '#ffffff', fontSize: 14, fontWeight: '600', backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  settings: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)' },
  compose: { width: '100%', maxWidth: 480, gap: 8, alignItems: 'stretch' },
  input: { backgroundColor: theme.surface, borderRadius: 14, padding: 12, minHeight: 84, color: theme.ink, fontSize: 16, textAlignVertical: 'top' },
});
