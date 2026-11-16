// @layer adapter
import { Platform, Share } from 'react-native';
import { fallback, report } from '../diagnostics/sink';
import { shareOutcome, type ShareResult } from './outcome';

/** The phone or browser, for the GPS log's header. */
export const deviceName = (): string => (Platform.OS === 'web' ? navigator.userAgent : `${Platform.OS} ${Platform.Version}`);

/**
 * Hands the log to the share sheet, or copies it where a browser has none (a
 * desktop). Call it straight from a tap, with the text already read: a
 * browser opens the share sheet only from one. Nothing is sent by the app.
 */
export async function shareLogText(text: string, title = 'Chronicles GPS log'): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  const clip = Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  const result: ShareResult = await Share.share({ message: text, title }).then(
    (r: { action?: string } | undefined) => ({ action: r?.action }),
    (e: unknown) => {
      const name = (e as { name?: unknown } | null)?.name;
      // A cancel is the walker's; anything else is the platform refusing (errors-handled audit 13).
      if (name !== 'AbortError') report('refused', 'lib/shareLog/share · shareLogText', e);
      return { error: { name } };
    },
  );
  const how = shareOutcome(result, !!clip);
  if (how !== 'copy') return how;
  return clip!.writeText(text).then(
    () => 'copied' as const,
    fallback('lib/shareLog/share · shareLogText', 'failed' as const, 'a copy to the clipboard'),
  );
}
