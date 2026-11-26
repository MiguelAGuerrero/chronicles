import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Kind } from '../../lib/discovery/types';
import { INTO_HINT, INTO_TITLE } from '../../lib/explore/intoPage';
import { KINDS_SHEET_TITLE, kindsSheet, kindsSheetBody } from '../../lib/explore/placeCard';
import { useExploreSettings } from '../../lib/explore/useExploreSettings';
import { Modal } from '../Modal';
import { PageRow } from '../PageRow';
import { SwitchRow } from '../SwitchRow';
import { theme } from '../ui';

/**
 * A place's kinds, from its card's More (specs/poi-hide-from-card HK2-HK4, HK7, HK10; decision 0254, the owner's redraw):
 * "Show on the map" with Done, the kind as a title row and its subtype as a subtitle row, each the switch What I'm into
 * shows and saved at once (`setKind`: `withKind`, `saveSettings`; the walk hears `onSettings`), the sheet staying up; then
 * "What I’m into ›". It never names the place. Done, the dimmed map, Back and Escape close it (the Modal's
 * `onRequestClose`: Android's Back, the web's Escape while it is up). No switch is drawn until the reader's choices are
 * read (WI9); a failed read says What I'm into's sentence. No icon, no count (HK8).
 */
export function PlaceKinds(props: { kind: Kind | null; onClose: (hidden: ReadonlySet<Kind> | null) => void; onInto: (at: Kind) => void }) {
  const { settings, failed, setKind } = useExploreSettings();
  const kind = props.kind;
  if (!kind) return null;
  const body = kindsSheetBody(settings, failed);
  const sheet = kindsSheet(kind, settings?.hidden ?? new Set());
  const close = () => props.onClose(settings?.hidden ?? null);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.back}>
        <Pressable testID="kinds-sheet-dim" style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        <View style={styles.sheet} testID="kinds-sheet" accessibilityViewIsModal>
          <View style={styles.headRow}>
            <Text style={styles.heading} accessibilityRole="header">{KINDS_SHEET_TITLE}</Text>
            <Pressable testID="kinds-sheet-done" accessibilityRole="button" onPress={close} style={styles.done}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          {body.rows
            ? sheet.rows.map((r) => (
                <View key={r.id} style={styles.cell}>
                  <SwitchRow
                    testID={`kind-sheet-${r.id}`}
                    label={r.label}
                    hint={r.hint}
                    value={r.on}
                    disabled={r.locked}
                    heavy={r.heavy}
                    indent={r.depth}
                    indentStep={16}
                    onChange={(on) => setKind(r.id, on)}
                  />
                </View>
              ))
            : null}
          {body.line ? (
            <Text testID="kinds-sheet-unread" style={styles.unread} accessibilityLiveRegion="polite">
              {body.line}
            </Text>
          ) : null}
          <View style={styles.rule} />
          <View style={styles.cell}>
            <PageRow testID="kinds-sheet-into" label={INTO_TITLE} hint={INTO_HINT} onOpen={() => props.onInto(sheet.at)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(20,24,32,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 12, paddingBottom: 24, gap: 2, width: '100%', maxWidth: 640, alignSelf: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { flex: 1, color: theme.ink, fontSize: 16, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 10 },
  // poi-hide-from-card audit 16 (the owner, Nov 25, "48 everywhere"): Done is 48 on both platforms.
  done: { minHeight: 48, minWidth: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  cell: { paddingHorizontal: 12 },
  unread: { fontSize: 15, lineHeight: 21, color: theme.muted, paddingHorizontal: 12, paddingVertical: 8 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.line, marginHorizontal: 12, marginVertical: 4 },
});
