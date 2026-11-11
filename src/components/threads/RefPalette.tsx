import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { entryRef, type KeywordEntry } from '../../lib/refKeywords';
import { refResolver } from '../../lib/refPlaces';
import type { KeywordRef } from '../../lib/refs';
import type { MomentView } from '../../lib/resurface/types';
import type { LngLat } from '../../lib/types';
import { Icon } from '../icons';
import { theme } from '../ui';
import { MomentList } from './MomentPicker';
import { RefResolve } from './RefResolve';
import type { MomentPool } from './useMomentPool';

/**
 * The palette a note's "@" opens (specs/reference-keywords RK1, RK14): where (here, next to me, over there), when (the
 * time words) and the moments, in one place. The time words and "over there" are there at once; "here" and "next to
 * me" appear when the local read answers, and typing is never held up. Drawn inside the editor's Modal.
 */
export function RefPalette(props: {
  pool: MomentPool;
  self: string | null;
  fix: { saved: LngLat | null; stamp: LngLat | null };
  /** The moment's own time. */
  t: number;
  /** How far into its walk, when it is on one. */
  minutesIn: number | null;
  onKeyword: (k: KeywordRef) => void;
  onMoment: (v: MomentView) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<KeywordEntry[]>([{ key: 'there', word: 'over there', value: null, payload: '' }]);
  const [resolving, setResolving] = useState(false);
  const times = useMemo(() => refResolver.timeEntries(props.t, props.minutesIn), [props.t, props.minutesIn]);
  const { saved, stamp } = props.fix;
  useEffect(() => {
    let alive = true;
    void refResolver.placeEntries({ saved, stamp }).then((e) => alive && setPlaces(e));
    return () => {
      alive = false;
    };
  }, [saved, stamp]);
  const choose = (e: KeywordEntry) => {
    if (e.value == null) setResolving(true);
    else {
      const r = entryRef(e);
      if (r) props.onKeyword(r);
    }
  };
  return (
    <View style={[StyleSheet.absoluteFill, styles.back, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.card} testID="ref-palette" accessibilityViewIsModal>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">Mention</Text>
          <Pressable testID="ref-palette-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} hitSlop={8} style={styles.x}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
        {places.map((e) => (
          <Pressable
            key={e.key + e.word}
            testID={`ref-key-${e.key}`}
            accessibilityRole="button"
            accessibilityLabel={e.value ? `${e.word}: ${e.value}` : `${e.word}: pick a place`}
            onPress={() => choose(e)}
            style={styles.row}
          >
            <Text style={styles.name}>{e.word}</Text>
            <Text style={styles.sub} numberOfLines={1}>{e.value ?? 'pick a place, or a spot on the map'}</Text>
          </Pressable>
        ))}
        <View style={styles.chips}>
          {times.map((e) => (
            <Pressable
              key={e.word}
              testID={`ref-time-${e.word.replace(/\s+/g, '-')}`}
              accessibilityRole="button"
              accessibilityLabel={`${e.word}: ${e.value}`}
              onPress={() => choose(e)}
              style={styles.chip}
            >
              <Text style={styles.chipText}>{e.word}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.section}>A moment</Text>
        <MomentList pool={props.pool} self={props.self} onPick={props.onMoment} />
      </View>
      {resolving && (
        <RefResolve
          fix={props.fix}
          title="Over there"
          onPick={(r) => props.onKeyword({ key: 'there', word: 'over there', value: r.value, payload: r.payload })}
          onClose={() => setResolving(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { backgroundColor: 'rgba(20,24,32,0.7)', paddingHorizontal: 12, alignItems: 'center' },
  card: { width: '100%', maxWidth: 520, flex: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 12, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: theme.ink, fontSize: 17, fontWeight: '700', flex: 1 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: theme.line, gap: 2 },
  name: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  sub: { color: theme.muted, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: theme.line },
  chipText: { color: theme.ink, fontSize: 14 },
  section: { color: theme.muted, fontSize: 13, fontWeight: '600', marginTop: 4 },
});
