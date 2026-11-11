import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { insetsFromPaddings, sameInsets, type Insets } from '../lib/safeInsets';

const NONE: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

function probe(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  return el;
}

function read(el: HTMLElement): Insets {
  const s = window.getComputedStyle(el);
  return insetsFromPaddings({ paddingTop: s.paddingTop, paddingRight: s.paddingRight, paddingBottom: s.paddingBottom, paddingLeft: s.paddingLeft });
}

/** The insets as the page opens, before the first paint, so nothing jumps once the effect runs. */
function first(): Insets {
  if (typeof document === 'undefined') return NONE;
  const el = probe();
  document.body.appendChild(el);
  const i = read(el);
  el.remove();
  return i;
}

/**
 * The web's safe-area insets, under the library's provider (fix memories-weird-state): the
 * `env(safe-area-inset-*)` values alone (`lib/safeInsets`). The library clamps them against
 * `window.innerWidth/innerHeight`, which iOS Safari reports as the visual viewport, so a resize during
 * a pinch-zoom left the tab bar half the screen tall until a reload. Read again on every resize, a
 * rotation, and the visual viewport's resize, which is how a zoom's end is heard.
 */
export function SafeInsets({ children }: { children: ReactNode }) {
  const [insets, setInsets] = useState<Insets>(first);
  useEffect(() => {
    const el = probe();
    document.body.appendChild(el);
    const update = () => {
      const next = read(el);
      setInsets((prev) => (sameInsets(prev, next) ? prev : next));
    };
    // A frame later, in case env() moved between the first render and now; never setState in the effect body.
    const frame = requestAnimationFrame(update);
    const vv = window.visualViewport;
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    vv?.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      vv?.removeEventListener('resize', update);
      el.remove();
    };
  }, []);
  return <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>;
}
