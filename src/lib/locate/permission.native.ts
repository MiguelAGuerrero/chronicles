// @layer adapter
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import type { LocatePermission } from '../atlas/findYou';

/**
 * The phone's foreground location permission for Chronicles, now and as it changes (tend explore 8). The permission
 * lives in the phone's Settings, so it is read again each time the app comes back to the front; only a different answer
 * is told. Returns the unsubscribe. Unverified on a device (docs/NATIVE_UNVERIFIED.md).
 */
export function watchLocatePermission(onState: (state: LocatePermission) => void): () => void {
  let live = true;
  let last: LocatePermission | null = null;
  const read = () => {
    Location.getForegroundPermissionsAsync().then(
      (p) => {
        // A refusal the phone may still ask again about (Android's first "Deny") is a prompt, not a block (tend explore audit 8).
        const state: LocatePermission = p.status === 'granted' ? 'granted' : p.status === 'denied' && !p.canAskAgain ? 'denied' : 'prompt';
        if (!live || state === last) return;
        last = state;
        onState(state);
      },
      () => {
        if (live && last == null) onState((last = 'unknown'));
      },
    );
  };
  read();
  const sub = AppState.addEventListener('change', (s) => s === 'active' && read());
  return () => {
    live = false;
    sub.remove();
  };
}
