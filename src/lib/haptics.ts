// @layer adapter
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { canBuzz } from './canBuzz';
import { HAPTIC_PATTERNS, nudgeAllowed, webFeedbackPlays, type FeedbackKind, type HapticStep } from './motionTokens';

const playStep = (s: HapticStep) => {
  const done =
    s.weight === 'light' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    : s.weight === 'medium' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    : Haptics.notificationAsync(s.weight === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  done.catch(() => {});
};

/**
 * Feedback for an app used with the phone half in a pocket. On the web only the
 * pocket alert plays (PA6), through expo-haptics' web build (`navigator.vibrate`;
 * iPhone Safari is not offered it, decision 0138); a button press gives nothing there.
 */
let lastNudge: number | null = null;

export function playFeedback(kind: FeedbackKind) {
  if (Platform.OS === 'web' && !webFeedbackPlays(kind, canBuzz())) return;
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
