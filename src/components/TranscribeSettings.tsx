import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { COPY } from '../lib/transcribe/core';
import { model } from '../lib/transcribe';
import { useStore } from '../lib/useStore';
import { SwitchRow } from './SwitchRow';
import { Button, theme } from './ui';

/**
 * The switch for memo transcripts, a row in the walk settings (MX10-MX15, MX27; the owner, Nov 11): off by default, a
 * dialog in words before anything comes down, the state said only while the switch is on or the row is open, and
 * Remove the model offered only on the owner's own turn-off. No count, no progress (MX23). Nothing is added to the
 * capture stack or the viewer's toolbar.
 */
export function TranscribeSettings() {
  const on = useStore(model.store, (s) => s.on);
  const asking = useStore(model.store, (s) => s.asking);
  const busy = useStore(model.store, (s) => s.busy);
  const size = useStore(model.store, (s) => s.size);
  const line = useStore(model.store, (s) => s.line);
  const supported = useStore(model.store, (s) => s.supported);
  const [removable, setRemovable] = useState(false);
  return (
    <View style={styles.wrap}>
      <SwitchRow
        testID="transcribe-switch"
        label={COPY.title}
        note={COPY.sub}
        value={on}
        onChange={(next) => {
          setRemovable(false);
          if (next) void model.turnOn();
          else void model.turnOff().then((offer) => setRemovable(offer.canRemove));
        }}
      />
      {asking ? (
        <View style={styles.panel} testID="transcribe-ask" accessibilityLiveRegion="polite">
          <Text style={styles.body}>{COPY.ask(size)}</Text>
          <View style={styles.row}>
            <Button testID="transcribe-notnow" variant="secondary" style={styles.flex} label={COPY.notNow} onPress={() => model.decline()} />
            <Button testID="transcribe-download" style={styles.flex} label={COPY.download} disabled={busy || !supported} onPress={() => void model.download()} />
          </View>
        </View>
      ) : null}
      {removable ? (
        <View style={styles.panel} testID="transcribe-removeask">
          <View style={styles.row}>
            <Button testID="transcribe-keep" variant="secondary" style={styles.flex} label={COPY.keep} onPress={() => setRemovable(false)} />
            <Button
              testID="transcribe-remove"
              variant="secondary"
              style={styles.flex}
              label={COPY.remove}
              onPress={() => {
                setRemovable(false);
                void model.remove();
              }}
            />
          </View>
        </View>
      ) : null}
      {line ? (
        <Pressable accessible={false} onPress={() => model.open(false)}>
          <Text style={styles.line} testID="transcribe-line" accessibilityLiveRegion="polite">{line}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  panel: { borderRadius: theme.radius, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, padding: 14, gap: 10 },
  body: { fontSize: 15, lineHeight: 21, color: theme.ink },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  line: { fontSize: 13, color: theme.muted },
});
