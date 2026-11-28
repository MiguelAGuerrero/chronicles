import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { CONFIRM_STACK_BELOW } from '../lib/deletion/core';
import { focusOn } from '../lib/focus';
import { endItLabel, quietLine } from '../lib/quietEnd/core';
import { Button, theme } from './ui';

/**
 * A walk left running (specs/forgotten-stop, decision 0272): the one card a held Stop shows on a walk gone quiet (QE3,
 * QE4), and the More (⋯) row's ask (QE7), as drawn: the line, then "End it at <time>" (the one filled button) and the
 * other choice outlined ("Keep it all" at a Stop, "Cancel" in the More). Side by side, End it first, as drawn; stacked,
 * End it on top, where the card is narrower than the width `ConfirmCard` stacks below (its own width, measured: the walk
 * screen's card leaves the capture column clear). A plain view, never a Modal, so it can sit over the walk
 * screen's strip, above the bar, or inside the walk's More sheet (iOS can't present a Modal over a Modal). The screen
 * reader lands on its line.
 */
export function QuietEndAsk(props: {
  at: number;
  now: number;
  /** The other choice's words: "Keep it all" at a Stop, "Cancel" in the More. */
  other: string;
  onEnd: () => void;
  onOther: () => void;
  /** The More's ask: in a row, Cancel leads and End it trails, as the same sheet's Delete confirm (`confirmActions`;
   *  forgotten-stop audit 10). The Stop's ask keeps End it first, as drawn. Stacked, End it is on top either way. */
  cancelLeads?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const lineRef = useRef<ComponentRef<typeof Text>>(null);
  const [width, setWidth] = useState(0);
  const stacked = width > 0 && width < CONFIRM_STACK_BELOW;
  useEffect(() => {
    focusOn(lineRef);
  }, []);
  const end = (
    <Button key="end" testID="quiet-end" label={endItLabel(props.at)} onPress={props.onEnd} busy={props.busy} style={!stacked && styles.flex} />
  );
  const other = (
    <Button key="other" testID="quiet-other" variant="secondary" label={props.other} onPress={props.onOther} disabled={props.busy} style={[styles.other, !stacked && styles.flex]} />
  );
  return (
    // Not modal to a screen reader: on the walk screen the capture stack beside it stays one swipe away (forgotten-stop
    // audit 13); the More's sheet around its ask is the modal one.
    <View testID="quiet-ask" style={[styles.card, props.style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLiveRegion="polite">
      <Text ref={lineRef} testID="quiet-line" style={styles.line} accessibilityRole="header">{quietLine(props.at, props.now)}</Text>
      <View style={stacked ? styles.stack : styles.row}>
        {props.cancelLeads && !stacked ? [other, end] : [end, other]}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // As drawn: a white card, rounded, lifted a little off the map or the page.
  card: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  line: { fontSize: 16, lineHeight: 22, color: theme.ink },
  row: { flexDirection: 'row', gap: 8 },
  stack: { gap: 12 },
  flex: { flex: 1 },
  // Outlined, as drawn: the edge a control reads by (3:1).
  other: { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.edge },
});
