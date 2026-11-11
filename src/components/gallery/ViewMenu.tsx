import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MENU_GRID, MENU_SHOW, MENU_SIZE, MENU_SORT, ORDER_LABEL, SHAPE_LABEL, SHOW_LABEL, ZOOM_IN, ZOOM_OUT } from '../../lib/gallery/copy';
import type { GalleryView, Order, Shape, Show } from '../../lib/gallery/types';
import { zoomed } from '../../lib/gallery/view';
import { Icon } from '../icons';
import { Modal } from '../Modal';
import { theme } from '../ui';

/**
 * The gallery's View menu (MG9, MG18, MG20, MG21), iOS Photos' Sort and View Options in one sheet: Sort, Show, Size
 * and Grid. Chosen items are checked radios (MG15); a choice applies at once and the sheet stays, as a menu of
 * settings does; Done closes it.
 */
export function ViewMenu(props: {
  open: boolean;
  view: GalleryView;
  show: Show;
  /** Size is for Days only: Months and Years have no grid to size. */
  sizable: boolean;
  onClose: () => void;
  onOrder: (o: Order) => void;
  onShow: (s: Show) => void;
  onZoom: (dir: 'in' | 'out') => void;
  onShape: (s: Shape) => void;
}) {
  const radio = (id: string, label: string, on: boolean, pick: () => void) => (
    <Pressable
      key={id}
      testID={`gallery-menu-${id}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      onPress={pick}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      {on ? <Icon name="checkmark" size={20} color={theme.ink} /> : null}
    </Pressable>
  );
  const step = (dir: 'in' | 'out', label: string) => {
    const can = props.sizable && zoomed(props.view.size, dir) != null;
    return (
      <Pressable
        key={dir}
        testID={`gallery-menu-zoom-${dir}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !can }}
        disabled={!can}
        onPress={() => props.onZoom(dir)}
        style={({ pressed }) => [styles.item, pressed && styles.pressed, !can && styles.dim]}
      >
        <Text style={styles.label}>{label}</Text>
        <Icon name={dir === 'in' ? 'add' : 'remove'} size={20} color={theme.ink} />
      </Pressable>
    );
  };
  return (
    <Modal visible={props.open} transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.back}>
        <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} accessible={false} />
        <View style={styles.sheet} testID="gallery-menu" accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.section} accessibilityRole="header">{MENU_SORT}</Text>
            <View accessibilityRole="radiogroup">{(['newest', 'oldest'] as const).map((o) => radio(`order-${o}`, ORDER_LABEL[o], props.view.order === o, () => props.onOrder(o)))}</View>
            <Text style={styles.section} accessibilityRole="header">{MENU_SHOW}</Text>
            <View accessibilityRole="radiogroup">{(['all', 'photo', 'video', 'voice'] as const).map((s) => radio(`show-${s}`, SHOW_LABEL[s], props.show === s, () => props.onShow(s)))}</View>
            <Text style={styles.section} accessibilityRole="header">{MENU_SIZE}</Text>
            {step('in', ZOOM_IN)}
            {step('out', ZOOM_OUT)}
            <Text style={styles.section} accessibilityRole="header">{MENU_GRID}</Text>
            <View accessibilityRole="radiogroup">{(['square', 'aspect'] as const).map((s) => radio(`shape-${s}`, SHAPE_LABEL[s], props.view.shape === s, () => props.onShape(s)))}</View>
          </ScrollView>
          <Pressable testID="gallery-menu-done" accessibilityRole="button" onPress={props.onClose} style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(20,24,32,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8, paddingBottom: 20, width: '100%', maxWidth: 640, alignSelf: 'center', maxHeight: '85%' },
  body: { paddingHorizontal: 12, paddingBottom: 4 },
  section: { color: theme.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  item: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderRadius: 12 },
  pressed: { backgroundColor: theme.bg },
  dim: { opacity: 0.4 },
  label: { color: theme.ink, fontSize: 16 },
  done: { minHeight: 48, marginHorizontal: 24, marginTop: 8, borderRadius: 999, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: theme.bg, fontSize: 16, fontWeight: '600' },
});
