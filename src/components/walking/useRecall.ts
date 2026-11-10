import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { onRecallFired, onRecallOpen, onRecallWaiting, takeRecallOpen } from '../../lib/discovery/recallCheck';
import { distanceM } from '../../lib/geo';
import type { Faced } from '../../lib/moment';
import type { LngLat, Walk } from '../../lib/types';

/** A reminder's card goes after this long, or this far walked on. */
const REMINDER_MS = 30_000;
const REMINDER_AWAY_M = 100;

/**
 * Remind me here (v1 slice 4): a flagged capture comes back when this walk passes it (R2, R3). The web
 * checks on each accepted fix in the open walk's keeper, minimized or not (NV8); on a phone the location
 * task checks every batch. Fires reach this card while the screen is in front; a second fire joins the
 * open card (R7). A tapped reminder notification opens its captures, playing (R4).
 */
export function useRecall(a: { walk: Walk | null; here: LngLat | null; recall: string | undefined; resumed: number; setViewing: (c: Faced[] | null) => void }) {
  const { walk, here, setViewing } = a;
  const [reminder, setReminder] = useState<{ captures: Faced[]; at: LngLat | null; shownAt: number } | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const hereRef = useRef(here);
  useEffect(() => {
    hereRef.current = here;
  }, [here]);
  useEffect(
    () =>
      onRecallFired((due) => {
        setReminder((r) => {
          const all = [...(r?.captures ?? []), ...due.filter((c) => !r?.captures.some((x) => x.id === c.id))];
          return { captures: all, at: hereRef.current, shownAt: Date.now() };
        });
        AccessibilityInfo.announceForAccessibility(due.length > 1 ? `${due.length} memories here` : 'A memory from here');
      }),
    [],
  );
  // The card goes by itself after half a minute or 100 m walked on (it stays fired).
  useEffect(() => {
    if (!reminder) return;
    const walkedOn = reminder.at && here && distanceM(reminder.at, here) > REMINDER_AWAY_M;
    const t = setTimeout(() => setReminder(null), walkedOn ? 0 : Math.max(0, reminder.shownAt + REMINDER_MS - Date.now()));
    return () => clearTimeout(t);
  }, [reminder, here]);
  useEffect(() => {
    if (!walk) return;
    let alive = true;
    // A reminder tapped while this screen is in front opens here at once (audit 1).
    const off = onRecallOpen((found) => {
      setAutoPlay(true);
      setViewing(found);
      return true;
    });
    const take = () =>
      takeRecallOpen()
        .then((found) => {
          if (!alive || !found.length) return;
          setAutoPlay(true);
          setViewing(found);
        })
        .catch(() => {});
    void take();
    // Kept while this screen was mounting (a cold open now shows the walk sooner, NR3): taken as it lands.
    const offWaiting = onRecallWaiting(() => void take());
    return () => {
      alive = false;
      off();
      offWaiting();
    };
  }, [walk, a.recall, a.resumed, setViewing]);
  /** The card's Open: its captures, playing. */
  const open = () => {
    if (!reminder) return;
    setAutoPlay(true);
    setViewing(reminder.captures);
    setReminder(null);
  };
  return { reminder, dismiss: () => setReminder(null), open, autoPlay, setAutoPlay };
}

export type Recall = ReturnType<typeof useRecall>;
