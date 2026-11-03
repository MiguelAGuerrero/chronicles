import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Platform, type GestureResponderEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ATLAS_ORDER, MARKS_EXPLAINED, distanceWords, familiarityWords,
  type AtlasArea, type Familiarity,
} from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import { focusOn } from '../../lib/focus';
import { formatDistance } from '../../lib/format';
import { useReducedMotion } from '../../lib/motion';
import { MOTION } from '../../lib/motionTokens';
import type { LngLat } from '../../lib/types';
import { COLORS, HOTSPOT, HOTSPOT_INK } from '../map/types';
import { Icon } from '../icons';
import { Button, theme } from '../ui';
import { KIND_COLOR, KIND_ICON_OF } from './kinds';
import { KindRow } from './KindStrip';
import { MiniMap } from './MiniMap';

const fmt = (m: number) => formatDistance(m);
const lastWords = (t: number | null) =>
  t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
const minutesFrom = (m: number) => distanceWords(m, false, fmt).replace(/ walk$/, '').replace(/ away$/, '');

/** Where the card sits: a sheet over a phone's screen, or a panel beside the map on a wide one. */
export type CardLayout = { kind: 'sheet'; screenH: number } | { kind: 'side'; width: number; height: number };

/** A sheet's two heights (atlas round 3): low keeps the map and its ring in sight; high reads the rest. */
const LOW = 0.58;
const HIGH = 0.9;

/**
 * An area's card (AT8, atlas round 3): the larger picture, the eight kinds in
 * words and dots, how the marks work, busy streets, what is waiting (kinds
 * only, AT7), what you found, the areas next door, and Walk to, always in
 * sight in a footer. On a phone it is a sheet with two heights and a handle;
 * on a wide screen a panel beside the map. ✕, Back, Escape, a tap outside and
 * a drag down close it. Never a Modal, so nothing stacks on iOS.
 */
export function AtlasCard(props: {
  area: AtlasArea;
  parent: string | null;
  distanceM: number;
  here: boolean;
  fam: Familiarity;
  walked: Set<string>;
  waiting: { category: CategoryId; at: LngLat }[];
  finds: { name: string; category: CategoryId; at: LngLat }[];
  you: LngLat | null;
  nextDoor: { area: AtlasArea; distanceM: number }[];
  walkTo: { at: LngLat; label: string; via: string | null } | null;
  starting: boolean;
  onWalk: () => void;
  onPick: (key: string) => void;
  onClose: () => void;
  /**
   * Measured by the screen, in pixels: Safari on iPhone left a card sized by
   * percent and insets at its header's height, its body gone (Nov 3).
   */
  layout: CardLayout;
}) {
  const { area, fam, layout } = props;
  const p = area.profile;
  const [how, setHow] = useState(false);
  const reduced = useReducedMotion();
  const close = useRef(props.onClose);
  useEffect(() => {
    close.current = props.onClose;
  }, [props.onClose]);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close.current();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, []);
  // Focus moves into the card as it opens, so a screen reader and a keyboard start at its name.
  const nameRef = useRef<React.ComponentRef<typeof Text>>(null);
  useEffect(() => {
    const t = setTimeout(() => focusOn(nameRef), 60);
    return () => clearTimeout(t);
  }, []);

  // The sheet's height follows a drag on its handle and settles at the nearer height; far enough down closes it.
  const screenH = layout.kind === 'sheet' ? layout.screenH : 0;
  const low = Math.round(screenH * LOW);
  const high = Math.round(screenH * HIGH);
  const [height] = useState(() => new Animated.Value(low));
  // Which height it rests at; the sheet starts low, so the map and the area's ring stay in sight.
  const [tall, setTall] = useState(false);
  const target = tall ? high : low;
  useEffect(() => {
    if (reduced) height.setValue(target);
    else Animated.spring(height, { toValue: target, ...MOTION.spring, useNativeDriver: false }).start();
  }, [target, reduced, height]);
  // The handle drags it, as the home sheet's does: a tap flips the height, a drag settles at the
  // nearer one, and a drag well below the low height closes the card.
  const drag = useRef({ y: 0, from: 0, moved: false });
  const settle = (pageY: number) => {
    const moved = drag.current.y - pageY;
    if (!drag.current.moved && Math.abs(moved) < 6) return setTall((t) => !t);
    const now = drag.current.from + moved;
    if (now < low - 80) return props.onClose();
    const toTall = Math.abs(now - high) < Math.abs(now - low);
    if (toTall === tall) {
      if (reduced) height.setValue(target);
      else Animated.spring(height, { toValue: target, ...MOTION.spring, useNativeDriver: false }).start();
    } else setTall(toTall);
  };
  const dragProps = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      drag.current = { y: e.nativeEvent.pageY, from: target, moved: false };
      height.stopAnimation((v) => (drag.current.from = v));
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const dy = e.nativeEvent.pageY - drag.current.y;
      if (Math.abs(dy) >= 6) drag.current.moved = true;
      height.setValue(Math.max(0, Math.min(high, drag.current.from - dy)));
    },
    onResponderRelease: (e: GestureResponderEvent) => settle(e.nativeEvent.pageY),
    onResponderTerminate: (e: GestureResponderEvent) => settle(e.nativeEvent.pageY),
  };

  const level = area.level === 'neighborhood' ? 'Neighborhood' : 'Town';
  const last = lastWords(fam.last);
  const frameStyle = layout.kind === 'sheet'
    ? [styles.sheet, { height }]
    : [styles.side, { width: layout.width, height: layout.height }];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* A tap outside closes; screen readers use ✕, so the scrim isn't a second Close button. A side panel leaves the map usable. */}
      {layout.kind === 'sheet' && (
        <Pressable style={styles.scrim} onPress={props.onClose} accessible={false} importantForAccessibility="no" testID="atlas-scrim" />
      )}
      <Animated.View style={frameStyle} testID="atlas-card" accessibilityViewIsModal>
        {layout.kind === 'sheet' && (
          <View {...dragProps} style={styles.grip} accessibilityRole="adjustable" accessibilityLabel="Card height" testID="atlas-card-grip">
            <View style={styles.handle} />
          </View>
        )}
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.eyebrow}>{props.parent ? `${level} · ${props.parent}` : level}</Text>
            <Text ref={nameRef} style={styles.name} accessibilityRole="header" testID="atlas-card-name" {...{ tabIndex: -1 }}>{area.name}</Text>
            <View style={styles.youRow}>
              {fam.walks ? <Icon name="footsteps-outline" size={14} color={COLORS.trace} /> : null}
              <Text style={[styles.you, fam.walks ? styles.known : null]}>
                {familiarityWords(fam)}{last ? ` · last ${last}` : ''}
              </Text>
              <Text style={styles.muted}> · {distanceWords(props.distanceM, props.here, fmt)}</Text>
            </View>
          </View>
          <Pressable testID="atlas-card-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} style={styles.close}>
            <Icon name="close" size={20} color={theme.ink} />
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          <View style={styles.bigMap}>
            <MiniMap area={area} walked={props.walked} waiting={props.waiting} finds={props.finds} here={props.here ? props.you : null} />
          </View>

          <View style={styles.sec}>
            <View style={styles.secHead}>
              <Text style={styles.secTitle} accessibilityRole="header">
                {area.level === 'town' ? 'What’s here · around its centre' : 'What’s here'}
              </Text>
              <Pressable testID="atlas-how" accessibilityRole="button" accessibilityState={{ expanded: how }} onPress={() => setHow((v) => !v)} style={styles.howBtn}>
                <Icon name="information-circle-outline" size={16} color={theme.accent} />
                <Text style={styles.howText}>How the marks work</Text>
              </Pressable>
            </View>
            {how && (
              <View style={styles.explain} testID="atlas-how-panel">
                {MARKS_EXPLAINED.map((line) => <Text key={line} style={styles.explainText}>{line}</Text>)}
              </View>
            )}
            {p ? (
              ATLAS_ORDER.map((c) => <KindRow key={c} kind={c} step={p.steps[c]} testID={`atlas-kind-${c}`} />)
            ) : (
              <Text style={styles.muted}>Reading this area…</Text>
            )}
          </View>

          {p && p.strips.length > 0 && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Busy streets</Text>
              <View style={styles.chips} testID="atlas-streets">
                {p.strips.map((s) => (
                  <View key={s} style={styles.busy}>
                    <View style={styles.busyLine} />
                    <Text style={styles.busyText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {props.waiting.length > 0 && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Waiting to be found</Text>
              <View style={styles.chips} testID="atlas-waiting">
                {props.waiting.map((m) => (
                  <View key={m.category} style={[styles.q, { borderColor: KIND_COLOR[m.category] }]} accessible accessibilityLabel={`A place not found yet: ${m.category}`}>
                    <Icon name={KIND_ICON_OF[m.category]} size={18} color={KIND_COLOR[m.category]} />
                    <Text style={styles.qMark}>?</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {props.finds.length > 0 && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Found</Text>
              <View testID="atlas-found">
                {props.finds.map((f, i) => (
                  <View key={`${f.name}-${i}`} style={styles.found}>
                    <Icon name={KIND_ICON_OF[f.category]} size={18} color={KIND_COLOR[f.category]} />
                    <Text style={styles.foundName}>{f.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {props.nextDoor.length > 0 && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Next door</Text>
              <View style={styles.chips}>
                {props.nextDoor.map((n) => {
                  // Measured from this area, so it says so (atlas round 3).
                  const from = `${minutesFrom(n.distanceM)} from ${area.name}`;
                  return (
                    <Pressable key={n.area.key} testID="atlas-next-door" accessibilityRole="button" onPress={() => props.onPick(n.area.key)} style={styles.nb}
                      accessibilityLabel={`${n.area.name}, ${from}`}>
                      <Text style={styles.nbName}>{n.area.name}</Text>
                      <Text style={styles.muted}>{from}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* The card's main step stays in sight (atlas round 3): never at the end of a scroll. */}
        <View style={styles.footer}>
          {props.here ? (
            <Text style={[styles.you, styles.hereLine]}>You’re in {area.name}</Text>
          ) : props.walkTo ? (
            <>
              <Button testID="atlas-walk" label={`Walk to ${props.walkTo.label}`} onPress={props.onWalk} busy={props.starting} busyLabel="Starting…" tall />
              {props.walkTo.via ? <Text style={styles.via} testID="atlas-walk-via">Starts you at {props.walkTo.via}, its busiest street</Text> : null}
            </>
          ) : (
            <Text style={[styles.muted, styles.hereLine]}>Too far to walk from here</Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.22)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxWidth: 640, width: '100%', alignSelf: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  side: {
    position: 'absolute', right: 0, top: 0, backgroundColor: theme.surface, borderLeftWidth: 1, borderLeftColor: theme.line, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: -2, height: 0 }, elevation: 8,
  },
  grip: { height: 24, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: '#cfcac1' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.line },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: theme.muted },
  name: { fontSize: 26, fontWeight: '800', color: theme.ink },
  youRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  you: { fontSize: 14, color: theme.ink },
  known: { color: COLORS.trace, fontWeight: '600' },
  muted: { fontSize: 13, color: theme.muted },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 },
  body: { padding: 18, gap: 20, paddingBottom: 24 },
  bigMap: { width: '100%', maxWidth: 240, alignSelf: 'center', aspectRatio: 4 / 3, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.line },
  sec: { gap: 4 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  secTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: theme.muted },
  howBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  howText: { fontSize: 13, fontWeight: '600', color: theme.accent },
  explain: { backgroundColor: theme.bg, borderRadius: 12, padding: 12, gap: 6, marginBottom: 4 },
  explainText: { fontSize: 14, color: theme.ink, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(214,38,140,0.12)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  busyLine: { width: 10, height: 3, borderRadius: 2, backgroundColor: HOTSPOT },
  busyText: { fontSize: 13, fontWeight: '600', color: HOTSPOT_INK },
  q: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.6, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  qMark: { position: 'absolute', top: -4, right: -4, fontSize: 11, fontWeight: '800', color: theme.ink, backgroundColor: theme.surface, borderRadius: 8, paddingHorizontal: 3, overflow: 'hidden' },
  found: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  foundName: { fontSize: 15, color: theme.ink, fontWeight: '500' },
  nb: { backgroundColor: theme.bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13, flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44 },
  nbName: { fontSize: 14, fontWeight: '600', color: theme.ink },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: theme.line, gap: 6, backgroundColor: theme.surface },
  via: { fontSize: 13, color: theme.muted, textAlign: 'center' },
  hereLine: { color: COLORS.route, fontWeight: '600', textAlign: 'center', paddingVertical: 12 },
});
