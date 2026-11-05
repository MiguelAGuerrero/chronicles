import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AtlasArea } from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import { stepBudget } from '../../lib/kindWalk/settings';
import { kindWalkPrefs } from '../../lib/kindWalk/app';
import { useKindWalk, useKindWalkPrefs } from '../../lib/kindWalk/useKindWalk';
import {
  farLine, fewLine, introLine, lengthLine, longerLabel, noneLine, noRouteLine, readingLine, shorterLabel, skippedLine, startLabel, startLine, walkabilityLine,
} from '../../lib/kindWalk/words';
import type { Waypoint } from '../../lib/nav/types';
import type { LngLat } from '../../lib/types';
import { useUnits } from '../../lib/useUnits';
import { theme } from '../ui';

/**
 * A kind opened in place on an area's card (KW1): one suggested walk through where the kind is concentrated, its
 * distance, whether it can be walked the whole way, and a button. It names no place (KW6) and shows only the current
 * length (KW8b); a step writes the budget setting.
 */
export function KindWalkPanel(props: { kind: CategoryId; area: AtlasArea; you: LngLat | null; none: boolean; starting: boolean; onStart: (dest: Waypoint) => void }) {
  const { kind, area } = props;
  const units = useUnits();
  const prefs = useKindWalkPrefs();
  // A kind with no presence is said without reading anything (KW2).
  const s = useKindWalk(kind, { at: area.at, reachM: area.reachM }, props.you, !props.none);
  const say = (text: string, id: string) => <Text style={styles.line} testID={id}>{text}</Text>;
  return (
    <View style={styles.panel} testID={`kindwalk-${kind}`}>
      {props.none ? say(noneLine(kind), 'kindwalk-none') : !s ? say(readingLine, 'kindwalk-reading') : null}
      {s?.state === 'none' ? say(noneLine(kind), 'kindwalk-none') : null}
      {s?.state === 'few' ? say(fewLine, 'kindwalk-few') : null}
      {s?.state === 'far' ? say(farLine, 'kindwalk-far') : null}
      {s?.state === 'noRoute' ? say(noRouteLine, 'kindwalk-noroute') : null}
      {s?.state === 'skipped' ? say(skippedLine, 'kindwalk-skipped') : null}
      {s?.state === 'walk' ? (
        <>
          <Text style={styles.line}>{introLine(kind)}</Text>
          <Text style={styles.length} testID="kindwalk-length">{lengthLine(s.walk.lengthM, units)}</Text>
          {startLine(s.walk.startM, units) ? <Text style={styles.line} testID="kindwalk-start">{startLine(s.walk.startM, units)}</Text> : null}
          <Text style={styles.line} testID="kindwalk-reach">{walkabilityLine(s.reach)}</Text>
          <View style={styles.row}>
            <Pressable testID="kindwalk-shorter" accessibilityRole="button" onPress={() => void kindWalkPrefs.setBudget(stepBudget(prefs.budgetM, -1, units))} style={styles.step}>
              <Text style={styles.stepText}>{shorterLabel}</Text>
            </Pressable>
            <Pressable testID="kindwalk-longer" accessibilityRole="button" onPress={() => void kindWalkPrefs.setBudget(stepBudget(prefs.budgetM, 1, units))} style={styles.step}>
              <Text style={styles.stepText}>{longerLabel}</Text>
            </Pressable>
            <Pressable testID="kindwalk-start-walk" accessibilityRole="button" disabled={props.starting} onPress={() => props.onStart(s.dest)} style={[styles.step, styles.go]}>
              <Text style={styles.stepText}>{startLabel}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: theme.bg, borderRadius: 12, padding: 12, gap: 8, marginBottom: 4 },
  line: { fontSize: 14, color: theme.ink, lineHeight: 19 },
  length: { fontSize: 16, fontWeight: '600', color: theme.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: theme.edge, backgroundColor: theme.surface },
  go: { marginLeft: 'auto' },
  stepText: { fontSize: 15, fontWeight: '600', color: theme.ink },
});
