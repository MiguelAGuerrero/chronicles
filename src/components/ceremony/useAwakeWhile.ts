import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { AppState } from 'react-native';

const TAG = 'chronicles-replay';

/**
 * Keeps the screen awake while `on` (RR24, decision 0087): a replay plays for
 * a minute with no touch, longer than a phone's auto-lock. Taken again when
 * the app comes back to the front, since the web's wake lock is let go
 * whenever the page is hidden. Never throws: a browser without a wake lock
 * just lets the screen sleep.
 */
export function useAwakeWhile(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const take = () => {
      activateKeepAwakeAsync(TAG).catch(() => {});
    };
    take();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') take();
    });
    return () => {
      sub.remove();
      deactivateKeepAwake(TAG).catch(() => {});
    };
  }, [on]);
}
