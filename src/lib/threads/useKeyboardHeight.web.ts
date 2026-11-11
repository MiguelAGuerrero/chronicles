// @layer view
import { useEffect, useState } from 'react';
import { keyboardInset } from './keyboardInset';

/**
 * How far the on-screen keyboard reaches up from the page's foot; 0 while it is down. react-native-web's `Keyboard`
 * reports nothing, so this reads `visualViewport` (a web exception, `docs/ARCHITECTURE.md`): what the visual viewport
 * leaves uncovered at the bottom of the layout viewport, which `#root` is pinned to.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    // Zoomed, iOS's innerHeight is the visual viewport: keyboardInset reads the layout's own height then (fix note-keyboard-zoom).
    const read = () =>
      setHeight(
        keyboardInset({
          innerHeight: window.innerHeight,
          layoutHeight: document.documentElement.clientHeight,
          vvHeight: vv.height,
          vvOffsetTop: vv.offsetTop,
          scale: vv.scale,
        }),
      );
    vv.addEventListener('resize', read);
    vv.addEventListener('scroll', read);
    return () => {
      vv.removeEventListener('resize', read);
      vv.removeEventListener('scroll', read);
    };
  }, []);
  return height;
}
