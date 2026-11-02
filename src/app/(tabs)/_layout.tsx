import { useIsFocused } from 'expo-router';
import { BottomTabBar, BottomTabBarHeightCallbackContext, Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useContext } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/icons';
import { RecordingBar } from '../../components/RecordingBar';
import { theme } from '../../components/ui';
import { TABS } from '../../lib/startPlan';

/**
 * The three tabs (Navigation & tabs, NV1): Explore · Navigate · Chronicle, in
 * that order, with an icon and a label, the same on web and phone. Every tab
 * option lives here, so the iOS build can move to native tabs by changing only
 * this file. Navigate opens first (NV2), and Back on another tab returns to it
 * (NV5). Each tab keeps its state while another is in front (NV3); each takes
 * its own map down while unfocused, so one map is live at a time (NV4).
 */
export const unstable_settings = { initialRouteName: 'index' };

/** The tab bar's height above the safe area. */
const TAB_BAR_H = 58;

const ignoreHeight = () => {};

/**
 * The tab bar, with the recording bar just above it while a walk is open and
 * minimized (NV9). The two are measured as one, so every tab's drawer sits
 * above both (`useBottomTabBarHeight`).
 */
function TabBarWithRecording(props: BottomTabBarProps & { minimized: boolean }) {
  const { minimized, ...bar } = props;
  const setHeight = useContext(BottomTabBarHeightCallbackContext);
  return (
    <View onLayout={(e) => setHeight?.(e.nativeEvent.layout.height)}>
      {minimized && <RecordingBar />}
      {/* The tab bar would report its own height alone. */}
      <BottomTabBarHeightCallbackContext.Provider value={ignoreHeight}>
        <BottomTabBar {...bar} />
      </BottomTabBarHeightCallbackContext.Provider>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // The tabs are in front: the walk, if one is open, is minimized. Under the walk screen or a replay
  // the bar is taken down, so nothing beneath ticks (NV6, NV9).
  const minimized = useIsFocused();
  return (
    <Tabs
      backBehavior="initialRoute"
      tabBar={(p) => <TabBarWithRecording {...p} minimized={minimized} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        // Tall enough for the icon and its label on the web too, where the default bar clipped the label.
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.line, height: TAB_BAR_H + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4 },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.id}
          name={t.route}
          options={{
            title: t.label,
            tabBarLabel: t.label,
            tabBarAccessibilityLabel: t.label,
            tabBarButtonTestID: `tab-${t.id}`,
            tabBarIcon: ({ color, focused, size }) => <Icon name={(focused ? t.iconOn : t.icon) as IconName} size={size} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
