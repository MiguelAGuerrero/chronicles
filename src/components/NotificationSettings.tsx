import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { NOTICE_KINDS, notifier, type NoticePrefs, type Permission } from '../lib/notify';
import { Button, theme } from './ui';

/** What the section says about permission (NT5), per platform; nothing when it is granted. */
function permissionNote(p: Permission | null): string | null {
  switch (p) {
    case 'denied':
      return Platform.OS === 'web'
        ? 'Notifications are blocked for this site. Allow them in your browser’s site settings.'
        : 'Notifications are off for Chronicles. Turn them on in your phone’s Settings.';
    case 'unsupported':
      return 'This browser can’t show notifications. On an iPhone, add Chronicles to your Home Screen (Share, then Add to Home Screen) and open it from there.';
    case 'default':
      return 'You’ll be asked the first time one is needed.';
    default:
      return null;
  }
}

/**
 * Settings' Notifications section (NT4-NT6, NT10): a switch per kind, where
 * permission stands, and a test notification to see how one looks. The
 * switches are saved with the panel's Done; turning one on asks for
 * permission, from the tap.
 */
export function NotificationSettings({ value, onChange }: { value: NoticePrefs; onChange: (p: NoticePrefs) => void }) {
  const [perm, setPerm] = useState<Permission | null>(null);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    let alive = true;
    notifier.permission().then((p) => alive && setPerm(p), () => {});
    return () => {
      alive = false;
    };
  }, []);
  const note = permissionNote(perm);
  return (
    <View testID="notify-settings" style={{ gap: 2 }}>
      <Text style={styles.section}>Notifications</Text>
      {NOTICE_KINDS.map((k) => (
        <View key={k.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>{k.label}</Text>
            <Text style={styles.sub}>
              {k.note}
              {k.id === 'pause' && Platform.OS === 'web' ? ' In a browser it can only arrive while the page is still open.' : ''}
            </Text>
          </View>
          <Switch
            testID={`notify-${k.id}`}
            accessibilityLabel={k.label}
            value={value[k.id]}
            onValueChange={(on) => {
              onChange({ ...value, [k.id]: on });
              if (on) notifier.ask().then(setPerm, () => {});
            }}
          />
        </View>
      ))}
      {note ? <Text testID="notify-permission" style={styles.sub}>{note}</Text> : null}
      <View style={styles.testRow}>
        <Button
          testID="notify-test"
          variant="secondary"
          label="Send a test notification"
          disabled={perm === 'unsupported' || perm === 'denied'}
          onPress={() => {
            setSent(false);
            notifier.test().then((p) => {
              setPerm(p);
              setSent(p === 'granted');
            }, () => {});
          }}
        />
        {sent ? <Text testID="notify-sent" style={styles.sub}>Sent.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 13, color: theme.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  label: { fontSize: 15, color: theme.ink },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 },
});
