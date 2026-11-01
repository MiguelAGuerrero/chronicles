import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Feedback for an app used with the phone half in a pocket. No-ops on web.
export function tapFeedback() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successFeedback() {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warnFeedback() {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
