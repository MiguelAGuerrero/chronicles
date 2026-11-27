import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AtlasArea } from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import type { Waypoint } from '../../lib/nav/types';
import { focusOn, useFocusReturn, useFocusTrap } from '../../lib/focus';
import { OPEN_SETTINGS_LABEL, positionAction, positionAt, positionLine, RETRY_LABEL } from '../../lib/locate/pagePosition';
import { usePagePosition } from '../../lib/locate/usePagePosition';
import { hideTabs, modalsUp } from '../../lib/tabsHidden';
import type { LngLat } from '../../lib/types';
import { useUnits } from '../../lib/useUnits';
import { plannerMap } from '../../lib/walkPlanner/mapProps';
import { usePlanner } from '../../lib/walkPlanner/usePlanner';
import { closeLabel, differentLabel, reasonLine, readingLine, replacesLine, startLabel, title } from '../../lib/walkPlanner/words';
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
  starting: boolean;
  onClose: () => void;
  onStart: (dest: Waypoint) => void;
}) {
  const insets = useSafeAreaInsets();
  const units = useUnits();
  // WP3 (fix outing-current-position, decision 0273): the planner's own fix, read as it opens; nothing is planned until it is in.
  // Read again when the app comes back to the front, on Try again, and at Start when it has aged or a walk records (audits 1-3).
  const page = usePagePosition();
  const pos = page.pos;
  const you: LngLat | null = positionAt(pos);
  const platform = Platform.OS === 'web' ? 'web' : 'native';
  const posLine = positionLine(pos, platform);
  const posAction = positionAction(pos, platform);
  const p = usePlanner(props.kind, { at: props.area.at, reachM: props.area.reachM }, you, pos.state !== 'finding');
  const [busy, setBusy] = useState(false);
  // tend explore 27: focus moves into the planner as it opens, at its title, as the card's does at its name, and goes back
  // to the kind's button as it closes. tend explore 27: and Tab stays inside it on the web.
  useFocusReturn();
  const titleRef = useRef<React.ComponentRef<typeof Text>>(null);
  useEffect(() => focusOn(titleRef), []);
  const rootRef = useRef<React.ComponentRef<typeof View>>(null);
  useFocusTrap(rootRef, true);
  // The tabs fold away while the planner is up, and go back as they were when it goes: the area card under it may still be open (audit 12).
  useEffect(() => hideTabs(), []);
  // Back (Android) and Escape (web) close it: the card is as it was. Not with a Modal over it (the editor, the note's
  // page): Escape is that Modal's (fix planner-edit), as Back already is on a phone.
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      props.onClose();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && modalsUp.get() === 0 && props.onClose();
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
  // Two taps in one frame start once: a ref, not state (audit 11).
  const starting = useRef(false);
  const [failed, setFailed] = useState(false);
  async function start() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      // Start routes from the planner's own fix (decision 0273), the one it planned from.
      // Read once more when the fix has aged or a walk records (audit 1); with none, nothing starts and the page says why.
      const at = await page.startAt(!!p.walkId);
      const dest = at ? await p.start(at) : null;
      if (dest) props.onStart(dest);
    } catch {
      setFailed(true);
    } finally {
      starting.current = false;
      setBusy(false);
    }
  }
  return (
    <View ref={rootRef} style={[StyleSheet.absoluteFill, styles.over, { paddingTop: insets.top }]} testID="planner" accessibilityViewIsModal>
      {/* audit 9: the planner's one live region on the web, there from the first render, says its position's line once as it settles. */}
      {platform === 'web' ? <Text testID="plan-said" accessibilityLiveRegion="polite" style={styles.said}>{page.said.n % 2 ? `${page.said.text}\u200B` : page.said.text}</Text> : null}
      <View style={styles.head}>
        <Text ref={titleRef} style={styles.title} accessibilityRole="header" testID="plan-title" {...{ tabIndex: -1 }}>{title(props.kind)}</Text>
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
          walker={you}
          walkerMuted={pos.state === 'earlier'}
          route={map.route}
          alternates={map.alternates}
          routeGrades={map.grades}
          foundPins={map.pins}
          fitBounds={map.fit}
          fitKey={fitN}
        />
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {/* Finding you, or how long ago the fix it plans from was, above the routes; location off under "needs your position". */}
        {posLine && pos.state !== 'none' ? <Text style={styles.line} testID="plan-position">{posLine}</Text> : null}
        {p.reading ? <Text style={styles.line} testID="plan-reading">{readingLine}</Text> : null}
        {p.routes.length > 0 ? (
          <RouteRows routes={p.routes} selected={p.page.selected} kind={props.kind} units={units} ceilingM={p.ceilingM} onSelect={p.choose} />
        ) : null}
        {reasons.map((r) => <Text key={r} style={styles.line} testID={`plan-reason-${r}`}>{reasonLine(r)}</Text>)}
        {p.nothing ? <Text style={styles.line} testID="plan-reason-nothingDifferent">{reasonLine('nothingDifferent')}</Text> : null}
        {posLine && pos.state === 'none' ? <Text style={styles.line} testID="plan-position">{posLine}</Text> : null}
        {/* audit 8: Try again after a timeout; Open Settings when refused, on a phone (a web page cannot open them). */}
        {posAction === 'retry' ? <Button testID="plan-position-retry" label={RETRY_LABEL} variant="secondary" onPress={page.retry} /> : null}
        {posAction === 'settings' ? <Button testID="plan-position-settings" label={OPEN_SETTINGS_LABEL} variant="secondary" onPress={() => void Linking.openSettings()} /> : null}
        {failed ? <Text style={styles.line} testID="plan-failed">{reasonLine('noRoute')}</Text> : null}
        {p.walkId && p.replaces ? <Text style={styles.line} testID="plan-replaces">{replacesLine}</Text> : null}
        <View style={styles.actions}>
          <Button testID="plan-different" variant="secondary" label={differentLabel} disabled={!p.routes.length} onPress={p.different} style={styles.different} />
          <Button testID="plan-start" label={startLabel} disabled={!p.canStart || busy || props.starting} onPress={() => void start()} style={styles.start} />
        </View>
        <PlannerSettings prefs={p.prefs} units={units} kind={props.kind} />
      </ScrollView>
      {p.walkId ? <PlannerCapture walkId={p.walkId} here={you} lastFixAt={pos.state === 'here' || pos.state === 'earlier' ? pos.t : null} leaving={starting} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Read by a screen reader, never seen (audit 9).
  said: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  over: { backgroundColor: theme.bg, zIndex: 50 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: theme.ink },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  map: { height: 280, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  body: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 140 },
  line: { fontSize: 14, color: theme.ink, lineHeight: 19 },
  // One row at 320 px, Start to the right: the padding is what lets both fit; at a large text size the long label wraps inside
  // its own button and Start keeps its place (tend explore 28; ui-patterns, "Nothing wraps on a 320 px phone").
  actions: { flexDirection: 'row', gap: 8 },
  different: { flexShrink: 1, paddingHorizontal: 12 },
  start: { paddingHorizontal: 12 },
});
