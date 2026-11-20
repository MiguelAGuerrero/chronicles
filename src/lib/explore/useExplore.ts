// @layer view
import { faced, type Faced } from '../moment';
import { ensureOvertureRelease } from '../activity/overture';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MarkPin } from '../../components/MarkPinView';
import { db } from '../db';
import { findOnKept, hereBounds, momentsHere } from './placeCard';
import { deletions } from '../deletion';
import { categoryOf } from '../discovery/categories';
import { boundsOf, distanceM } from '../geo';
import { feedback } from '../motion';
import { sweepCovered } from '../landing/view';
import type { LngLat } from '../types';
import {
  pocketAlert,
  alertedFor,
  alertKeys,
  EXPLORE_RULES,
  readCentre,
  retryAllowed,
  revealedKeys,
  routeMarks,
  routeProbes,
  visibleMarks,
  type ChecklistArea,
  type ChecklistItem,
  type ExploreRead,
  rememberStorefronts,
} from './explore';
import { placesArchive } from '../discovery/archive';
import { exploreBuild, exploreBusy, exploreHold, exploreRead, itemBounds } from './exploreRun';
import { facesToRead, foundFaces } from './foundFace';
import { DEFAULT_SETTINGS, loadSettings, onSettings, type ExploreSettings } from './settings';

/** Items are read again around you after this much walking. */
const RELOAD_M = 500;
/** Whether to read is checked again after this much walking, not every fix. */
const CHECK_M = 25;

/**
 * Explore on the walk screen (E2-E9, E17-E23): checklists built quietly in
 * the background on every walk; while Places is on, the "?" marks within
 * your range, faint ones along a route, the pocket alert; and a capture begun
 * on a place's card finding that place (capture-at-a-place CA2-CA4).
 */
/** The places each walk has alerted (audit 3): outlives the walk screen, not a reload. */
const alertedByWalk = new Map<string, Set<string>>();

export function useExplore(opts: {
  walkId: string | null;
  /** Places is on for this walk (decision 0234): the "?" within range, the pocket alert, the place's card. */
  places: boolean;
  /** Storefronts is on for this walk: storefront streets are remembered (MD17). */
  storefronts: boolean;
  here: LngLat | null;
  /** On a ride (rides, R12): nothing is named, no pocket alert, no read starts until you are on foot. */
  riding?: boolean;
  /** Every accepted fix of this walk, for what it revealed after a reload (E7). */
  fixes: LngLat[];
  captures: Faced[];
  /** The route ahead while navigating (E22), else null. */
  route: LngLat[] | null;
  /** The whole route being navigated: its areas are read once, keyed on it, not on each fix (audit 1). */
  routePath: LngLat[] | null;
  /** The range being previewed in settings, so the marks follow the slider (audit, UI). */
  previewRangeM?: number | null;
  onFound: (item: ChecklistItem) => void;
  /** A read remembered new storefront streets. */
  onAreas: () => void;
}) {
  const [settings, setSettings] = useState<ExploreSettings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [routeItems, setRouteItems] = useState<ChecklistItem[]>([]);
  const [found, setFound] = useState<Set<string> | null>(null);
  // Which moment found each place, so its pin wears that moment's glyph (decision 0172, O26).
  const [finds, setFinds] = useState<{ key: string; capture_id: string }[]>([]);
  // Moments of other walks (or loose) that found a place on the map: read once each.
  const [elsewhere, setElsewhere] = useState<Faced[]>([]);
  const asked = useRef(new Set<string>());
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

  // A capture's find, recorded through `record` (E8, E9) when a capture begun on the place's card is kept (CA2-CA4).
  const record = useCallback(async (item: ChecklistItem, captureId: string) => {
    const walkId = latest.current.walkId;
    if (!walkId) return;
    await db.addFind({ ...item, walk_id: walkId, capture_id: captureId, found_at: Date.now() }).catch(() => {});
    if (!mounted.current) return;
    setFound((f) => new Set([...(f ?? []), item.key]));
    setFinds((fs) => [...fs.filter((x) => x.key !== item.key), { key: item.key, capture_id: captureId }]);
    latest.current.onFound(item);
  }, []);

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => alive && setSettings(s), () => {});
    const off = onSettings((s) => setSettings(s));
    const readFinds = () =>
      db.listFinds().then((f) => {
        if (!alive) return;
        setFound(new Set(f.map((x) => x.key)));
        setFinds(f.map((x) => ({ key: x.key, capture_id: x.capture_id })));
      }, () => alive && setFound((was) => was ?? new Set()));
    readFinds();
    // A deleted moment takes its find: the place can be found again on this walk (deletion audit 6).
    const offDeleted = deletions.onCommitted(() => void readFinds());
    return () => {
      alive = false;
      off();
      offDeleted();
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
  const readAt = useCallback(async (centre: LngLat, stop: () => boolean = () => false): Promise<boolean> => {
    // Storefront streets only while Places or Storefronts is on (MD17); checklists on every walk.
    const r = await exploreRead(centre, { remember: rememberStorefronts(latest.current) }, () => !mounted.current || stop());
    if (!mounted.current) return false;
    if (!r.ok) {
      // tend explore audit 13: a read its caller stopped is no failure, so it sets no failure's wait.
      if (!r.stopped) failed.current = { at: centre, t: Date.now() };
      return false;
    }
    failed.current = null;
    await loadKnown();
    latest.current.onAreas();
    return true;
  }, [loadKnown]);
  // Areas read without storefront streets: read again once while Places or Storefronts is on, never in a loop.
  const sweptAt = useRef<LngLat[]>([]);
  const maybeRead = useCallback(async (fix: LngLat) => {
    if (exploreBusy() || !retryAllowed(failed.current, fix, Date.now())) return;
    // tend explore audit 11: held from here, so a capture made while the read is still being decided waits for it; let go
    // before the read's items load, so the capture is looked at again with them.
    const read = await exploreHold(async () => {
      const build = await exploreBuild();
      if (build === 'unknown') return false;
      const k = known.current ?? (await loadKnown());
      const candidates = k.reads.filter((r) => r.build === build).flatMap((r) => r.candidates);
      // Audit 3: the archive's version here, so an area built before it (or with an older one) is read again.
      await placesArchive.refresh();
      let centre = readCentre({ fix, candidates, areas: k.areas, reads: k.reads, build, archive: (at) => placesArchive.versionAt(at) });
      if (!centre && rememberStorefronts(latest.current) && !sweptAt.current.some((p) => distanceM(p, fix) <= EXPLORE_RULES.rereadM)) {
        const rows = await db.listLandings().catch(() => []);
        // Asked, not assumed: on a walk opened straight from a launch the release isn't known yet (activity-density audit 8).
        if (!sweepCovered(rows, fix, build, await ensureOvertureRelease().catch(() => null))) centre = fix;
      }
      if (!centre) return false;
      if (rememberStorefronts(latest.current)) sweptAt.current.push(centre);
      return readAt(centre);
    });
    if (read) await loadItems(fix);
  }, [loadKnown, loadItems, readAt]);

  const { here, places } = opts;
  const riding = !!opts.riding;
  useEffect(() => {
    if (!here || !opts.walkId) return;
    if (!itemsAt.current || distanceM(itemsAt.current, here) >= RELOAD_M) loadItems(here).catch(() => {});
    if (riding) return;
    if (checkedAt.current && distanceM(checkedAt.current, here) < CHECK_M) return;
    checkedAt.current = here;
    maybeRead(here).catch(() => {});
  }, [here, riding, opts.walkId, loadItems, maybeRead]);

  // Switched on: check at once, so storefront streets a read skipped come in now, not 25 m on.
  useEffect(() => {
    const at = latest.current.here;
    if (!(places || opts.storefronts) || !at || latest.current.riding) return;
    checkedAt.current = at;
    maybeRead(at).catch(() => {});
  }, [places, opts.storefronts, maybeRead]);

  // On the way (E22, E23): the areas along a new route are read, one each, then its items loaded.
  // Keyed on the route itself, so a fix never starts it again (audit 1); a failed read waits as any does.
  const routePath = places ? opts.routePath : null;
  useEffect(() => {
    if (!routePath || routePath.length < 2) {
      const t = setTimeout(() => setRouteItems((r) => (r.length ? [] : r)), 0);
      return () => clearTimeout(t);
    }
    let alive = true;
    // tend explore audit 11: the route's reads hold the queue while they are decided, as `maybeRead`'s do, until its items load.
    (async () => {
      await exploreHold(async () => {
        for (const p of routeProbes(routePath)) {
          if (!alive || !retryAllowed(failed.current, p, Date.now())) break;
          const build = await exploreBuild();
          if (build === 'unknown') break;
          const k = known.current ?? (await loadKnown());
          const candidates = k.reads.filter((r) => r.build === build).flatMap((r) => r.candidates);
          const centre = readCentre({ fix: p, candidates, areas: k.areas, reads: k.reads, build, archive: (at) => placesArchive.versionAt(at) });
          // tend explore audit 13: a route dropped meanwhile stops its reads, a waiting one included.
          if (centre && !(await readAt(centre, () => !alive))) break;
        }
      });
      const box = boundsOf(routePath, EXPLORE_RULES.rangeMax);
      const got = box ? await db.checklistItemsIn(box).catch(() => []) : [];
      if (alive && mounted.current) setRouteItems(got);
    })();
    return () => {
      alive = false;
    };
  }, [routePath, loadKnown, readAt]);

  // Named within 60 m, fix by fix, while Places is on (E7); a reload's fixes counted once.
  const seeded = useRef(false);
  useEffect(() => {
    if (!places || seeded.current || !items.length || !opts.fixes.length) return;
    seeded.current = true;
    const keys = revealedKeys(items, opts.fixes);
    const t = setTimeout(() => setRevealed((r) => new Set([...r, ...keys])), 0);
    return () => clearTimeout(t);
  }, [places, items, opts.fixes]);
  useEffect(() => {
    if (!places || !here || !items.length || riding) return;
    const fresh = [...revealedKeys(items, [here])].filter((k) => !revealed.has(k));
    if (!fresh.length) return;
    const t = setTimeout(() => setRevealed((r) => new Set([...r, ...fresh])), 0);
    return () => clearTimeout(t);
  }, [places, here, riding, items, revealed]);

  // A capture finds a place only when it was begun on the place's card (TC1, CA2-CA4): its stamp carries the place, and
  // the walk screen hands the kept moment here. Nothing is armed, so a cancelled capture leaves nothing waiting (CA7).
  const foundRef = useRef(found);
  useEffect(() => {
    foundRef.current = found;
  });
  const keptAtPlace = useCallback(async (item: ChecklistItem, kept: { momentId: string; piece: boolean }) => {
    // Before the finds are read, ask the store: the first find of a place stands (CA12).
    const known = foundRef.current ?? new Set((await db.listFinds().catch(() => [])).map((f) => f.key));
    const hit = findOnKept({ place: item.key, piece: kept.piece, momentId: kept.momentId }, known);
    if (hit) await record(item, hit.momentId);
  }, [record]);
  /**
   * A found place's card (CA11): the moments taken within 60 m of it, and the one that found it wherever it was taken
   * (decision 0247), newest first, in words. Read once per opening.
   */
  const findsRef = useRef(finds);
  useEffect(() => {
    findsRef.current = finds;
  });
  const momentsAt = useCallback(async (key: string, at: LngLat, now: number) => {
    const finding = findsRef.current.find((f) => f.key === key)?.capture_id ?? null;
    // The finder's read failing alone leaves the near list (fix poi-any-distance audit 3).
    const [near, own] = await Promise.all([db.momentsIn(hereBounds(at)), finding ? db.getMomentsByIds([finding]).catch(() => []) : Promise.resolve([])]);
    const finder = own[0] ?? null;
    const byId = new Map([...near, ...own].map((x) => [x.id, x]));
    return momentsHere(near, at, now, latest.current.walkId, finder).map((x) => ({ ...x, moment: faced(byId.get(x.id)!) }));
  }, []);

  const rangeM = opts.previewRangeM ?? settings.rangeM;
  const foundSet = useMemo(() => found ?? new Set<string>(), [found]);
  const shown = useMemo(
    () => (places ? visibleMarks({ items, here, rangeM, found: foundSet, hidden: settings.hidden, revealed }) : []),
    [places, items, here, rangeM, settings.hidden, foundSet, revealed],
  );
  const onTheWay = useMemo(() => {
    if (!places || !opts.route) return [];
    return routeMarks({ items: routeItems, route: opts.route, rangeM, exclude: new Set(shown.map((s) => s.item.key)), found: foundSet, hidden: settings.hidden });
  }, [places, opts.route, routeItems, rangeM, settings.hidden, shown, foundSet]);

  // The pocket alert (E19, PA1-PA3): one double-tap for the places that just came into range, each once a walk.
  const previewing = opts.previewRangeM != null;
  useEffect(() => {
    const alerted = alertedFor(alertedByWalk, opts.walkId);
    const { mark, nudge } = pocketAlert({ places, haptic: settings.haptic, riding, previewing, nearKeys: alertKeys(shown), alerted });
    for (const k of mark) alerted.add(k);
    if (nudge) feedback('nudge');
  }, [places, settings.haptic, riding, previewing, shown, opts.walkId]);

  // The found places on the map wear the glyph of the moment that found each (O26): this walk's captures, else read.
  const shownFound = useMemo(() => new Set(shown.filter((s) => s.state === 'found').map((s) => s.item.key)), [shown]);
  useEffect(() => {
    const known = new Set([...opts.captures, ...elsewhere].map((c) => c.id));
    const ids = facesToRead(finds, shownFound, known, asked.current);
    if (!ids.length) return;
    for (const id of ids) asked.current.add(id);
    let alive = true;
    db.getMomentsByIds(ids).then((ms) => alive && mounted.current && setElsewhere((e) => [...e, ...ms.map(faced)]), () => {});
    return () => {
      alive = false;
    };
  }, [finds, shownFound, opts.captures, elsewhere]);
  const faces = useMemo(() => foundFaces(finds, opts.captures, elsewhere), [finds, opts.captures, elsewhere]);

  const pins = useMemo<MarkPin[]>(() => {
    const pin = (item: ChecklistItem, o: Partial<MarkPin>): MarkPin => {
      const c = categoryOf(item.category);
      return { id: item.key, at: item.at, revealed: false, icon: c.icon as MarkPin['icon'], name: item.name, category: c.label, ...o };
    };
    // The kind, whose glyph and words the pin wears; never a note's type: note types wait for the owner's rework (0172).
    const kind = (key: string) => faces.get(key)?.kind;
    return [
      ...shown.map((s) => pin(s.item, { revealed: s.state !== 'unknown', found: s.state === 'found', foundKind: s.state === 'found' ? kind(s.item.key) : undefined })),
      ...onTheWay.map((i) => pin(i, { faint: true })),
    ];
  }, [shown, onTheWay, faces]);

  const byKey = useMemo(() => new Map([...routeItems, ...items].map((i) => [i.key, i])), [items, routeItems]);
  const itemOf = useCallback((key: string) => byKey.get(key) ?? null, [byKey]);

  return { pins, settings, revealed, found: foundSet, itemOf, keptAtPlace, momentsAt };
}
