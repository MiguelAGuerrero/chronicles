// @layer view
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { appReturn } from './front';

/**
 * Calls `onBack` each time the app comes back to the front from the back (specs/current-position YH1, YH2; `appReturn`),
 * while `enabled`. React Native's `AppState`, which react-native-web serves from `visibilitychange`, so no web exception.
 * The callback is reached through a ref, so a new one never subscribes again. Unverified on a device
 * (docs/NATIVE_UNVERIFIED.md).
 */
export function useAppReturn(onBack: () => void, enabled = true) {
  const cb = useRef(onBack);
  useEffect(() => {
    cb.current = onBack;
  });
  useEffect(() => {
    if (!enabled) return;
    let away = false;
    const sub = AppState.addEventListener('change', (next) => {
      const r = appReturn(away, next);
      away = r.away;
      if (r.back) cb.current();
    });
    return () => sub.remove();
  }, [enabled]);
}
