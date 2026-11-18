// @layer view
import { useEffect, useRef, useState } from 'react';
import { distanceM } from '../geo';
import type { Waypoint } from '../nav/types';
import type { LngLat } from '../types';
import { useUnits } from '../useUnits';
import { chapterDest, emptyState, passBy, stepPlan, type JourneyPlan, type PlanState } from './journeyPlan';
import { hereLine, NO_TOWN_LINE, towardLine } from './journeyWords';
import { journeyPlans } from './plans';
import { canSpeak } from '../roads/speech';
import { useDrive } from '../roads/useDrive';
import { LIMITS_LINE, NO_ROAD_LINE, roadLine, SHOWN_LINE, turnLine } from '../roads/words';

/** RE26: what the engine cannot know is said from the tap on "Drive there" until you have moved this far: at rest, never beside a turn. */
const NOTICE_M = 50;
/** How far you may move after "Pass by" with Undo still offered. */
const UNDO_M = 300;

/**
 * The session's part of a journey (OJ28-OJ31, OJ48, OJ49; decision 0201, the second audit). Between towns it gives the screen its
 * line (the town it is headed toward and how far) and the point to hand to Maps. Within reach of a town it says the town is here and
 * offers the way on foot through its stops: nothing is routed until that is tapped. The plan kept for the session holds only the
 * towns still ahead: a town left, driven past, drifted from or passed by leaves it, with nothing said and nothing recorded of why.
 */
export function useJourneyBar(o: { walkId: string | null; here: LngLat | null; navigating: boolean; goTo: (dest: Waypoint) => void }) {
  const units = useUnits();
  const [held, setHeld] = useState<{ walkId: string; plan: JourneyPlan | null; st: PlanState } | null>(null);
  const [undo, setUndo] = useState<{ plan: JourneyPlan; at: LngLat | null } | null>(null);
  // RE26: where "Drive there" was tapped; RE15: the one line said when the road could not be found.
  const [began, setBegan] = useState<LngLat | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!o.walkId) return;
    const walkId = o.walkId;
    void journeyPlans.load(walkId).then((p) => live && p && setHeld({ walkId, plan: p, st: emptyState(p) }), () => {});
    return () => {
      live = false;
    };
  }, [o.walkId]);
  const mine = held && held.walkId === o.walkId ? held : null;
  const r = mine?.plan ? stepPlan(mine.plan, mine.st, o.here) : null;
  // Each fix's step is kept: the towns still ahead, and what the screen has seen of them.
  if (mine && r && (r.plan !== mine.plan || r.state !== mine.st)) setHeld({ ...mine, plan: r.plan, st: r.state });
  // The plan the session keeps follows: only what is ahead, and nothing once no town is.
  const kept = useRef<JourneyPlan | null | undefined>(undefined);
  const plan = mine ? mine.plan : undefined;
  const walkId = mine?.walkId ?? null;
  useEffect(() => {
    if (plan === undefined || !walkId) return;
    if (kept.current === undefined) kept.current = plan;
    else if (kept.current !== plan) {
      kept.current = plan;
      void journeyPlans.keep(walkId, plan).catch(() => {});
    }
  }, [plan, walkId]);
  const ahead = r?.ahead ?? null;
  const chapter = mine?.plan?.chapters[0] ?? null;
  const undoShown = !!undo && (!undo.at || !o.here || distanceM(undo.at, o.here) <= UNDO_M);
  const town = ahead?.town ?? null;
  // RE24: with the town at hand the guiding ends by itself, with nothing said.
  const guided = !!mine?.plan?.driving && !!ahead && !ahead.within;
  if (mine?.plan?.driving && ahead?.within) setHeld({ ...mine, plan: { chapters: mine.plan.chapters, ...(mine.plan.muted ? { muted: true as const } : {}) } });
  const endDrive = (said: string | null) => {
    if (mine?.plan?.driving) setHeld({ ...mine, plan: { chapters: mine.plan.chapters, ...(mine.plan.muted ? { muted: true as const } : {}) } });
    setBegan(null);
    setNote(said);
  };
  const drive = useDrive({ on: guided && !o.navigating, here: o.here, to: guided ? ahead.at : null, muted: !!mine?.plan?.muted, onFail: () => endDrive(NO_ROAD_LINE) });
  const notice = guided && !!began && (!o.here || distanceM(began, o.here) < NOTICE_M);
  // RE20, RE22: the turn and how far; nothing while off the way or at the road's end, where the town's own line stands alone.
  const turn = !guided ? null : notice ? (canSpeak ? LIMITS_LINE : `${SHOWN_LINE} ${LIMITS_LINE}`) : drive.finding ? roadLine('reading') : drive.turn ? turnLine(drive.turn, units) : null;
  return {
    /**
     * What the screen says of the journey, or null: with no plan, while a way is followed, or with no town ahead (then only while
     * a pass can still be taken back).
     */
    next:
      !mine || o.navigating
        ? null
        : ahead && town
          ? {
              // RE20: under a turn, the town alone; with no turn to show, the town and how far, as between towns.
              line: ahead.within ? hereLine(town) : towardLine(town, turn ? null : ahead.awayM, units),
              within: ahead.within,
              at: ahead.at,
              awayM: ahead.awayM,
              town,
              undo: undoShown,
              /** RE20, RE20a: guiding: the line above the town's, and nothing to tap but End. */
              driving: guided,
              /** RE25: turns are spoken here, and whether they are muted. */
              speaks: canSpeak,
              muted: !!mine?.plan?.muted,
              turn,
              /** RE26: the line above is the one-time statement, which may take a third line. */
              notice,
              /** RE15: said once when the road could not be found; Open in Maps is beside it. */
              note: guided ? null : note,
            }
          : undoShown
            ? { line: NO_TOWN_LINE, within: false, at: null, awayM: null, town: null, undo: true, driving: false, speaks: canSpeak, muted: false, turn: null, notice: false, note: null }
            : null,
    /** RE19: guiding begins on this tap and no sooner. */
    drive() {
      if (!mine?.plan || !ahead || ahead.within) return;
      setHeld({ ...mine, plan: { ...mine.plan, driving: true } });
      setBegan(o.here);
      setNote(null);
    },
    /** RE25: the mute on the bar. */
    mute() {
      if (!mine?.plan) return;
      const { muted: was, ...rest } = mine.plan;
      setHeld({ ...mine, plan: was ? rest : { ...rest, muted: true } });
    },
    /** RE19: "End": guiding stops; the town stays ahead. */
    end: () => endDrive(null),
    /** OJ31: the town ahead leaves the plan; it can be taken back until you have moved on. */
    pass() {
      if (!mine?.plan) return;
      const next = passBy(mine.plan);
      setNote(null);
      setUndo({ plan: mine.plan, at: o.here });
      setHeld({ ...mine, plan: next, st: emptyState(next) });
    },
    undo() {
      if (!mine || !undo) return;
      setHeld({ ...mine, plan: undo.plan, st: emptyState(undo.plan) });
      setUndo(null);
    },
    /** OJ30: the way on foot through the town at hand, on a tap. */
    walk() {
      if (chapter) o.goTo(chapterDest(chapter));
    },
  };
}
