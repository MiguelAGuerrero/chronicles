import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MemoryPreview } from '../MemoryPreview';
import { GUTTER } from '../walk/layout';
import type { Cards } from './useCards';
import type { WalkMemories } from './useWalkMemories';

/** A memory pin's preview (MR4), in the cards' slot; Open shows Memories here. */
export function MemoryCard(props: { mem: WalkMemories; cards: Cards; show: boolean; cardAt: StyleProp<ViewStyle> }) {
  const { memoryShown, setMemoryView } = props.mem;
  const { memory, setMemory } = props.cards;
  if (!memory || memoryShown.length === 0 || !props.show) return null;
  return (
    <View style={[styles.spotRow, props.cardAt]} pointerEvents="box-none">
      <MemoryPreview
        // A new pin's preview starts fresh: never the last pin's photo (audit 1).
        key={memoryShown[0].id}
        captures={memoryShown}
        walkLine={memory.result.context.get(memoryShown[0].id) ?? null}
        onOpen={() => {
          const r = { ...memory.result, captures: memoryShown };
          setMemory(null);
          setMemoryView(r);
        }}
        onClose={() => setMemory(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  spotRow: { position: 'absolute', left: GUTTER, right: GUTTER, alignItems: 'center' },
});
