import { router, Stack, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, theme } from '../components/ui';
import { backup, datePartsOf } from '../lib/backup';
import { BACK_UP, BACKING_UP, FILE_LINE, lastLine, YOUR_DATA } from '../lib/backup/core';
import { backupIO } from '../lib/export';
import { useStore } from '../lib/useStore';

export { ScreenError as ErrorBoundary } from '../components/ScreenError';

/**
 * Your data (`/your-data`; specs/back-up-everything, decisions 0241, 0247): pushed on the root stack from the foot of
 * Walk settings, with the stack's Back. One line of what the file is and who can see it, one action, Back up
 * everything, and under it when the last file was made. No size, count, gauge or celebration; the file goes only where
 * the person sends it (the share sheet on a phone, a download on the web). Escape on the web goes back too.
 */
export default function YourDataRoute() {
  const focused = useIsFocused();
  const making = useStore(backup.store, (s) => s.making);
  const last = useStore(backup.store, (s) => s.last);
  const after = useStore(backup.store, (s) => s.after);
  const failed = useStore(backup.store, (s) => s.failed);
  const [thisYear] = useState(() => new Date().getFullYear());
  useEffect(() => {
    void backup.load();
  }, []);
  useEffect(() => {
    if (!focused || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (router.canGoBack()) router.back();
      else router.replace('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);
  const line = lastLine(last == null ? null : datePartsOf(last), thisYear);
  return (
    <>
      <Stack.Screen options={{ title: YOUR_DATA, presentation: 'card', headerShown: true, headerBackTitle: 'Back' }} />
      <ScrollView testID="your-data-page" style={styles.page} contentContainerStyle={styles.content}>
        <Text style={styles.line}>{FILE_LINE}</Text>
        <Button testID="backup-now" label={BACK_UP} busy={making} busyLabel={BACKING_UP} onPress={() => void backup.backUp(backupIO())} />
        {/* Said where it is seen, politely, when it changes (matrix row 19); a finished backup changes only this line (row 20). */}
        <Text testID="backup-last" style={styles.last} accessibilityLiveRegion="polite" aria-live="polite">
          {line}
        </Text>
        {after ? <Text testID="backup-after" style={styles.last} accessibilityLiveRegion="polite" aria-live="polite">{after}</Text> : null}
        {failed ? <Text testID="backup-failed" style={styles.failed} accessibilityLiveRegion="polite" aria-live="polite">{failed}</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 16 },
  line: { fontSize: 15, lineHeight: 21, color: theme.muted },
  last: { fontSize: 15, lineHeight: 21, color: theme.ink },
  failed: { fontSize: 15, lineHeight: 21, color: theme.ink },
});
