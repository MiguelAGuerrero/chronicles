import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { useReducedMotion } from '../lib/motion';
import { MOTION } from '../lib/motionTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { placeWalks, type PlacesIndex } from '../lib/places';
import { formatCaptures, formatDistance, formatDuration, suggestTitle } from '../lib/summary';
import type { Walk, WalkSummary } from '../lib/types';
import { Icon } from './icons';
import { theme } from './ui';

/** What the sheet shows: the summary, every walk, or one place's walks. */
export type SheetMode = { kind: 'summary' } | { kind: 'walks' } | { kind: 'place'; key: string };

/** The sheet's height when it peeks over the map, above the safe area. */
export const SHEET_PEEK = 76;

type Size = 'peek' | 'half' | 'full';

/**
 * The home map's bottom sheet, as in AllTrails and Google Maps: it peeks with
 * a one-line summary and a Walks button, and opens to half or full height to
 * list walks, every one or a place's. The handle and header drag between the
 * three heights; the buttons do the same for a screen reader or a keyboard,
 * and back (Android) or Escape (web) lowers it. Built on Animated and the
 * responder system, so it is the same on phones and on the web.
 */
export function HomeSheet(props: {
  index: PlacesIndex;
  summaries: Map<string, WalkSummary>;
  unplaced: Walk[];
  mode: SheetMode;
  onMode: (m: SheetMode) => void;
  /** Called with the sheet's height whenever it settles, so the map and Start sit clear of it. */
  onHeight?: (h: number) => void;
  /** While old walks are being placed, rows can't open a replay. */
  busy?: boolean;
  /** Starts a walk navigating to the place shown (N11). */
  onGoToPlace?: () => void;
  /** The place's checklist count and found places (E10), in the place view only. */
  placeExtra?: { count: string; found: string[] } | null;
}) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const heights: Record<Size, number> = {
    peek: SHEET_PEEK + insets.bottom,
    half: Math.round(screenH * 0.5),
    full: Math.round(screenH - insets.top - 56),
  };
  const expanded = props.mode.kind !== 'summary';
  // Opening a list starts at half height; the drag can take it to full.
  const [openSize, setOpenSize] = useState<Exclude<Size, 'peek'>>('half');
  const size: Size = expanded ? openSize : 'peek';
  const target = heights[size];
  // The sheet settles at its height with the app's one spring (M5), or snaps with reduce motion on
  // (M2). Height can't use the native driver, so it runs in JavaScript, as it did.
  const [h] = useState(() => new Animated.Value(heights.peek));
  const reduced = useReducedMotion();
  const onHeight = useRef(props.onHeight);
  useEffect(() => {
    onHeight.current = props.onHeight;
  });
  // Every move reports where the sheet ends, finished or cut short by a drag (audit 2).
  const [moveTo] = useState(() => (to: number, snap: boolean) => {
    const done = () => onHeight.current?.(to);
    if (snap) {
      h.setValue(to);
      done();
    } else Animated.spring(h, { toValue: to, ...MOTION.spring, useNativeDriver: false }).start(done);
  });
  useEffect(() => {
    moveTo(target, reduced);
  }, [moveTo, target, reduced]);

  const setSize = (next: Size) => {
    if (next === 'peek') props.onMode({ kind: 'summary' });
    else {
      setOpenSize(next);
      if (!expanded) props.onMode({ kind: 'walks' });
    }
  };
  // Back on Android, and Escape on the web, lower an open sheet before anything else.
  const onModeRef = useRef(props.onMode);
  useEffect(() => {
    onModeRef.current = props.onMode;
  });
  useEffect(() => {
    if (!expanded) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onModeRef.current({ kind: 'summary' });
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onModeRef.current({ kind: 'summary' });
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  // Dragging the handle or header: it settles at the nearest of the three
  // heights, however the gesture ends (released, or taken by something else).
  const drag = useRef({ y: 0, from: 0, moved: false });
  const settle = (pageY: number) => {
    const moved = drag.current.y - pageY;
    if (!drag.current.moved && Math.abs(moved) < 6) {
      setSize(expanded ? 'peek' : 'half');
      return;
    }
    const at = drag.current.from + moved;
    const nearest = (Object.keys(heights) as Size[]).sort((x, y) => Math.abs(heights[x] - at) - Math.abs(heights[y] - at))[0];
    if (nearest === size) moveTo(target, reduced);
    else setSize(nearest);
  };
  const dragProps = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      // Grabbed mid-move, it holds where it is rather than jumping to where it was going (audit).
      drag.current = { y: e.nativeEvent.pageY, from: target, moved: false };
      h.stopAnimation((v) => (drag.current.from = v));
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const dy = e.nativeEvent.pageY - drag.current.y;
      if (Math.abs(dy) >= 6) drag.current.moved = true;
      h.setValue(Math.max(heights.peek, Math.min(heights.full, drag.current.from - dy)));
    },
    onResponderRelease: (e: GestureResponderEvent) => settle(e.nativeEvent.pageY),
    onResponderTerminate: (e: GestureResponderEvent) => settle(e.nativeEvent.pageY),
  };

  const { index } = props;
  const all = [...index.walks.values()].sort((x, y) => y.started_at - x.started_at);
  const place = props.mode.kind === 'place' ? placeWalks(index, props.mode.key) : null;
  const unplacedIds = new Set(props.unplaced.map((w) => w.id));
  const summary = index.walkCount
    ? `${index.walkCount} ${index.walkCount === 1 ? 'walk' : 'walks'} · ${index.placeCount} ${index.placeCount === 1 ? 'place' : 'places'}`
    : '';

  return (
    <Animated.View testID="home-sheet" style={[styles.sheet, { height: h, paddingBottom: insets.bottom }]}>
      <View testID="sheet-drag" {...dragProps} style={styles.dragArea}>
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>
        <View style={styles.header}>
          {place ? (
            <View style={styles.headerText}>
              <Text testID="place-title" style={styles.title} accessibilityRole="header" numberOfLines={1}>{place.title}</Text>
              <Text style={styles.meta} numberOfLines={2}>
                {[place.subtitle, `${place.walks.length} ${place.walks.length === 1 ? 'walk' : 'walks'}`, formatDistance(place.metres)].filter(Boolean).join(' · ')}
              </Text>
              {props.placeExtra && (
                <Text testID="place-count" style={styles.meta} numberOfLines={1}>{props.placeExtra.count}</Text>
              )}
            </View>
          ) : (
            <Text style={[styles.title, styles.headerText]} accessibilityRole="header" numberOfLines={1}>
              {expanded ? 'Walks' : summary}
            </Text>
          )}
          {expanded ? (
            <Pressable
              testID="sheet-map"
              accessibilityRole="button"
              accessibilityLabel="Back to the map"
              accessibilityState={{ expanded: true }}
              onPress={() => props.onMode({ kind: 'summary' })}
              style={styles.pill}
              hitSlop={8}
            >
              <Icon name="map-outline" size={18} color={theme.ink} />
              <Text style={styles.pillText}>Map</Text>
            </Pressable>
          ) : (
            index.walkCount > 0 && (
              <Pressable
                testID="sheet-walks"
                accessibilityRole="button"
                accessibilityLabel="Show your walks"
                accessibilityState={{ expanded: false }}
                onPress={() => props.onMode({ kind: 'walks' })}
                style={styles.pill}
                hitSlop={8}
              >
                <Icon name="list" size={18} color={theme.ink} />
                <Text style={styles.pillText}>Walks</Text>
              </Pressable>
            )
          )}
        </View>
      </View>
      {place && props.onGoToPlace && (
        <View style={styles.goRow}>
          <Pressable testID="place-go" accessibilityRole="button" accessibilityLabel={`Start a walk to ${place.title}`} onPress={props.onGoToPlace} disabled={props.busy} style={({ pressed }) => [styles.go, (pressed || props.busy) && { opacity: 0.7 }]}>
            <Icon name="navigate" size={18} color="#ffffff" />
            <Text style={styles.goText}>Walk here</Text>
          </Pressable>
        </View>
      )}
      {expanded && (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {place && props.placeExtra && props.placeExtra.found.length > 0 && (
            <Text testID="place-found" style={styles.note}>Found here: {props.placeExtra.found.join(' · ')}</Text>
          )}
          {(place ? place.walks : all.filter((w) => !unplacedIds.has(w.id))).map((w) => (
            <WalkRow key={w.id} walk={w} summary={props.summaries.get(w.id) ?? null} disabled={props.busy} />
          ))}
          {!place && props.unplaced.length > 0 && (
            <>
              <Text style={styles.section} accessibilityRole="header">Not placed yet</Text>
              <Text style={styles.note}>Placed when you’re online. Open one to place it now.</Text>
              {props.unplaced.map((w) => (
                <WalkRow key={w.id} walk={w} summary={props.summaries.get(w.id) ?? null} disabled={props.busy} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}

function WalkRow({ walk, summary: s, disabled }: { walk: Walk; summary: WalkSummary | null; disabled?: boolean }) {
  const title = walk.title ?? suggestTitle(walk);
  const date = new Date(walk.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const meta = s
    ? [date, formatDistance(s.distance_m), formatDuration(s.duration_ms), s.new_streets ? `${s.new_streets} new ${s.new_streets === 1 ? 'street' : 'streets'}` : '']
        .concat(formatCaptures(s) || [])
        .filter(Boolean)
        .join(' · ')
    : `${date} · Open to finish reading its streets`;
  return (
    <Pressable
      testID="walk-row"
      accessibilityRole="button"
      accessibilityLabel={`Replay ${title}`}
      accessibilityHint={meta}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => router.push(`/replay/${walk.id}?ceremony=0`)}
      style={({ pressed }) => [styles.row, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowMeta}>{meta}</Text>
      {walk.epilogue ? <Text style={styles.epilogue}>“{walk.epilogue}”</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // In the 640 column on wide screens, like the rest of the app.
  sheet: {
    position: 'absolute', bottom: 0, width: '100%', maxWidth: 640, alignSelf: 'center', backgroundColor: theme.bg,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  // The handle and header drag the sheet; no text in them gets selected on the web.
  dragArea: Platform.OS === 'web' ? ({ userSelect: 'none' } as object) : {},
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 10, minHeight: 24 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: theme.edge },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: theme.ink },
  meta: { fontSize: 14, color: theme.muted, marginTop: 2 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
  },
  pillText: { fontSize: 15, fontWeight: '600', color: theme.ink },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  note: { fontSize: 14, color: theme.muted, marginTop: -4 },
  goRow: { paddingHorizontal: 16, paddingTop: 4, maxWidth: 640, width: '100%', alignSelf: 'center' },
  go: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 24, backgroundColor: theme.accent, alignSelf: 'flex-start', paddingHorizontal: 20 },
  goText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  section: { marginTop: 12, fontSize: 13, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 4, borderWidth: 1, borderColor: theme.line },
  rowTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  rowMeta: { fontSize: 14, color: theme.muted, lineHeight: 19 },
  epilogue: { fontSize: 15, color: theme.ink, fontStyle: 'italic', marginTop: 4 },
});
