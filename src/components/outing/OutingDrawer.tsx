import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { matches, mergeFacets } from '../../lib/outing/candidates';
import { distanceM } from '../../lib/geo';
import type { Waypoint } from '../../lib/nav/types';
import { useOuting } from '../../lib/outing/useOuting';
import { SEARCH_LABEL, CHAINS_LABEL, CLOSE_LABEL, HOURS_LINE, MODE_LABEL, SLOT_HINT, NO_PICK_LINE, READING_LINE, START_LABEL, SWAP_LABEL, TITLE, cardLine, reasonLine, slotLine } from '../../lib/outing/words';
import { hideTabs } from '../../lib/tabsHidden';
import type { LngLat } from '../../lib/types';
import { Icon } from '../icons';
import { WalkMap } from '../map/WalkMap';
import { PlannerCapture } from '../planner/PlannerCapture';
import { Button, theme } from '../ui';

const NONE: never[] = [];

/**
 * Plan an outing (QC1-QC3, QC6-QC8, QC17, QC18, QC20-QC22, QC24, QC25, QC41): a full-screen drawer over Explore. A search box over the
 * vocabulary's chips, Loop or One way, "Include chains", one proposal as slots said by kind and never named until a tap, Swap on each,
 * and Start. While a walk records, the capture stack is on it (QC30), as the planner's.
 */
export function OutingDrawer(props: {
  you: LngLat | null;
  lastFixAt: number | null;
  /** The walker's latest position, read when Start is pressed. */
  fixNow: () => LngLat | null;
  starting: boolean;
  onClose: () => void;
  onStart: (dest: Waypoint) => void;
}) {
  const insets = useSafeAreaInsets();
  const o = useOuting(props.you);
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  useEffect(() => hideTabs(), []);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      props.onClose();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
    // The close handler is read when pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fitN = useMemo(() => {
    let h = 7;
    for (const ch of `${o.map.route?.length ?? 0}|${(o.outing?.lengthM ?? 0) | 0}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
  }, [o.map.route, o.outing]);
  // What each stop is called before it is named: its entry's word, and how far it is from the point before it (QC17).
  const slots = useMemo(() => {
    if (!o.outing) return [];
    return o.outing.stops.map((s, i) => {
      const want = o.picked.find((w) => matches(mergeFacets([w]), s)) ?? o.picked[0];
      const prev = i === 0 ? props.you ?? o.outing!.path[0] : o.outing!.stops[i - 1].at;
      const m = distanceM(prev, s.at);
      return { id: s.id, name: s.name, word: want?.slotWord ?? 'a place', m };
    });
  }, [o.outing, o.picked, props.you]);
  async function start() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    try {
      const dest = o.start(props.fixNow());
      if (dest) props.onStart(dest);
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }
  const reasons = [...new Set(o.reasons)];
  return (
    <View style={[StyleSheet.absoluteFill, styles.over, { paddingTop: insets.top }]} testID="outing" accessibilityViewIsModal>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header" testID="outing-title">{TITLE}</Text>
        <Pressable testID="outing-close" accessibilityRole="button" accessibilityLabel={CLOSE_LABEL} onPress={props.onClose} style={styles.close}>
          <Icon name="close" size={22} color={theme.ink} />
        </Pressable>
      </View>
      <View style={styles.map} testID="outing-map">
        <WalkMap
          trace={NONE}
          walked={NONE}
          fog={NONE}
          captures={NONE}
          walker={props.you}
          route={o.map.route}
          alternates={NONE}
          routeGrades={NONE}
          foundPins={o.map.pins}
          fitBounds={o.map.fit}
          fitKey={fitN}
          hideLabels
        />
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          testID="outing-search"
          style={styles.search}
          value={o.query}
          onChangeText={o.setQuery}
          placeholder={SEARCH_LABEL}
          placeholderTextColor={theme.muted}
          accessibilityLabel={SEARCH_LABEL}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <View style={styles.chips} accessibilityRole="toolbar">
          {o.entries.map((w) => {
            const on = o.pickedIds.includes(w.id);
            return (
              <Pressable
                key={w.id}
                testID={`outing-want-${w.id}`}
                accessibilityRole="button"
                accessibilityLabel={w.label}
                accessibilityState={{ selected: on }}
                {...({ 'aria-pressed': on } as object)}
                onPress={() => o.toggle(w.id)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{w.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.segment} accessibilityRole="radiogroup" testID="outing-mode">
          {(['loop', 'oneway'] as const).map((m) => (
            <Pressable
              key={m}
              testID={`outing-mode-${m}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: o.mode === m }}
              {...({ 'aria-checked': o.mode === m } as object)}
              onPress={() => o.setMode(m)}
              style={[styles.segBtn, o.mode === m && styles.segOn]}
            >
              <Text style={[styles.segText, o.mode === m && styles.segTextOn]}>{MODE_LABEL[m]}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          testID="outing-chains"
          accessibilityRole="switch"
          accessibilityLabel={CHAINS_LABEL}
          accessibilityState={{ checked: o.chains }}
          {...({ 'aria-checked': o.chains } as object)}
          onPress={() => o.setChains(!o.chains)}
          style={styles.switchRow}
        >
          <Icon name={o.chains ? 'checkbox' : 'square-outline'} size={22} color={theme.ink} />
          <Text style={styles.line}>{CHAINS_LABEL}</Text>
        </Pressable>
        {!o.pickedIds.length ? <Text style={styles.line} testID="outing-pick">{NO_PICK_LINE}</Text> : null}
        {o.reading ? <Text style={styles.line} testID="outing-reading">{READING_LINE}</Text> : null}
        {slots.map((s, i) => (
          <View key={s.id} style={styles.slot} testID={`outing-slot-${i}`}>
            <Pressable
              testID={`outing-slot-open-${i}`}
              accessibilityRole="button"
              accessibilityLabel={slotLine(s.word, s.m)}
              accessibilityHint={SLOT_HINT}
              accessibilityState={{ expanded: o.open === i }}
              onPress={() => o.toggleOpen(i)}
              style={styles.slotMain}
            >
              <Text style={styles.slotText}>{slotLine(s.word, s.m)}</Text>
              <View testID={`outing-slot-chevron-${i}`}>
                <Icon name={o.open === i ? 'chevron-up' : 'chevron-down'} size={20} color={theme.muted} />
              </View>
            </Pressable>
            <Pressable
              testID={`outing-swap-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${SWAP_LABEL}. ${slotLine(s.word, s.m)}`}
              onPress={() => o.swap(i)}
              style={styles.swap}
            >
              <Icon name="swap-horizontal" size={18} color={theme.ink} />
              <Text style={styles.swapText}>{SWAP_LABEL}</Text>
            </Pressable>
            {o.open === i ? (
              <View style={styles.card} testID="outing-card" accessibilityLiveRegion="polite">
                <Text style={styles.cardName}>{s.name}</Text>
                <Text style={styles.line}>{cardLine(s.word, s.m)}</Text>
              </View>
            ) : null}
          </View>
        ))}
        {o.said ? <Text style={styles.line} testID="outing-said">{o.said}</Text> : null}
        {reasons.map((r) => <Text key={r} style={styles.line} testID={`outing-reason-${r}`}>{reasonLine(r)}</Text>)}
        {o.outing ? <Text style={styles.line} testID="outing-hours">{HOURS_LINE}</Text> : null}
      </ScrollView>
      {/* Start stays on screen under the list (quick-circuit ui 1); with a walk recording it clears the capture stack. */}
      <View style={[styles.footer, { paddingBottom: o.walkId ? 120 : insets.bottom + 12 }]}>
        <Button testID="outing-start" label={START_LABEL} disabled={!o.canStart || busy || props.starting} onPress={() => void start()} />
      </View>
      {o.walkId ? <PlannerCapture walkId={o.walkId} here={props.you} lastFixAt={props.lastFixAt} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  over: { backgroundColor: theme.bg, zIndex: 50 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: theme.ink },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  map: { height: 240, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  body: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderColor: theme.line, backgroundColor: theme.bg },
  search: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: 12, fontSize: 16, color: theme.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  chipText: { fontSize: 15, fontWeight: '600', color: theme.ink },
  chipTextOn: { color: theme.surface },
  segment: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  segBtn: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: theme.surface },
  segOn: { backgroundColor: theme.ink },
  segText: { fontSize: 14, fontWeight: '600', color: theme.ink, textAlign: 'center' },
  segTextOn: { color: theme.surface },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  line: { fontSize: 14, color: theme.ink, lineHeight: 19 },
  slot: { borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, overflow: 'hidden' },
  slotMain: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  slotText: { fontSize: 16, fontWeight: '600', color: theme.ink },
  swap: { minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: theme.line },
  swapText: { fontSize: 14, fontWeight: '600', color: theme.ink },
  card: { padding: 14, gap: 4, borderTopWidth: 1, borderColor: theme.line },
  cardName: { fontSize: 18, fontWeight: '800', color: theme.ink },
});
