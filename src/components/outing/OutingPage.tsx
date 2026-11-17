import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { matches } from '../../lib/outing/candidates';
import { distanceM } from '../../lib/geo';
import type { Waypoint } from '../../lib/nav/types';
import { ANOTHER_LABEL, BACK_LABEL, CHANGE_LABEL, CHIPS_LINE, FIRST_LINE, FURTHER_LABEL, HERE_LABEL, LATER_LABEL, NEXT_MOVE_LINE, NOWHERE_LABEL, PEEK_LABEL, READ_FAILED_LINE, REACH_LINE, SEE_LABEL, TOO_FAR_LINE, TOWNS_LINE, UNFOUND_LINE, UNPEEK_LABEL, WHERE_LABEL, awayLine, cardSummary, chapterLine, nothingLine, reachLabel, townLine } from '../../lib/outing/journeyWords';
import { useJourney } from '../../lib/outing/useJourney';
import { CHAINS_LABEL, CLOSE_LABEL, HOURS_LINE, NO_PICK_LINE, READING_LINE, SLOT_HINT, START_LABEL, SWAP_LABEL, TITLE, cardLine, reasonLine, slotLine } from '../../lib/outing/words';
import { hideTabs } from '../../lib/tabsHidden';
import type { LngLat } from '../../lib/types';
import { SearchSheet } from '../atlas/PlaceSearch';
import { Icon } from '../icons';
import { OpenInMapsButton, useOpenInMaps } from '../OpenInMapsButton';
import { WalkMap } from '../map/WalkMap';
import { PlannerCapture } from '../planner/PlannerCapture';
import { Button, theme } from '../ui';

const NONE: never[] = [];
const GAP = 10;

/**
 * Plan an outing (OJ1-OJ46, decisions 0197-0199): the map is the page, and one machine plans every outing. It opens proposing around
 * where you stand, within a reach you can widen to the towns about; a field over the map says where to instead (Explore's own search),
 * and the towns toward it are looked at. The sheet holds the chips and the journeys in a row that scrolls sideways, a mixed one ahead
 * when the chips span leanings; opening one shows it town by town, its stops by kind and never named until a tap, Swap on each,
 * "Another like this", Open in Maps for a town, and Start for the first. The sheet folds away to show the map. While a session
 * records, the capture stack is on it.
 */
export function OutingPage(props: {
  you: LngLat | null;
  lastFixAt: number | null;
  /** The person's latest position, read when Start is pressed. */
  fixNow: () => LngLat | null;
  starting: boolean;
  onClose: () => void;
  onStart: (dest: Waypoint) => void;
  /** "When I get there" (0121): the chapter kept as Navigate's destination, nothing started. */
  onLater: (dest: Waypoint) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const j = useJourney(props.you);
  const [searching, setSearching] = useState(false);
  const [peek, setPeek] = useState(false);
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);
  const row = useRef<ComponentRef<typeof ScrollView>>(null);
  const openMaps = useOpenInMaps(() => {});
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
  const fitN = useMemo(() => {
    let h = 7;
    for (const ch of `${j.map.pins.length}|${(j.journey?.footM ?? 0) | 0}|${j.map.pins[0]?.join(',') ?? ''}|${j.dest?.at.join(',') ?? ''}|${j.journey?.leaning ?? ''}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
  }, [j.map.pins, j.journey, j.dest]);
  // What each stop is called before it is named: its chip's word, and how far it is from the point before it (QC17, OJ25); the stops
  // run on through the chapters, so a slot has one place in the whole journey.
  const chapters = useMemo(() => {
    if (!j.journey) return [];
    const wants = j.journey.wants;
    let n = 0;
    return j.journey.chapters.map((c, ci) => {
      const o = c.outing;
      const labels: string[] = [];
      const slots = o.stops.map((s, i) => {
        const want = wants.find((w) => matches(w.match, s)) ?? wants[0];
        if (want && !labels.includes(want.label)) labels.push(want.label);
        const m = o.stops.length < 2 ? 0 : distanceM(i === 0 ? o.path[0] : o.stops[i - 1].at, s.at);
        return { n: n++, i, id: s.id, name: s.unfound ? null : s.name, word: want?.slotWord ?? 'a place', line: o.stops.length < 2 ? cap(want?.slotWord ?? 'a place') : slotLine(want?.slotWord ?? 'a place', m), m };
      });
      return { ci, area: c.area, labels, slots, stops: o.stops.length, lengthM: o.lengthM, loop: o.loop };
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
  const away = j.awayM != null ? awayLine(j.awayM, j.units) : null;
  const capturing = !!j.walkId;
  // OJ21: a summary names only the chips its stops came from, never one that found nothing.
  const summary = (x: NonNullable<typeof j.journey>) => {
    const labels = x.wants.filter((w) => x.chapters.some((c) => c.outing.stops.some((s) => matches(w.match, s)))).map((w) => w.label);
    return cardSummary({ places: x.chapters.map((c) => c.area.name), labels, footM: x.footM }, j.units);
  };
  return (
    <View style={[StyleSheet.absoluteFill, styles.over]} testID="outing" accessibilityViewIsModal>
      <View style={StyleSheet.absoluteFill} testID="outing-map">
        <WalkMap trace={NONE} walked={NONE} fog={NONE} captures={NONE} walker={props.you} route={j.map.route} alternates={NONE} routeGrades={NONE} foundPins={j.map.pins} fitBounds={j.map.fit} fitKey={fitN} hideLabels />
      </View>
      <View style={[styles.top, { top: insets.top + 8 }]}>
        <Pressable testID="outing-where" accessibilityRole="button" accessibilityLabel={j.dest ? `${j.dest.name}. ${CHANGE_LABEL}` : WHERE_LABEL} onPress={() => setSearching(true)} style={styles.field}>
          <Icon name="search" size={18} color={theme.ink} />
          <Text style={[styles.fieldText, !j.dest && styles.fieldHint]} numberOfLines={1} testID="outing-where-text">{j.dest ? j.dest.name : WHERE_LABEL}</Text>
          {away ? <Text style={styles.away} testID="outing-away">{away}</Text> : null}
        </Pressable>
        <Pressable testID="outing-close" accessibilityRole="button" accessibilityLabel={CLOSE_LABEL} onPress={props.onClose} style={styles.close}>
          <Icon name="close" size={22} color={theme.ink} />
        </Pressable>
      </View>
      <View style={[styles.sheet, { maxHeight: Math.round(height * 0.62), paddingBottom: capturing ? 120 : insets.bottom + 12 }]} testID="outing-sheet">
        <Pressable testID="outing-peek" accessibilityRole="button" accessibilityLabel={peek ? UNPEEK_LABEL : PEEK_LABEL} accessibilityState={{ expanded: !peek }} onPress={() => setPeek(!peek)} style={styles.peek}>
          <Icon name={peek ? 'chevron-up' : 'chevron-down'} size={20} color={theme.ink} />
          <Text style={styles.swapText}>{peek ? UNPEEK_LABEL : PEEK_LABEL}</Text>
        </Pressable>
        {peek ? null : !j.hasOrigin && !j.dest ? (
          <View style={styles.pad}>
            <Text style={styles.title} accessibilityRole="header" testID="outing-title">{TITLE}</Text>
            <Text style={styles.line} testID="outing-reason-noPosition">{reasonLine('noPosition')}</Text>
            <Button testID="outing-search" label={WHERE_LABEL} onPress={() => setSearching(true)} />
          </View>
        ) : !j.opened ? (
          <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            <Text style={styles.title} accessibilityRole="header" testID="outing-title">{place ?? HERE_LABEL}</Text>
            <Text style={styles.label}>{CHIPS_LINE}</Text>
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
            {j.dest ? (
              j.hasOrigin ? <Button testID="outing-nowhere" label={NOWHERE_LABEL} variant="secondary" onPress={() => j.setDest(null)} /> : null
            ) : (
              <>
                <Text style={styles.label}>{REACH_LINE}</Text>
                <View style={styles.chips} accessibilityRole="radiogroup" testID="outing-reach">
                  {j.reachSteps.map((m, i) => {
                    const on = j.reachM === m;
                    return (
                      <Pressable key={m} testID={`outing-reach-${i}`} accessibilityRole="radio" accessibilityState={{ checked: on }} {...({ 'aria-checked': on } as object)} onPress={() => j.setReach(m)} style={[styles.chip, on && styles.chipOn]}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{reachLabel(m, j.units)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
            <Pressable testID="outing-chains" accessibilityRole="switch" accessibilityLabel={CHAINS_LABEL} accessibilityState={{ checked: j.chains }} {...({ 'aria-checked': j.chains } as object)} onPress={() => j.setChains(!j.chains)} style={styles.switchRow}>
              <Icon name={j.chains ? 'checkbox' : 'square-outline'} size={22} color={theme.ink} />
              <Text style={styles.line}>{CHAINS_LABEL}</Text>
            </Pressable>
            {!j.pickedIds.length ? <Text style={styles.line} testID="outing-pick">{NO_PICK_LINE}</Text> : null}
            {j.readingTowns ? <Text style={styles.line} testID="outing-reading-towns">{TOWNS_LINE}</Text> : j.reading ? <Text style={styles.line} testID="outing-reading">{READING_LINE}</Text> : null}
            {j.failed ? <Text style={styles.line} testID="outing-failed">{READ_FAILED_LINE}</Text> : null}
            {reasons.map((r) => (
              <View key={r} style={styles.head} testID={`outing-reason-${r}`}>
                <Text style={styles.line}>{r === 'few' ? `${nothingLine(place)} ${NEXT_MOVE_LINE}` : reasonLine(r)}</Text>
                {r === 'few' && !j.dest && j.further != null ? <Button testID="outing-further" label={FURTHER_LABEL} variant="secondary" onPress={() => j.setReach(j.further!)} /> : null}
              </View>
            ))}
            {j.journeys.length ? (
              <ScrollView ref={row} horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardW + GAP} decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={64} contentContainerStyle={styles.cards} style={styles.cardsRow} testID="outing-journeys">
                {j.journeys.map((x, i) => (
                  <Pressable key={x.leaning} testID={`outing-journey-${i}`} accessibilityRole="button" accessibilityState={{ selected: i === j.cur }} {...({ 'aria-pressed': i === j.cur } as object)} onPress={() => show(i)} style={[styles.jcard, { width: cardW }, i === j.cur && styles.jcardOn]}>
                    <Text style={styles.jname}>{x.name}</Text>
                    <Text style={styles.line}>{summary(x)}</Text>
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
                <Pressable testID="outing-back" accessibilityRole="button" accessibilityLabel={BACK_LABEL} onPress={() => j.setOpened(false)} style={styles.back}>
                  <Icon name="chevron-back" size={18} color={theme.ink} />
                  <Text style={styles.swapText}>{BACK_LABEL}</Text>
                </Pressable>
                <Text style={styles.title} accessibilityRole="header" testID="outing-journey-name">{j.journey!.name}</Text>
              </View>
              <Text style={styles.line} testID="outing-summary">{summary(j.journey!)}</Text>
              <Button testID="outing-another" label={ANOTHER_LABEL} variant="secondary" onPress={j.another} />
              {j.said ? <Text style={styles.line} testID="outing-said" accessibilityLiveRegion="polite">{j.said}</Text> : null}
              {chapters.map((c) => (
                <View key={c.ci} style={styles.chapter} testID={`outing-chapter-${c.ci}`}>
                  <Text style={styles.jname} accessibilityRole="header" testID={`outing-chapter-name-${c.ci}`}>{c.area.name ?? HERE_LABEL}</Text>
                  <Text style={styles.line} testID={`outing-chapter-line-${c.ci}`}>{townLine(c.labels)} {chapterLine(c, j.units)}</Text>
                  {c.area.name ? <OpenInMapsButton testID={`outing-maps-${c.ci}`} variant="link" target={{ at: c.area.at, label: c.area.name, kind: 'area' }} onOpen={openMaps} /> : null}
                  {c.slots.map((s) => {
                    const key = `${c.ci}:${s.i}`;
                    return (
                      <View key={s.id} style={styles.slot} testID={`outing-slot-${s.n}`}>
                        <Pressable testID={`outing-slot-open-${s.n}`} accessibilityRole="button" accessibilityLabel={s.line} accessibilityHint={SLOT_HINT} accessibilityState={{ expanded: j.open === key }} onPress={() => j.toggleOpen(key)} style={styles.slotMain}>
                          <Text style={styles.slotText}>{s.line}</Text>
                          <View testID={`outing-slot-chevron-${s.n}`}>
                            <Icon name={j.open === key ? 'chevron-up' : 'chevron-down'} size={20} color={theme.muted} />
                          </View>
                        </Pressable>
                        <Pressable testID={`outing-swap-${s.n}`} accessibilityRole="button" accessibilityLabel={`${SWAP_LABEL}. ${s.line}`} onPress={() => j.swap(c.ci, s.i)} style={styles.swap}>
                          <Icon name="swap-horizontal" size={18} color={theme.ink} />
                          <Text style={styles.swapText}>{SWAP_LABEL}</Text>
                        </Pressable>
                        {j.open === key ? (
                          <View style={styles.card} testID="outing-card" accessibilityLiveRegion="polite">
                            {s.name ? <Text style={styles.cardName}>{s.name}</Text> : <Text style={styles.line} testID="outing-card-unfound">{UNFOUND_LINE}</Text>}
                            <Text style={styles.line}>{cardLine(s.word, s.m)}</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
              <Text style={styles.line} testID="outing-hours">{HOURS_LINE}</Text>
              {chapters.length > 1 ? <Text style={styles.line} testID="outing-first">{FIRST_LINE}</Text> : null}
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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  over: { backgroundColor: theme.bg, zIndex: 50 },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.edge, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  fieldText: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.ink },
  fieldHint: { fontWeight: '400', color: theme.muted },
  away: { fontSize: 13, color: theme.muted },
  close: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTopWidth: 1, borderColor: theme.line },
  pad: { padding: 16, paddingTop: 4, gap: 12 },
  peek: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  chapter: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderColor: theme.line },
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
