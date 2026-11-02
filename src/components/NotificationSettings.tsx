import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { db } from '../lib/db';
import { loadNoticePrefs, NOTICE_KINDS, notifier, saveNoticePrefs, type NoticePrefs, type Permission } from '../lib/notify';
import { SwitchRow } from './SwitchRow';
import { Button, theme } from './ui';

/** What the section says about permission (NT5), per platform; nothing when it is granted. */
function permissionNote(p: Permission | null, dismissed: boolean): string | null {
  const web = Platform.OS === 'web';
  switch (p) {
    case 'denied':
      return web
        ? 'Notifications are blocked for this site. Allow them in your browser’s site settings, then come back.'
        : 'Notifications are off for Chronicles. Turn them on in your phone’s Settings, then come back.';
    case 'unsupported':
      return web
        ? 'This browser can’t show notifications here. On an iPhone, add Chronicles to your Home Screen (Share, then Add to Home Screen) and open it from there.'
        : 'Notifications aren’t available on this phone right now.';
    case 'default':
      return dismissed
        ? 'Not allowed yet. Tap “Send a test notification” to be asked again.'
        : 'You’ll be asked when you first set a reminder, pause a walk or send a test.';
    default:
      return null;
  }
}

/**
 * Settings' Notifications section (NT4-NT6, NT10): a switch per kind, where
 * permission stands, and a test notification to see how one looks. The
 * switches are saved as they change (turning one on asks for permission from
 * the tap, so it isn't left for Cancel to undo), and a pending pause reminder
 * goes when its switch goes off.
 */
export function NotificationSettings(props: { heading?: boolean } = {}) {
  const [prefs, setPrefs] = useState<NoticePrefs | null>(null);
  const [perm, setPerm] = useState<Permission | null>(null);
  const [sent, setSent] = useState<'sent' | 'failed' | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let alive = true;
    notifier.permission().then((p) => alive && setPerm(p), () => {});
    loadNoticePrefs().then((p) => alive && setPrefs(p), () => {});
    return () => {
      alive = false;
    };
  }, []);
  const note = permissionNote(perm, dismissed);
  const say = (text: string) => AccessibilityInfo.announceForAccessibility(text);
  const asked = (p: Permission) => {
    setPerm(p);
    setDismissed(p === 'default');
    const n = permissionNote(p, p === 'default');
    if (n) say(n);
  };
  const set = (next: NoticePrefs) => {
    setPrefs(next);
    saveNoticePrefs(next).catch(() => {});
    db.getOpenWalk().then((w) => notifier.prefsChanged(next, w?.id ?? null), () => {});
  };
  if (!prefs) return null;
  const blocked = perm === 'unsupported' || perm === 'denied';
  return (
    <View testID="notify-settings" style={{ gap: 2 }}>
      {/* Under Navigate's "Reminders and alerts" its own heading would say it twice (U12). */}
      {props.heading !== false && <Text style={styles.section} accessibilityRole="header">Notifications</Text>}
      {NOTICE_KINDS.map((k) => {
        const hint = `${k.note}${k.id === 'pause' && Platform.OS === 'web' ? ' In a browser it can only arrive while the page is still open.' : ''}`;
        return (
          // The whole row flips it (U4); turning one on still asks from that tap (NV24).
          <SwitchRow
            key={k.id}
            testID={`notify-${k.id}`}
            label={k.label}
            note={hint}
            value={prefs[k.id]}
            onChange={(on) => {
              const next = { ...prefs, [k.id]: on };
              set(next);
              if (on) notifier.ask(k.id).then(asked, () => {});
            }}
          />
        );
      })}
      {note ? <Text testID="notify-permission" style={styles.sub}>{note}</Text> : null}
      <View style={styles.testRow}>
        <Button
          testID="notify-test"
          variant="secondary"
          label="Send a test notification"
          accessibilityHint={blocked ? 'Unavailable until notifications are allowed' : 'Shows how a reminder looks'}
          disabled={blocked}
          onPress={() => {
            setSent(null);
            notifier.test().then((r) => {
              asked(r.permission);
              const ok = r.shown;
              setSent(r.permission === 'granted' ? (ok ? 'sent' : 'failed') : null);
              if (r.permission === 'granted') say(ok ? 'Test notification sent' : 'The test notification couldn’t be shown');
            }, () => {});
          }}
        />
        {sent ? (
          <Text testID={sent === 'sent' ? 'notify-sent' : 'notify-failed'} style={styles.sub}>
            {sent === 'sent' ? 'Sent.' : 'Couldn’t show it here. Try again in a moment.'}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 13, color: theme.muted },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, flexWrap: 'wrap' },
});
