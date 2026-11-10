import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { feedback } from '../../lib/motion';
import { noticeShown } from '../../lib/pauseReminder';
import { pauseWalk, resumeWalk, stopWalk } from '../../lib/session';
import { heldLabel } from '../../lib/space/core';
import type { Pause, Walk } from '../../lib/types';
import { notifyWalkChanged } from '../../lib/walkEvents';
import { askMotion, useMotionAccess } from '../../lib/walkMotion';
import type { WalkCaptures } from './useWalkCaptures';
import type { SetNotice } from './useWalkNotice';

/**
 * Stop, Pause and Resume, and Minimize. Stop waits for a memo in flight and says first what it would
 * lose (an unsaved memo, a held photo or video, SA8); the walk stays on screen until the replay replaces
 * it. Minimize leaves the walk recording beneath the tabs (NV8), never mid-memo.
 */
export function useWalkLifecycle(a: {
  walk: Walk | null;
  pauses: Pause[];
  captures: WalkCaptures;
  setNotice: SetNotice;
  setEnded: (w: Walk) => void;
  onMinimize: () => void;
}) {
  const { walk, captures, setNotice } = a;
  const { cap } = captures;
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const giveUpHeld = useRef(false);
  const paused = a.pauses.some((p) => p.ended_at == null);
  // Without motion the walk goes on, on the GPS filters alone (Motion, MO2); the drawer says so.
  const motionAccess = useMotionAccess();

  async function stop() {
    if (!walk || stopping) return;
    setStopping(true);
    try {
      // Waits for any voice action in flight (a start, a save) before ending.
      const r = await cap.finishVoice();
      if ((r === 'failed' || cap.unsaved) && !captures.memoGivenUp()) {
        captures.giveUpMemo();
        setNotice({ message: 'The voice memo could not be saved. Retry, or hold Stop again to end the walk without it.', tone: 'error', sticky: true });
        return;
      }
      // A photo or video still held is said before the walk ends without it (SA8).
      if (cap.held.length > 0 && !giveUpHeld.current) {
        giveUpHeld.current = true;
        setNotice({ message: `${heldLabel(cap.held)} yet. Retry, or hold Stop again to end the walk without it.`, tone: 'error', sticky: true });
        return;
      }
      // The walk stays on screen until the replay replaces it (the keeper hears it ended first).
      a.setEnded(walk);
      await stopWalk(walk.id);
      feedback('success');
      router.replace(`/replay/${walk.id}`);
    } catch (e) {
      // The walk stays on screen with the error, even if storage already closed it (audit 3).
      setNotice({ message: `The walk could not be stopped: ${e instanceof Error ? e.message : e}`, tone: 'error', sticky: true });
    } finally {
      setStopping(false);
    }
  }

  // The walk goes on beneath the tabs: the recorder, the trace and the reminders are kept above
  // this screen (NV8). Never mid-memo: leaving would cut it short.
  function minimize() {
    if (captures.recordingVoice || stopping) return;
    AccessibilityInfo.announceForAccessibility('Walk minimized. Still recording.');
    // To the tab beneath, Explore when there is none (NR4).
    a.onMinimize();
  }

  async function togglePause() {
    if (!walk || pausing) return;
    setPausing(true);
    try {
      if (paused) {
        void askMotion();
        await resumeWalk(walk.id);
        setNotice((n) => noticeShown(n, null)); // the paused reminder ends with the pause
        AccessibilityInfo.announceForAccessibility('Walk resumed');
      } else {
        // A memo in progress is saved first; a paused walk records nothing.
        await cap.finishVoice();
        await pauseWalk(walk.id);
        AccessibilityInfo.announceForAccessibility('Walk paused. Nothing is recorded until you resume.');
      }
      feedback('tap');
    } catch (e) {
      setNotice({ message: `Could not ${paused ? 'resume' : 'pause'}: ${e instanceof Error ? e.message : e}`, tone: 'error', sticky: true });
    } finally {
      // The screen shows whatever the database holds, even after a failure.
      await notifyWalkChanged();
      setPausing(false);
    }
  }

  return { stopping, pausing, paused, stop, minimize, togglePause, motionAccess };
}

export type WalkLifecycle = ReturnType<typeof useWalkLifecycle>;
