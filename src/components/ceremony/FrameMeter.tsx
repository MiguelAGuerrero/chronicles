import { useSyncExternalStore } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { Meter } from '../../lib/ceremony/meter';
import { theme } from '../ui';

/**
 * The frames a replay really draws, said once a second under Hold (replay ceremony RC6): for the owner's looks at the
 * engine on a phone, at the preview address only (`lib/ceremony/meter`). It renders once a second, by itself; the
 * screen above it does not.
 */
export function FrameMeter({ meter, top }: { meter: Meter; top: number }) {
  const line = useSyncExternalStore(meter.subscribe, meter.line, meter.line);
  if (!line) return null;
  return (
    <Text testID="replay-meter" pointerEvents="none" accessible={false} style={[styles.line, { top }]}>
      {line}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', left: 12, maxWidth: 150, backgroundColor: theme.glass, color: theme.ink, fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
});
