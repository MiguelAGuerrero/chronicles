import { Platform, Share } from 'react-native';
import { db } from './db';
import { gpsLog } from './gpsLog';

/** A walk's GPS log (`gpsLog`) from storage: every raw reading and its placed captures, open or finished. */
export async function walkLogText(walkId: string, startedAt: number): Promise<string> {
  const [points, captures] = await Promise.all([db.getPoints(walkId), db.getCaptures(walkId)]);
  const device = Platform.OS === 'web' ? navigator.userAgent : `${Platform.OS} ${Platform.Version}`;
  return gpsLog({ startedAt, points, captures, userAgent: device });
}

/**
 * Hands the log to the share sheet, or copies it where a browser has none (a
 * desktop). Call it straight from a tap, with the text already read: a
 * browser opens the share sheet only from one. Nothing is sent by the app.
 */
export async function shareLogText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    await Share.share({ message: text, title: 'Chronicles GPS log' });
    return 'shared';
  } catch {
    const clip = Platform.OS === 'web' ? navigator.clipboard : undefined;
    if (!clip) return 'failed';
    return clip.writeText(text).then(
      () => 'copied' as const,
      () => 'failed' as const,
    );
  }
}
