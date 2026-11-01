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
  // Once played it renders the plain child again: no transform or layer left on the pin (audit 4).
  const [done, setDone] = useState(false);
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
    anim.start(({ finished }) => finished && setDone(true));
    return () => anim.stop();
  }, [t, reduced, props.kind]);
  const testID = `enter-${props.kind}`;
  if (done) return <View style={props.style}>{props.children}</View>;
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
 * mounted across changes (native), with a count that grows on every one, so
 * each change plays afresh (key `Enter` by it). Set one render after the change.
 */
export function useOwnEnter<T>(value: T, decide: (prev: T, next: T) => EnterKind | null): { kind: EnterKind | null; n: number } {
  const [prev, setPrev] = useState(value);
  const [state, setState] = useState<{ kind: EnterKind | null; n: number }>({ kind: null, n: 0 });
  useEffect(() => {
    if (Object.is(prev, value)) return;
    const k = decide(prev, value);
    const id = setTimeout(() => {
      setPrev(value);
      setState((s) => ({ kind: k, n: s.n + 1 }));
    }, 0);
    return () => clearTimeout(id);
  }, [prev, value, decide]);
  return state;
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 3, borderColor: '#1f7a4d' },
});
