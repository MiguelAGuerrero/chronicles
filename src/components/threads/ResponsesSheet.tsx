import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import type { MomentView } from '../../lib/resurface/types';
import type { ResponseRow } from '../../lib/threads/responses';
import type { Walk } from '../../lib/types';
import { SheetFrame, type SheetSize } from '../HomeSheet';
import { Icon } from '../icons';
import { theme } from '../ui';
import { ResponseEntry } from './ResponseEntry';

/**
 * A moment's responses (response thread, decision 0128): a sheet drawn inside the viewer, never a Modal of its own,
 * over everything but the docked toolbar, whose Respond is the sheet's bottom bar (RT7). It opens at half and drags to
 * full; a drag down, Close, Back or Escape lowers it (RT3). The moment first, then its responses oldest first (RT4).
 */
export function ResponsesSheet(props: {
  rows: ResponseRow<MomentView>[];
  walks: ReadonlyMap<string, Walk>;
  now: number;
  size: Exclude<SheetSize, 'peek'>;
  onSize: (s: Exclude<SheetSize, 'peek'> | null) => void;
  /** The height the sheet can grow into: the screen above the docked toolbar. */
  areaHeight: number;
  onOpen: (m: MomentView) => void;
}) {
  const scroll = useRef<ScrollViewInstance>(null);
  const count = useRef(props.rows.length);
  return (
    <SheetFrame
      testID="responses-sheet"
      dragTestID="responses-grip"
      size={props.size}
      onSize={(s) => props.onSize(s === 'peek' ? null : s)}
      bottomInset={0}
      // The viewer's Modal lowers it on Back and Escape before it closes itself (RT3).
      ownKeys={false}
      areaHeight={props.areaHeight}
      header={
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">Responses</Text>
          <Pressable testID="responses-close" accessibilityRole="button" accessibilityLabel="Close the responses" onPress={() => props.onSize(null)} style={styles.close} hitSlop={4}>
            <Icon name="chevron-down" size={22} color={theme.ink} />
          </Pressable>
        </View>
      }
    >
      <ScrollView
        ref={scroll}
        style={styles.list}
        contentContainerStyle={styles.pad}
        // A response kept from the sheet arrives like the others: the list only scrolls it into view (RT7, steward S4).
        onContentSizeChange={() => {
          if (props.rows.length > count.current) scroll.current?.scrollToEnd({ animated: false });
          count.current = props.rows.length;
        }}
      >
        {props.rows.map((r, i) => (
          <ResponseEntry key={r.moment.id} moment={r.moment} answering={r.answering} walks={props.walks} now={props.now} first={i === 0} onPress={() => (i === 0 ? props.onSize(null) : props.onOpen(r.moment))} />
        ))}
      </ScrollView>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  title: { flex: 1, color: theme.ink, fontSize: 17, fontWeight: '700' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  pad: { paddingBottom: 16 },
});
