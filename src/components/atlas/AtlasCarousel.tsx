import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import type { Listed } from '../../lib/atlas/atlas';
import { offsetOf, settledIndex, settleStep } from '../../lib/atlas/carousel';

/** A card's width: most of a phone's width so the next one peeks, never wider than this. */
const CARD_MAX = 320;
const CARD_SHARE = 0.78;
const GAP = 12;
/** The scroll is "settled" once it has been still this long. */
const SETTLE_MS = 120;

/**
 * The row of area cards (EC2-EC4, EC13; decision 0123): one horizontal row, one card centred at a time. A scroll that settles
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
    if (Math.abs(offset.current - offsetOf(index, step)) < 2) return;
    scrollTo(index);
  }, [index, step, scrollTo]);

  const settle = useCallback(() => {
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
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(settle, SETTLE_MS);
  }, [settle]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ScrollView
      ref={scroller}
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
      contentContainerStyle={[styles.content, { paddingHorizontal: sidePad }]}
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
  content: { gap: GAP, alignItems: 'flex-start', paddingVertical: 6 },
});
