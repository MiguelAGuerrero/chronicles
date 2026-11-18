import { useEffect, useRef, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMPLEX_NOTE, switchLabel } from '../lib/complexes/kinds';
import { COMPLEX_KINDS } from '../lib/complexes/types';
import { useHiddenKinds } from '../lib/complexes/useComplexes';
import { KINDS } from '../lib/explore/explore';
import { INTO_TITLE, intoChildren, intoSections, type IntoChild } from '../lib/explore/intoPage';
import { useExploreSettings } from '../lib/explore/useExploreSettings';
import { focusOn } from '../lib/focus';
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
 * On the web the pinned headings are CSS sticky, all at the top of one box, so they stack, the last drawn on top: an
 * opaque ground and one height each make the stack read as one heading pushing the last out, as on a phone.
 */
export function IntoPage() {
  const { settings, setKind } = useExploreSettings();
  const complexes = useHiddenKinds();
  const insets = useSafeAreaInsets();
  if (!settings) return <View testID="into-page" style={styles.page} />;
  const { children, sticky } = intoChildren(intoSections(KINDS, settings.hidden), COMPLEX_KINDS);
  const draw = (c: IntoChild) => {
    switch (c.type) {
      case 'heading':
        return (
          <View key={`h-${c.id}`} testID={`kind-heading-${c.id}`} accessible accessibilityRole="header" style={styles.heading}>
            <Text style={styles.headingText} numberOfLines={1}>{c.label}</Text>
          </View>
        );
      case 'row':
        return (
          <View key={c.row.id} style={styles.cell}>
            <SwitchRow
              testID={`kind-${c.row.id}`}
              icon={c.row.icon as IconName}
              label={c.row.label}
              hint={c.row.hint}
              value={c.row.on}
              disabled={c.row.locked}
              indent={c.row.depth}
              heavy={c.row.heavy}
              onChange={(on) => setKind(c.row.id, on)}
            />
          </View>
        );
      case 'note':
        return (
          <View key="complex-note" style={styles.cell}>
            <Text style={styles.note}>{COMPLEX_NOTE}</Text>
          </View>
        );
      case 'complex': {
        const k = c.kind;
        const { hidden, set } = complexes;
        return (
          <View key={`c-${k}`} style={styles.cell}>
            <SwitchRow testID={`complex-kind-${k}`} label={switchLabel(k)} value={!hidden.includes(k)} heavy onChange={(on) => set(on ? hidden.filter((x) => x !== k) : [...hidden, k])} />
          </View>
        );
      }
    }
  };
  return (
    <View testID="into-page" style={styles.page}>
      <ScrollView stickyHeaderIndices={sticky} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {children.map(draw)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  title: { fontSize: 17, fontWeight: '600', color: theme.ink },
  // Its own ground, at one height, the full width (WI5): the rows pass under it. Ink, bold, no smaller than the rows
  // (XS2, explore-subtypes audit 16).
  heading: { minHeight: 48, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 6, backgroundColor: theme.bg },
  headingText: { fontSize: 15, fontWeight: '700', color: theme.ink },
  cell: { paddingHorizontal: 16 },
  note: { fontSize: 13, color: theme.muted, marginBottom: 4 },
});
