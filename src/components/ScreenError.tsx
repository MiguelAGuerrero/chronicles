import { router, type ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { walkErrorLine } from '../lib/readyNav';
import { useOpenWalkInfo } from './OpenWalk';
import { Button, theme } from './ui';

/**
 * How the error screen's "Back to Chronicle" reaches `/`. Over the tabs (a replay, a day, the walk screen) it
 * dismisses down to Chronicle; inside the tab navigator `dismissTo('/')` is a POP_TO the tabs have not, and does
 * nothing (the T20 review's auditor 1), so a tab navigates to Chronicle's tab instead. On Chronicle's own tab, and
 * in the tabs' layout that stands in for them all, there is nowhere to go back to: Try again alone (`none`).
 */
type Exit = 'dismiss' | 'navigate' | 'none';

function ErrorScreen({ error, retry, exit, body = 'Your walk is saved.' }: ErrorBoundaryProps & { exit: Exit; body?: string | null }) {
  return (
    <View style={styles.screen} testID="screen-error">
      <Text style={styles.title} accessibilityRole="header">Something went wrong showing this screen.</Text>
      {body != null && <Text style={styles.body}>{body}</Text>}
      <Text style={styles.detail} selectable>{error?.message || String(error)}</Text>
      <Button label="Try again" onPress={() => void retry()} />
      {exit !== 'none' && (
        <Button
          label="Back to Chronicle"
          variant="secondary"
          onPress={() => (exit === 'navigate' ? router.navigate('/') : router.dismissTo('/'))}
          style={{ marginTop: 12 }}
        />
      )}
    </View>
  );
}

/**
 * Shown in place of a screen that threw while rendering, instead of a blank
 * page (bug, Nov 1: a white screen after Stop on an iPhone). The walk and its
 * captures are already stored; this only redraws the screen. The message is
 * kept on screen so a report can say what broke.
 */
export function ScreenError(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} exit="dismiss" />;
}

/**
 * The same, on the walk screen: the recorder goes on behind it, so a walk recording is "still recording", never saved,
 * which can read as ended (decision 0172, O35); a paused walk is saved, and Navigate with no walk open says nothing of a
 * walk (tend walk-screen audit 5). The way back is the walk's own, as `ScreenError`'s.
 */
export function WalkScreenError(props: ErrorBoundaryProps) {
  const line = walkErrorLine(useOpenWalkInfo());
  return <ErrorScreen {...props} exit="dismiss" body={line} />;
}

/** The same, on Explore and Navigate: its way back opens Chronicle's tab (tend replay audit 7). */
export function TabScreenError(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} exit="navigate" />;
}

/** The same, on Chronicle's own tab and in the tabs' layout: Try again alone (tend replay audit 8). */
export function HomeScreenError(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} exit="none" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 24 },
  title: { color: theme.ink, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  body: { color: theme.ink, fontSize: 15, marginBottom: 12 },
  detail: { color: theme.muted, fontSize: 13, marginBottom: 24 },
});
