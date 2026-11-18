import { router, Stack, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Icon } from '../components/icons';
import { IntoPage, IntoTitle } from '../components/IntoPage';
import { useOpenWalkInfo } from '../components/OpenWalk';
import { theme } from '../components/ui';
import { intoBack, intoHeader, intoMeasures } from '../lib/explore/intoPage';
import { intoShown } from '../lib/intoNav';

export { ScreenError as ErrorBoundary } from '../components/ScreenError';

/**
 * What I'm into's page (`/into`; specs/what-im-into-page, decision 0192): pushed on the root stack over the walk screen
 * and the tabs, the same page from the ready bar's row and the walk's (WI3), with the stack's Back (WI4). A walk goes on
 * under it (WI10): recording is the open walk's, above the stack. Escape on the web goes back too, while it is in front.
 * A link or a reload lands on it with the tabs beneath (`initialRouteName`), or, with a walk open, on the walk (WI16).
 */
export default function IntoRoute() {
  const focused = useIsFocused();
  // While it is up, a second tap on the row pushes nothing (audit 3).
  useEffect(() => intoShown(), []);
  // From the walk's drawer, Back reads the walk screen's name, the arrow and the word (WI20, audit 14); a link with no
  // walk open has no walk beneath, so it stays "Go back" (audit 10).
  const walkOpen = !!useOpenWalkInfo().walk;
  const back = intoBack(useLocalSearchParams<{ from?: string }>().from, walkOpen);
  // At large text the word would squeeze the title to nothing: Back keeps its arrow alone there, still heard as "Walk,
  // back" (WI21), as iOS drops a back title that has no room.
  const win = useWindowDimensions();
  const [width, setWidth] = useState<number | null>(null);
  const roomy = intoMeasures(width ?? win.width, win.fontScale).icon > 0;
  const header = intoHeader(back, roomy, Platform.OS);
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
  const { backSpoken, ...options } = header;
  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <IntoTitle />,
          ...options,
          // Android (audit 8): native-stack has no spoken name for its back arrow, so the route draws its own, named
          // "Walk, back"; the system Back and its gesture still pop the page.
          ...(backSpoken
            ? {
                headerLeft: () => (
                  <Pressable testID="into-back" accessibilityRole="button" accessibilityLabel={backSpoken} onPress={() => router.back()} hitSlop={8} style={styles.back}>
                    <Icon name="arrow-back" size={24} color={theme.ink} />
                  </Pressable>
                ),
              }
            : {}),
        }}
      />
      <IntoPage onWidth={setWidth} />
    </>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
});
