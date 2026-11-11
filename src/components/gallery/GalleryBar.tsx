import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ONLY, SHOW_ALL, VIEW_MENU, ZOOM_LABEL } from '../../lib/gallery/copy';
import type { Show, Zoom } from '../../lib/gallery/types';
import { Icon } from '../icons';
import { theme } from '../ui';

const ZOOMS: Zoom[] = ['years', 'months', 'days'];

/**
 * The gallery's slim bar (MG9, MG19): Years, Months, Days as a segmented control, the View menu's button, and with a
 * kind chosen, which one in words with a way back to all.
 */
export function GalleryBar(props: { zoom: Zoom; show: Show; onZoom: (z: Zoom) => void; onMenu: () => void; onShowAll: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <View style={styles.segments} accessibilityRole="tablist" testID="gallery-zoom">
          {ZOOMS.map((z) => {
            const on = props.zoom === z;
            return (
              <Pressable
                key={z}
                testID={`gallery-zoom-${z}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                aria-selected={on}
                onPress={() => props.onZoom(z)}
                style={[styles.segment, on && styles.segmentOn]}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={1}>{ZOOM_LABEL[z]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable testID="gallery-view-menu" accessibilityRole="button" accessibilityLabel={VIEW_MENU} onPress={props.onMenu} style={styles.menu}>
          <Icon name="options-outline" size={22} color={theme.ink} />
        </Pressable>
      </View>
      {props.show !== 'all' ? (
        <View style={styles.only}>
          <Text testID="gallery-only" style={styles.onlyText}>{ONLY[props.show]}</Text>
          <Pressable testID="gallery-show-all" accessibilityRole="button" onPress={props.onShowAll} style={styles.showAll}>
            <Text style={styles.showAllText}>{SHOW_ALL}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: theme.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 6, width: '100%', maxWidth: 640, alignSelf: 'center' },
  segments: { flex: 1, flexDirection: 'row', backgroundColor: theme.line, borderRadius: 10, padding: 2 },
  segment: { flex: 1, minHeight: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: theme.surface },
  segmentText: { color: theme.muted, fontSize: 14, fontWeight: '600' },
  segmentTextOn: { color: theme.ink },
  menu: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  only: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4, width: '100%', maxWidth: 640, alignSelf: 'center' },
  onlyText: { color: theme.ink, fontSize: 14, fontWeight: '600' },
  showAll: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  showAllText: { color: theme.ink, fontSize: 14, textDecorationLine: 'underline' },
});
