import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import type { Listed } from '../../lib/atlas/atlas';
import { liveReport, offsetOf, settledIndex, settleStep } from '../../lib/atlas/carousel';

/** A card's width: most of a phone's width so the next one peeks, never wider than this. */
const CARD_MAX = 320;
const CARD_SHARE = 0.78;
const GAP = 12;
/** The scroll is "settled" once it has been still this long. */
const SETTLE_MS = 120;

/**
 * The row of area cards (EC2-EC4, EC13; decision 0124): one horizontal row, one card centred at a time. A scroll that settles
 * selects the card it stopped on (`onSettle`); a selection made elsewhere (a swipe on the map, a tap on another card) scrolls
 * the row to its card. The two never fight: a scroll the row made itself is not reported back. Snapping is the platform's on a
 * phone (`snapToInterval`); on web, which has no such prop, a settled scroll that stopped between cards is eased onto one.
 */
export function AtlasCarousel(props: {
  items: Listed[];
  selected: string | null;
  width: number;
  reduced: boolean;
  renderCard: (l: Listed, selected: boolean) => ReactNode;
  onSettle: (key: string) => void;
  /** The row's name for a screen reader, holding no count (explore-carousel audit 15). */
  label: string;
}) {
  const { items, selected, width, reduced } = props;
  const cardW = Math.min(Math.round(width * CARD_SHARE), CARD_MAX);
  const step = cardW + GAP;
  const sidePad = Math.max(0, (width - cardW) / 2);
  const scroller = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The card the row scrolled to by itself; the settle that ends that scroll is not the reader's.
  const intended = useRef<number | null>(null);
  // The card (by key, so a changed list never misleads it) the reader's own scroll is on: while it is set, the selection follows
  // the scroll and the effect never scrolls the row (fix carousel-live-select audits 1, 3). The settle clears it.
  const lastKey = useRef<string | null>(null);
  const index = useMemo(() => items.findIndex((l) => l.area.key === selected), [items, selected]);

  // What the settle needs, as the screen last drew it: a timer's callback must never read an older row.
  const latest = useRef({ items, selected, step, reduced, onSettle: props.onSettle });
  useEffect(() => {
    latest.current = { items, selected, step, reduced, onSettle: props.onSettle };
  }, [items, selected, step, reduced, props.onSettle]);

  const scrollTo = useCallback((i: number) => {
    const { step: s, reduced: r } = latest.current;
    intended.current = i;
    scroller.current?.scrollTo({ x: offsetOf(i, s), animated: !r });
  }, []);

  // A selection made elsewhere brings its card to the middle; one the reader just scrolled to is already there.
  useEffect(() => {
    if (index < 0 || step <= 0) return;
    // The reader's scroll is selecting as it passes cards: leave the scroll alone (fix carousel-live-select audit 1).
    if (lastKey.current != null) return;
    if (Math.abs(offset.current - offsetOf(index, step)) < 2) return;
    scrollTo(index);
  }, [index, step, scrollTo]);

  const settle = useCallback(() => {
    lastKey.current = null;
    const { items: list, selected: now, step: s, onSettle } = latest.current;
    const i = settledIndex(offset.current, s, list.length);
    const at = list.findIndex((l) => l.area.key === now);
    const step = settleStep({ index: i, intended: intended.current, selected: at });
    // The row's own scroll ended where it was sent: nothing to report; one that stalled short of it aims on (audit 2).
    if (intended.current != null) {
      if (step.scrollTo != null) scrollTo(step.scrollTo);
      else intended.current = null;
      return;
    }
    // Stopped between two cards (web has no snap): ease onto the nearest, then report it.
    if (Math.abs(offset.current - offsetOf(i, s)) > 2) scrollTo(i);
    const key = step.report != null ? list[step.report]?.area.key : null;
    if (key) onSettle(key);
  }, [scrollTo]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.x;
    // The card nearest the middle is selected as it passes, so the map previews it while the reader is still scrolling.
    const { items: list, selected: now, step: s, onSettle } = latest.current;
    const i = settledIndex(offset.current, s, list.length);
    const at = list.findIndex((l) => l.area.key === now);
    const last = lastKey.current == null ? -1 : list.findIndex((l) => l.area.key === lastKey.current);
    const report = liveReport({ index: i, intended: intended.current, selected: at, last: last < 0 ? null : last });
    if (intended.current == null) lastKey.current = list[i]?.area.key ?? null;
    const key = report != null ? list[report]?.area.key : null;
    if (key) onSettle(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(settle, SETTLE_MS);
  }, [settle]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // smooth-switches SS9: the row keeps the tallest it has been for these cards. Only the selected card has a footer and
  // names wrap, so the row's height followed the selection, and each switch resized the map mid-move.
  const rowKey = items.map((l) => l.area.key).join('|');
  const [tallest, setTallest] = useState<{ key: string; h: number }>({ key: '', h: 0 });
  const minH = tallest.key === rowKey ? tallest.h : 0;
  const onContentSize = useCallback(
    (_w: number, h: number) => setTallest((t) => (t.key === rowKey && t.h >= h ? t : { key: rowKey, h: Math.max(h, t.key === rowKey ? t.h : 0) })),
    [rowKey],
  );

  return (
    <ScrollView
      ref={scroller}
      onContentSizeChange={onContentSize}
      horizontal
      testID="atlas-carousel"
      accessibilityLabel={props.label}
      // A reader's own drag takes the scroll back from the row's (explore-carousel audit 2).
      onScrollBeginDrag={() => {
        intended.current = null;
      }}
      showsHorizontalScrollIndicator={false}
      snapToInterval={step}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
      // Size to the cards, never `flex: 1` (react-native-web would stretch it down the screen).
      style={styles.row}
      contentContainerStyle={[styles.content, { paddingHorizontal: sidePad }, minH ? { minHeight: minH } : null]}
    >
      {items.map((l) => (
        <View key={l.area.key} style={{ width: cardW }}>
          {props.renderCard(l, l.area.key === selected)}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexGrow: 0, flexShrink: 0 },
  // Every card as tall as the tallest (fix card-heights): the row stretches them, each card fills its slot.
  content: { gap: GAP, alignItems: 'stretch', paddingVertical: 6 },
});
