import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { diagnostics, localWhen } from '../lib/diagnostics';
import { diagnosticsHeader } from '../lib/diagnostics/header';
import { caught } from '../lib/diagnostics/sink';
import { shareLogText } from '../lib/shareLog/share';
import { Button, theme } from './ui';

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
      <View style={styles.rule} />
      <Text style={styles.title} accessibilityRole="header">Help</Text>
      <Button testID="share-diagnostics" variant="secondary" label="Share diagnostics" disabled={text === null} onPress={share} style={styles.btn} />
      <Text testID="share-diagnostics-note" style={styles.note} accessibilityLiveRegion="polite">
        {note}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.edge, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '700', color: theme.ink, marginTop: 4 },
  btn: { alignSelf: 'flex-start' },
  note: { fontSize: 13, color: theme.muted },
});
