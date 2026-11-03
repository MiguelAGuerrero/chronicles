import { Linking, Platform } from 'react-native';
import type { LngLat } from '../types';
import { mapsTarget, mapsUrls } from './handoff';

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
  for (const url of mapsUrls(at, label, target)) {
    try {
      // Never canOpenURL first: Android 11+ answers false for schemes not declared in <queries>.
      await Linking.openURL(url);
      return true;
    } catch {
      // No app took it: the next link (Google's, on Android).
    }
  }
  return false;
}
