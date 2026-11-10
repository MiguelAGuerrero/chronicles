// @layer view
import { useEffect, useState } from 'react';

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
    const read = () => setHeight(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener('resize', read);
    vv.addEventListener('scroll', read);
    return () => {
      vv.removeEventListener('resize', read);
      vv.removeEventListener('scroll', read);
    };
  }, []);
  return height;
}
