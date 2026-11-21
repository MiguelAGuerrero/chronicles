import { router, Stack, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Icon } from '../components/icons';
import { Button, theme } from '../components/ui';
import { backup, datePartsOf } from '../lib/backup';
import { BACK_UP, BACKING_UP, FILE_LINE, lastLine, YOUR_DATA, yourDataBack } from '../lib/backup/core';
import { intoHeader, intoMeasures } from '../lib/explore/intoPage';
import { backupIO } from '../lib/export';
import { useStore } from '../lib/useStore';

export { ScreenError as ErrorBoundary } from '../components/ScreenError';

/**
 * Your data (`/your-data`; specs/back-up-everything, decisions 0241, 0248): pushed on the root stack from the foot of
 * Walk settings or from Chronicle's Contents, with the stack's Back naming the screen beneath (audit 18). One line of
 * what the file is and who can see it, one action, Back up everything, and under it, quietly, when the last file was
 * made. No size, count, gauge or celebration; the file goes only where the person sends it (the share sheet on a
 * phone, a download on the web). Escape on the web goes back too.
 */
export default function YourDataRoute() {
  const focused = useIsFocused();
  const making = useStore(backup.store, (s) => s.making);
  const last = useStore(backup.store, (s) => s.last);
  const after = useStore(backup.store, (s) => s.after);
  const failed = useStore(backup.store, (s) => s.failed);
  const [thisYear] = useState(() => new Date().getFullYear());
  const win = useWindowDimensions();
  const header = intoHeader(yourDataBack(useLocalSearchParams<{ from?: string }>().from), intoMeasures(win.width, win.fontScale).icon > 0, Platform.OS);
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
  const { backSpoken, ...options } = header;
  return (
    <>
      <Stack.Screen
        options={{
          title: YOUR_DATA,
          presentation: 'card',
          headerShown: true,
          ...options,
          // Android (audit 18, as What I'm into's audit 8): native-stack has no spoken name for its back arrow, so the
          // route draws its own, named for the screen beneath; the system Back and its gesture still pop the page.
          ...(backSpoken
            ? {
                headerLeft: () => (
                  <Pressable testID="your-data-back" accessibilityRole="button" accessibilityLabel={backSpoken} onPress={() => router.back()} hitSlop={8} style={styles.back}>
                    <Icon name="arrow-back" size={24} color={theme.ink} />
                  </Pressable>
                ),
              }
            : {}),
        }}
      />
      <ScrollView testID="your-data-page" style={styles.page} contentContainerStyle={styles.content}>
        <Text testID="backup-file-line" style={styles.line}>{FILE_LINE}</Text>
        <Button testID="backup-now" label={BACK_UP} busy={making} busyLabel={BACKING_UP} onPress={() => void backup.backUp(backupIO())} />
        {/* Said where it is seen, politely, when it changes (matrix row 19), and quiet (BK8, audit 19); a finished backup
            changes only this line (row 20). What went wrong, or was left out, is said in ink. */}
        <Text testID="backup-last" style={styles.last} accessibilityLiveRegion="polite" aria-live="polite">
          {line}
        </Text>
        {after ? <Text testID="backup-after" style={styles.said} accessibilityLiveRegion="polite" aria-live="polite">{after}</Text> : null}
        {failed ? <Text testID="backup-failed" style={styles.said} accessibilityLiveRegion="polite" aria-live="polite">{failed}</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 16 },
  // What the file is and who can see it, in ink: it is what the page asks the person to know (audit 19).
  line: { fontSize: 15, lineHeight: 21, color: theme.ink },
  last: { fontSize: 15, lineHeight: 21, color: theme.muted },
  said: { fontSize: 15, lineHeight: 21, color: theme.ink },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
});
