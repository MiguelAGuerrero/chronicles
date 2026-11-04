// @layer adapter
import { Linking, Platform } from 'react-native';
import type { LngLat } from '../types';
import { mapsTarget, mapsUrls } from './handoff';

/**
 * What a screen reader hears on every Open in Maps button. A browser takes no
 * fixes while Chronicles is hidden (bridges audit 4), so the web says so.
 */
export const HANDOFF_HINT =
  Platform.OS === 'web'
    ? 'Opens your maps app with walking directions. Recording pauses while Chronicles is hidden.'
    : 'Opens your maps app with walking directions. Chronicles keeps recording.';

/**
 * Open in Maps (NH1-NH8): hands the destination to the phone's maps app for
 * walking directions. Call it straight from the tap: a browser opens a new
 * window only from one (NH7). Navigation and the walk go on as they were.
 * Resolves false when nothing could open it (NH8); a browser never says, so
 * on the web it is always true.
 */
export async function openInMaps(at: LngLat, label: string): Promise<boolean> {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const target = mapsTarget({ os: Platform.OS, ua: nav?.userAgent, touchPoints: nav?.maxTouchPoints });
  const standalone =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    ((nav as { standalone?: boolean } | undefined)?.standalone === true ||
      !!window.matchMedia?.('(display-mode: standalone)').matches);
  for (const url of mapsUrls(at, label, target, { standalone })) {
    try {
      if (standalone && url.startsWith('maps:')) {
        // Navigate, not window.open: no in-app browser is left behind (a blank page on return).
        window.location.href = url;
        return true;
      }
      // Never canOpenURL first: Android 11+ answers false for schemes not declared in <queries>.
      await Linking.openURL(url);
      return true;
    } catch {
      // No app took it: the next link (Google's, on Android).
    }
  }
  return false;
}
