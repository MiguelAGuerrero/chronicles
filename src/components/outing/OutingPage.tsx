import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { matches } from '../../lib/outing/candidates';
import { boundsOf, distanceM } from '../../lib/geo';
import type { Waypoint } from '../../lib/nav/types';
import { BACK_LABEL, CHANGE_LABEL, CHIPS_LINE, HERE_LABEL, INTRO_LINE, LATER_LABEL, LOOP_LINE, NOWHERE_LABEL, ONEWAY_LINE, READ_FAILED_LINE, READS_LINE, SEE_LABEL, TOO_FAR_LINE, UNFOUND_LINE, WHERE_LABEL, awayLine, cardSummary, nothingLine } from '../../lib/outing/journeyWords';
import { useJourney } from '../../lib/outing/useJourney';
import { CHAINS_LABEL, CLOSE_LABEL, HOURS_LINE, NO_PICK_LINE, READING_LINE, SLOT_HINT, START_LABEL, SWAP_LABEL, TITLE, cardLine, reasonLine, slotLine } from '../../lib/outing/words';
import { hideTabs } from '../../lib/tabsHidden';
import type { LngLat } from '../../lib/types';
import { SearchSheet } from '../atlas/PlaceSearch';
import { Icon } from '../icons';
import { WalkMap } from '../map/WalkMap';
import { PlannerCapture } from '../planner/PlannerCapture';
import { Button, theme } from '../ui';

const NONE: never[] = [];
const GAP = 10;

/**
 * Plan an outing, destination first (OJ1-OJ4, OJ7, OJ9, OJ11-OJ18, OJ21, OJ22, OJ25, OJ27, OJ39): the map is the page. A field over it
 * says where to (Explore's own search, towns and cities), or the sheet's "Nowhere in particular" stays around here. With a place, the
 * sheet holds the chips and up to three journeys in a row that scrolls sideways, the one in view drawn on the map; opening one shows its
 * stops by kind, never named until a tap, Swap on each, and Start. While a session records, the capture stack is on it.
 */
export function OutingPage(props: {
  you: LngLat | null;
  lastFixAt: number | null;
  /** The person's latest position, read when Start is pressed. */
  fixNow: () => LngLat | null;
  starting: boolean;
  onClose: () => void;
  onStart: (dest: Waypoint) => void;
  /** "When I get there" (0121): the journey kept as Navigate's destination, nothing started. */
  onLater: (dest: Waypoint) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const j = useJourney(props.you);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  const row = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => hideTabs(), []);
  const onBack = useRef<() => boolean>(() => false);
  useEffect(() => {
    onBack.current = () => {
      if (searching) setSearching(false);
      else if (j.opened) j.setOpened(false);
      else props.onClose();
      return true;
    };
  });
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => onBack.current());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onBack.current();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, []);
  const fit = useMemo(() => j.map.fit ?? (j.dest ? boundsOf([j.dest.at], 1200) : null), [j.map.fit, j.dest]);
  const fitN = useMemo(() => {
    let h = 7;
    for (const ch of `${j.map.route?.length ?? 0}|${(j.journey?.outing.lengthM ?? 0) | 0}|${j.dest?.at.join(',') ?? ''}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
  }, [j.map.route, j.journey, j.dest]);
  // What each stop is called before it is named: its chip's word, and how far it is from the point before it (QC17, OJ25).
  const slots = useMemo(() => {
    const o = j.journey?.outing;
    if (!o || !j.journey) return [];
    const wants = j.journey.wants;
    return o.stops.map((s, i) => {
      const want = wants.find((w) => matches(w.match, s)) ?? wants[0];
      const m = distanceM(i === 0 ? o.path[0] : o.stops[i - 1].at, s.at);
      return { id: s.id, name: s.unfound ? null : s.name, word: want?.slotWord ?? 'a place', m };
    });
  }, [j.journey]);
  const cardW = Math.min(width - 56, 340);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(j.journeys.length - 1, Math.round(e.nativeEvent.contentOffset.x / (cardW + GAP))));
    if (i !== j.cur) j.setCur(i);
  };
  const show = (i: number) => {
    j.setCur(i);
    row.current?.scrollTo({ x: i * (cardW + GAP), animated: true });
  };
  function go(later: boolean) {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    try {
      const dest = j.start(props.fixNow());
      if (dest) (later ? props.onLater : props.onStart)(dest);
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }
  const place = j.dest?.name ?? null;
  const reasons = [...new Set(j.reasons)];
  const where = j.dest ? j.dest.name ?? HERE_LABEL : WHERE_LABEL;
  const away = j.awayM != null ? awayLine(j.awayM, j.units) : null;
  const capturing = !!j.walkId;
  return (
    <View style={[StyleSheet.absoluteFill, styles.over]} testID="outing" accessibilityViewIsModal>
      <View style={StyleSheet.absoluteFill} testID="outing-map">
        <WalkMap trace={NONE} walked={NONE} fog={NONE} captures={NONE} walker={props.you} route={j.map.route} alternates={NONE} routeGrades={NONE} foundPins={j.map.pins} fitBounds={fit} fitKey={fitN} hideLabels />
      </View>
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Pressable testID="outing-where" accessibilityRole="button" accessibilityLabel={j.dest ? `${where}. ${CHANGE_LABEL}` : WHERE_LABEL} onPress={() => setSearching(true)} style={styles.field}>
          <Icon name="search" size={18} color={theme.ink} />
          <Text style={[styles.fieldText, !j.dest && styles.fieldHint]} numberOfLines={1} testID="outing-where-text">{where}</Text>
          {away ? <Text style={styles.away} testID="outing-away">{away}</Text> : null}
        </Pressable>
        <Pressable testID="outing-close" accessibilityRole="button" accessibilityLabel={CLOSE_LABEL} onPress={props.onClose} style={styles.close}>
          <Icon name="close" size={22} color={theme.ink} />
        </Pressable>
      </View>
      <View style={[styles.sheet, { maxHeight: Math.round(height * 0.62), paddingBottom: capturing ? 120 : insets.bottom + 12 }]} testID="outing-sheet">
        {!j.dest ? (
          <View style={styles.pad}>
            <Text style={styles.title} accessibilityRole="header" testID="outing-title">{TITLE}</Text>
            <Text style={styles.line}>{INTRO_LINE}</Text>
            <Button testID="outing-search" label={WHERE_LABEL} onPress={() => setSearching(true)} />
            <Button testID="outing-nowhere" label={NOWHERE_LABEL} variant="secondary" disabled={!props.you} onPress={() => props.you && j.setDest({ name: null, at: props.you })} />
            {!props.you ? <Text style={styles.line} testID="outing-reason-noPosition">{reasonLine('noPosition')}</Text> : null}
          </View>
        ) : !j.opened ? (
          <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            <Text style={styles.label} accessibilityRole="header" testID="outing-title">{CHIPS_LINE}</Text>
            <View style={styles.chips} accessibilityRole="toolbar">
              {j.chips.map((w) => {
                const on = j.pickedIds.includes(w.id);
                return (
                  <Pressable key={w.id} testID={`outing-want-${w.id}`} accessibilityRole="button" accessibilityLabel={w.label} accessibilityState={{ selected: on }} {...({ 'aria-pressed': on } as object)} onPress={() => j.toggle(w.id)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{w.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable testID="outing-chains" accessibilityRole="switch" accessibilityLabel={CHAINS_LABEL} accessibilityState={{ checked: j.chains }} {...({ 'aria-checked': j.chains } as object)} onPress={() => j.setChains(!j.chains)} style={styles.switchRow}>
              <Icon name={j.chains ? 'checkbox' : 'square-outline'} size={22} color={theme.ink} />
              <Text style={styles.line}>{CHAINS_LABEL}</Text>
            </Pressable>
            {!j.pickedIds.length ? <Text style={styles.line} testID="outing-pick">{NO_PICK_LINE}</Text> : null}
            {j.reading ? <Text style={styles.line} testID="outing-reading">{READING_LINE} {READS_LINE}</Text> : null}
            {j.failed ? <Text style={styles.line} testID="outing-failed">{READ_FAILED_LINE}</Text> : null}
            {reasons.map((r) => <Text key={r} style={styles.line} testID={`outing-reason-${r}`}>{r === 'few' ? nothingLine(place) : reasonLine(r)}</Text>)}
            {j.journeys.length ? (
              <ScrollView ref={row} horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardW + GAP} decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={64} contentContainerStyle={styles.cards} style={styles.cardsRow} testID="outing-journeys">
                {j.journeys.map((x, i) => (
                  <Pressable key={x.leaning} testID={`outing-journey-${i}`} accessibilityRole="button" accessibilityState={{ selected: i === j.cur }} onPress={() => show(i)} style={[styles.jcard, { width: cardW }, i === j.cur && styles.jcardOn]}>
                    <Text style={styles.jname}>{x.name}</Text>
                    <Text style={styles.line}>{cardSummary({ place, labels: x.wants.map((w) => w.label), footM: x.outing.lengthM, loop: x.outing.loop }, j.units)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {j.journey ? <Button testID="outing-see" label={SEE_LABEL} onPress={() => j.setOpened(true)} /> : null}
          </ScrollView>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
              <View style={styles.head}>
                <Text style={styles.title} accessibilityRole="header" testID="outing-journey-name">{j.journey!.name}</Text>
                <Pressable testID="outing-back" accessibilityRole="button" accessibilityLabel={BACK_LABEL} onPress={() => j.setOpened(false)} style={styles.back}>
                  <Icon name="chevron-back" size={18} color={theme.ink} />
                  <Text style={styles.swapText}>{BACK_LABEL}</Text>
                </Pressable>
              </View>
              <Text style={styles.line} testID="outing-summary">{cardSummary({ place, labels: j.journey!.wants.map((w) => w.label), footM: j.journey!.outing.lengthM, loop: j.journey!.outing.loop }, j.units)} {j.journey!.outing.loop ? LOOP_LINE : ONEWAY_LINE}</Text>
              {slots.map((s, i) => (
                <View key={s.id} style={styles.slot} testID={`outing-slot-${i}`}>
                  <Pressable testID={`outing-slot-open-${i}`} accessibilityRole="button" accessibilityLabel={slotLine(s.word, s.m)} accessibilityHint={SLOT_HINT} accessibilityState={{ expanded: j.open === i }} onPress={() => j.toggleOpen(i)} style={styles.slotMain}>
                    <Text style={styles.slotText}>{slotLine(s.word, s.m)}</Text>
                    <View testID={`outing-slot-chevron-${i}`}>
                      <Icon name={j.open === i ? 'chevron-up' : 'chevron-down'} size={20} color={theme.muted} />
                    </View>
                  </Pressable>
                  <Pressable testID={`outing-swap-${i}`} accessibilityRole="button" accessibilityLabel={`${SWAP_LABEL}. ${slotLine(s.word, s.m)}`} onPress={() => j.swap(i)} style={styles.swap}>
                    <Icon name="swap-horizontal" size={18} color={theme.ink} />
                    <Text style={styles.swapText}>{SWAP_LABEL}</Text>
                  </Pressable>
                  {j.open === i ? (
                    <View style={styles.card} testID="outing-card" accessibilityLiveRegion="polite">
                      {s.name ? <Text style={styles.cardName}>{s.name}</Text> : <Text style={styles.line} testID="outing-card-unfound">{UNFOUND_LINE}</Text>}
                      <Text style={styles.line}>{cardLine(s.word, s.m)}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
              {j.said ? <Text style={styles.line} testID="outing-said">{j.said}</Text> : null}
              <Text style={styles.line} testID="outing-hours">{HOURS_LINE}</Text>
              {j.startChoice === 'later' ? <Text style={styles.line} testID="outing-too-far">{TOO_FAR_LINE}</Text> : null}
            </ScrollView>
            <View style={styles.footer}>
              {j.startChoice !== 'later' ? <Button testID="outing-start" label={START_LABEL} disabled={busy || props.starting} onPress={() => go(false)} /> : null}
              {j.startChoice !== 'start' ? <Button testID="outing-later" label={LATER_LABEL} variant={j.startChoice === 'later' ? 'primary' : 'secondary'} disabled={busy || props.starting} onPress={() => go(true)} /> : null}
            </View>
          </>
        )}
      </View>
      {searching ? (
        <SearchSheet
          top={insets.top + 8}
          origin={props.you}
          onPick={(p) => {
            setSearching(false);
            j.setDest({ name: p.name, at: p.at });
          }}
          onClose={() => setSearching(false)}
        />
      ) : null}
      {j.walkId ? <PlannerCapture walkId={j.walkId} here={props.you} lastFixAt={props.lastFixAt} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  over: { backgroundColor: theme.bg, zIndex: 50 },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.edge, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  fieldText: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.ink },
  fieldHint: { fontWeight: '400', color: theme.muted },
  away: { fontSize: 13, color: theme.muted },
  close: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTopWidth: 1, borderColor: theme.line },
  pad: { padding: 16, gap: 12 },
  head: { gap: 6 },
  title: { fontSize: 20, fontWeight: '800', color: theme.ink },
  label: { fontSize: 14, fontWeight: '600', color: theme.muted },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  footer: { paddingHorizontal: 16, paddingTop: 10, gap: 8, borderTopWidth: 1, borderColor: theme.line },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: theme.edge, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  chipText: { fontSize: 15, fontWeight: '600', color: theme.ink },
  chipTextOn: { color: theme.surface },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  line: { fontSize: 14, color: theme.ink, lineHeight: 19 },
  cardsRow: { marginHorizontal: -16 },
  cards: { paddingHorizontal: 16, gap: GAP },
  jcard: { borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, padding: 12, gap: 6 },
  jcardOn: { borderColor: theme.ink, borderWidth: 2, padding: 11 },
  jname: { fontSize: 16, fontWeight: '800', color: theme.ink },
  slot: { borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, overflow: 'hidden' },
  slotMain: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  slotText: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.ink },
  swap: { minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: theme.line },
  swapText: { fontSize: 14, fontWeight: '600', color: theme.ink },
  card: { padding: 14, gap: 4, borderTopWidth: 1, borderColor: theme.line },
  cardName: { fontSize: 18, fontWeight: '800', color: theme.ink },
});
