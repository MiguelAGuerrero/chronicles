import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { diagnostics, localDay } from '../lib/diagnostics';
import { diagnosticsHeader } from '../lib/diagnostics/header';
import { caught } from '../lib/diagnostics/sink';
import { shareLogText } from '../lib/shareLog/share';
import { useStore } from '../lib/useStore';
import { Button, theme } from './ui';

/** What the row says before the tap: what the text holds, never how much (EH3a, EH13). */
const HOLDS = 'When and where in the app something went wrong; no places, times of walks or words.';
const AFTER = { shared: 'Shared.', copied: 'Copied: paste it into a message or an email.', cancelled: HOLDS, failed: 'Not shared: this browser offers no share sheet and no clipboard.' } as const;

/**
 * Share diagnostics (EH1, decision 0179): the log as text through the share sheet, or the clipboard where there is
 * none. The text is read when the settings open, since a browser opens the share sheet only straight from a tap, and
 * again after each new entry, so a failure while they are open is in it (errors-handled audit 10).
 */
export function ShareDiagnostics() {
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState(HOLDS);
  const changed = useStore(diagnostics.changes, (n) => n);
  useEffect(() => {
    let live = true;
    diagnostics.text(diagnosticsHeader(), localDay).then((t) => live && setText(t), caught('cache', 'ShareDiagnostics · read the log'));
    return () => {
      live = false;
    };
  }, [changed]);
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
  // The sheet's section heading (errors-handled audit 18).
  title: { fontSize: 15, fontWeight: '700', color: theme.ink, marginTop: 6 },
  btn: { alignSelf: 'flex-start' },
  note: { fontSize: 13, color: theme.muted },
});
