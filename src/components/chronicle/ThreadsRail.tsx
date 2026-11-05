import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { threadLine } from '../../lib/resurface/lines';
import type { MomentView, Thread } from '../../lib/resurface/types';
import { theme } from '../ui';
import { MomentPicture } from './MomentPicture';

/**
 * Things the user keeps coming back to (RM14): a tile per thread, its name in
 * the user's word and a line in words. Absent when there are none.
 */
export function ThreadsRail(props: { threads: Thread[]; moments: Map<string, MomentView>; now: number; onOpen: (t: Thread) => void }) {
  if (!props.threads.length) return null;
  return (
    <View style={styles.sec} testID="threads-rail">
      <View>
        <Text style={styles.h} accessibilityRole="header">Threads</Text>
        <Text style={styles.sub}>Things you keep coming back to</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll} role="list">
        {props.threads.map((t) => {
          const photo = t.momentIds.map((id) => props.moments.get(id)).find((m) => m?.kind === 'photo');
          const line = threadLine(t, props.now);
          return (
            <View key={t.term} role="listitem">
            <Pressable testID="thread-tile" accessibilityRole="button" accessibilityLabel={`${t.name}. ${line}`} onPress={() => props.onOpen(t)} style={styles.tile}>
              {photo ? <MomentPicture capture={photo.capture} style={styles.art} /> : <View style={[styles.art, styles.plain]} />}
              <View style={styles.tx}>
                <Text style={styles.name} numberOfLines={1}>{t.name}</Text>
                <Text style={styles.line} numberOfLines={2}>{line}</Text>
              </View>
            </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sec: { gap: 10 },
  h: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  sub: { color: theme.muted, fontSize: 13 },
  scroll: { marginHorizontal: -16 },
  row: { paddingHorizontal: 16, gap: 10 },
  tile: { width: 148, backgroundColor: theme.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.line, overflow: 'hidden' },
  art: { height: 84, width: '100%' },
  plain: { backgroundColor: '#f1dccf' },
  tx: { padding: 10, gap: 2 },
  name: { color: theme.ink, fontSize: 15, fontWeight: '700' },
  line: { color: theme.muted, fontSize: 12.5 },
});
