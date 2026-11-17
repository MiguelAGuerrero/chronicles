import { StyleSheet, Text, View } from 'react-native';
import { HEADER_TYPE, type DaySection } from '../../lib/gallery/layout';
import { theme } from '../ui';

/**
 * A day's header (MG6, MG16): its title and where, the row's height made from the same type (`HEADER_TYPE`), so neither
 * line is cut. Chronicle's Media and the pickers' Media (specs/picker-media MP5) draw the same one.
 */
export function DayHeader(props: { day: DaySection; height: number }) {
  return (
    <View style={[styles.header, { height: props.height }]} testID="gallery-day" {...({ dataSet: { day: props.day.key } } as object)}>
      <Text testID="gallery-day-title" style={styles.title} accessibilityRole="header" numberOfLines={1}>{props.day.title}</Text>
      <Text testID="gallery-day-line" style={styles.line} numberOfLines={HEADER_TYPE.lines}>{props.day.line}</Text>
    </View>
  );
}

// The row's height is made from these numbers (HEADER_TYPE); neither text may shrink to fit, or the title is cut.
const styles = StyleSheet.create({
  header: { backgroundColor: theme.bg, paddingHorizontal: 16, paddingTop: HEADER_TYPE.padTop, paddingBottom: HEADER_TYPE.padBottom, justifyContent: 'flex-end' },
  title: { color: theme.ink, fontSize: HEADER_TYPE.titleSize, lineHeight: HEADER_TYPE.titleLine, fontWeight: '700', flexShrink: 0 },
  line: { color: theme.muted, fontSize: HEADER_TYPE.lineSize, lineHeight: HEADER_TYPE.lineLine, flexShrink: 0 },
});
