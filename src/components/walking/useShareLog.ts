import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { shareLogText, walkLogText } from '../../lib/shareLog';
import type { Walk } from '../../lib/types';
import type { SetNotice } from './useWalkNotice';

/**
 * Share GPS log, in the walk's drawer: the log is read when the drawer opens, so a tap can share it at
 * once (a browser only opens the share sheet straight from a tap, not after a wait).
 */
export function useShareLog(a: { walk: Walk | null; open: boolean; setNotice: SetNotice }) {
  const { walk, open, setNotice } = a;
  const logText = useRef<string | null>(null);
  useEffect(() => {
    logText.current = null;
    if (!open || !walk) return;
    let live = true;
    void walkLogText(walk.id, walk.started_at).then((text) => {
      if (live) logText.current = text;
    });
    return () => {
      live = false;
    };
  }, [open, walk]);
  return useCallback(() => {
    const text = logText.current;
    if (!text) {
      setNotice({ message: 'The GPS log is still being read. Try again in a moment.' });
      return;
    }
    void shareLogText(text).then((how) => {
      // A browser without a share sheet (a desktop) copies it instead.
      if (how === 'copied') setNotice({ message: 'GPS log copied. Paste it in a message.' });
      else if (how === 'failed' && Platform.OS === 'web') setNotice({ message: 'Couldn’t share or copy the GPS log.', tone: 'error' });
    });
  }, [setNotice]);
}
