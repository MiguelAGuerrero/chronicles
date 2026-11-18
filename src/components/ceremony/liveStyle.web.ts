import type { LiveStyle } from './layout';

/**
 * Writes what moved onto a view's own element, with no render (replay ceremony RC7). A web exception to native first
 * (docs/ARCHITECTURE.md): react-native-web's views have no `setNativeProps`, and its `Animated` renders the animated
 * component again on every value, so a style that moves every frame is written on the element itself. React never
 * states these properties on the element (`useLiveStyle` writes them from the first frame on), so no render undoes one.
 */
export function writeStyle(node: unknown, s: LiveStyle): void {
  const el = node as { style?: CSSStyleDeclaration } | null;
  const style = el?.style;
  if (!style) return;
  if (s.opacity !== undefined) style.opacity = String(s.opacity);
  if (s.left !== undefined) style.left = `${s.left}px`;
  if (s.top !== undefined) style.top = `${s.top}px`;
  if (s.maxHeight !== undefined) style.maxHeight = s.maxHeight == null ? '' : `${s.maxHeight}px`;
  if (s.textAlign !== undefined) style.textAlign = s.textAlign;
  let transform = '';
  if (s.translateX !== undefined) transform += `translateX(${s.translateX}px) `;
  if (s.translateY !== undefined) transform += `translateY(${s.translateY}px) `;
  if (s.rotate !== undefined) transform += `rotate(${s.rotate}deg) `;
  if (s.scale !== undefined) transform += `scale(${s.scale})`;
  if (transform) style.transform = transform;
}
