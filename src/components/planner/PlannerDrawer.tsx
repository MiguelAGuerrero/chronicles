import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AtlasArea } from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import type { Waypoint } from '../../lib/nav/types';
import { tabsHidden } from '../../lib/tabsHidden';
import type { LngLat } from '../../lib/types';
import { useUnits } from '../../lib/useUnits';
import { plannerMap } from '../../lib/walkPlanner/mapProps';
import { usePlanner } from '../../lib/walkPlanner/usePlanner';
import { closeLabel, differentLabel, reasonLine, readingLine, startLabel, title } from '../../lib/walkPlanner/words';
import { Icon } from '../icons';
import { WalkMap } from '../map/WalkMap';
import { Button, theme } from '../ui';
import { PlannerCapture } from './PlannerCapture';
import { PlannerSettings } from './PlannerSettings';
import { RouteRows } from './RouteRows';

const NONE: never[] = [];

/**
 * The walk planner (WP1-WP27): a full-screen drawer over Explore, opened from a kind's button. The map with up to three routes, a
 * row for each, the settings, "Suggest different routes", and Start. While a walk records, the capture stack is on it.
 */
export function PlannerDrawer(props: {
  kind: CategoryId;
  area: AtlasArea;
  you: LngLat | null;
  lastFixAt: number | null;
  starting: boolean;
  onClose: () => void;
  onStart: (dest: Waypoint) => void;
}) {
  const insets = useSafeAreaInsets();
  const units = useUnits();
  const p = usePlanner(props.kind, { at: props.area.at, reachM: props.area.reachM }, props.you, true);
  const [busy, setBusy] = useState(false);
  // The tabs fold away while the planner is up, and come back when it goes.
  useEffect(() => {
    tabsHidden.set(true);
    return () => tabsHidden.set(false);
  }, []);
  // Back (Android) and Escape (web) close it: the card is as it was.
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      props.onClose();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
    // The close handler is read when pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const map = useMemo(() => plannerMap(p.routes, p.page.selected, p.result?.found ?? NONE), [p.routes, p.page.selected, p.result?.found]);
  // The camera frames all the routes when they change.
  const fitN = useMemo(() => {
    let h = 7;
    for (const ch of p.routes.map((r) => `${r.preset}${r.lengthM | 0}`).join(',')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h;
  }, [p.routes]);
  const reasons = p.result ? [...new Set(p.result.reasons)] : [];
  async function start() {
    setBusy(true);
    try {
      const dest = await p.start();
      if (dest) props.onStart(dest);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={[StyleSheet.absoluteFill, styles.over, { paddingTop: insets.top }]} testID="planner" accessibilityViewIsModal>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header" testID="plan-title">{title(props.kind)}</Text>
        <Pressable testID="plan-close" accessibilityRole="button" accessibilityLabel={closeLabel} onPress={props.onClose} style={styles.close}>
          <Icon name="close" size={22} color={theme.ink} />
        </Pressable>
      </View>
      <View style={styles.map} testID="plan-map">
        <WalkMap
          trace={NONE}
          walked={NONE}
          fog={NONE}
          captures={NONE}
          walker={props.you}
          route={map.route}
          alternates={map.alternates}
          routeGrades={map.grades}
          foundPins={map.pins}
          fitBounds={map.fit}
          fitKey={fitN}
        />
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {p.reading ? <Text style={styles.line} testID="plan-reading">{readingLine}</Text> : null}
        {p.routes.length > 0 ? (
          <RouteRows routes={p.routes} selected={p.page.selected} kind={props.kind} units={units} ceilingM={p.prefs.budgetM} onSelect={p.choose} />
        ) : null}
        {reasons.map((r) => <Text key={r} style={styles.line} testID={`plan-reason-${r}`}>{reasonLine(r)}</Text>)}
        <View style={styles.actions}>
          <Button testID="plan-different" variant="secondary" label={differentLabel} disabled={!p.routes.length} onPress={p.different} />
          <Button testID="plan-start" label={startLabel} disabled={!p.canStart || busy || props.starting} onPress={() => void start()} />
        </View>
        <PlannerSettings prefs={p.prefs} units={units} />
      </ScrollView>
      {p.walkId ? <PlannerCapture walkId={p.walkId} here={props.you} lastFixAt={props.lastFixAt} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  over: { backgroundColor: theme.bg, zIndex: 50 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: theme.ink },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  map: { height: 280, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  body: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 140 },
  line: { fontSize: 14, color: theme.ink, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
