// @layer view
import { useCallback, useEffect, useState } from 'react';
import type { Kind } from './explore';
import { loadSettings, onSettings, toggleKind } from './settings';

/**
 * What I'm into on Explore's panel (ES1, ES4): the kinds switched off, read from the walk's one store and heard when either door
 * changes it. `hidden` is null until the saved choice has loaded, so the switches wait rather than show on and then flip.
 */
export function useKindSwitches(): { hidden: Set<Kind> | null; toggle: (k: Kind, on: boolean) => void } {
  const [hidden, setHidden] = useState<Set<Kind> | null>(null);
  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => alive && setHidden((cur) => cur ?? s.hidden), () => {});
    const off = onSettings((s) => setHidden(s.hidden));
    return () => {
      alive = false;
      off();
    };
  }, []);
  const toggle = useCallback((k: Kind, on: boolean) => void toggleKind(k, on), []);
  return { hidden, toggle };
}
