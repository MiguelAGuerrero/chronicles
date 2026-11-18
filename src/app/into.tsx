import { router, Stack, useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { IntoPage, IntoTitle } from '../components/IntoPage';

export { ScreenError as ErrorBoundary } from '../components/ScreenError';

/**
 * What I'm into's page (`/into`; specs/what-im-into-page, decision 0192): pushed on the root stack over the walk screen
 * and the tabs, the same page from the ready bar's row and the walk's (WI3), with the stack's Back (WI4). A walk goes on
 * under it (WI10): recording is the open walk's, above the stack. Escape on the web goes back too, while it is in front.
 * A link or a reload lands on it with the tabs beneath (`initialRouteName`), or, with a walk open, on the walk (WI16).
 */
export default function IntoRoute() {
  const focused = useIsFocused();
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
  return (
    <>
      <Stack.Screen options={{ headerTitle: () => <IntoTitle /> }} />
      <IntoPage />
    </>
  );
}
