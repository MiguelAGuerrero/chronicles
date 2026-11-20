import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ENTER, type EnterKind } from '../lib/enter';
import { MARK_MOTION } from '../lib/markMotion';
import { nativeDriver, useReducedMotion } from '../lib/motion';
import { MOTION } from '../lib/motionTokens';

/**
 * Plays one of the deferred four (motion M9-M12) once, as it mounts; with
 * reduce motion on it renders still. A pulse leaves the child still and grows
 * a ring out of it (`ring` places the ring over the pin's head).
 */
/**
 * The e2e's slow motion for the marks' moves (poi-transitions ui 1): a harness sets `__motionSlow` so a picture can
 * catch a grow or a shrink mid-move. 1 everywhere else. Read when a move starts, never in render.
 */
const motionSlow = () => (globalThis as { __motionSlow?: number }).__motionSlow ?? 1;

/** The point a mark scales about, as a style (poi-transitions ui 4): its place, never its middle. */
const originStyle = (o?: { x: number; y: number }): ViewStyle | undefined => (o ? { transformOrigin: `${o.x}px ${o.y}px` } : undefined);

export function Enter(props: { kind: EnterKind; children: ReactNode; ring?: StyleProp<ViewStyle>; style?: StyleProp<ViewStyle>; origin?: { x: number; y: number } }) {
  const reduced = useReducedMotion();
  const [t] = useState(() => new Animated.Value(reduced ? 1 : 0));
  // A "?" coming within range grows on the marks' own spring (PI2, PI9); the rest keep their own.
  // Once played it renders the plain child again: no transform or layer left on the pin (audit 4).
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const anim =
      props.kind === 'bounce' || props.kind === 'grow'
        ? Animated.spring(t, { toValue: 1, ...(props.kind === 'grow' ? slowed(MARK_MOTION.spring, motionSlow()) : MOTION.spring), useNativeDriver: nativeDriver })
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
        : props.kind === 'grow'
          ? { opacity: MARK_MOTION.fromOpacity, transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [MARK_MOTION.fromScale, 1], extrapolate: 'extend' }) }] }
          : { transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [ENTER.bounce.fromScale, 1] }) }] };
  return (
    <Animated.View testID={testID} style={[props.style, originStyle(props.origin), motion]}>
      {props.children}
    </Animated.View>
  );
}

/** A spring run `s` times slower with the same shape: mass by s², damping by s (the damping ratio kept). */
const slowed = (sp: { stiffness: number; damping: number; mass: number }, s: number) => (s === 1 ? sp : { ...sp, mass: sp.mass * s * s, damping: sp.damping * s });

/**
 * A "?" falling out of range shrinks and fades as it goes (PI3), then calls `onDone`, which takes it off the map;
 * with reduce motion on it goes at once (PI10). It takes no touch while it leaves (PI6).
 */
export function Leave(props: { children: ReactNode; onDone: () => void; style?: StyleProp<ViewStyle>; origin?: { x: number; y: number } }) {
  const reduced = useReducedMotion();
  // Progress, 0 to 1, linear in time; the fade and the shrink each read it on their own curve (poi-transitions ui 3).
  const [p] = useState(() => new Animated.Value(0));
  const done = useRef(props.onDone);
  useEffect(() => {
    done.current = props.onDone;
  });
  useEffect(() => {
    if (reduced) {
      done.current();
      return;
    }
    const anim = Animated.timing(p, { toValue: 1, duration: MARK_MOTION.leaveMs * motionSlow(), easing: Easing.linear, useNativeDriver: nativeDriver });
    anim.start(({ finished }) => finished && done.current());
    return () => anim.stop();
  }, [p, reduced]);
  if (reduced) return <View style={props.style} pointerEvents="none">{props.children}</View>;
  const [x1, y1, x2, y2] = MARK_MOTION.leaveCurve;
  const motion = {
    opacity: p.interpolate({ inputRange: [0, MARK_MOTION.leaveFadeUntil], outputRange: [1, 0], extrapolate: 'clamp' }),
    transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, MARK_MOTION.leaveScale], easing: Easing.bezier(x1, y1, x2, y2) }) }],
  };
  return (
    <Animated.View testID="leave-shrink" pointerEvents="none" style={[props.style, originStyle(props.origin), motion]}>
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
