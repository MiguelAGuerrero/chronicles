import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import { LiftIn, theme } from '../ui';
import { GUTTER } from '../walk/layout';

/**
 * The walk's top column. Minimize (NV7) at the top-left, the navigation bar beside it in the same row (the
 * owner, Nov 6: nothing above the bar), the notice in the row when no bar holds it (Nov 4), and the street
 * chip centred in the row (Nov 5); with the bar up both sit just under it. Then the lines below.
 */
export function WalkTop(props: {
  top: number;
  sideInset: number;
  onMinimize: () => void;
  minimizeDisabled: boolean;
  bar: ReactNode | null;
  notice: ReactNode | null;
  chip: ReactNode | null;
  toast: string | null;
  children: ReactNode;
}) {
  const { bar, notice, chip } = props;
  return (
    <View style={[styles.top, { top: props.top + 4, left: props.sideInset, right: props.sideInset }]} pointerEvents="box-none">
      {/* Minimize (NV7): down to the recording bar above the tabs, still recording. At the top-left
          edge, under the navigation bar when one shows, away from the capture row and Stop. */}
      <View style={styles.minRow} pointerEvents="box-none">
        <Pressable
          testID="walk-minimize"
          accessibilityRole="button"
          accessibilityLabel="Minimize the walk"
          accessibilityHint="It keeps recording. The bar above the tabs brings it back."
          onPress={props.onMinimize}
          disabled={props.minimizeDisabled}
          hitSlop={2}
          style={({ pressed }) => [styles.edgeBtn, styles.minBtn, props.minimizeDisabled && styles.disabled, pressed && styles.pressed]}
        >
          <Icon name="chevron-down" size={24} color={theme.ink} />
        </Pressable>
        {/* The navigation bar takes the top row beside Minimize, so nothing sits above it (the owner, Nov 6: it keeps
            drifting down; supersedes Nov 5's "Minimize above the bar"). */}
        {bar}
        {/* The notice shares the minimize button's row, level with it at the top edge (the owner's call,
            Nov 4), so the button doesn't move when one appears (NR6). While the navigation bar holds the row
            it sits just below. */}
        {notice && !bar && <View style={styles.noticeCell}>{notice}</View>}
        {/* The street chip: top centre, level with the chevron, so nothing below it moves it (the owner, Nov 5).
            Under the navigation bar it sits in the column instead of over the bar. */}
        {!notice && chip && !bar && (
          <View style={styles.chipCell} pointerEvents="none">
            {chip}
          </View>
        )}
      </View>
      {bar && notice && <View style={styles.noticeBelow}>{notice}</View>}
      {bar && !notice && chip}
      {props.children}
      {props.toast && (
        <LiftIn style={styles.toast} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{props.toast}</Text>
        </LiftIn>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: GUTTER, right: GUTTER, gap: 8, alignItems: 'center', maxWidth: 640, alignSelf: 'center' },
  minRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeCell: { flex: 1, minWidth: 0 },
  noticeBelow: { alignSelf: 'stretch' },
  minBtn: { position: 'relative' },
  chipCell: { position: 'absolute', left: 0, right: 0, top: 0, height: 44, alignItems: 'center', justifyContent: 'center' },
  toast: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'center' },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  edgeBtn: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
});
