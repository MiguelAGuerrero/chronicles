import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { MOTION } from '../../lib/motionTokens';
import { theme } from '../ui';
import { timeOf } from './layout';

const LINE = 24;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** One digit on a reel: it rolls to its new value, or jumps with reduce motion (RR8, RR18). */
function Digit({ n, still }: { n: number; still: boolean }) {
  const [y] = useState(() => new Animated.Value(-n * LINE));
  useEffect(() => {
    if (still) {
      y.setValue(-n * LINE);
      return;
    }
    const a = Animated.timing(y, { toValue: -n * LINE, duration: MOTION.fast, useNativeDriver: Platform.OS !== 'web' });
    a.start();
    return () => a.stop();
  }, [n, still, y]);
  return (
    <View style={styles.slot}>
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        {DIGITS.map((d) => (
          <Text key={d} style={styles.digit}>{d}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

/** The time of day where the walker is, in the device's own clock format; its digits roll (RR8). */
export function RollingClock({ time, still }: { time: number; still: boolean }) {
  const text = timeOf(time);
  const chars = [...text];
  return (
    <View testID="replay-clock" accessible accessibilityRole="text" accessibilityLabel={text} style={styles.chip}>
      <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {chars.map((ch, i) => {
          // Keyed from the end, so the minutes keep their reels when the hour gains a digit.
          const k = chars.length - i;
          return /\d/.test(ch) ? <Digit key={`d${k}`} n={Number(ch)} still={still} /> : <Text key={`c${k}`} style={/\s/.test(ch) ? styles.space : /[:.]/.test(ch) ? styles.digit : styles.ampm}>{ch}</Text>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: theme.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6,
    shadowColor: '#1d2430', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', height: LINE },
  slot: { height: LINE, overflow: 'hidden' },
  digit: { height: LINE, lineHeight: LINE, fontSize: 20, fontWeight: '600', color: theme.ink, fontVariant: ['tabular-nums'], textAlign: 'center' },
  space: { width: 4 },
  ampm: { fontSize: 12, fontWeight: '600', color: theme.muted, lineHeight: LINE },
});
