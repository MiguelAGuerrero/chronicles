import { useCallback, useEffect, useRef, useState } from 'react';
import { onWalkGap } from '../OpenWalk';
import { PAUSE_REMIND_MS } from '../../lib/notify';
import { noticeShown } from '../../lib/pauseReminder';
import { arrivalNotice, startNotice } from '../../lib/readyNav';
import { formatDuration } from '../../lib/summary';
import type { LngLat, Pause, Walk } from '../../lib/types';
import { walkScreen } from '../../lib/walkScreen';

const NOTICE_MS = 6000;
/** The screen's own clock: weak GPS (20 s) and the pause reminder (10 min) need no finer. */
const SLOW_TICK_MS = 5000;

export type Notice = {
  message: string;
  tone?: 'info' | 'error';
  openSettings?: boolean;
  sticky?: boolean;
  /** The paused reminder: the `started_at` of its pause; it goes when that pause ends (fix pause-banner). */
  forPause?: number;
  /** A route that couldn't be found offers the destination to the phone's maps app (NH5). */
  maps?: { at: LngLat; label: string };
};
export type SetNotice = (n: Notice | null | ((cur: Notice | null) => Notice | null)) => void;

/**
 * The walk's one notice, its toast and the screen's slow clock: a start warning or "started", the
 * notice following the walk's arrival, the hidden page's gap, the first walk's hint, and the reminder
 * of a forgotten pause.
 */
export function useWalkNotice(a: { shownWalk: Walk | null; params: { warning?: string; started?: string }; pauses: Pause[]; distanceM: number }) {
  const { shownWalk, params, pauses } = a;
  const [now, setNow] = useState(() => Date.now());
  // One-off notices: a start warning or "started". The web's "keep this page open" note is said
  // once on first launch (Navigate), not on every walk (the owner's call, Nov 4).
  const [rawNotice, setNotice] = useState<Notice | null>(() =>
    !shownWalk
      ? null
      : params.warning
        ? { message: params.warning }
        : params.started
          ? { message: 'Walk started · recording' }
          : null,
  );
  // Walk here or Start can bring this screen up before the keeper has read the new walk: the notice follows
  // the walk's arrival, not the screen's mount (capture-from-chronicle audit 1).
  const [noticedWalk, setNoticedWalk] = useState<string | null>(shownWalk?.id ?? null);
  if (shownWalk && noticedWalk !== shownWalk.id) {
    setNoticedWalk(shownWalk.id);
    const message = rawNotice ? null : arrivalNotice(params);
    if (message) setNotice({ message });
  }
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    // Slow on purpose: only weak GPS and the pause reminder read it. The clock and the memo
    // timer tick in their own small components, so the screen isn't re-rendered each second (perf).
    const t = setInterval(() => setNow(Date.now()), SLOW_TICK_MS);
    return () => clearInterval(t);
  }, []);
  const onGap = useCallback((ms: number) => {
    if (!walkScreen.backgroundCapable()) {
      setNotice({ message: `Tracing paused for ${formatDuration(ms)} while this page was hidden.` });
    }
  }, []);
  useEffect(() => onWalkGap(onGap), [onGap]);
  useEffect(() => {
    if (!rawNotice || rawNotice.sticky) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [rawNotice]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);
  // Once, after the first 100 m of a first walk: how to go somewhere.
  const hinted = useRef(false);
  useEffect(() => {
    if (hinted.current || a.distanceM < 100) return;
    hinted.current = true;
    walkScreen
      .hintDue()
      .then((due) => {
        if (due) setNotice({ message: 'Press and hold the map to go somewhere, or to see what happened there.' });
      })
      .catch(() => {});
  }, [a.distanceM]);
  // A forgotten pause loses the rest of the walk: after a while, say so once per pause.
  const openPause = pauses.find((p) => p.ended_at == null);
  const notice = noticeShown(rawNotice, openPause?.started_at ?? null);
  const remindedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!openPause || remindedFor.current === openPause.started_at || now - openPause.started_at < PAUSE_REMIND_MS) return;
    remindedFor.current = openPause.started_at;
    setNotice({ message: `Paused for ${formatDuration(now - openPause.started_at)}. Nothing is recorded until you resume.`, sticky: true, forPause: openPause.started_at });
  }, [openPause, now]);
  /** Recording in place (NR6): it says so, or the recorder's warning, or why its plan failed (audit 9, 10). */
  const started = (p: Record<string, string> | null) => {
    if (p?.error) setNotice({ message: p.error, tone: 'error', sticky: true });
    else if (p) setNotice({ message: startNotice(p) });
  };
  return { notice, setNotice: setNotice as SetNotice, now, toast, setToast, started };
}
