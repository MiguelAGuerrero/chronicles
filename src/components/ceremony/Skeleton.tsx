import { useEffect, useState } from 'react';
import { Animated, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { MOTION } from '../../lib/motionTokens';
import { theme } from '../ui';

/**
 * A placeholder where a medium will be while it loads (RR23, decision 0087):
 * a soft pulse, still with reduce motion. No spinner, no count; a screen
 * reader hears "Loading".
 */
export function Skeleton({ style, still, testID }: { style?: StyleProp<ViewStyle>; still: boolean; testID: string }) {
  const [glow] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    if (still) {
      glow.setValue(0.75);
      return;
    }
    const native = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: MOTION.pulse, useNativeDriver: native }),
        Animated.timing(glow, { toValue: 0.55, duration: MOTION.pulse, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [still, glow]);
  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
      pointerEvents="none"
      style={[{ backgroundColor: theme.line }, style, { opacity: glow }]}
    />
  );
}
