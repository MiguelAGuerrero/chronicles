import { router, type ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, theme } from './ui';

/**
 * Shown in place of a screen that threw while rendering, instead of a blank
 * page (bug, Nov 1: a white screen after Stop on an iPhone). The walk and its
 * captures are already stored; this only redraws the screen. The message is
 * kept on screen so a report can say what broke.
 */
export function ScreenError({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.screen} testID="screen-error">
      <Text style={styles.title} accessibilityRole="header">Something went wrong showing this screen.</Text>
      <Text style={styles.body}>Your walk is saved.</Text>
      <Text style={styles.detail} selectable>{error?.message || String(error)}</Text>
      <Button label="Try again" onPress={() => void retry()} />
      <Button label="Back to walks" variant="secondary" onPress={() => router.dismissTo('/chronicle')} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 24 },
  title: { color: theme.ink, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  body: { color: theme.ink, fontSize: 15, marginBottom: 12 },
  detail: { color: theme.muted, fontSize: 13, marginBottom: 24 },
});
