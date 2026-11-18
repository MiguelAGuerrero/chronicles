import type { LiveStyle } from './layout';

/**
 * Writes what moved onto a view, with no render (replay ceremony RC7): on a phone, the view's own `setNativeProps`.
 * The web has its own file (`liveStyle.web.ts`): react-native-web gave `setNativeProps` up, and its `Animated` renders
 * the animated component again on every value. Unverified on a device.
 */
export function writeStyle(node: unknown, s: LiveStyle): void {
  const view = node as { setNativeProps?: (props: { style: Record<string, unknown> }) => void } | null;
  if (!view || typeof view.setNativeProps !== 'function') return;
  const style: Record<string, unknown> = {};
  if (s.opacity !== undefined) style.opacity = s.opacity;
  if (s.left !== undefined) style.left = s.left;
  if (s.top !== undefined) style.top = s.top;
  if (s.maxHeight !== undefined) style.maxHeight = s.maxHeight ?? undefined;
  if (s.textAlign !== undefined) style.textAlign = s.textAlign;
  const transform: Record<string, unknown>[] = [];
  if (s.translateX !== undefined) transform.push({ translateX: s.translateX });
  if (s.translateY !== undefined) transform.push({ translateY: s.translateY });
  if (s.rotate !== undefined) transform.push({ rotate: `${s.rotate}deg` });
  if (s.scale !== undefined) transform.push({ scale: s.scale });
  if (transform.length) style.transform = transform;
  view.setNativeProps({ style });
}
