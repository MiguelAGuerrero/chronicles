import { useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LngLat } from '../../lib/types';
import { feedback } from '../../lib/motion';
import { useCaptures } from '../../lib/useCaptures';
import { CaptureStack } from '../walk/CaptureStack';
import { theme } from '../ui';
import { Modal } from '../Modal';
import { NewNotePage } from '../notePage/NewNotePage';
import type { NotePageHandle } from '../notePage/NotePage';

/**
 * Capture on the planner while a walk is recording (WP23): the same stack as the walk screen, photo, voice memo and note, one tap away,
 * the moment arriving with its place, time and walk. Not shown with no walk.
 */
export function PlannerCapture(props: { walkId: string; here: LngLat | null; lastFixAt: number | null }) {
  const [said, setSaid] = useState<{ text: string; settings: boolean } | null>(null);
  const message = said?.text ?? null;
  const setMessage = (text: string) => setSaid({ text, settings: false });
  // A permission refusal is only fixable in Settings; the web has none to open. Any later message drops the button.
  const cap = useCaptures(props.walkId, props.here, props.lastFixAt, (e) =>
    setSaid({ text: e.message, settings: !!e.openSettings && Platform.OS !== 'web' }),
  );
  // The note's page (note pages NP1; note-pages audit 13), begun at the pencil's tap, keyed per page.
  const [page, setPage] = useState(0);
  const pageRef = useRef<NotePageHandle>(null);
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
        onNote={() => setPage((n) => n + 1)}
      />
      {said ? (
        <View style={styles.toast}>
          <Text style={styles.toastText} accessibilityLiveRegion="polite">{said.text}</Text>
          {said.settings ? (
            <Pressable testID="plan-cap-settings" accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.settings} hitSlop={8}>
              <Text style={styles.settingsText}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Modal visible={page > 0} animationType="slide" onRequestClose={() => pageRef.current?.requestClose()}>
        {page > 0 ? <NewNotePage key={page} ref={pageRef} cap={cap} into={null} onWalk reactable camera onKept={() => setMessage('Note saved here')} onClose={() => setPage(0)} /> : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, bottom: 140, alignItems: 'center', gap: 8, backgroundColor: theme.ink, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  toastText: { color: '#ffffff', textAlign: 'center' },
  settings: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: theme.surface },
  settingsText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
});
