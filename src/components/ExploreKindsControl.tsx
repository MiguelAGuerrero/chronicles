// @layer view
import { useEffect, useRef, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { Kind } from '../lib/explore/explore';
import { panelBox } from '../lib/layers/layout';
import { focusOn } from '../lib/focus';
import { Icon } from './icons';
import { KindSwitches } from './ExploreSettings';
import { BUTTON, mapPanel } from './mapPanel';
import { theme } from './ui';

/**
 * What I'm into, on Explore's map (specs/explore-settings ES3-ES5): one round button under Layers in the map's edge column,
 * opening a card beside it with the walk settings' switch per kind. Inline, never a `Modal`, the same card as Layers. The button
 * looks the same however many kinds are off: its glyph never changes, there is no dot or fill (ES3, the vision's counts-as-words).
 * `hidden` is null until the saved choice has loaded; the switches wait for it.
 */
export function ExploreKindsControl(props: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  hidden: Set<Kind> | null;
  onKind: (k: Kind, on: boolean) => void;
  top: number;
  right: number;
  paneWidth?: number;
  clearBottom: number;
}) {
  const { open, onClose } = props;
  const { height: winH } = useWindowDimensions();
  const button = useRef<ComponentRef<typeof Pressable>>(null);
  const wasOpen = useRef(false);
  const box = panelBox({ windowW: 0, windowH: winH, buttonTop: props.top, right: props.right, paneWidth: props.paneWidth ?? 640, clearBottom: props.clearBottom });
  // A panel left open never follows the person to another screen: it closes when its button goes.
  useEffect(() => onClose, [onClose]);
  // Focus goes back to the button when the panel closes (ES5).
  useEffect(() => {
    if (wasOpen.current && !open) focusOn(button);
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    // As Layers: the Escape that closes the panel stops here, so a town's page does not also act on it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <>
      <Pressable
        ref={button}
        testID="kinds"
        accessibilityRole="button"
        accessibilityLabel={'What I’m into'}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={props.onToggle}
        style={({ pressed }) => [mapPanel.btn, { right: props.right, top: props.top }, pressed && mapPanel.pressed]}
      >
        <Icon name="funnel-outline" size={22} color={theme.ink} />
      </Pressable>
      {open ? (
        <View testID="kinds-panel" accessibilityLabel={'What I’m into'} role="group" style={[mapPanel.card, styles.card, { right: props.right + BUTTON + 8, top: props.top, width: box.width, maxHeight: box.maxHeight }]}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View style={styles.rows}>
              <KindSwitches hidden={props.hidden ?? new Set()} onToggle={props.onKind} disabled={props.hidden === null} />
            </View>
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {},
  /** The rows keep off the card's edges, as Layers' do. */
  rows: { paddingHorizontal: 8 },
});
