import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labelFor } from '../../lib/resurface/lines';
import type { ContextEntry } from '../../lib/resurface/shell';
import type { Pick } from '../../lib/resurface/types';
import { contextText, momentSpoken } from '../chronicle/MomentCard';
import { MomentPicture } from '../chronicle/MomentPicture';
import { Icon } from '../icons';
import { theme } from '../ui';
import { OWNER_FONT } from './type';

/**
 * The moment brought back, as a slip on today's page (chronicle journal JN20): why it is here and where and when
 * it was, in the app's voice; its own words or picture; a tap opens it. Relive it, Another and the rest are in
 * More. It never asks for anything, and it keeps its place while an entry is written.
 */
export function Slip(props: { pick: Pick; now: number; context?: ContextEntry; onOpen: () => void; onMore: () => void }) {
  const { moment: m, reason } = props.pick;
  const label = labelFor(reason, m.t, props.now);
  const where = contextText(props.context, m, props.now);
  const picture = m.kind === 'photo' || m.kind === 'video';
  return (
    <View style={styles.slip} testID="resurfaced">
      <Pressable testID="resurfaced-open" accessibilityRole="button" accessibilityLabel={`${label}. ${momentSpoken(m, props.now, props.context)}. Open`} onPress={props.onOpen} style={styles.body}>
        <Text style={styles.app} testID="resurfaced-label">{label}</Text>
        <View style={styles.row}>
          {picture && <MomentPicture capture={m.capture} style={styles.picture} iconSize={22} />}
          {m.words ? (
            <Text style={styles.words} numberOfLines={3}>{m.words}</Text>
          ) : (
            <Text style={styles.plain}>{m.kind === 'voice' ? 'A voice note' : picture ? '' : 'A moment you kept'}</Text>
          )}
        </View>
        <Text style={styles.app} numberOfLines={2} testID="resurfaced-context">{where}</Text>
      </Pressable>
      <Pressable testID="resurfaced-more" accessibilityRole="button" accessibilityLabel="More about this moment" onPress={props.onMore} style={styles.more}>
        <Icon name="ellipsis-horizontal" size={18} color={theme.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slip: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.edge, marginTop: 6, marginBottom: 4 },
  body: { flex: 1, paddingVertical: 12, gap: 6, minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  picture: { width: 56, height: 56 },
  app: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  words: { flex: 1, color: theme.ink, fontFamily: OWNER_FONT, fontStyle: 'italic', fontSize: 17, lineHeight: 25 },
  plain: { flex: 1, color: theme.ink, fontSize: 15 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
});
