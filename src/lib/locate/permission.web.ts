// @layer adapter
import type { LocatePermission } from '../atlas/findYou';

/**
 * The browser's location permission for this site, now and as it changes (tend explore 8): `navigator.permissions`,
 * whose status fires `change` when the person allows or blocks the site, or resets it. Where there is no permissions
 * API, it says `unknown` once and nothing after. Returns the unsubscribe.
 */
export function watchLocatePermission(onState: (state: LocatePermission) => void): () => void {
  let live = true;
  let status: PermissionStatus | null = null;
  const tell = () => {
    if (live && status) onState(status.state === 'granted' || status.state === 'denied' ? status.state : 'prompt');
  };
  const perms = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { permissions?: Permissions }).permissions;
  if (!perms?.query) {
    onState('unknown');
    return () => {
      live = false;
    };
  }
  perms.query({ name: 'geolocation' as PermissionName }).then(
    (st) => {
      if (!live) return;
      status = st;
      st.addEventListener('change', tell);
      tell();
    },
    () => live && onState('unknown'),
  );
  return () => {
    live = false;
    status?.removeEventListener('change', tell);
  };
}
