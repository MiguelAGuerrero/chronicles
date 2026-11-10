import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, BackHandler, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View,
  type NativeScrollEvent, type NativeSyntheticEvent, type PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ATLAS_ORDER, distanceWords, familiarityWords, kindsHeading, marksExplained,
  type AtlasArea, type Familiarity,
} from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import { focusOn } from '../../lib/focus';
import { formatDistance } from '../../lib/format';
import { useReducedMotion } from '../../lib/motion';
import { MOTION } from '../../lib/motionTokens';
import { ATLAS_RULES } from '../../lib/atlas/atlas';
import { useAreaWords } from '../../lib/walk/useAreaWords';
import { hideTabs } from '../../lib/tabsHidden';
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

/** Pulled this far down (a share of the screen), or flung down, a let-go closes the drawer; short of it, it snaps back. */
const CLOSE_AT = 0.3;
const FLING_VY = 1;
/** A pull from the content starts only once it is clearly downward, not a tap or a sideways wobble. */
const PULL_START = 8;

type Pan = ReturnType<typeof PanResponder.create>;

/**
 * An area's card (AT8, atlas round 3): the larger picture, the eight kinds in
 * words and dots, how the marks work, busy streets, what is waiting (kinds
 * only, AT7), what you found, the areas next door, and Walk to, always in
 * sight in a footer. On a phone it is a full-screen drawer over the tabs, which
 * fold away while it is open; on a wide screen a panel beside the map. ✕, Back
 * and Escape close it, and so does a pull down: from the handle or header at any
 * time, from the content only when it is scrolled to the top. The drawer follows
 * the finger, and a let-go past a third of the screen (or a fling) completes the
 * close, else it springs back. Never a Modal, so nothing stacks on iOS.
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
  /** TP7: a graded town's busy areas, busiest first; `walkable` is whether navigation will route from where you are. */
  busyAreas: { label: string; at: LngLat; walkable: boolean }[];
  starting: boolean;
  /** DW14: past what can be walked (N5), the footer offers When I get there alone. */
  farOff?: boolean;
  /** DW2, DW5: whether Walk to a place asks Walk now or When I get there first (decision 0121). */
  askFirst?: (at: LngLat) => boolean;
  /** DW3: When I get there: the place is kept for Navigate's Start; no walk starts. */
  onLater?: (at: LngLat, label: string) => void;
  onWalk: () => void;
  onWalkAt: (at: LngLat, label: string) => void;
  /** WP1: a kind's "Suggest a walk" button opens the walk planner for it. */
  onPlan: (kind: CategoryId) => void;
  onPick: (key: string) => void;
  onClose: () => void;
  /**
   * Measured by the screen, in pixels: Safari on iPhone left a card sized by
   * percent and insets at its header's height, its body gone (Nov 3).
   */
  layout: CardLayout;
}) {
  const { area, fam, layout } = props;
  // How the area treats someone on foot (WK11): words only, read when the card opens.
  const onFoot = useAreaWords(area.at, ATLAS_RULES.ringM, true);
  const p = area.profile;
  const [how, setHow] = useState(false);
  const reduced = useReducedMotion();
  // DW2: Walk to a far place asks first, in the footer; Back and Escape close the question before the card.
  const [asking, setAsking] = useState<{ at: LngLat; label: string; now: () => void } | null>(null);
  const close = useRef(props.onClose);
  useEffect(() => {
    close.current = asking ? () => setAsking(null) : props.onClose;
  }, [props.onClose, asking]);
  const walkTo = (at: LngLat, label: string, now: () => void) => {
    if (props.askFirst?.(at)) setAsking({ at, label, now });
    else now();
  };
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

  const insets = useSafeAreaInsets();
  const sheet = layout.kind === 'sheet';
  const screenH = sheet ? layout.screenH : 0;
  // The tabs fold away while the drawer is up, and come back when it goes (however it goes).
  useEffect(() => {
    if (!sheet) return;
    return hideTabs();
  }, [sheet]);

  // How far down the drawer is: 0 is full screen. It slides up as it opens and follows a pull down.
  const [offset] = useState(() => new Animated.Value(screenH));
  const [pull] = useState(() => createPull(offset));
  useEffect(() => {
    pull.sync({ screenH, reduced, onClose: props.onClose });
  }, [pull, screenH, reduced, props.onClose]);
  useEffect(() => {
    const detach = pull.attach();
    if (sheet) pull.snapBack();
    return detach;
  }, [sheet, pull]);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => pull.setScroll(e.nativeEvent.contentOffset.y);
  const pullProps = sheet ? pull.handle.panHandlers : {};

  const level = area.level === 'neighborhood' ? 'Neighborhood' : 'Town';
  const last = lastWords(fam.last);
  const frameStyle = layout.kind === 'sheet'
    ? [styles.sheet, {
        transform: [{ translateY: offset }],
        // Square at rest; the corners round as it is pulled away.
        borderTopLeftRadius: offset.interpolate({ inputRange: [0, 40], outputRange: [0, 22], extrapolate: 'clamp' }),
        borderTopRightRadius: offset.interpolate({ inputRange: [0, 40], outputRange: [0, 22], extrapolate: 'clamp' }),
      }]
    : [styles.side, { width: layout.width, height: layout.height }];
  return (
    <View style={[StyleSheet.absoluteFill, styles.over]} pointerEvents="box-none">
      {/* Behind the drawer: dims the tab beneath as the drawer is pulled away, so the close reads as progress. */}
      {layout.kind === 'sheet' && (
        <Animated.View
          pointerEvents="none"
          style={[styles.scrim, { opacity: offset.interpolate({ inputRange: [0, Math.max(1, screenH)], outputRange: [1, 0], extrapolate: 'clamp' }) }]}
          testID="atlas-scrim"
        />
      )}
      <Animated.View style={frameStyle} testID="atlas-card" accessibilityViewIsModal>
        <View {...pullProps} testID="atlas-card-pull">
          {layout.kind === 'sheet' && (
            <View style={[styles.grip, { paddingTop: insets.top }]} accessibilityLabel="Pull down to close" testID="atlas-card-grip">
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
        </View>
        <View style={styles.scroll} {...(sheet ? pull.body.panHandlers : {})}>
        <ScrollView style={styles.scrollInner} contentContainerStyle={styles.body} onScroll={onScroll} scrollEventThrottle={16}>
          <View style={styles.bigMap}>
            <MiniMap area={area} walked={props.walked} waiting={props.waiting} finds={props.finds} here={props.here ? props.you : null} />
          </View>

          {/* UF13: what the ground is like for someone on foot, in words. Shown only once there are words (never a "Reading" that
              vanishes, layers audit 9), and for a town said of the ground around its centre, as "What's here" is. */}
          {onFoot.words && (
            <View style={styles.sec} testID="atlas-onfoot">
              <Text style={styles.secTitle} accessibilityRole="header">{area.level === 'town' ? 'On foot · around its centre' : 'On foot'}</Text>
              <Text style={styles.onFoot} testID="atlas-onfoot-words">{onFoot.words}</Text>
              <Text style={styles.muted}>From OpenStreetMap and Overture.</Text>
            </View>
          )}

          {/* AG3: a ring the map knows almost nothing about says nothing about its kinds. */}
          {!p?.thin && (
            <View style={styles.sec}>
              <View style={styles.secHead}>
                <Text style={styles.secTitle} accessibilityRole="header">
                  {kindsHeading(area.level, p)}
                </Text>
                <Pressable testID="atlas-how" accessibilityRole="button" accessibilityState={{ expanded: how }} onPress={() => setHow((v) => !v)} style={styles.howBtn}>
                  <Icon name="information-circle-outline" size={16} color={theme.accent} />
                  <Text style={styles.howText}>How the marks work</Text>
                </Pressable>
              </View>
              {how && (
                <View style={styles.explain} testID="atlas-how-panel">
                  {marksExplained(p).map((line) => <Text key={line} style={styles.explainText}>{line}</Text>)}
                </View>
              )}
              {p ? (
                ATLAS_ORDER.map((c) => (
                  <KindRow key={c} kind={c} step={p.steps[c]} testID={`atlas-kind-${c}`} onPress={p.steps[c] ? () => props.onPlan(c) : undefined} />
                ))
              ) : (
                <Text style={styles.muted}>Reading this area…</Text>
              )}
            </View>
          )}

          {/* TP3: a town wider than one read takes says it covers part of it. */}
          {p?.partial && <Text style={styles.muted} testID="atlas-partial">Covers part of the town: the middle of it, around its point.</Text>}

          {/* TP7: where a town is busy, apart from its kinds: each busy street once, busiest first, with Walk to. */}
          {props.busyAreas.length > 0 && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Busy areas</Text>
              <View testID="atlas-busy-areas">
                {props.busyAreas.map((b, i) => (
                  <View key={`${b.label}-${i}`} style={styles.pocket} testID="atlas-busy-area">
                    <Text style={styles.pocketName}>{b.label}</Text>
                    {b.walkable ? (
                      <Pressable testID="atlas-busy-walk" accessibilityRole="button" accessibilityLabel={`Walk to ${b.label}`} onPress={() => walkTo(b.at, b.label, () => props.onWalkAt(b.at, b.label))} style={styles.pocketWalk}>
                        <Text style={styles.howText}>Walk to</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

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
        </View>

        {/* The card's main step stays in sight (atlas round 3): never at the end of a scroll. */}
        <View style={[styles.footer, sheet && { paddingBottom: 16 + insets.bottom }]}>
          {props.here ? (
            <Text style={[styles.you, styles.hereLine]}>You’re in {area.name}</Text>
          ) : asking ? (
            // DW2: Walk now starts as Walk to always did; When I get there keeps the place for Navigate's Start (DW3).
            <>
              <View style={styles.askHead}>
                <Text style={styles.askTitle} numberOfLines={1} accessibilityRole="header">{asking.label}</Text>
                <Pressable testID="atlas-walk-cancel" accessibilityRole="button" accessibilityLabel="Not now" onPress={() => setAsking(null)} style={styles.askClose}>
                  <Icon name="close" size={22} color={theme.ink} />
                </Pressable>
              </View>
              <View style={styles.askRow}>
                <Button testID="atlas-walk-now" label="Walk now" busy={props.starting} busyLabel="Starting…" style={styles.askBtn}
                  onPress={() => {
                    const go = asking.now;
                    setAsking(null);
                    go();
                  }} />
                <Button testID="atlas-walk-later" variant="secondary" label="When I get there" style={styles.askBtn}
                  accessibilityHint="Keeps it on Navigate. The walk starts when you tap Start."
                  onPress={() => {
                    const a = asking;
                    setAsking(null);
                    props.onLater?.(a.at, a.label);
                  }} />
              </View>
            </>
          ) : props.walkTo && props.farOff ? (
            // DW14: too far to walk, not too far to go.
            <Button testID="atlas-walk-later" label="When I get there" tall
              accessibilityHint="Keeps it on Navigate. The walk starts when you tap Start."
              onPress={() => props.walkTo && props.onLater?.(props.walkTo.at, props.walkTo.label)} />
          ) : props.walkTo ? (
            <>
              <Button testID="atlas-walk" label={`Walk to ${props.walkTo.label}`} onPress={() => props.walkTo && walkTo(props.walkTo.at, props.walkTo.label, props.onWalk)} busy={props.starting} busyLabel="Starting…" tall />
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

/**
 * The pull-down gesture, kept in one object so its state (the scroll offset, where the drawer is, the
 * latest props) lives outside render. The handle and header's pan takes every touch; the content's takes
 * the touch from the ScrollView only when the content is at the top and the move is clearly downward (so a
 * swipe up, or any scroll mid-list, is left alone).
 */
function createPull(offset: Animated.Value) {
  let scrollY = 0;
  let at = 0;
  let ctx = { screenH: 0, reduced: false, onClose: () => {} };
  const snapBack = () => {
    if (ctx.reduced) offset.setValue(0);
    else Animated.spring(offset, { toValue: 0, ...MOTION.spring, useNativeDriver: false }).start();
  };
  const pan = (fromBody: boolean): Pan => {
    let start = 0;
    const finish = (g: PanResponderGestureState) => {
      const far = at > ctx.screenH * CLOSE_AT;
      // Only a pull still going down closes: one that turned back up snaps back, however far it went.
      const fling = g.vy > FLING_VY && at > 24;
      if (!(far && g.vy >= 0) && !fling) return snapBack();
      if (ctx.reduced) return ctx.onClose();
      Animated.timing(offset, { toValue: ctx.screenH, duration: MOTION.base, useNativeDriver: false }).start(ctx.onClose);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !fromBody,
      onMoveShouldSetPanResponder: () => !fromBody,
      onMoveShouldSetPanResponderCapture: (_, g) => fromBody && scrollY <= 0 && g.dy > PULL_START && g.dy > Math.abs(g.dx) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, g) => {
        offset.stopAnimation();
        start = g.dy;
      },
      // Never above full screen: pulling back up past where the pull began holds at the top, it doesn't close.
      onPanResponderMove: (_, g) => offset.setValue(Math.max(0, g.dy - start)),
      onPanResponderRelease: (_, g) => finish(g),
      onPanResponderTerminate: (_, g) => finish(g),
    });
  };
  return {
    handle: pan(false),
    body: pan(true),
    snapBack,
    setScroll: (y: number) => {
      scrollY = y;
    },
    sync: (next: typeof ctx) => {
      ctx = next;
    },
    /** Starts following the drawer's position; returns the stop (an effect's cleanup, so a re-run restarts it). */
    attach: () => {
      const id = offset.addListener(({ value }) => {
        at = value;
      });
      return () => offset.removeListener(id);
    },
  };
}

const styles = StyleSheet.create({
  // Above Explore's map pane, which sits at zIndex 5 so the Layers panel can overlay the cards (ML4).
  over: { zIndex: 6 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  // Full screen, over the tabs (which fold away while it is open); `maxWidth` keeps a wide phone-width window readable.
  sheet: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.surface, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  side: {
    position: 'absolute', right: 0, top: 0, backgroundColor: theme.surface, borderLeftWidth: 1, borderLeftColor: theme.line, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: -2, height: 0 }, elevation: 8,
  },
  grip: { minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: '#cfcac1' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.line },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: theme.muted },
  name: { fontSize: 26, fontWeight: '800', color: theme.ink },
  youRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  you: { fontSize: 14, color: theme.ink },
  known: { color: COLORS.trace, fontWeight: '600' },
  onFoot: { fontSize: 16, color: theme.ink },
  muted: { fontSize: 13, color: theme.muted },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 },
  scrollInner: { flex: 1 },
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
  pocket: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.line },
  pocketName: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: theme.ink },
  pocketWalk: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
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
  askHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  askTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.ink },
  askClose: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  askRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  askBtn: { flexGrow: 1, flexBasis: 140 },
  hereLine: { color: COLORS.route, fontWeight: '600', textAlign: 'center', paddingVertical: 12 },
});
