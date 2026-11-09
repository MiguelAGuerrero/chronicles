// @layer view
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CategoryId } from '../discovery/types';
import { useKindWalkPrefs } from '../kindWalk/useKindWalk';
import type { Waypoint } from '../nav/types';
import type { LngLat } from '../types';
import { useUnits } from '../useUnits';
import { planner, navRaw, openWalkId } from './app';
import { destFor } from './dest';
import { applyRound, close, headingNote, open, replanned, roundFor, select, startable, type PageState } from './page';
import { ceilingFor } from './settings';
import { startFrom, type PlannerResult, type PlannerRoute } from './service';

/**
 * The planner page's state (WP1-WP4, WP12, WP13, WP18, WP24): reads once the page is open and again when a setting changes or
 * different routes are asked for; the only memory is the routes on screen (WP13). An empty answer to "different routes" leaves the
 * routes on screen (audit 2); the round starts over with the settings in the same render (audit 10); the ceiling is the step shown (audit 6).
 */
export function usePlanner(kind: CategoryId, area: { at: LngLat; reachM: number }, you: LngLat | null, active: boolean) {
  const prefs = useKindWalkPrefs();
  const units = useUnits();
  const ceilingM = ceilingFor(prefs.budgetM, units);
  const [page, setPage] = useState<PageState>(() => (active ? open() : close()));
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [nothing, setNothing] = useState(false);
  const [walkId, setWalkId] = useState<string | null>(null);
  const [replaces, setReplaces] = useState<string | null>(null);
  const settingsKey = `${ceilingM}|${prefs.pref}|${prefs.mode}|${prefs.density}`;
  const [roundState, setRoundState] = useState({ key: settingsKey, n: 0 });
  const round = roundFor(roundState, settingsKey);
  const shown = useRef<LngLat[][]>([]);
  const prev = useRef<PlannerResult | null>(null);
  const key = `${kind}|${area.at.join(',')}|${you ? you.join(',') : ''}|${settingsKey}|${round}`;
  const asked = useRef('');
  useEffect(() => {
    if (!active) return;
    let live = true;
    asked.current = key;
    // A new setting means nothing is remembered: what was on screen is not "shown" for the new plan.
    const sent = round ? shown.current : [];
    void planner.plan({ kind, area, from: you, prefs: { ...prefs, budgetM: ceilingM }, round, shown: sent }).then((r) => {
      if (!live || asked.current !== key) return;
      const a = applyRound(prev.current, r, round);
      prev.current = a.result;
      shown.current = a.result.routes.map((x) => x.path);
      setResult(a.result);
      setNothing(a.nothing);
      if (!a.nothing) setPage((p) => replanned(p, a.result.routes));
    });
    return () => {
      live = false;
    };
    // The inputs are read through the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);
  useEffect(() => {
    if (!active) return;
    void openWalkId().then((id) => {
      setWalkId(id);
      if (id) void navRaw().then((raw) => setReplaces(headingNote(raw, id)));
    });
  }, [active]);
  // A setting changed: nothing is remembered and nothing is "nothing different" any more.
  useEffect(() => {
    prev.current = null;
    shown.current = [];
  }, [settingsKey]);
  const routes: PlannerRoute[] = useMemo(() => result?.routes ?? [], [result]);
  const different = useCallback(() => setRoundState({ key: settingsKey, n: round + 1 }), [settingsKey, round]);
  const choose = useCallback((i: number) => setPage((p) => select(p, i, routes)), [routes]);
  const chosen = startable(page, routes);
  /** Start (WP24): plans again from where the walker is now (`now`), and gives the destination to start. */
  const start = useCallback(async (now: LngLat | null): Promise<Waypoint | null> => {
    if (!chosen) return null;
    const route = await startFrom(planner, { kind, area, from: now ?? you, prefs: { ...prefs, budgetM: ceilingM } }, chosen);
    return destFor(route);
  }, [chosen, kind, area, you, prefs, ceilingM]);
  return { prefs, ceilingM, page, routes, result, nothing, reading: active && !result, walkId, replaces, choose, different, start, canStart: !!chosen, round };
}
