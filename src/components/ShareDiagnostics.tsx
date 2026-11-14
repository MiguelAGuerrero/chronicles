import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { diagnostics, localWhen } from '../lib/diagnostics';
import { diagnosticsHeader } from '../lib/diagnostics/header';
import { caught } from '../lib/diagnostics/sink';
import { shareLogText } from '../lib/shareLog/share';
import { theme } from './ui';

/** What the row says before the tap: what the text holds, never how much (EH3a, EH13). */
const HOLDS = 'When and where in the app something went wrong; no places, times of walks or words.';
const AFTER = { shared: 'Shared.', copied: 'Copied.', failed: 'Not shared: this browser offers no share sheet and no clipboard.' } as const;

/**
 * Share diagnostics (EH1, decision 0179): the log as text through the share sheet, or the clipboard where there is
 * none. The text is read when the settings open, since a browser opens the share sheet only straight from a tap.
 */
export function ShareDiagnostics() {
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState(HOLDS);
  useEffect(() => {
    let live = true;
    diagnostics.text(diagnosticsHeader(), localWhen).then((t) => live && setText(t), caught('cache', 'ShareDiagnostics · read the log'));
    return () => {
      live = false;
    };
  }, []);
  const share = () => {
    if (text === null) return;
    shareLogText(text, 'Chronicles diagnostics').then((how) => setNote(AFTER[how]), caught('unexpected', 'ShareDiagnostics · share'));
  };
  return (
    <View style={styles.box}>
      <Pressable testID="share-diagnostics" accessibilityRole="button" accessibilityState={{ disabled: text === null }} aria-disabled={text === null} onPress={share} style={styles.row}>
        <Text style={styles.label}>Share diagnostics</Text>
      </Pressable>
      <Text testID="share-diagnostics-note" style={styles.note} accessibilityLiveRegion="polite">
        {note}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 2 },
  row: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  label: { fontSize: 15, fontWeight: '700', color: theme.ink },
  note: { fontSize: 13, color: theme.muted },
});
