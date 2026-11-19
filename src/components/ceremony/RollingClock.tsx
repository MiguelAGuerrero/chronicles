import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MOTION } from '../../lib/motionTokens';
import { theme } from '../ui';
import { timeOf } from './layout';

const LINE = 24;
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
/**
 * The web rolls a reel with the browser's own transition (replay ceremony RC7): react-native-web's `Animated` renders
 * the animated view again on every frame of a roll, which the replay's clock does a few times a second.
 */
const WEB_ROLL = { transitionProperty: 'transform', transitionDuration: `${MOTION.fast}ms`, transitionTimingFunction: 'ease-in-out' } as unknown as ViewStyle;

function Reel() {
  return (
    <>
      {DIGITS.map((d) => (
        <Text key={d} style={styles.digit}>{d}</Text>
      ))}
    </>
  );
}

/** One digit on a reel, on a phone: it rolls to its new value on the native driver, or jumps with reduce motion (RR8, RR18). */
function NativeDigit({ n, still }: { n: number; still: boolean }) {
  const [y] = useState(() => new Animated.Value(-n * LINE));
  useEffect(() => {
    if (still) {
      y.setValue(-n * LINE);
      return;
    }
    const a = Animated.timing(y, { toValue: -n * LINE, duration: MOTION.fast, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [n, still, y]);
  return (
    <Animated.View style={{ transform: [{ translateY: y }] }}>
      <Reel />
    </Animated.View>
  );
}

/** One digit on a reel: it rolls to its new value, or jumps with reduce motion (RR8, RR18). */
function Digit({ n, still }: { n: number; still: boolean }) {
  return (
    <View style={styles.slot}>
      {Platform.OS === 'web' ? (
        <View style={[{ transform: [{ translateY: -n * LINE }] }, !still && WEB_ROLL]}>
          <Reel />
        </View>
      ) : (
        <NativeDigit n={n} still={still} />
      )}
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
    shadowColor: theme.ink, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center', height: LINE },
  slot: { height: LINE, overflow: 'hidden' },
  digit: { height: LINE, lineHeight: LINE, fontSize: 20, fontWeight: '600', color: theme.ink, fontVariant: ['tabular-nums'], textAlign: 'center' },
  space: { width: 4 },
  ampm: { fontSize: 12, fontWeight: '600', color: theme.muted, lineHeight: LINE },
});
