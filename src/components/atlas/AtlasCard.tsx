import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ATLAS_LABEL, ATLAS_ORDER, ATLAS_RULES, STEP_WORDS, STEPS, distanceWords, familiarityWords,
  type AtlasArea, type Familiarity,
} from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import { formatDistance } from '../../lib/format';
import type { LngLat } from '../../lib/types';
import { COLORS, HOTSPOT, HOTSPOT_INK } from '../map/types';
import { Icon } from '../icons';
import { Button, theme } from '../ui';
import { KIND_COLOR, KIND_ICON_OF } from './kinds';
import { MiniMap } from './MiniMap';

const fmt = (m: number) => formatDistance(m);
const lastWords = (t: number | null) =>
  t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

/**
 * An area's card (AT8): the larger picture, the eight kinds in words and bars,
 * how the bars count, busy streets, what is waiting (kinds only, AT7), what you
 * found, the areas next door, and Walk to. ✕, Back, Escape and a tap outside
 * close it. A panel over the screen, never a Modal, so nothing stacks on iOS.
 */
export function AtlasCard(props: {
  area: AtlasArea;
  parent: string | null;
  distanceM: number;
  here: boolean;
  fam: Familiarity;
  walked: Set<string>;
  waiting: { category: CategoryId; at: LngLat }[];
  finds: { name: string; category: CategoryId; at: LngLat }[];
  you: LngLat | null;
  nextDoor: { area: AtlasArea; distanceM: number }[];
  walkTo: { at: LngLat; label: string } | null;
  starting: boolean;
  onWalk: () => void;
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  const { area, fam } = props;
  const p = area.profile;
  const [how, setHow] = useState(false);
  const close = useRef(props.onClose);
  useEffect(() => {
    close.current = props.onClose;
  }, [props.onClose]);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close.current();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, []);
  const level = area.level === 'neighborhood' ? 'Neighborhood' : 'Town';
  const last = lastWords(fam.last);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* A tap outside closes; screen readers use ✕, so the scrim isn't a second Close button. */}
      <Pressable style={styles.scrim} onPress={props.onClose} accessible={false} importantForAccessibility="no" testID="atlas-scrim" />
      <View style={styles.card} testID="atlas-card" accessibilityViewIsModal>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.eyebrow}>{props.parent ? `${level} · ${props.parent}` : level}</Text>
            <Text style={styles.name} accessibilityRole="header" testID="atlas-card-name">{area.name}</Text>
            <View style={styles.youRow}>
              {fam.walks ? <Icon name="footsteps-outline" size={14} color={COLORS.trace} /> : null}
              <Text style={[styles.you, fam.walks ? styles.known : null]}>
                {familiarityWords(fam)}{last ? ` · last ${last}` : ''}
              </Text>
              <Text style={styles.muted}> · {distanceWords(props.distanceM, props.here, fmt)}</Text>
            </View>
          </View>
          <Pressable testID="atlas-card-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} style={styles.close} hitSlop={8}>
            <Icon name="close" size={20} color={theme.ink} />
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          <View style={styles.bigMap}>
            <MiniMap area={area} walked={props.walked} waiting={props.waiting} finds={props.finds} here={props.here ? props.you : null} />
          </View>

          <View style={styles.sec}>
            <View style={styles.secHead}>
              <Text style={styles.secTitle} accessibilityRole="header">
                {area.level === 'town' ? 'What’s here · around its centre' : 'What’s here'}
              </Text>
              <Pressable testID="atlas-how" accessibilityRole="button" accessibilityState={{ expanded: how }} onPress={() => setHow((v) => !v)} hitSlop={8} style={styles.howBtn}>
                <Icon name="information-circle-outline" size={16} color={theme.accent} />
                <Text style={styles.howText}>How bars count</Text>
              </Pressable>
            </View>
            {how && (
              <View style={styles.explain} testID="atlas-how-panel">
                <Text style={styles.explainText}>
                  Every area is counted the same way: the places inside an {fmt(ATLAS_RULES.ringM)} ring, about a 10-minute walk, around
                  its point. The steps are fixed, so the same bars mean the same amount anywhere. Places for one, two and three bars:
                </Text>
                {ATLAS_ORDER.map((c) => (
                  <View key={c} style={styles.stepRow}>
                    <Text style={styles.stepName}>{ATLAS_LABEL[c]}</Text>
                    <Text style={styles.stepVals}>{STEPS[c].join(' · ')}</Text>
                  </View>
                ))}
              </View>
            )}
            {p ? (
              ATLAS_ORDER.map((c) => {
                const v = p.steps[c];
                return (
                  <View key={c} style={[styles.kindRow, !v && styles.faint]} accessible accessibilityLabel={`${ATLAS_LABEL[c]}: ${STEP_WORDS[v]}`} testID={`atlas-kind-${c}`}>
                    <Icon name={KIND_ICON_OF[c]} size={18} color={KIND_COLOR[c]} />
                    <Text style={styles.kindName}>{ATLAS_LABEL[c]}</Text>
                    <Text style={styles.kindWord}>{STEP_WORDS[v]}</Text>
                    <View style={styles.bars}>
                      {[1, 2, 3].map((n) => <View key={n} style={[styles.bar, { backgroundColor: n <= v ? KIND_COLOR[c] : theme.line }]} />)}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.muted}>Reading this area…</Text>
            )}
          </View>

          {p && p.strips.length > 0 && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Busy streets</Text>
              <View style={styles.chips} testID="atlas-streets">
                {p.strips.map((s) => (
                  <View key={s} style={styles.busy}>
                    <View style={styles.busyLine} />
                    <Text style={styles.busyText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {props.waiting.length > 0 && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Waiting to be found</Text>
              <View style={styles.chips} testID="atlas-waiting">
                {props.waiting.map((m) => (
                  <View key={m.category} style={[styles.q, { borderColor: KIND_COLOR[m.category] }]} accessible accessibilityLabel={`${ATLAS_LABEL[m.category]}: a place not found yet`}>
                    <Icon name={KIND_ICON_OF[m.category]} size={18} color={KIND_COLOR[m.category]} />
                    <Text style={styles.qMark}>?</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {props.finds.length > 0 && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Found</Text>
              <View testID="atlas-found">
                {props.finds.map((f, i) => (
                  <View key={`${f.name}-${i}`} style={styles.found}>
                    <Icon name={KIND_ICON_OF[f.category]} size={18} color={KIND_COLOR[f.category]} />
                    <Text style={styles.foundName}>{f.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {props.nextDoor.length > 0 && (
            <View style={styles.sec}>
              <Text style={styles.secTitle} accessibilityRole="header">Next door</Text>
              <View style={styles.chips}>
                {props.nextDoor.map((n) => (
                  <Pressable key={n.area.key} testID="atlas-next-door" accessibilityRole="button" onPress={() => props.onPick(n.area.key)} style={styles.nb}
                    accessibilityLabel={`${n.area.name}, ${distanceWords(n.distanceM, false, fmt)} from here`}>
                    <Text style={styles.nbName}>{n.area.name}</Text>
                    <Text style={styles.muted}>{distanceWords(n.distanceM, false, fmt)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {props.here ? (
            <Text style={[styles.you, styles.hereLine]}>You’re in {area.name}</Text>
          ) : props.walkTo ? (
            <Button testID="atlas-walk" label={`Walk to ${props.walkTo.label}`} onPress={props.onWalk} busy={props.starting} busyLabel="Starting…" />
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  card: {
    position: 'absolute', left: 0, right: 0, bottom: 0, top: '14%', backgroundColor: theme.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxWidth: 640, width: '100%', alignSelf: 'center', overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.line },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: theme.muted },
  name: { fontSize: 26, fontWeight: '800', color: theme.ink },
  youRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  you: { fontSize: 14, color: theme.ink },
  known: { color: COLORS.trace, fontWeight: '600' },
  muted: { fontSize: 13, color: theme.muted },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  body: { padding: 18, gap: 20, paddingBottom: 32 },
  bigMap: { width: '100%', maxWidth: 346, alignSelf: 'center', aspectRatio: 4 / 3, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.line },
  sec: { gap: 6 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  secTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: theme.muted },
  howBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  howText: { fontSize: 13, fontWeight: '600', color: theme.accent },
  explain: { backgroundColor: theme.bg, borderRadius: 12, padding: 12, gap: 4 },
  explainText: { fontSize: 13, color: theme.ink, lineHeight: 18, marginBottom: 4 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepName: { fontSize: 13, color: theme.ink },
  stepVals: { fontSize: 13, color: theme.muted, fontVariant: ['tabular-nums'] },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  faint: { opacity: 0.45 },
  kindName: { fontSize: 15, color: theme.ink, fontWeight: '500' },
  kindWord: { fontSize: 13, color: theme.muted, flex: 1 },
  bars: { flexDirection: 'row', gap: 3 },
  bar: { width: 18, height: 6, borderRadius: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(214,38,140,0.12)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  busyLine: { width: 10, height: 3, borderRadius: 2, backgroundColor: HOTSPOT },
  busyText: { fontSize: 13, fontWeight: '600', color: HOTSPOT_INK },
  q: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.6, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  qMark: { position: 'absolute', top: -4, right: -4, fontSize: 11, fontWeight: '800', color: theme.ink, backgroundColor: theme.surface, borderRadius: 8, paddingHorizontal: 3, overflow: 'hidden' },
  found: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  foundName: { fontSize: 15, color: theme.ink, fontWeight: '500' },
  nb: { backgroundColor: theme.bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13, flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 44 },
  nbName: { fontSize: 14, fontWeight: '600', color: theme.ink },
  hereLine: { color: COLORS.route, fontWeight: '600', textAlign: 'center' },
});
