import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CategoryId } from '../../lib/discovery/types';
import { stripLabel, strip, type Grade } from '../../lib/walkPlanner/exposure';
import type { PlannerRoute } from '../../lib/walkPlanner/service';
import { fillsLess, lessGroundLine, rowWords } from '../../lib/walkPlanner/words';
import { walkabilityLine } from '../../lib/kindWalk/words';
import type { Units } from '../../lib/units';
import { KIND_COLOR } from '../atlas/kinds';
import { theme } from '../ui';

/** The strip (WP15): the route start to end in three flat grades of the kind's colour, no number, no fill, no cap. */
export function ExposureStrip(props: { grades: Grade[]; color: string; testID?: string }) {
  return (
    <View style={styles.strip} accessible accessibilityLabel={stripLabel(props.grades)} testID={props.testID}>
      {props.grades.map((g, i) => (
        <View key={i} style={[styles.cell, { backgroundColor: g === 0 ? theme.line : props.color, opacity: g === 0 ? 1 : 0.25 + 0.25 * g }]} />
      ))}
    </View>
  );
}

/** A route's row (WP14): its name, its own distance, what it passes in words and how much is only getting there; its strip below. */
export function RouteRows(props: {
  routes: PlannerRoute[];
  selected: number | null;
  kind: CategoryId;
  units: Units;
  ceilingM: number;
  onSelect: (i: number) => void;
}) {
  return (
    <View style={styles.rows}>
      {props.routes.map((r, i) => {
        const w = rowWords(r, props.units);
        const on = i === props.selected;
        const reach = walkabilityLine(r.reach);
        return (
          <Pressable
            key={r.preset}
            testID={`plan-row-${i}`}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            accessibilityLabel={`${w.title}. ${w.distance}. ${w.passes}.${w.getting ? ` ${w.getting}.` : ''} ${reach}`}
            onPress={() => props.onSelect(i)}
            style={[styles.row, on && styles.rowOn]}
            {...{ dataSet: { selected: on ? '1' : '0', preset: r.preset } }}
          >
            <Text style={styles.title}>{w.title}</Text>
            <Text style={styles.meta} testID={`plan-row-distance-${i}`}>{w.distance}</Text>
            <Text style={styles.meta}>{w.passes}</Text>
            {w.getting ? <Text style={styles.meta}>{w.getting}</Text> : null}
            <ExposureStrip grades={strip(r.runs)} color={KIND_COLOR[props.kind]} testID={`plan-strip-${i}`} />
            <Text style={styles.meta} testID={`plan-reach-${i}`}>{reach}</Text>
            {fillsLess(r, props.ceilingM) ? <Text style={styles.meta}>{lessGroundLine}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 8 },
  row: { borderRadius: 12, borderWidth: 2, borderColor: theme.line, backgroundColor: theme.surface, padding: 12, gap: 4, minHeight: 44 },
  rowOn: { borderColor: theme.ink },
  title: { fontSize: 16, fontWeight: '700', color: theme.ink },
  meta: { fontSize: 14, color: theme.ink, lineHeight: 19 },
  strip: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginVertical: 4 },
  cell: { flex: 1 },
});
