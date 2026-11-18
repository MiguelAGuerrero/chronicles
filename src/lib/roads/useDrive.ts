// @layer view
import { useEffect, useRef, useState } from 'react';
import type { LngLat } from '../types';
import { useMemo } from 'react';
import { driveStep, speakStep } from './drive';
import { thinLine } from './thin';
import { roads } from './index';
import { hush, sayTurn } from './speech';
import type { Turn, TurnSay } from './types';
import { spokenTurn } from './words';

/**
 * A guided drive to one point (RE20, RE22-RE24, RE28): while `on`, the way by road from where you are is found once, each fix is
 * placed on it, and the turn ahead comes back. Off the way no turn comes back, and after a set distance driven off it the way is
 * found again from there, with nothing said. Nothing is stored: a reload finds the way again from the fix it then has.
 */
export function useDrive(o: { on: boolean; here: LngLat | null; to: LngLat | null; muted: boolean; onFail: () => void }) {
  const [found, setFound] = useState<{ key: string; path: LngLat[]; turns: Turn[] } | null>(null);
  const [left, setLeft] = useState<LngLat | null>(null);
  const key = o.on && o.to ? `${o.to[0].toFixed(5)},${o.to[1].toFixed(5)}` : null;
  const mine = found && found.key === key ? found : null;
  // Guiding that has ended, or that heads elsewhere now, keeps nothing.
  if (found && !mine) setFound(null);
  if (!key && left) setLeft(null);
  // Audit 2: where the last fix was along the way, so one between two passes of it stays on the pass being driven.
  const [along, setAlong] = useState<number | null>(null);
  const step = mine && o.here ? driveStep(mine.path, mine.turns, o.here, left, undefined, along) : null;
  if (step && step.left !== left) setLeft(step.left);
  if (step && step.alongM != null && step.alongM !== along) setAlong(step.alongM);
  if (!key && along != null) setAlong(null);
  // RE25: a turn is spoken once as it nears; which one was last said is kept, muted or not, so unmuting says nothing late.
  const [said, setSaid] = useState<{ id: number; say: TurnSay } | null>(null);
  const due = speakStep(step?.turn ?? null, said?.id ?? null);
  if (due.say && due.said != null) setSaid({ id: due.said, say: due.say });
  if (!key && said) setSaid(null);
  const muted = useRef(o.muted);
  useEffect(() => {
    if (said && !muted.current) sayTurn(spokenTurn(said.say));
  }, [said]);
  const line = useMemo(() => (mine ? thinLine(mine.path, 400) : null), [mine]);
  const here = useRef(o.here);
  const fail = useRef(o.onFail);
  useEffect(() => {
    here.current = o.here;
    fail.current = o.onFail;
    muted.current = o.muted;
  });
  const hasHere = !!o.here;
  const again = !!step?.again;
  const need = !!key && hasHere && (!mine || again);
  useEffect(() => {
    let live = true;
    const from = here.current;
    if (!need || !key || !from || !o.to) return;
    const first = !again;
    void roads.way([from, o.to], () => !live).then((a) => {
      if (!live || !a) return;
      const leg = a.state === 'found' ? a.way.legs[0] : null;
      if (a.state === 'found' && leg) {
        setFound({ key, path: leg.path, turns: a.turns });
        setLeft(null);
        setAlong(null);
        setSaid(null);
      } else if (first) fail.current();
      // Found again and no road from here: the wait by distance starts over from this fix.
      else setLeft(here.current);
    });
    return () => {
      live = false;
    };
    // The point is read through its key, and the fix is the one held when the way is asked for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [need, key, again]);
  // The graph is dropped with the guiding.
  useEffect(() => {
    if (!key) return;
    return () => {
      roads.forget();
      hush();
    };
  }, [key]);
  return {
    /** The way is being found for the first time. */
    finding: !!key && !mine,
    /** The turn ahead and how far; null while finding, off the way, and at the road's end. */
    turn: step?.turn ?? null,
    /** Off the way: the screen then says the town and nothing else (RE22). */
    off: !!step?.off,
    /** The way being driven, thinned for the map (audit 12); null with none. */
    path: line,
  };
}
