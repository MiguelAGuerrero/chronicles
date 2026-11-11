import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { entryRef, matchEntries, moveHighlight, type KeywordEntry } from '../../lib/refKeywords';
import { refResolver } from '../../lib/refPlaces';
import type { KeywordRef } from '../../lib/refs';
import type { MomentView } from '../../lib/resurface/types';
import type { LngLat } from '../../lib/types';
import { momentRow, useMomentMatches } from './MomentPicker';
import type { MomentPool } from './useMomentPool';
import { theme } from '../ui';

/** How many moments the menu lists at a time; the picker (Add to a thread) pages through the rest. */
const MOMENTS = 5;

/** What the editor drives from the keyboard (RK22): the highlight, and a pick of it. */
export type RefMenuHandle = {
  /** Moves the highlight one up or down, staying in the list. */
  move(delta: number): void;
  /** Picks the highlighted item; false when there is none. */
  pickHighlighted(): boolean;
  /** Whether the menu has anything to show: with nothing it is not drawn, and Enter is the field's own (RK21). */
  hasItems(): boolean;
};

type Item = { id: string; entry: KeywordEntry } | { id: string; moment: MomentView };

/**
 * The menu a note's "@" opens, beside the field and never over it (specs/reference-keywords RK1, RK14, RK21, RK22), as
 * Notion's does: where (here, next to me, over there), when (the time words) and moments, narrowed by what is typed
 * after the "@". The time words and "over there" are there at once; "here" and "next to me" appear when the local read
 * answers, so typing is never held up. A tap picks; on the web the arrows, Enter and Escape drive it.
 */
export const RefPalette = forwardRef<
  RefMenuHandle,
  {
    pool: MomentPool;
    self: string | null;
    fix: { saved: LngLat | null; stamp: LngLat | null };
    /** The moment's own time. */
    t: number;
    /** How far into its walk, when it is on one. */
    minutesIn: number | null;
    /** What was typed after the "@". */
    query: string;
    onKeyword: (k: KeywordRef) => void;
    /** "Over there": the resolution picker opens, and the editor takes the pick. */
    onResolve: () => void;
    onMoment: (v: MomentView) => void;
  }
>(function RefPalette(props, ref) {
  const [places, setPlaces] = useState<KeywordEntry[]>([{ key: 'there', word: 'over there', value: null, payload: '' }]);
  const times = useMemo(() => refResolver.timeEntries(props.t, props.minutesIn), [props.t, props.minutesIn]);
  const { saved, stamp } = props.fix;
  useEffect(() => {
    let alive = true;
    void refResolver.placeEntries({ saved, stamp }).then((e) => alive && setPlaces(e));
    return () => {
      alive = false;
    };
  }, [saved, stamp]);
  const moments = useMomentMatches(props.pool, props.self, props.query, MOMENTS);
  const [now] = useState(() => Date.now());
  const items = useMemo<Item[]>(
    () => [
      ...matchEntries([...places, ...times], props.query).map((entry) => ({ id: `${entry.key}:${entry.word}`, entry })),
      // The keywords first, then the latest moments, as Notion's menu lists its pages.
      ...moments.shown.map((moment) => ({ id: `moment:${moment.id}`, moment })),
    ],
    [places, times, moments.shown, props.query],
  );
  const [at, setAt] = useState(0);
  // The highlight starts at the first item and stays inside the list as it narrows.
  const lit = items.length ? Math.min(at, items.length - 1) : -1;
  const choose = (item: Item) => {
    if ('moment' in item) return props.onMoment(item.moment);
    const e = item.entry;
    if (e.value == null) return props.onResolve();
    const r = entryRef(e);
    if (r) props.onKeyword(r);
  };
  useImperativeHandle(
    ref,
    () => ({
      move: (d) => setAt((i) => moveHighlight(Math.min(i, items.length - 1), d, items.length)),
      pickHighlighted: () => {
        const item = items[lit];
        if (!item) return false;
        choose(item);
        return true;
      },
      hasItems: () => items.length > 0,
    }),
    // choose reads the props of this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, lit, props.onKeyword, props.onMoment, props.onResolve],
  );
  if (!items.length) return null;
  return (
    <View style={styles.menu} testID="ref-palette" accessibilityRole="menu">
      <ScrollView keyboardShouldPersistTaps="always" style={styles.scroll}>
        {items.map((item, i) => {
          const on = i === lit;
          if ('moment' in item) {
            const r = momentRow(item.moment, props.pool, now);
            return (
              <Pressable
                key={item.id}
                testID="moment-picker-row"
                accessibilityRole="menuitem"
                accessibilityState={{ selected: on }}
                // The e2e reads the highlight (react-native-web drops aria-selected on a button).
                {...{ dataSet: { selected: on ? '1' : '0' } }}
                accessibilityLabel={`${r.words}. ${r.context}`}
                onPress={() => choose(item)}
                style={[styles.row, on && styles.on]}
              >
                <Text style={styles.name} numberOfLines={1}>{r.words}</Text>
                <Text style={styles.sub} numberOfLines={1}>{r.context}</Text>
              </Pressable>
            );
          }
          const e = item.entry;
          return (
            <Pressable
              key={item.id}
              testID={e.key === 'time' ? `ref-time-${e.word.replace(/\s+/g, '-')}` : `ref-key-${e.key}`}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: on }}
              {...{ dataSet: { selected: on ? '1' : '0' } }}
              accessibilityLabel={e.value ? `${e.word}: ${e.value}` : `${e.word}: pick a place`}
              onPress={() => choose(item)}
              style={[styles.row, on && styles.on]}
            >
              <Text style={styles.name} numberOfLines={1}>{e.word}</Text>
              <Text style={styles.sub} numberOfLines={1}>{e.value ?? 'pick a place, or a spot on the map'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  menu: {
    width: '100%', maxWidth: 520, alignSelf: 'center', maxHeight: 248, marginTop: 8, borderRadius: theme.radius,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, overflow: 'hidden',
  },
  scroll: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  on: { backgroundColor: theme.bg },
  name: { color: theme.ink, fontSize: 16, fontWeight: '600', flexShrink: 0, maxWidth: '55%' },
  sub: { color: theme.muted, fontSize: 14, flex: 1 },
});
