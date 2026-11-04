// @layer adapter
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { HAPTIC_PATTERNS, nudgeAllowed, type FeedbackKind, type HapticStep } from './motionTokens';

const playStep = (s: HapticStep) => {
  const done =
    s.weight === 'light' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    : s.weight === 'medium' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    : Haptics.notificationAsync(s.weight === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  done.catch(() => {});
};

/**
 * Feedback for an app used with the phone half in a pocket. On the web only the
 * pocket alert plays (PA6), through expo-haptics' web build (`navigator.vibrate`,
 * or iPhone Safari's switch haptic); a button press gives nothing there.
 */
let lastNudge: number | null = null;

export function playFeedback(kind: FeedbackKind) {
  if (Platform.OS === 'web' && kind !== 'nudge') return;
  if (kind === 'nudge') {
    const now = Date.now();
    if (!nudgeAllowed(lastNudge, now)) return;
    lastNudge = now;
  }
  for (const s of HAPTIC_PATTERNS[kind]) {
    if (s.at === 0) playStep(s);
    else setTimeout(() => playStep(s), s.at);
  }
}
