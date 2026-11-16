// @layer view
import { forwardRef, useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { Place } from '../../lib/gazetteer/pack';
import { search } from '../../lib/gazetteer/search';
import { usePlaceSearch } from '../../lib/gazetteer/usePlaceSearch';
import { announceSearch, placeLine, searchWords, type SearchStatus } from '../../lib/gazetteer/words';
import type { LngLat } from '../../lib/types';
import { Icon } from '../icons';
import { Button, theme } from '../ui';

/**
 * Place search (GZ1, GZ2): a magnifier beside the title card and a sheet over the top of the map with a labelled field, the
 * matching towns and cities, and a Close. The sheet is inside the screen, never a Modal. It stores nothing (GZ16).
 */
export const SearchButton = forwardRef<ComponentRef<typeof Pressable>, { onPress: () => void }>(function SearchButton(props, ref) {
  const words = searchWords();
  return (
    <Pressable
      ref={ref}
      testID="atlas-search"
      accessibilityRole="button"
      accessibilityLabel={words.open}
      {...({ title: words.open } as object)}
      onPress={props.onPress}
      style={({ pressed }) => [styles.magnifier, pressed && styles.pressed]}
    >
      <Icon name="search" size={22} color={theme.ink} />
    </Pressable>
  );
});

export function SearchSheet(props: { top: number; origin: LngLat | null; onPick: (place: Place) => void; onClose: () => void }) {
  const words = searchWords();
  const { height } = useWindowDimensions();
  const { state, retry } = usePlaceSearch();
  const [text, setText] = useState('');
  const [active, setActive] = useState(-1);
  const [said, setSaid] = useState('');
  const [focused, setFocused] = useState(true);
  const last = useRef<SearchStatus>('idle');

  const found = useMemo(() => (state.status === 'ready' ? search(state.index, text, props.origin) : null), [state, text, props.origin]);
  const status: SearchStatus =
    state.status === 'loading' ? 'loading' : state.status === 'failed' ? 'unavailable' : !found || (found.places.length === 0 && text.replace(/[^\p{L}\p{N}]/gu, '').length < 2) ? 'idle' : found.places.length ? 'some' : 'none';

  // A screen reader hears a change between none, some and loading, never each keystroke (GZ11).
  const tell = useCallback((next: SearchStatus) => {
    const line = announceSearch(last.current, next);
    last.current = next;
    if (!line) return;
    setSaid((s) => (s === line ? `${line}​` : line));
    AccessibilityInfo.announceForAccessibility(line);
  }, []);

  const change = (t: string) => {
    setText(t);
    setActive(-1);
    const r = state.status === 'ready' ? search(state.index, t, props.origin) : null;
    tell(!r ? last.current : r.places.length ? 'some' : t.replace(/[^\p{L}\p{N}]/gu, '').length < 2 ? 'idle' : 'none');
  };
  const places = found?.places ?? [];
  const pick = (i: number) => places[i] && props.onPick(places[i]);
  const onKey = (key: string) => {
    if (key === 'Escape') props.onClose();
    else if (key === 'ArrowDown') setActive((a) => Math.min(places.length - 1, a + 1));
    else if (key === 'ArrowUp') setActive((a) => Math.max(-1, a - 1));
    else if (key === 'Enter') pick(active >= 0 ? active : 0);
  };

  return (
    <View style={[styles.sheet, { top: props.top }]} testID="atlas-search-sheet" accessibilityViewIsModal>
      <Text testID="atlas-search-label" style={styles.label} nativeID="atlas-search-label">{words.label}</Text>
      <View style={[styles.fieldRow, focused && styles.fieldRowFocus]}>
        <TextInput
          testID="atlas-search-field"
          style={styles.field}
          value={text}
          onChangeText={change}
          onKeyPress={(e) => onKey(e.nativeEvent.key)}
          onSubmitEditing={() => pick(active >= 0 ? active : 0)}
          autoFocus
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={words.label}
          placeholderTextColor={theme.muted}
        />
        {text ? (
          <Pressable testID="atlas-search-clear" accessibilityRole="button" accessibilityLabel={words.clear} onPress={() => change('')} style={styles.iconBtn}>
            <Icon name="close-circle" size={20} color={theme.muted} />
          </Pressable>
        ) : null}
        <Pressable testID="atlas-search-close" accessibilityRole="button" accessibilityLabel={words.close} onPress={props.onClose} style={styles.iconBtn}>
          <Icon name="close" size={22} color={theme.ink} />
        </Pressable>
      </View>
      <ScrollView style={{ maxHeight: Math.max(120, Math.min(300, height * 0.35)) }} keyboardShouldPersistTaps="handled">
        {status === 'loading' ? <Text style={styles.line}>{words.loading}</Text> : null}
        {status === 'idle' ? <Text style={styles.line}>{words.prompt}</Text> : null}
        {status === 'unavailable' ? (
          <View style={styles.fail}>
            <Text style={styles.line}>{words.unavailable}</Text>
            <Button label={words.retry} variant="secondary" onPress={retry} testID="atlas-search-retry" />
          </View>
        ) : null}
        {status === 'none' ? (
          <View>
            <Text style={styles.line} testID="atlas-search-none">{words.none}</Text>
            <Text style={styles.line}>{words.wayOn}</Text>
          </View>
        ) : null}
        {places.map((p, i) => (
          <Pressable
            key={p.index}
            testID="atlas-search-result"
            accessibilityRole="button"
            accessibilityLabel={`${p.name}, ${placeLine(p)}. Shows areas there`}
            accessibilityState={{ selected: i === active }}
            onPress={() => pick(i)}
            style={({ pressed }) => [styles.row, i === active && styles.rowActive, pressed && styles.pressed]}
          >
            <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
            <Text style={styles.where} numberOfLines={1}>{placeLine(p)}</Text>
          </Pressable>
        ))}
        {found?.more ? <Text style={styles.line}>{words.more}</Text> : null}
      </ScrollView>
      {Platform.OS === 'web' ? <Text accessibilityLiveRegion="polite" style={styles.said}>{said}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  magnifier: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  pressed: { opacity: 0.8 },
  sheet: {
    position: 'absolute', left: 12, right: 12, maxWidth: 616, alignSelf: 'center', zIndex: 20, backgroundColor: theme.surface, borderRadius: theme.radius,
    paddingTop: 10, paddingHorizontal: 12, paddingBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 8,
  },
  label: { fontSize: 13, color: theme.muted, marginBottom: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 2, borderColor: theme.line },
  // The field's own outline is off (a box round half the row); the focused row's ink underline is the visible focus (WCAG 2.4.7).
  fieldRowFocus: { borderColor: theme.ink },
  // 16 px at least on web, or a phone browser zooms the page on focus.
  field: { flex: 1, minWidth: 0, minHeight: 44, fontSize: 16, color: theme.ink, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  line: { fontSize: 15, color: theme.muted, paddingVertical: 10 },
  fail: { gap: 8, paddingVertical: 6, alignItems: 'flex-start' },
  row: { minHeight: 52, justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8 },
  rowActive: { backgroundColor: theme.bg },
  name: { fontSize: 17, fontWeight: '700', color: theme.ink, minWidth: 0 },
  where: { fontSize: 14, color: theme.muted, minWidth: 0 },
  said: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
