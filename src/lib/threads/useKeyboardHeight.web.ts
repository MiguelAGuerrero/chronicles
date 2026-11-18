// @layer view
import { useEffect, useState } from 'react';
import { keyboardLift } from '../journal/keyboard';

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
    // Nothing while the page is pinch-zoomed: a zoom shrinks the visual viewport too (chronicle journal JN19).
    const read = () => setHeight(keyboardLift(window.innerHeight, vv.height, vv.offsetTop, vv.scale));
    vv.addEventListener('resize', read);
    vv.addEventListener('scroll', read);
    return () => {
      vv.removeEventListener('resize', read);
      vv.removeEventListener('scroll', read);
    };
  }, []);
  return height;
}
