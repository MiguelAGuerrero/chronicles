import { useState } from 'react';
import { AccessibilityInfo, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { LngLat } from '../../lib/types';
import { feedback } from '../../lib/motion';
import { useCaptures } from '../../lib/useCaptures';
import { CaptureStack } from '../walk/CaptureStack';
import { Button, theme } from '../ui';

/**
 * Capture on the planner while a walk is recording (WP23): the same stack as the walk screen, photo, voice memo and note, one tap away,
 * the moment arriving with its place, time and walk. Not shown with no walk.
 */
export function PlannerCapture(props: { walkId: string; here: LngLat | null; lastFixAt: number | null }) {
  const [message, setMessage] = useState<string | null>(null);
  // A permission refusal is only fixable in Settings; the web has none to open.
  const [settings, setSettings] = useState(false);
  const cap = useCaptures(props.walkId, props.here, props.lastFixAt, (e) => {
    setMessage(e.message);
    setSettings(!!e.openSettings && Platform.OS !== 'web');
  });
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  async function photo() {
    if (await cap.takePhoto()) {
      feedback('tap');
      setMessage('Saved here');
    }
  }
  async function startVoice() {
    if (await cap.startVoice()) {
      feedback('tap');
      AccessibilityInfo.announceForAccessibility('Recording voice memo');
    }
  }
  async function saveVoice() {
    const r = await cap.finishVoice();
    if (r === 'saved') {
      feedback('tap');
      setMessage('Voice memo saved here');
    } else if (r === 'dropped') setMessage('Too short, not kept');
  }
  async function discardVoice() {
    await cap.discardVoice();
  }
  async function saveNote() {
    if (await cap.saveNote(note)) {
      setNote('');
      setNoteOpen(false);
      feedback('tap');
      setMessage('Note saved here');
    }
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="plan-capture">
      <CaptureStack
        ids={{ photo: 'plan-cap-photo', voice: 'plan-cap-voice', note: 'plan-cap-note', save: 'plan-voice-save', discard: 'plan-voice-discard' }}
        labels={{ photo: 'Take a photo or video', voice: 'Record a voice memo', note: 'Write a note' }}
        voiceStartedAt={cap.voiceStartedAt}
        busy={cap.busy}
        onPhoto={photo}
        onVoice={startVoice}
        onSave={saveVoice}
        onDiscard={discardVoice}
        onNote={() => setNoteOpen(true)}
      />
      {message ? <Text style={styles.toast} accessibilityLiveRegion="polite">{message}</Text> : null}
      {message && settings ? (
        <Pressable testID="plan-cap-settings" accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.settings} hitSlop={8}>
          <Text style={styles.settingsText}>Open Settings</Text>
        </Pressable>
      ) : null}
      {noteOpen ? (
        <View style={styles.note} testID="plan-note">
          <TextInput value={note} onChangeText={setNote} placeholder="A note, here" multiline style={styles.input} accessibilityLabel="A note, here" autoFocus />
          <View style={styles.noteRow}>
            <Button variant="ghost" label="Close" onPress={() => setNoteOpen(false)} />
            <Button label="Save" onPress={() => void saveNote()} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, bottom: 140, textAlign: 'center', backgroundColor: theme.ink, color: '#ffffff', paddingVertical: 8, borderRadius: 12, overflow: 'hidden' },
  settings: { position: 'absolute', alignSelf: 'center', bottom: 188, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: theme.surface },
  settingsText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  note: { position: 'absolute', left: 12, right: 12, bottom: 90, backgroundColor: theme.surface, borderRadius: 14, padding: 12, gap: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  input: { minHeight: 80, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  noteRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
