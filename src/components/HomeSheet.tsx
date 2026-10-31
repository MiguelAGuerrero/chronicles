import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent,
} from 'react-native';
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

/**
 * The home map's bottom sheet, as in AllTrails and Google Maps: it peeks with
 * a one-line summary and a Walks button, and drags (or taps) up to list walks,
 * every one or a place's. Built on Animated and the responder system, so it
 * is the same on phones and on the web.
 */
export function HomeSheet(props: {
  index: PlacesIndex;
  summaries: Map<string, WalkSummary>;
  unplaced: Walk[];
  mode: SheetMode;
  onMode: (m: SheetMode) => void;
  /** Called with the sheet's height whenever it settles, so the map and Start sit clear of it. */
  onHeight?: (h: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const peek = SHEET_PEEK + insets.bottom;
  const full = Math.round(screenH * 0.62);
  const expanded = props.mode.kind !== 'summary';
  const [h] = useState(() => new Animated.Value(peek));
  const target = expanded ? full : peek;
  const onHeight = useRef(props.onHeight);
  useEffect(() => {
    onHeight.current = props.onHeight;
  });
  useEffect(() => {
    Animated.timing(h, { toValue: target, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() =>
      onHeight.current?.(target),
    );
  }, [h, target]);

  // Dragging the handle: up past a third opens the walks, down past a third closes.
  const drag = useRef({ y: 0, from: 0 });
  const dragProps = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      drag.current = { y: e.nativeEvent.pageY, from: target };
    },
    onResponderMove: (e: GestureResponderEvent) => {
      h.setValue(Math.max(peek, Math.min(full, drag.current.from - (e.nativeEvent.pageY - drag.current.y))));
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      const moved = drag.current.y - e.nativeEvent.pageY;
      const third = (full - peek) / 3;
      if (!expanded && moved > third) props.onMode({ kind: 'walks' });
      else if (expanded && -moved > third) props.onMode({ kind: 'summary' });
      else if (Math.abs(moved) < 6) props.onMode(expanded ? { kind: 'summary' } : { kind: 'walks' });
      else Animated.timing(h, { toValue: target, duration: 160, useNativeDriver: false }).start();
    },
  };

  const { index } = props;
  const all = [...index.walks.values()].sort((x, y) => y.started_at - x.started_at);
  const place = props.mode.kind === 'place' ? placeWalks(index, props.mode.key) : null;
  const unplacedIds = new Set(props.unplaced.map((w) => w.id));
  const summary = index.walkCount
    ? `${index.walkCount} ${index.walkCount === 1 ? 'walk' : 'walks'} · ${index.placeCount} ${index.placeCount === 1 ? 'place' : 'places'}`
    : 'No walks yet';

  return (
    <Animated.View testID="home-sheet" style={[styles.sheet, { height: h, paddingBottom: insets.bottom }]}>
      <View {...dragProps} style={styles.handleArea} accessible={false}>
        <View style={styles.handle} />
      </View>
      <View style={styles.header}>
        {place ? (
          <View style={styles.headerText}>
            <Text testID="place-title" style={styles.title} accessibilityRole="header" numberOfLines={1}>{place.title}</Text>
            <Text style={styles.meta} numberOfLines={2}>
              {[place.subtitle, `${place.walks.length} ${place.walks.length === 1 ? 'walk' : 'walks'}`, formatDistance(place.metres)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : (
          <Text style={[styles.title, styles.headerText]} accessibilityRole="header" numberOfLines={1}>
            {expanded ? 'Walks' : summary}
          </Text>
        )}
        {expanded ? (
          <Pressable testID="sheet-map" accessibilityRole="button" accessibilityLabel="Back to the map" onPress={() => props.onMode({ kind: 'summary' })} style={styles.pill} hitSlop={8}>
            <Icon name="map-outline" size={18} color={theme.ink} />
            <Text style={styles.pillText}>Map</Text>
          </Pressable>
        ) : (
          index.walkCount > 0 && (
            <Pressable testID="sheet-walks" accessibilityRole="button" accessibilityLabel="Show your walks" onPress={() => props.onMode({ kind: 'walks' })} style={styles.pill} hitSlop={8}>
              <Icon name="list" size={18} color={theme.ink} />
              <Text style={styles.pillText}>Walks</Text>
            </Pressable>
          )
        )}
      </View>
      {expanded && (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {(place ? place.walks : all.filter((w) => !unplacedIds.has(w.id))).map((w) => (
            <WalkRow key={w.id} walk={w} summary={props.summaries.get(w.id) ?? null} />
          ))}
          {!place && props.unplaced.length > 0 && (
            <>
              <Text style={styles.section} accessibilityRole="header">Not placed yet</Text>
              {props.unplaced.map((w) => (
                <WalkRow key={w.id} walk={w} summary={props.summaries.get(w.id) ?? null} />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}

function WalkRow({ walk, summary: s }: { walk: Walk; summary: WalkSummary | null }) {
  const title = walk.title ?? suggestTitle(walk);
  const date = new Date(walk.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const meta = s
    ? [date, formatDistance(s.distance_m), formatDuration(s.duration_ms), `${s.new_streets} new ${s.new_streets === 1 ? 'street' : 'streets'}`]
        .concat(formatCaptures(s) || [])
        .join(' · ')
    : `${date} · Open to finish reading its streets`;
  return (
    <Pressable
      testID="walk-row"
      accessibilityRole="button"
      accessibilityLabel={`Replay ${title}`}
      accessibilityHint={meta}
      onPress={() => router.push(`/replay/${walk.id}?ceremony=0`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowMeta}>{meta}</Text>
      {walk.epilogue ? <Text style={styles.epilogue}>“{walk.epilogue}”</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.bg,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  handleArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
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
  section: { marginTop: 12, fontSize: 13, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 4, borderWidth: 1, borderColor: theme.line },
  rowTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  rowMeta: { fontSize: 14, color: theme.muted, lineHeight: 19 },
  epilogue: { fontSize: 15, color: theme.ink, fontStyle: 'italic', marginTop: 4 },
});
