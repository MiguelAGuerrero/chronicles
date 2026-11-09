// @layer view
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CategoryId } from '../discovery/types';
import { useKindWalkPrefs } from '../kindWalk/useKindWalk';
import type { LngLat } from '../types';
import { planner, openWalkId } from './app';
import { destFor } from './dest';
import { close, open, replanned, select, startable, type PageState } from './page';
import { startFrom, type PlannerResult, type PlannerRoute } from './service';
import type { Waypoint } from '../nav/types';

/**
 * The planner page's state (WP1-WP4, WP12, WP13, WP18, WP24): reads once the page is open and again when a setting changes or
 * different routes are asked for; the only memory is the routes on screen (WP13).
 */
export function usePlanner(kind: CategoryId, area: { at: LngLat; reachM: number }, you: LngLat | null, active: boolean) {
  const prefs = useKindWalkPrefs();
  const [page, setPage] = useState<PageState>(() => (active ? open() : close()));
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [round, setRound] = useState(0);
  const [walkId, setWalkId] = useState<string | null>(null);
  const shown = useRef<LngLat[][]>([]);
  const key = `${kind}|${area.at.join(',')}|${you ? you.join(',') : ''}|${prefs.budgetM}|${prefs.pref}|${prefs.mode}|${prefs.density}|${round}`;
  const asked = useRef('');
  useEffect(() => {
    if (!active) return;
    let live = true;
    asked.current = key;
    void planner.plan({ kind, area, from: you, prefs, round, shown: round ? shown.current : [] }).then((r) => {
      if (!live || asked.current !== key) return;
      setResult(r);
      shown.current = r.routes.map((x) => x.path);
      setPage((p) => replanned(p, r.routes));
    });
    return () => {
      live = false;
    };
    // The inputs are read through the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);
  useEffect(() => {
    if (active) void openWalkId().then(setWalkId);
  }, [active]);
  // A setting changes: the routes are asked for again from the first round (WP12), and nothing is remembered.
  const settingsKey = `${prefs.budgetM}|${prefs.pref}|${prefs.mode}|${prefs.density}`;
  const lastSettings = useRef(settingsKey);
  useEffect(() => {
    if (lastSettings.current === settingsKey) return;
    lastSettings.current = settingsKey;
    shown.current = [];
    setRound(0);
  }, [settingsKey]);
  const routes: PlannerRoute[] = useMemo(() => result?.routes ?? [], [result]);
  const different = useCallback(() => setRound((r) => r + 1), []);
  const choose = useCallback((i: number) => setPage((p) => select(p, i, routes)), [routes]);
  const chosen = startable(page, routes);
  /** Start (WP24): plans again from where the walker is now, and gives the destination to start. */
  const start = useCallback(async (): Promise<Waypoint | null> => {
    if (!chosen) return null;
    const route = await startFrom(planner, { kind, area, from: you, prefs }, chosen);
    return destFor(route);
  }, [chosen, kind, area, you, prefs]);
  return { prefs, page, routes, result, reading: active && !result, walkId, choose, different, start, canStart: !!chosen, round };
}
