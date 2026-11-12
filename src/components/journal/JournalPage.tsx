import { forwardRef, useImperativeHandle, useRef, type ComponentRef, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { dayHeading } from '../../lib/journal/lines';
import type { JournalRow } from '../../lib/journal/page';
import type { MomentView } from '../../lib/resurface/types';
import { theme } from '../ui';

export type JournalPageHandle = { toFoot: (animated?: boolean) => void };

/** Older entries are asked for this near the top of what is drawn. */
const NEAR_TOP = 240;

/**
 * The journal's sheet (chronicle journal JN1, JN2): the rows in book order, opening at the foot. Reaching the top
 * asks for older entries, and what was on screen stays where it was as they are added above. A plain ScrollView:
 * a page is a few dozen entries, and an inverted list flips the wheel on the web.
 */
export const JournalPage = forwardRef<JournalPageHandle, {
  rows: JournalRow[];
  more: boolean;
  now: number;
  onMore: () => void;
  /** Room at the foot for the open line. */
  footPad: number;
  slip: ReactNode;
  entry: (m: MomentView) => ReactNode;
  /** Said under today's date when the page could not be read. */
  notice?: ReactNode;
}>(function JournalPage(props, ref) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const at = useRef({ y: 0, height: 0, view: 0 });
  // Until the first layout has been taken to the foot, and whenever the reader is at the foot, new content keeps it there.
  const pinned = useRef(true);
  const adding = useRef(false);
  // Older entries are asked for only once the page has first been taken to its foot: it opens there, not at the top.
  const opened = useRef(false);
  useImperativeHandle(ref, () => ({
    toFoot: (animated = false) => {
      pinned.current = true;
      scroll.current?.scrollToEnd({ animated });
    },
  }));
  const { more, onMore } = props;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    at.current = { y: contentOffset.y, height: contentSize.height, view: layoutMeasurement.height };
    pinned.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
    if (pinned.current) opened.current = true;
    if (opened.current && contentOffset.y < NEAR_TOP && contentSize.height > layoutMeasurement.height && more && !adding.current) {
      adding.current = true;
      onMore();
    }
  };
  const onContentSizeChange = (_w: number, h: number) => {
    const before = at.current.height;
    at.current.height = h;
    if (adding.current) {
      adding.current = false;
      // Entries were added above: the ones on screen keep their place. Native holds it itself (below).
      if (Platform.OS === 'web' && before > 0 && h > before) scroll.current?.scrollTo({ y: at.current.y + (h - before), animated: false });
      return;
    }
    if (pinned.current) scroll.current?.scrollToEnd({ animated: false });
    // A page shorter than the screen never scrolls, so it never reaches "the top": older entries are asked for here.
    if (more && at.current.view > 0 && h <= at.current.view) {
      adding.current = true;
      onMore();
    }
  };
  return (
    <ScrollView
      ref={scroll}
      testID="journal-page"
      style={styles.scroll}
      contentContainerStyle={[styles.page, { paddingBottom: props.footPad }]}
      onScroll={onScroll}
      scrollEventThrottle={32}
      onContentSizeChange={onContentSizeChange}
      onLayout={(e) => {
        at.current.view = e.nativeEvent.layout.height;
        if (pinned.current) scroll.current?.scrollToEnd({ animated: false });
      }}
      maintainVisibleContentPosition={Platform.OS === 'web' ? undefined : { minIndexForVisible: 0 }}
      keyboardShouldPersistTaps="handled"
    >
      {props.rows.map((r) => {
        if (r.k === 'day') {
          return (
            <View key={r.key} style={styles.day}>
              <Text style={styles.heading} accessibilityRole="header" testID="day-heading">{dayHeading(r.t, props.now)}</Text>
              {r.today ? props.notice : null}
            </View>
          );
        }
        if (r.k === 'slip') return <View key={r.key}>{props.slip}</View>;
        return <View key={r.key}>{props.entry(r.m)}</View>;
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  // The foot is the page's start: a short page sits low, above the open line.
  page: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 8, width: '100%', maxWidth: 640, alignSelf: 'center' },
  day: { paddingTop: 28, gap: 10 },
  heading: { color: theme.ink, fontSize: 22, lineHeight: 28, fontWeight: '600' },
});
