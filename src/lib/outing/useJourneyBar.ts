// @layer view
import { useEffect, useRef, useState } from 'react';
import type { Waypoint } from '../nav/types';
import type { LngLat } from '../types';
import { useUnits } from '../useUnits';
import { chapterAhead, chapterDest, PLAN_RULES, type JourneyPlan } from './journeyPlan';
import { nextTownLine } from './journeyWords';
import { journeyPlans, sessionTrace } from './plans';
import { distanceM } from '../geo';

/**
 * The session's part of a journey (OJ28-OJ31, OJ49; decision 0201). Between towns it gives the screen its line (the town ahead and how
 * far away) and the point to hand to Maps; within reach of a town it asks once for the way on foot through that town's stops. A
 * town left behind is let go with nothing said. Which towns were reached is read from the session's own trace when the screen
 * opens and from each fix after; "Pass this town by" and putting the plan away last only while the screen does. Nothing is stored.
 */
export function useJourneyBar(o: { walkId: string | null; here: LngLat | null; navigating: boolean; goTo: (dest: Waypoint) => void }) {
  const units = useUnits();
  const [plan, setPlan] = useState<{ walkId: string; plan: JourneyPlan; seen: LngLat[] } | null>(null);
  const [passed, setPassed] = useState<ReadonlySet<number>>(new Set());
  const [away, setAway] = useState(false);
  const routed = useRef<number | null>(null);
  useEffect(() => {
    let live = true;
    if (!o.walkId) return;
    const walkId = o.walkId;
    void Promise.all([journeyPlans.load(walkId), sessionTrace(walkId)]).then(([p, trace]) => live && p && setPlan({ walkId, plan: p, seen: trace }), () => {});
    return () => {
      live = false;
    };
  }, [o.walkId]);
  const mine = plan && plan.walkId === o.walkId ? plan : null;
  // A town come within reach of is remembered for the screen's life by one point of it, so it stays reached after you leave.
  if (mine && o.here) {
    const fresh = mine.plan.chapters.filter((c) => distanceM(c.at, o.here!) <= PLAN_RULES.reachM && !mine.seen.some((p) => distanceM(p, c.at) < 1));
    if (fresh.length) setPlan({ ...mine, seen: [...mine.seen, ...fresh.map((c) => c.at)] });
  }
  const ahead = mine ? chapterAhead(mine.plan, mine.seen, o.here, passed) : null;
  const chapter = mine && ahead ? mine.plan.chapters[ahead.index] : null;
  const within = !!ahead?.within;
  const index = ahead?.index ?? null;
  const goToRef = useRef(o.goTo);
  useEffect(() => {
    goToRef.current = o.goTo;
  });
  // OJ30: within reach of the town ahead, the way on foot is asked for once; ended by hand, it is not asked for again.
  useEffect(() => {
    if (!chapter || !within || index == null || o.navigating || routed.current === index) return;
    routed.current = index;
    goToRef.current(chapterDest(chapter));
    // The chapter is read through its index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, within, o.navigating]);
  // With no position yet (a weak signal in a car) the town ahead is still said, without a distance.
  const shown = !!chapter && !!chapter.town && !within && !away && !o.navigating;
  return {
    /** What the screen says between towns, or null: with no plan, within a town, while a way is followed, or put away. */
    next: shown && ahead ? { line: nextTownLine(chapter!.town!, o.here ? ahead.awayM : null, units), at: chapter!.at, town: chapter!.town! } : null,
    pass: () => index != null && setPassed(new Set([...passed, index])),
    putAway: () => setAway(true),
  };
}
