import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { dayHeading } from '../../lib/journal/lines';
import type { JournalRow } from '../../lib/journal/page';
import { anchorOf, blankHeight, peekStart, stickyDay } from '../../lib/journal/rest';
import type { MomentView } from '../../lib/resurface/types';
import { useReducedMotion } from '../../lib/motion';
import { theme } from '../ui';

export type JournalPageHandle = { toFoot: (animated?: boolean) => void };

/** Older entries are asked for this near the top of what is drawn. */
const NEAR_TOP = 240;
/** How long the sheet's end is held while the empty page grows or comes back (the bars fold in about this long). */
const SETTLE_MS = 450;
/** A day's date before it has been measured. */
const DATE_H = 66;

/**
 * The journal's sheet (chronicle journal JN1, JN2, JN31-JN33): the rows in book order, each day's date held at the
 * top while its entries pass, and after them the empty page, where the next entry is written.
 *
 * It rests at its end. The empty page is as tall as it takes for that end to show the entry the page opened on under
 * its date and nothing older (`lib/journal/rest`), so the page reads as aligned to the top with where you left off
 * in view. A tap on the empty page gives the field the keyboard, under the last entry. Entries made since the page
 * opened stack beneath it and stay in view; once they fill two thirds of the room the sheet slides up as it grows
 * and the line being written holds its place, as paper in a typewriter. Pulling down reads back; reaching the top asks for older
 * entries, and what was on screen stays where it was as they are added above. A plain ScrollView: a page is a few
 * dozen entries, and an inverted list flips the wheel on the web.
 */
export const JournalPage = forwardRef<JournalPageHandle, {
  rows: JournalRow[];
  more: boolean;
  now: number;
  onMore: () => void;
  /** Room at the foot for the bar. */
  footPad: number;
  slip: ReactNode;
  entry: (m: MomentView) => ReactNode;
  /** The field: the first line of the empty page, where the words are written (JN28). */
  field?: ReactNode;
  /** A tap on the empty page: the field takes the keyboard (JN32). */
  onWrite?: () => void;
  /** The field has the keyboard. */
  writing?: boolean;
  /** The empty page went out of view, or came back (audit 50): out of view, the bar holds the pen. */
  onAway?: (away: boolean) => void;
  /** Memories is the screen in front. Coming back to it is a new sitting: the page opens on the last entry again (audit 42). */
  focused?: boolean;
  /** Said under today's date when the page could not be read. */
  notice?: ReactNode;
}>(function JournalPage(props, ref) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const at = useRef({ y: 0, height: 0, view: 0 });
  // Until the first layout has been taken to the foot, and whenever the reader is at the foot, new content keeps it there.
  const pinned = useRef(true);
  // Older entries were asked for, with the rows there were: a size change with the same rows is not their arrival
  // (a dateline wrapping as its place is read), and must not be taken for it (audit 13).
  const adding = useRef(false);
  const askedAt = useRef(0);
  const count = props.rows.length;
  // Older entries are asked for only once the page has first been taken to its foot: it opens there, not at the top.
  const opened = useRef(false);
  useImperativeHandle(ref, () => ({
    toFoot: (animated = false) => {
      pinned.current = true;
      scroll.current?.scrollToEnd({ animated });
    },
  }));

  // The empty page's height (JN31, JN32), from the sheet's own height and the heights of the rows in the peek.
  const [view, setView] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const measured = (key: string, h: number) => setHeights((prev) => (prev[key] === h ? prev : { ...prev, [key]: h }));
  const writing = !!props.writing;
  // The entry the page opened on (JN33): the peek begins with it, and every entry made since stacks beneath it.
  const [opened0, setOpened0] = useState<string | null>(null);
  // A sitting ends when Memories is left (audit 42): back in front, the page opens on its last entry again.
  const focused = props.focused !== false;
  const [wasFocused, setWasFocused] = useState(focused);
  if (wasFocused !== focused) setWasFocused(focused);
  const anchor = anchorOf(props.rows, focused && !wasFocused ? null : opened0);
  if (anchor !== opened0) setOpened0(anchor);
  const from = peekStart(props.rows, anchor);
  const peek = props.rows.slice(from).reduce((sum, r) => sum + (heights[r.key] ?? 0), 0);
  // A peek that begins with a date brings its own; otherwise its day's date is held above it (audit 48).
  const held = stickyDay(props.rows, from);
  const sticky = held == null ? 0 : heights[held] || DATE_H;
  const blank = view > 0 ? blankHeight({ view, foot: props.footPad, sticky, peek }) : 0;
  // The stack sliding up as the keyboard comes and goes is a movement the eye follows (JN33); anything else that
  // changes the sheet's length while the reader is at its end just keeps the end in view.
  const moving = useRef(false);
  // The keyboard coming and going changes the sheet's height and its length in several steps (the bars fold, the
  // empty page resizes). The reader is at the end before and must be at the end after, whatever a scroll event in between
  // says: the end is held for a moment, and the sheet is taken there once more when it has settled.
  const hold = useRef(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    // A reader who scrolled back while writing stays there when the keyboard goes (audit 43); the keyboard coming
    // up always brings the line into view.
    if (!writing && !pinned.current) return;
    moving.current = !reduced;
    hold.current = true;
    pinned.current = true;
    const t = setTimeout(() => {
      hold.current = false;
      scroll.current?.scrollToEnd({ animated: false });
    }, SETTLE_MS);
    return () => clearTimeout(t);
    // `reduced` is read, not watched: a change of the setting is not a movement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writing]);

  // Back in front, the page opens at its end as it first did (audit 42): the anchor has moved to the last entry,
  // the empty page resizes, and the end is held until that has settled.
  useEffect(() => {
    if (!focused) return;
    hold.current = true;
    pinned.current = true;
    const t = setTimeout(() => {
      hold.current = false;
      scroll.current?.scrollToEnd({ animated: false });
    }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [focused]);

  const away = useRef(false);
  // A page just drawn is at its foot, with the empty page in view (audit 60).
  const { onAway } = props;
  useEffect(() => {
    onAway?.(false);
  }, [onAway]);
  const { more, onMore } = props;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    at.current = { y: contentOffset.y, height: contentSize.height, view: layoutMeasurement.height };
    if (!hold.current) pinned.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
    if (pinned.current) opened.current = true;
    // The empty page is the sheet's last `blank` px above its foot's padding.
    // Out of view: its top is under the bar or below it (audit 61).
    const out = contentOffset.y + layoutMeasurement.height < contentSize.height - blank + 24;
    if (out !== away.current) {
      away.current = out;
      props.onAway?.(out);
    }
    if (opened.current && contentOffset.y < NEAR_TOP && contentSize.height > layoutMeasurement.height && more && !adding.current) {
      adding.current = true;
      askedAt.current = count;
      onMore();
    }
  };
  const toEnd = () => {
    const animated = moving.current;
    moving.current = false;
    scroll.current?.scrollToEnd({ animated });
  };
  const onContentSizeChange = (_w: number, h: number) => {
    const before = at.current.height;
    at.current.height = h;
    if (adding.current && count === askedAt.current) {
      if (pinned.current) toEnd();
      return;
    }
    if (adding.current) {
      adding.current = false;
      // A reader at the foot stays there (a page read again after it failed: ui 8).
      if (pinned.current) toEnd();
      // Entries were added above: the ones on screen keep their place. Native holds it itself (below).
      else if (Platform.OS === 'web' && before > 0 && h > before) scroll.current?.scrollTo({ y: at.current.y + (h - before), animated: false });
      return;
    }
    if (pinned.current) toEnd();
  };
  // Each day's date is held at the top while its entries pass (JN31).
  const dates = props.rows.flatMap((r, i) => (r.k === 'day' ? [i] : []));
  return (
    <ScrollView
      ref={scroll}
      testID="journal-page"
      style={styles.scroll}
      contentContainerStyle={[styles.page, { paddingBottom: props.footPad }]}
      stickyHeaderIndices={dates}
      onScroll={onScroll}
      scrollEventThrottle={32}
      onContentSizeChange={onContentSizeChange}
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        at.current.view = h;
        setView(h);
        if (pinned.current) scroll.current?.scrollToEnd({ animated: false });
      }}
      maintainVisibleContentPosition={Platform.OS === 'web' ? undefined : { minIndexForVisible: 0 }}
      keyboardShouldPersistTaps="handled"
    >
      {props.rows.map((r) => {
        const onLayout = (e: { nativeEvent: { layout: { height: number } } }) => measured(r.key, Math.round(e.nativeEvent.layout.height));
        if (r.k === 'day') {
          return (
            <View key={r.key} style={styles.day} onLayout={onLayout}>
              <Text style={styles.heading} accessibilityRole="header" testID="day-heading">{dayHeading(r.t, props.now)}</Text>
              {r.today ? props.notice : null}
              {/* An edge (audit 52): what passes under the held date fades into the page's ground, not cut mid-line. */}
              <View style={styles.edge} pointerEvents="none" testID="day-edge">
                {EDGE.map((o) => <View key={o} style={[styles.edgeBand, { opacity: o }]} />)}
              </View>
            </View>
          );
        }
        if (r.k === 'slip') return <View key={r.key} onLayout={onLayout}>{props.slip}</View>;
        return <View key={r.key} onLayout={onLayout}>{props.entry(r.m)}</View>;
      })}
      {/* The empty page (JN31, JN32): the field is its first line, and the rest of it is one place to tap. */}
      <View key="blank" style={{ minHeight: blank }} testID="empty-page">
        {/* Under the field, the whole of it: the room above the line takes the tap too (audit 45). The field has
            the name for a screen reader; this is the same thing to a finger, so it is not said twice (audit 44). */}
        <Pressable
          testID="line-write"
          onPress={props.onWrite}
          style={StyleSheet.absoluteFill}
          accessible={false}
          importantForAccessibility="no"
          aria-hidden
          tabIndex={-1}
        />
        {props.field}
      </View>
    </ScrollView>
  );
});

/**
 * The edge's bands, from the date's ground towards nothing. None fainter than a fifth: a fainter band is drawn a
 * shade off the ground it lies on, and shows as a line under every date.
 */
const EDGE = [0.82, 0.6, 0.4, 0.22];

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, right: 0, top: '100%' },
  edgeBand: { height: 4, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  page: { flexGrow: 1, paddingHorizontal: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  // Its own ground: entries pass under the date held at the top.
  day: { paddingTop: 28, paddingBottom: 10, gap: 10, backgroundColor: theme.bg, zIndex: 2 },
  heading: { color: theme.ink, fontSize: 22, lineHeight: 28, fontWeight: '600' },
});
