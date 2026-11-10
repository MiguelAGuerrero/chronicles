import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { deadZoneDue, deadZoneNudge, inDeadZone, stripAt } from '../../lib/landing/walk';
import type { LandingRow } from '../../lib/landing/view';
import type { LngLat, Walk } from '../../lib/types';
import { walkScreen } from '../../lib/walkScreen';

/**
 * Hotspots on the walk (v1.5 slice 3): the remembered areas' strips and pockets, current rules only, read
 * again on returning to the front (an area looked at meanwhile, audit), and "On <street>" while on a strip.
 */
export function useHotspots(a: { here: LngLat | null; exploring: boolean; resumed: number }) {
  const { here, exploring } = a;
  const [landings, setLandings] = useState<LandingRow[]>([]);
  const reload = useCallback(() => {
    walkScreen.landings().then(setLandings, () => {});
  }, []);
  useEffect(() => {
    reload();
  }, [a.resumed, reload]);
  const hotStrips = useMemo(() => landings.flatMap((r) => r.analysis.strips), [landings]);
  // Drawn on an exploring walk only (E9), as information: pockets, strips and their names.
  const hotPockets = useMemo(
    () => landings.flatMap((r) => r.analysis.pockets.map((p) => ({ name: p.name, centre: p.centre, strip: p.strips.length > 0 }))),
    [landings],
  );
  // On a strip: on within 30 m, off past 45 m, so jitter at the edge doesn't blink it (audit).
  const [onStrip, setOnStrip] = useState<string | null>(null);
  useEffect(() => {
    const at = here;
    const t = setTimeout(() => setOnStrip((cur) => (at && hotStrips.length && exploring ? stripAt(at, hotStrips, cur) : null)), 0);
    return () => clearTimeout(t);
  }, [here, hotStrips, exploring]);
  return { reload, hotPockets, onStrip };
}

/**
 * A dead zone, 10 min (walking, not paused) from every pocket: once a walk, a pill toward the nearest
 * (L15). Nothing is read from storage until it could fire (audit); it is spent only once it has been
 * seen: not under a card, a route or settings, never on a quiet walk (audit).
 */
export function useDeadZone(a: {
  walk: Walk | null;
  here: LngLat | null;
  riding: boolean;
  paused: boolean;
  pockets: ReturnType<typeof useHotspots>['hotPockets'];
  quiet: boolean;
  covered: boolean;
}) {
  const { walk, here, riding, pockets: hotPockets, quiet, paused: pausedNow } = a;
  const farSince = useRef<number | null>(null);
  const nudgedRef = useRef<boolean | null>(null);
  const [nudge, setNudge] = useState<{ text: string; at: LngLat; name: string } | null>(null);
  useEffect(() => {
    const at = here;
    if (!walk || !at || !hotPockets.length) return;
    const now = Date.now();
    // Riding is not walking far from everything (rides audit 13).
    if (pausedNow || riding || !inDeadZone(at, hotPockets)) {
      farSince.current = null;
      return;
    }
    farSince.current ??= now;
    const far = now - farSince.current;
    if (nudgedRef.current || !deadZoneDue({ here: at, pockets: hotPockets, farSinceMs: far })) return;
    let alive = true;
    (async () => {
      nudgedRef.current ??= await walkScreen.nudgeSpent(walk.id);
      const got = deadZoneNudge({ here: at, pockets: hotPockets, farSinceMs: far, quiet, nudged: nudgedRef.current });
      if (alive && got) setNudge(got);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [walk, here, riding, hotPockets, quiet, pausedNow]);
  const nudgeShown = !!nudge && !quiet && !a.covered;
  useEffect(() => {
    if (!nudgeShown || !walk) return;
    if (!nudgedRef.current) {
      nudgedRef.current = true;
      walkScreen.spendNudge(walk.id).catch(() => {});
      AccessibilityInfo.announceForAccessibility(nudge!.text);
    }
    const t = setTimeout(() => setNudge(null), 20_000);
    return () => clearTimeout(t);
  }, [nudgeShown, walk, nudge]);
  return { nudge: nudgeShown ? nudge : null, dismiss: () => setNudge(null) };
}
