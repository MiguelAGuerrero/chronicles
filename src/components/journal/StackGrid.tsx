import { Pressable, StyleSheet, Text, View } from 'react-native';
import { clockOf, facedAt, pieceWhen } from '../../lib/moment';
import type { MomentView } from '../../lib/resurface/types';
import type { Capture } from '../../lib/types';
import { MomentPicture } from '../chronicle/MomentPicture';
import { Icon } from '../icons';
import { theme } from '../ui';
import { OWNER_FONT } from './type';

const GAP = 4;

/**
 * A stack as a gallery (decision 0197, SW12): every piece as a square tile in capture order, three to a row, each with
 * its own time in words, under the entry's dateline, which says where. No tile or label gives a count or a position
 * (SW13). A tile opens the viewer on that piece.
 */
export function StackGrid(props: { moment: MomentView; onOpenPiece: (pieceId: string) => void; onTakeOut: (pieceId: string) => void }) {
  const m = props.moment;
  return (
    <View style={styles.grid} testID="stack-grid">
      {m.capture.pieces.map((p, i) => (
        <View key={p.id} style={styles.cell}>
          <Tile piece={p} moment={m} onOpen={() => props.onOpenPiece(p.id)} />
          {/* A piece joined by mistake can be taken out (SW21); the first piece is the moment itself. */}
          {i > 0 ? (
            <Pressable testID="grid-take-out" accessibilityRole="button" accessibilityLabel={`Take out the ${KIND_NAME[p.kind].toLowerCase()} made ${pieceWhen(m, p) ?? clockOf(p.t)}`} onPress={() => props.onTakeOut(p.id)} style={styles.takeOut}>
              <Text style={styles.takeOutText}>Take out</Text>
            </Pressable>
          ) : <View style={styles.takeOut} />}
        </View>
      ))}
    </View>
  );
}

const KIND_NAME = { photo: 'Photo', video: 'Video', voice: 'Voice note', text: 'Note' } as const;

function Tile({ piece: p, moment: m, onOpen }: { piece: Capture; moment: MomentView; onOpen: () => void }) {
  const when = pieceWhen(m, p) ?? clockOf(p.t);
  return (
    <Pressable testID="grid-tile" accessibilityRole="button" accessibilityLabel={`${KIND_NAME[p.kind]}, ${when}. Opens the moment`} onPress={onOpen} style={styles.tile}>
      {p.kind === 'photo' || p.kind === 'video' ? (
        <MomentPicture capture={facedAt(m.capture, p.id)} style={styles.fill} iconSize={28} />
      ) : p.kind === 'voice' ? (
        <View style={[styles.fill, styles.plain]}>
          <Icon name="mic-outline" size={26} color={theme.ink} />
          <Text style={styles.small}>A voice note</Text>
        </View>
      ) : (
        <View style={[styles.fill, styles.plain, styles.note]}>
          <Text style={styles.words} numberOfLines={5}>{p.body ?? ''}</Text>
        </View>
      )}
      <Text style={styles.when} numberOfLines={1}>{when}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: 8 },
  // Three to a row: a third of the width less the gaps, never under 88 px on a 320 px phone (SW18).
  cell: { width: '32%', minWidth: 88 },
  takeOut: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  takeOutText: { color: theme.ink, fontSize: 12, fontWeight: '600' },
  tile: { width: '100%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: theme.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.edge, minWidth: 88 },
  fill: { width: '100%', height: '100%' },
  plain: { alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
  note: { alignItems: 'flex-start', justifyContent: 'flex-start' },
  words: { color: theme.ink, fontFamily: OWNER_FONT, fontSize: 13, lineHeight: 17 },
  small: { color: theme.muted, fontSize: 11 },
  when: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 5, paddingVertical: 2, fontSize: 10.5, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.6)' },
});
