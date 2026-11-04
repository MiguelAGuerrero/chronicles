// @layer adapter
import { Platform, Share } from 'react-native';

/** The phone or browser, for the GPS log's header. */
export const deviceName = (): string => (Platform.OS === 'web' ? navigator.userAgent : `${Platform.OS} ${Platform.Version}`);

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
