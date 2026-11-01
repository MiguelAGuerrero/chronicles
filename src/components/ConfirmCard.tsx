import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ConfirmText } from '../lib/deletion/core';
import { focusOn } from '../lib/focus';
import { Button, theme } from './ui';

/**
 * Asks before a delete and says what goes (D4). A plain overlay, not a Modal,
 * so it can sit inside the capture viewer (iOS can't present a Modal over a
 * Modal). Tapping outside or Cancel keeps everything; Back and Escape are the
 * host Modal's `onRequestClose`.
 */
export function ConfirmCard(props: { text: ConfirmText; onConfirm: () => void; onCancel: () => void; testID?: string }) {
  const titleRef = useRef<ComponentRef<typeof Text>>(null);
  useEffect(() => {
    focusOn(titleRef);
  }, []);
  return (
    <View style={styles.back} accessibilityViewIsModal testID={props.testID}>
      <Pressable style={StyleSheet.absoluteFill} onPress={props.onCancel} accessible={false} />
      <View style={styles.card}>
        <Text ref={titleRef} style={styles.title} accessibilityRole="header">{props.text.title}</Text>
        <Text style={styles.body}>{props.text.body}</Text>
        <View style={styles.row}>
          <Button testID="confirm-cancel" variant="secondary" style={styles.flex} label="Cancel" onPress={props.onCancel} />
          <Button testID="confirm-delete" variant="danger" style={styles.flex} label={props.text.confirm} onPress={props.onConfirm} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 16, zIndex: 20 },
  card: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 20, gap: 10, width: '100%', maxWidth: 420 },
  title: { fontSize: 18, fontWeight: '700', color: theme.ink },
  body: { fontSize: 15, lineHeight: 21, color: theme.ink },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  flex: { flex: 1 },
});
