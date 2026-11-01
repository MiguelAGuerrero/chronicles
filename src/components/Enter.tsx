import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ENTER, type EnterKind } from '../lib/enter';
import { nativeDriver, useReducedMotion } from '../lib/motion';
import { MOTION } from '../lib/motionTokens';

/**
 * Plays one of the deferred four (motion M9-M12) once, as it mounts; with
 * reduce motion on it renders still. A pulse leaves the child still and grows
 * a ring out of it (`ring` places the ring over the pin's head).
 */
export function Enter(props: { kind: EnterKind; children: ReactNode; ring?: StyleProp<ViewStyle>; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [t] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    if (reduced) return;
    const anim =
      props.kind === 'bounce'
        ? Animated.spring(t, { toValue: 1, ...MOTION.spring, useNativeDriver: nativeDriver })
        : Animated.timing(t, {
            toValue: 1,
            duration: props.kind === 'drop' ? ENTER.drop.ms : props.kind === 'flip' ? ENTER.flip.ms : ENTER.pulse.ms,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: nativeDriver,
          });
    anim.start();
    return () => anim.stop();
  }, [t, reduced, props.kind]);
  const testID = `enter-${props.kind}`;
  if (reduced) return <View testID={testID} style={props.style}>{props.children}</View>;
  if (props.kind === 'pulse') {
    const ring = {
      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [ENTER.pulse.fromOpacity, 0] }),
      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, ENTER.pulse.toScale] }) }],
    };
    return (
      <View testID={testID} style={props.style} pointerEvents="none">
        <Animated.View style={[styles.ring, props.ring, ring]} />
        {props.children}
      </View>
    );
  }
  const motion =
    props.kind === 'drop'
      ? { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [ENTER.drop.fromY, 0] }) }] }
      : props.kind === 'flip'
        ? { transform: [{ perspective: 300 }, { rotateY: t.interpolate({ inputRange: [0, 1], outputRange: [`${ENTER.flip.fromDeg}deg`, '0deg'] }) }] }
        : { transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [ENTER.bounce.fromScale, 1] }) }] };
  return (
    <Animated.View testID={testID} style={[props.style, motion]}>
      {props.children}
    </Animated.View>
  );
}

/**
 * The kind a view's own change calls for, for maps that keep a pin's view
 * mounted across changes (native): set one render after the change. The
 * entrance has already played by the next change, so it never replays.
 */
export function useOwnEnter<T>(value: T, decide: (prev: T, next: T) => EnterKind | null): EnterKind | null {
  const [prev, setPrev] = useState(value);
  const [kind, setKind] = useState<EnterKind | null>(null);
  useEffect(() => {
    if (Object.is(prev, value)) return;
    const k = decide(prev, value);
    const id = setTimeout(() => {
      setPrev(value);
      if (k) setKind(k);
    }, 0);
    return () => clearTimeout(id);
  }, [prev, value, decide]);
  return kind;
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 3, borderColor: '#1f7a4d' },
});
