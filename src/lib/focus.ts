import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';

/**
 * Moves screen-reader (native) or keyboard (web) focus to a component.
 * findNodeHandle does not exist on web, where the ref is the DOM element.
 */
export function focusOn(ref: { current: unknown }) {
  const target = ref.current;
  if (!target) return;
  if (Platform.OS === 'web') {
    (target as { focus?: () => void }).focus?.();
    return;
  }
  const node = findNodeHandle(target as Parameters<typeof findNodeHandle>[0]);
  if (node) AccessibilityInfo.setAccessibilityFocus(node);
}
