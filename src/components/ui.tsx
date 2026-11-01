import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle,
} from 'react-native';
import { nativeDriver, useReducedMotion } from '../lib/motion';
import { MOTION, PRESS_SCALE } from '../lib/motionTokens';

const PressableAnim = Animated.createAnimatedComponent(Pressable);

// Text on these colors meets WCAG AA (4.5:1); checked against white and bg.
export const theme = {
  bg: '#f4f2ee',
  surface: '#ffffff',
  ink: '#1d2430',
  muted: '#596273',
  line: '#e3e0da',
  /** Borders that must read as a control edge (3:1 on bg). */
  edge: '#8a857d',
  accent: '#c2410c',
  accentInk: '#ffffff',
  danger: '#b42318',
  ok: '#15803d',
  warn: '#b45309',
  radius: 14,
};

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button(props: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  busy?: boolean;
  /** Shown beside the spinner while busy, so the wait has words. */
  busyLabel?: string;
  disabled?: boolean;
  tall?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
  children?: ReactNode;
}) {
  const v = props.variant ?? 'primary';
  const fg = v === 'primary' || v === 'danger' ? theme.accentInk : theme.ink;
  // Pressed down slightly while held, sprung back on release (M4). The dimming stays as the press's
  // sign with reduce motion on, when nothing moves (M2, audit 4).
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  return (
    <PressableAnim
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.busy && props.busyLabel ? props.busyLabel : props.label}
      accessibilityHint={props.accessibilityHint}
      accessibilityState={{ disabled: !!(props.disabled || props.busy), busy: !!props.busy }}
      disabled={props.disabled || props.busy}
      onPress={props.onPress}
      onPressIn={() => {
        setPressed(true);
        if (!reduced) Animated.timing(scale, { toValue: PRESS_SCALE, duration: MOTION.fast, useNativeDriver: nativeDriver }).start();
      }}
      onPressOut={() => {
        setPressed(false);
        if (reduced) scale.setValue(1);
        else Animated.spring(scale, { toValue: 1, ...MOTION.spring, useNativeDriver: nativeDriver }).start();
      }}
      style={[
        styles.btn,
        props.tall && styles.tall,
        styles[v],
        (props.disabled || props.busy) && styles.disabled,
        pressed && styles.pressed,
        { transform: [{ scale }] },
        props.style,
      ]}
    >
      {props.busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={fg} />
          {props.busyLabel ? <Text style={[styles.label, { color: fg }]}>{props.busyLabel}</Text> : null}
        </View>
      ) : (
        props.children ?? <Text style={[styles.label, { color: fg }]}>{props.label}</Text>
      )}
    </PressableAnim>
  );
}

/**
 * A long press would otherwise select the label as text (iOS Safari), which
 * cancels the hold; the touch callout is the menu that follows it.
 */
const noSelect = Platform.OS === 'web' ? ({ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as object) : null;

/** Ends something irreversible: hold for HOLD_MS while the button fills. */
const HOLD_MS = 800;
export function HoldButton(props: {
  label: string;
  onHold: () => void;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** A press let go before the hold completed, e.g. to explain that it needs holding. */
  onTap?: () => void;
  /** Replaces the label text, e.g. with an icon; the label stays the spoken name. */
  children?: ReactNode;
}) {
  const [fill] = useState(() => new Animated.Value(0));
  const fired = useRef(false);
  const start = () => {
    fired.current = false;
    Animated.timing(fill, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (finished && !fired.current) {
        fired.current = true;
        props.onHold();
      }
    });
  };
  const cancel = () => {
    if (fired.current) return;
    fill.stopAnimation();
    Animated.timing(fill, { toValue: 0, duration: MOTION.fast, useNativeDriver: false }).start();
  };
  useEffect(() => {
    if (!props.busy) fill.setValue(0);
  }, [props.busy, fill]);
  const inactive = props.disabled || props.busy;
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.busy && props.busyLabel ? props.busyLabel : props.label}
      accessibilityHint="Press and hold to end the walk"
      accessibilityState={{ disabled: !!inactive, busy: !!props.busy }}
      // Screen readers cannot hold; their activate action stops at once.
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => !inactive && props.onHold()}
      disabled={inactive}
      onPressIn={start}
      onPressOut={cancel}
      // Android Chrome fires contextmenu on a long press at about 500 ms,
      // which ends a press unless it has a long-press handler of its own.
      onLongPress={() => {}}
      delayLongPress={HOLD_MS + 1000}
      // A release before the hold completed: say it needs holding.
      onPress={() => {
        if (!fired.current) props.onTap?.();
      }}
      style={[styles.btn, styles.hold, noSelect, inactive && styles.disabled, props.style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.holdFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
      {props.busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={theme.ink} />
          {props.busyLabel ? <Text style={styles.label}>{props.busyLabel}</Text> : null}
        </View>
      ) : (
        props.children ?? <Text style={styles.label}>{props.label}</Text>
      )}
    </Pressable>
  );
}

/**
 * A pill, chip or toast that lifts in (M7): a fade with a short rise. It goes
 * at once when removed, so no copy lingers to be read out again (audit 5).
 */
export function LiftIn(props: { style?: StyleProp<ViewStyle>; children: ReactNode; testID?: string; accessibilityLiveRegion?: 'none' | 'polite' | 'assertive'; accessibilityRole?: 'alert' }) {
  const reduced = useReducedMotion();
  const [t] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    if (!reduced) Animated.timing(t, { toValue: 1, duration: MOTION.lift, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [t, reduced]);
  const lift = { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] };
  return (
    <Animated.View testID={props.testID ?? 'lift-in'} style={[props.style, lift]} accessibilityLiveRegion={props.accessibilityLiveRegion} accessibilityRole={props.accessibilityRole}>
      {props.children}
    </Animated.View>
  );
}

export function Banner(props: {
  children: ReactNode;
  tone?: 'info' | 'error';
  onDismiss?: () => void;
  action?: { label: string; onPress: () => void };
}) {
  const error = props.tone === 'error';
  return (
    <LiftIn
      style={[styles.banner, error && styles.bannerError]}
      accessibilityRole={error ? 'alert' : undefined}
      accessibilityLiveRegion={error ? 'assertive' : 'polite'}
    >
      <Text style={[styles.bannerText, error && { color: theme.danger }]}>{props.children}</Text>
      {props.action && (
        <Pressable accessibilityRole="button" onPress={props.action.onPress} style={styles.bannerAction} hitSlop={8}>
          <Text style={styles.bannerActionText}>{props.action.label}</Text>
        </Pressable>
      )}
      {props.onDismiss && (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={props.onDismiss} hitSlop={12} style={styles.bannerClose}>
          <Text style={styles.bannerCloseText}>✕</Text>
        </Pressable>
      )}
    </LiftIn>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: theme.radius,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tall: { minHeight: 60 },
  primary: { backgroundColor: theme.accent },
  secondary: { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.edge },
  danger: { backgroundColor: theme.danger },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  label: { fontSize: 16, fontWeight: '600', color: theme.ink },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hold: { minHeight: 44, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.ink },
  // 3.5:1 against the white button, so the hold's progress is visible.
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#d9663a' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7e6',
    borderColor: '#e0b765',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bannerError: { backgroundColor: '#fdecea', borderColor: '#e8a39a' },
  bannerText: { flex: 1, color: '#6b4500', fontSize: 14, lineHeight: 19 },
  bannerAction: { paddingVertical: 4, paddingHorizontal: 6 },
  bannerActionText: { color: theme.ink, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  bannerClose: { padding: 4 },
  bannerCloseText: { color: theme.muted, fontSize: 16 },
});
