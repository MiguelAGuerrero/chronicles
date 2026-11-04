import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, BackHandler, Platform, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { formatDistance } from '../../lib/summary';
import { MOTION } from '../../lib/motionTokens';
import { useReducedMotion } from '../../lib/motion';
import { destLine } from '../../lib/startPlan';
import type { Waypoint } from '../../lib/nav/types';
import type { LngLat } from '../../lib/types';
import { Button, theme } from '../ui';
import { BAR_H, raisedHeight, useStackLayout } from './layout';

/** The bar's spring: the app's one (M5), settled within a pixel, so the settings unmount soon after. */
const SPRING = { ...MOTION.spring, restDisplacementThreshold: 0.5, restSpeedThreshold: 0.5, useNativeDriver: false };
/** The grip's strip at the top of the bar pulled up: the handle, one thumb tall. */
const GRIP_UP = 28;

/**
 * The ready bar (NR5, NR7, NR8): at rest it is the walk's strip, at the same
 * height, with 0:00, a zero distance and Start where Stop will be, so Start
 * records in place. A drag up on its grip or its numbers, or a tap on them,
 * raises it over the map to show the walk settings (`children`); Start stays
 * at its foot at every height. A drag down, Back or Escape lowers it.
 */
export function ReadyBar(props: {
  up: boolean;
  onUp: (up: boolean) => void;
  /** The height the bar can grow into: the screen. */
  areaHeight: number;
  dest: Waypoint | null;
  fix: LngLat | null;
  starting: boolean;
  startDisabled: boolean;
  /** Mid-memo nothing raises the bar: a drag or a tap is refused before it moves it (audit 4). */
  locked: boolean;
  onStart: () => void;
  children: ReactNode;
}) {
  const at = useStackLayout();
  const rest = BAR_H + at.insets.bottom;
  const full = raisedHeight(props.areaHeight, rest);
  const { up } = props;
  const target = up ? full : rest;
  const [h] = useState(() => new Animated.Value(rest));
  const reduced = useReducedMotion();
  // The settings stay mounted while the bar lowers, so the foot never jumps up before it.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (reduced) {
      h.setValue(target);
      setTimeout(() => setShown(up), 0);
      return;
    }
    // Only a move that ends settles it: one cut short by the next (a quick tap back) says nothing.
    Animated.spring(h, { toValue: target, ...SPRING }).start(({ finished }) => finished && setShown(up));
  }, [h, target, reduced, up]);

  // Back on Android, and Escape on the web, lower the bar before anything else.
  const onUpRef = useRef(props.onUp);
  useEffect(() => {
    onUpRef.current = props.onUp;
  });
  useEffect(() => {
    if (!up) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onUpRef.current(false);
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onUpRef.current(false);
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, [up]);

  // A drag settles up or at rest, whichever is nearer, however it ends; a tap toggles.
  const drag = useRef({ y: 0, from: 0, moved: false });
  const settle = (pageY: number) => {
    const moved = drag.current.y - pageY;
    if (!drag.current.moved && Math.abs(moved) < 6) {
      props.onUp(!up);
      return;
    }
    const to = drag.current.from + moved > (rest + full) / 2;
    if (to === up) Animated.spring(h, { toValue: target, ...SPRING }).start(({ finished }) => finished && setShown(up));
    else props.onUp(to);
  };
  const { locked } = props;
  const dragProps = {
    // Locked (a memo recording), the bar takes no hold at all, so it is never left part-way up (audit 4).
    onStartShouldSetResponder: () => !locked,
    onMoveShouldSetResponder: () => !locked,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      drag.current = { y: e.nativeEvent.pageY, from: target, moved: false };
      // The settings show as the bar is taken hold of, so a drag up never reveals an empty panel.
      setShown(true);
      h.stopAnimation((v) => (drag.current.from = v));
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const dy = e.nativeEvent.pageY - drag.current.y;
      if (Math.abs(dy) >= 6) drag.current.moved = true;
      h.setValue(Math.max(rest, Math.min(full, drag.current.from - dy)));
    },
    onResponderRelease: (e: GestureResponderEvent) => settle(e.nativeEvent.pageY),
    onResponderTerminate: (e: GestureResponderEvent) => settle(e.nativeEvent.pageY),
  };
  // One button for keyboards and screen readers (audit 6): Enter or Space on the web, activate on a phone;
  // its name says the numbers and the destination, which its children would otherwise hide.
  const toggle = () => !locked && props.onUp(!up);
  const destText = props.dest ? `To ${destLine(props.dest, props.fix)}` : null;
  const stats = `0:00 · ${formatDistance(0)}`;
  const summaryLabel = [stats, destText, up ? 'Lower the walk settings' : 'Walk settings'].filter(Boolean).join('. ');
  const keys = Platform.OS === 'web'
    ? ({ onKeyDown: (e: { key: string; preventDefault: () => void }) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        toggle();
      } } as object)
    : {};

  return (
    <Animated.View testID="ready-bar" style={[styles.bar, { height: h }]}>
      {!(up || shown) && <View style={styles.scroll} />}
      {(up || shown) && (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingTop: GRIP_UP }}>
          {props.children}
        </ScrollView>
      )}
      {/* The grip: the handle in the strip's top edge at rest, a thumb-tall strip pulled up. */}
      <View
        testID="ready-grip"
        {...dragProps}
        // The summary below is the button for assistive tech; the grip is for the thumb.
        accessible={false}
        // Focusable, but not a tab stop: without it a touch on the handle's strip went to the map's canvas
        // beneath, and a finger could not lift the bar (the owner, Nov 4; mouse drags always worked).
        tabIndex={-1}
        importantForAccessibility="no-hide-descendants"
        style={[styles.grip, { height: up ? GRIP_UP : 10 }]}
      >
        <View style={styles.handle} />
      </View>
      <View style={[styles.foot, { paddingBottom: 10 + at.insets.bottom }]}>
        <View style={styles.footInner}>
          {/* The numbers take hold of the bar too: a bigger target than the handle. */}
          <View
            testID="ready-summary"
            {...dragProps}
            {...keys}
            focusable
            style={styles.summary}
            accessible
            accessibilityRole="button"
            accessibilityLabel={summaryLabel}
            accessibilityState={{ expanded: up, disabled: locked }}
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && toggle()}
          >
            <Text testID="walk-stats" style={styles.stats} numberOfLines={1}>{stats}</Text>
            {destText && (
              <Text testID="ready-dest" style={styles.dest} numberOfLines={1}>{destText}</Text>
            )}
          </View>
          {/* Start just starts, where you are, with the saved choices (NV19, NV25); never waits on a fix (NV28). */}
          <Button
            testID="start"
            label="Start"
            onPress={props.onStart}
            busy={props.starting}
            busyLabel="Starting…"
            disabled={props.startDisabled}
            style={styles.start}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.bg, borderTopWidth: 1, borderColor: theme.line,
    overflow: 'hidden', zIndex: 3,
  },
  scroll: { flex: 1 },
  grip: {
    position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 2,
    ...(Platform.OS === 'web' ? ({ userSelect: 'none', cursor: 'grab' } as object) : {}),
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.edge },
  foot: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: theme.bg },
  footInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center', minHeight: 48 },
  summary: { flexShrink: 1, minHeight: 48, justifyContent: 'center', ...(Platform.OS === 'web' ? ({ userSelect: 'none', cursor: 'grab' } as object) : {}) },
  stats: { color: theme.ink, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dest: { color: theme.muted, fontSize: 13 },
  start: { borderRadius: 999, paddingHorizontal: 32 },
});
