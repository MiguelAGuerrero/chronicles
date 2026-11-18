import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMPLEX_NOTE, switchLabel } from '../lib/complexes/kinds';
import { COMPLEX_KINDS } from '../lib/complexes/types';
import { useHiddenKinds } from '../lib/complexes/useComplexes';
import { KINDS } from '../lib/explore/explore';
import { COMPLEX_ICON, INTO_TITLE, intoChildren, intoMeasures, intoPin, intoSections, type IntoChild, type IntoMeasures, type IntoPin } from '../lib/explore/intoPage';
import { useExploreSettings } from '../lib/explore/useExploreSettings';
import { focusOn } from '../lib/focus';
import { createStore, type Store } from '../lib/store';
import { useStore } from '../lib/useStore';
import type { IconName } from './icons';
import { SwitchRow } from './SwitchRow';
import { theme } from './ui';

/**
 * The page's title in the stack's header (WI4, WI14): a header, and where focus starts as the page opens.
 */
export function IntoTitle() {
  const ref = useRef<ComponentRef<typeof Text>>(null);
  useEffect(() => {
    const t = setTimeout(() => focusOn(ref), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <Text ref={ref} testID="into-title" accessibilityRole="header" style={styles.title} numberOfLines={1} {...{ tabIndex: -1 }}>
      {INTO_TITLE}
    </Text>
  );
}

/**
 * What I'm into, its own page (specs/what-im-into-page, decision 0192): a switch per kind under the five categories'
 * headings, then Complexes' (WI15); each heading stays pinned on its own ground while its rows scroll under it (WI5), the
 * next taking its place. Each switch saves as it changes, with no Save (WI8). Nothing is drawn until the settings are
 * read (WI9). No heading or row carries a number (WI12, XS19).
 *
 * Two levels pinned (WI17, the owner, Nov 18): the platforms' sticky headers carry one level (on a phone each pushes the
 * last out; a kind row made sticky too would push its category out, not stack under it), so the kind whose subtypes
 * pass under the heading is the heading's second line, from the scroll position (`intoPin`), on the web and on a phone.
 * The heading keeps one height with or without it. On the web the pinned headings are CSS sticky, all at the top of one
 * box, so they stack: the outgoing one is pushed up by the incoming one and those under it are hidden (WI22), as a phone
 * does by itself. The scroll position reaches only the headings (a small store), never the rows.
 */
/** `onWidth`: the page's own width, so the route can fit its header to it (WI21). */
export function IntoPage(props: { onWidth?: (width: number) => void }) {
  const { settings, setKind } = useExploreSettings();
  const complexes = useHiddenKinds();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [width, setWidth] = useState<number | null>(null);
  const [pin] = useState(() => createStore<IntoPin>({ at: 0, push: 0, stuck: false, kind: null }));
  const heights = useRef(new Map<string, number>());
  const scrollY = useRef(0);
  const laid = useRef<{ children: IntoChild[]; m: IntoMeasures } | null>(null);
  const m = intoMeasures(width ?? win.width, win.fontScale);
  const built = settings ? intoChildren(intoSections(KINDS, settings.hidden), COMPLEX_KINDS) : null;
  const repin = () => {
    const now = laid.current;
    if (!now) return;
    const hs = now.children.map((c) => (c.type === 'heading' ? now.m.headingH : (heights.current.get(keyOf(c)) ?? 48)));
    const next = intoPin(now.children, hs, scrollY.current, now.m.headingH);
    const cur = pin.get();
    if (cur.at !== next.at || cur.push !== next.push || cur.stuck !== next.stuck || cur.kind !== next.kind) pin.set(next);
  };
  useEffect(() => {
    laid.current = built ? { children: built.children, m } : null;
    repin();
  });
  const measured = (key: string) => (e: LayoutChangeEvent) => {
    heights.current.set(key, e.nativeEvent.layout.height);
    repin();
  };
  // The page's own width, from its first draw (WI21): React reuses this View for the full page, and a reused View never
  // reports onLayout on the web, so the placeholder measures too.
  const sized = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
    props.onWidth?.(e.nativeEvent.layout.width);
  };
  if (!settings || !built) return <View testID="into-page" style={styles.page} onLayout={sized} />;
  const { children, sticky } = built;
  const cell = { paddingHorizontal: m.pad };
  const draw = (c: IntoChild) => {
    const key = keyOf(c);
    switch (c.type) {
      case 'heading':
        return <Heading key={key} id={c.id} label={c.label} ord={sticky.indexOf(children.indexOf(c))} pin={pin} m={m} />;
      case 'row':
        return (
          <View key={key} style={cell} onLayout={measured(key)}>
            <SwitchRow
              testID={`kind-${c.row.id}`}
              icon={m.icon ? (c.row.icon as IconName) : undefined}
              label={c.row.label}
              note={c.row.note}
              hint={c.row.hint}
              value={c.row.on}
              disabled={c.row.locked}
              indent={c.row.depth}
              indentStep={m.indent}
              gap={m.gap}
              heavy={c.row.heavy}
              onChange={(on) => setKind(c.row.id, on)}
            />
          </View>
        );
      case 'note':
        return (
          <View key={key} style={cell} onLayout={measured(key)}>
            <Text style={styles.note}>{COMPLEX_NOTE}</Text>
          </View>
        );
      case 'complex': {
        const k = c.kind;
        const { hidden, set } = complexes;
        // WI23: laid out as a kind row is, an icon and the label at the same start.
        return (
          <View key={key} style={cell} onLayout={measured(key)}>
            <SwitchRow testID={`complex-kind-${k}`} icon={m.icon ? (COMPLEX_ICON[k] as IconName) : undefined} label={switchLabel(k)} value={!hidden.includes(k)} heavy gap={m.gap} onChange={(on) => set(on ? hidden.filter((x) => x !== k) : [...hidden, k])} />
          </View>
        );
      }
    }
  };
  return (
    <View testID="into-page" style={styles.page} onLayout={sized}>
      <ScrollView
        stickyHeaderIndices={sticky}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
          repin();
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {children.map(draw)}
      </ScrollView>
    </View>
  );
}

const keyOf = (c: IntoChild): string => (c.type === 'heading' ? `h-${c.id}` : c.type === 'row' ? c.row.id : c.type === 'note' ? 'complex-note' : `c-${c.kind}`);

/**
 * A section's heading (WI5, WI14, WI17, WI22, WI24): its own ground at one height, the category in ink, larger than a
 * kind's label (WI23), and while it is pinned over a kind's subtypes, that kind's name under it. A screen reader hears
 * the category alone. A hairline under it while rows pass under it. Only it reads the scroll position.
 */
function Heading(props: { id: string; label: string; ord: number; pin: Store<IntoPin>; m: IntoMeasures }) {
  const { ord, pin, m } = props;
  const kind = useStore(pin, (s) => (s.at === ord ? s.kind : null));
  const push = useStore(pin, (s) => (s.at === ord ? s.push : 0));
  const stuck = useStore(pin, (s) => s.at === ord && s.stuck);
  const covered = useStore(pin, (s) => ord < s.at);
  const web = Platform.OS === 'web';
  return (
    <View
      testID={`kind-heading-${props.id}`}
      accessible
      accessibilityRole="header"
      accessibilityLabel={props.label}
      style={[
        styles.heading,
        { height: m.headingH, paddingHorizontal: m.pad },
        stuck && styles.headingStuck,
        web && push < 0 && { transform: [{ translateY: push }] },
        web && covered && styles.hidden,
      ]}
    >
      <Text testID="heading-label" style={styles.headingText} numberOfLines={m.headingLines}>{props.label}</Text>
      {kind ? (
        <Text testID="heading-kind" style={styles.headingKind} numberOfLines={1}>
          › {kind}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  title: { fontSize: 17, fontWeight: '600', color: theme.ink },
  // Its own ground, at one height, the full width (WI5): the rows pass under it. Ink, bold and larger than a kind's label
  // (XS2, explore-subtypes audit 16, WI23); the text at its foot, so a second line grows upward into the space above.
  heading: { justifyContent: 'flex-end', paddingBottom: 6, backgroundColor: theme.bg, borderBottomWidth: 0, borderBottomColor: theme.line },
  headingStuck: { borderBottomWidth: StyleSheet.hairlineWidth },
  hidden: { opacity: 0 },
  headingText: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: theme.ink },
  headingKind: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: theme.ink },
  note: { fontSize: 13, color: theme.muted, marginBottom: 4 },
});
