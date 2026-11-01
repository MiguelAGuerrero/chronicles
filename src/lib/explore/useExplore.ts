import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MarkPin } from '../../components/MarkPinView';
import { db } from '../db';
import { categoryOf } from '../discovery/categories';
import { boundsOf, distanceM } from '../geo';
import { tapFeedback } from '../haptics';
import { ensureTileBuild } from '../tiles';
import type { Capture, LngLat } from '../types';
import {
  alertsDue,
  EXPLORE_RULES,
  findFor,
  readCentre,
  retryAllowed,
  revealedKeys,
  routeMarks,
  routeProbes,
  visibleMarks,
  type ChecklistArea,
  type ChecklistItem,
  type ExploreRead,
} from './explore';
import { exploreBusy, exploreRead, itemBounds } from './exploreRun';
import { DEFAULT_SETTINGS, loadSettings, onSettings, type ExploreSettings } from './settings';

/** Items are read again around you after this much walking. */
const RELOAD_M = 500;
/** Whether to read is checked again after this much walking, not every fix. */
const CHECK_M = 25;

/**
 * Explore on the walk screen (E2-E9, E17-E23): checklists built quietly in
 * the background on every walk; on an exploring walk, the "?" marks within
 * your range, faint ones along a route, the pocket alert; and on any walk, a
 * capture finding the nearest place within 60 m.
 */
export function useExplore(opts: {
  walkId: string | null;
  exploring: boolean;
  here: LngLat | null;
  /** Every accepted fix of this walk, for what it revealed after a reload (E7). */
  fixes: LngLat[];
  captures: Capture[];
  /** The route ahead while navigating (E22), else null. */
  route: LngLat[] | null;
  onFound: (item: ChecklistItem) => void;
  /** A read remembered new busy streets. */
  onAreas: () => void;
}) {
  const [settings, setSettings] = useState<ExploreSettings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [routeItems, setRouteItems] = useState<ChecklistItem[]>([]);
  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const mounted = useRef(true);
  const latest = useRef(opts);
  useEffect(() => {
    latest.current = opts;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => alive && setSettings(s), () => {});
    const off = onSettings((s) => setSettings(s));
    db.listFinds().then((f) => alive && setFound(new Set(f.map((x) => x.key))), () => {});
    return () => {
      alive = false;
      off();
    };
  }, []);

  // What is known: checklists and reads, kept in memory and refreshed after each read.
  const known = useRef<{ areas: ChecklistArea[]; reads: ExploreRead[] } | null>(null);
  const loadKnown = useCallback(async () => {
    known.current = { areas: await db.listChecklistAreas().catch(() => []), reads: await db.listExploreReads().catch(() => []) };
    return known.current;
  }, []);

  const itemsAt = useRef<LngLat | null>(null);
  const loadItems = useCallback(async (at: LngLat) => {
    itemsAt.current = at;
    const got = await db.checklistItemsIn(itemBounds(at)).catch(() => null);
    if (got && mounted.current) setItems(got);
  }, []);

  // One read at a time, a failed one waiting 2 min and 100 m (E5); every walk, quiet or not (E2).
  const failed = useRef<{ at: LngLat; t: number } | null>(null);
  const checkedAt = useRef<LngLat | null>(null);
  const readAt = useCallback(async (centre: LngLat): Promise<boolean> => {
    const r = await exploreRead(centre, () => !mounted.current);
    if (!mounted.current) return false;
    if (!r.ok) {
      failed.current = { at: centre, t: Date.now() };
      return false;
    }
    failed.current = null;
    await loadKnown();
    latest.current.onAreas();
    return true;
  }, [loadKnown]);
  const maybeRead = useCallback(async (fix: LngLat) => {
    if (exploreBusy() || !retryAllowed(failed.current, fix, Date.now())) return;
    const build = await ensureTileBuild().catch(() => 'unknown');
    if (build === 'unknown') return;
    const k = known.current ?? (await loadKnown());
    const candidates = k.reads.filter((r) => r.build === build).flatMap((r) => r.candidates);
    const centre = readCentre({ fix, candidates, areas: k.areas, reads: k.reads, build });
    if (!centre) return;
    if (await readAt(centre)) await loadItems(fix);
  }, [loadKnown, loadItems, readAt]);

  const { here, exploring } = opts;
  useEffect(() => {
    if (!here || !opts.walkId) return;
    if (!itemsAt.current || distanceM(itemsAt.current, here) >= RELOAD_M) loadItems(here).catch(() => {});
    if (checkedAt.current && distanceM(checkedAt.current, here) < CHECK_M) return;
    checkedAt.current = here;
    maybeRead(here).catch(() => {});
  }, [here, opts.walkId, loadItems, maybeRead]);

  // On the way (E22, E23): the areas along a new route are read, one each, then its items loaded.
  const routeKey = opts.route && opts.route.length > 1 ? `${opts.route[0].join(',')}>${opts.route[opts.route.length - 1].join(',')}` : null;
  useEffect(() => {
    const route = latest.current.route;
    if (!routeKey || !exploring || !route) {
      const t = setTimeout(() => setRouteItems([]), 0);
      return () => clearTimeout(t);
    }
    let alive = true;
    (async () => {
      for (const p of routeProbes(route)) {
        if (!alive) return;
        const build = await ensureTileBuild().catch(() => 'unknown');
        if (build === 'unknown') break;
        const k = known.current ?? (await loadKnown());
        const candidates = k.reads.filter((r) => r.build === build).flatMap((r) => r.candidates);
        const centre = readCentre({ fix: p, candidates, areas: k.areas, reads: k.reads, build });
        if (centre && !(await readAt(centre))) break;
      }
      const box = boundsOf(route, EXPLORE_RULES.rangeMax);
      const got = box ? await db.checklistItemsIn(box).catch(() => []) : [];
      if (alive && mounted.current) setRouteItems(got);
    })();
    return () => {
      alive = false;
    };
  }, [routeKey, exploring, loadKnown, readAt]);

  // Named within 60 m, fix by fix, on an exploring walk (E7); a reload's fixes counted once.
  const seeded = useRef(false);
  useEffect(() => {
    if (!exploring || seeded.current || !items.length || !opts.fixes.length) return;
    seeded.current = true;
    const keys = revealedKeys(items, opts.fixes);
    const t = setTimeout(() => setRevealed((r) => new Set([...r, ...keys])), 0);
    return () => clearTimeout(t);
  }, [exploring, items, opts.fixes]);
  useEffect(() => {
    if (!exploring || !here || !items.length) return;
    const fresh = [...revealedKeys(items, [here])].filter((k) => !revealed.has(k));
    if (!fresh.length) return;
    const t = setTimeout(() => setRevealed((r) => new Set([...r, ...fresh])), 0);
    return () => clearTimeout(t);
  }, [exploring, here, items, revealed]);

  // A capture within 60 m finds the nearest place, on any walk, whatever its kind (E8, E9, E18).
  // Each capture is handled once; an unstamped one has no place until stop.
  const handled = useRef(new Set<string>());
  useEffect(() => {
    const walkId = opts.walkId;
    const fresh = opts.captures.filter((c) => !handled.current.has(c.id) && c.lat != null && c.lon != null);
    if (!walkId || !fresh.length || !items.length) return;
    for (const c of fresh) handled.current.add(c.id);
    (async () => {
      const taken = new Set(found);
      for (const c of fresh) {
        const item = findFor([c.lon!, c.lat!], [...items, ...routeItems], taken);
        if (!item) continue;
        taken.add(item.key);
        await db.addFind({ ...item, walk_id: walkId, capture_id: c.id, found_at: Date.now() }).catch(() => {});
        if (!mounted.current) return;
        setFound((f) => new Set([...f, item.key]));
        latest.current.onFound(item);
      }
    })();
  }, [opts.captures, opts.walkId, items, routeItems, found]);

  const shown = useMemo(
    () => (exploring ? visibleMarks({ items, here, rangeM: settings.rangeM, found, hidden: settings.hidden, revealed }) : []),
    [exploring, items, here, settings, found, revealed],
  );
  const onTheWay = useMemo(() => {
    if (!exploring || !opts.route) return [];
    return routeMarks({ items: routeItems, route: opts.route, rangeM: settings.rangeM, exclude: new Set(shown.map((s) => s.item.key)), found, hidden: settings.hidden });
  }, [exploring, opts.route, routeItems, settings, shown, found]);

  // The pocket alert (E19): a light tap, once a walk per place, as it comes into range as a "?".
  const alerted = useRef(new Set<string>());
  useEffect(() => {
    if (!exploring || !settings.haptic) return;
    const due = alertsDue(shown.filter((s) => s.state === 'unknown').map((s) => s.item.key), alerted.current);
    if (!due.length) return;
    for (const k of due) alerted.current.add(k);
    tapFeedback();
  }, [exploring, settings.haptic, shown]);

  const pins = useMemo<MarkPin[]>(() => {
    const pin = (item: ChecklistItem, o: Partial<MarkPin>): MarkPin => {
      const c = categoryOf(item.category);
      return { id: item.key, at: item.at, revealed: false, icon: c.icon as MarkPin['icon'], name: item.name, category: c.label, ...o };
    };
    return [
      ...shown.map((s) => pin(s.item, { revealed: s.state !== 'unknown', found: s.state === 'found' })),
      ...onTheWay.map((i) => pin(i, { faint: true })),
    ];
  }, [shown, onTheWay]);

  const byKey = useMemo(() => new Map([...routeItems, ...items].map((i) => [i.key, i])), [items, routeItems]);
  const itemOf = useCallback((key: string) => byKey.get(key) ?? null, [byKey]);

  return { pins, settings, revealed, found, itemOf };
}
