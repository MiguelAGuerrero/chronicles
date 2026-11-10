import { useEffect, useRef, useState } from 'react';
import type { RecorderStatus } from '../../lib/recorder/types';
import { retryRecorder } from '../../lib/recorderRetry';
import { restartRecording } from '../../lib/session';
import type { Walk } from '../../lib/types';
import { walkScreen } from '../../lib/walkScreen';
import { theme } from '../ui';
import type { SetNotice } from './useWalkNotice';

/** No accepted fix for this long while recording reads as weak GPS. */
const WEAK_GPS_MS = 20_000;

export type Problem = { label: string; color: string };

/**
 * The recorder's status, and the chip that shows only when something is wrong. The error notice is
 * raised once per error: when the status first turns to error, or for a new message. A retry's own
 * pass through "waiting" doesn't count as leaving it, so a failed retry keeps the chip and says nothing
 * again (QL20); the chip's tap brings the notice back (QL19).
 */
export function useRecorderStatus(a: { walk: Walk | null; paused: boolean; resumed: number; now: number; lastGoodAt: number | null; riding: boolean; setNotice: SetNotice }) {
  const { walk, paused, resumed, setNotice } = a;
  const [status, setStatus] = useState<RecorderStatus>({ kind: 'idle' });
  const raisedError = useRef<string | null>(null);
  const retrying = useRef(false);
  useEffect(
    () =>
      walkScreen.subscribeStatus((s) => {
        // The recorder reports "recording" with every fix: only a change re-renders the screen (perf).
        setStatus((prev) => (prev.kind === s.kind && JSON.stringify(prev) === JSON.stringify(s) ? prev : s));
        if (s.kind !== 'error') {
          if (!retrying.current) raisedError.current = null;
          return;
        }
        if (raisedError.current === s.message) return;
        raisedError.current = s.message;
        setNotice({ message: s.message, tone: 'error', openSettings: s.openSettings, sticky: true });
      }),
    [setNotice],
  );
  // Back in front with the recorder in error (location denied, then perhaps allowed in Settings):
  // start it again once per return, the way Resume does, so the walk goes on without a restart
  // (QL20). The recorder's own status clears the chip if it worked; a failure keeps it quietly.
  const retriedFor = useRef(0);
  useEffect(() => {
    if (resumed === retriedFor.current) return;
    retriedFor.current = resumed;
    if (!walk || !retryRecorder(status, paused, true)) return;
    retrying.current = true;
    restartRecording(walk.id)
      .catch(() => {})
      .finally(() => {
        retrying.current = false;
      });
  }, [resumed, status, paused, walk]);
  // Weak GPS is no usable fix for a while, judged before the speed gate: a bus's fixes are good ones (R11).
  const weak = status.kind === 'recording' && a.lastGoodAt != null && a.now - a.lastGoodAt > WEAK_GPS_MS;
  // The growing trace says it is recording; the status only shows when it is not.
  const problem: Problem | null =
    paused ? { label: 'Paused', color: theme.muted }
    : status.kind === 'error' ? { label: 'Not recording', color: theme.danger }
    : status.kind === 'waiting' || status.kind === 'idle' ? { label: 'Waiting for GPS', color: theme.warn }
    : weak ? { label: 'Weak GPS', color: theme.warn }
    : a.riding ? { label: 'On a ride', color: theme.muted }
    : null;
  /** Not recording, Why? (QL19): the recorder's notice again, past the once-per-error guard. */
  const why = () => {
    if (status.kind !== 'error') return;
    raisedError.current = status.message;
    setNotice({ message: status.message, tone: 'error', openSettings: status.openSettings, sticky: true });
  };
  return { status, problem, why };
}
