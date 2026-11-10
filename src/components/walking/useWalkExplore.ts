import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { categoryOf } from '../../lib/discovery/categories';
import type { Kind } from '../../lib/explore/explore';
import { reach } from '../../lib/explore/reach';
import { reachLine } from '../../lib/explore/reach/rule';
import { DEFAULT_SETTINGS, loadSettings, onSettings, saveSettings, type ExploreSettings } from '../../lib/explore/settings';
import { useExplore } from '../../lib/explore/useExplore';
import { boundsOf } from '../../lib/geo';
import type { Faced } from '../../lib/moment';
import { feedback } from '../../lib/motion';
import type { LngLat, Walk } from '../../lib/types';
import { walkScreen } from '../../lib/walkScreen';
import type { WalkNavigation } from './useWalkNavigation';

/** This walk explores only once switched on (E1); otherwise it is quiet: navigation and captures (E9). */
export function useExploring(a: { walk: Walk | null; setMarkOpen: (id: string | null) => void }) {
  const { walk } = a;
  const [exploring, setExploring] = useState(false);
  useEffect(() => {
    if (!walk) return;
    let alive = true;
    walkScreen.exploring(walk.id).then((v) => alive && setExploring(v), () => {});
    return () => {
      alive = false;
    };
  }, [walk]);
  const setExplore = (on: boolean) => {
    if (!walk) return;
    setExploring(on);
    if (!on) a.setMarkOpen(null);
    // Its replay counts what it passed from here on (E11, audit 9): the first time it was switched on.
    void walkScreen.setExploring(walk.id, on, Date.now());
  };
  return { exploring, setExplore };
}

/**
 * Explore on the walk (v1 slice 5): checklists are built quietly on every walk (E2); the layers show only on
 * an exploring walk (E1, E9), and a capture finds a place on any walk. Its settings (E16-E21) live in the
 * walk's drawer, saved as they change; the range is a ring on this map while the drawer is up.
 */
export function useWalkExplore(a: {
  walk: Walk | null;
  exploring: boolean;
  live: { here: LngLat | null; riding: boolean; runs: LngLat[][] };
  captures: Faced[];
  nav: WalkNavigation;
  options: boolean;
  markOpen: string | null;
  onAreas: () => void;
}) {
  const { walk, exploring, live, nav, markOpen } = a;
  const { navigation } = nav;
  // Nothing is saved before they have loaded (fix walk-drawer-settings audit 2), and a save from the ready
  // screen's bar reaches this copy at once (audit 1): both screens are one instance.
  const [loaded, setLoaded] = useState<ExploreSettings | null>(null);
  const settings = loaded ?? DEFAULT_SETTINGS;
  useEffect(() => {
    let alive = true;
    loadSettings().then((v) => alive && setLoaded((cur) => cur ?? v), () => {});
    const off = onSettings((v) => setLoaded(v));
    return () => {
      alive = false;
      off();
    };
  }, []);
  const changeSettings = (next: ExploreSettings) => {
    if (!loaded) return;
    setLoaded(next);
    saveSettings(next).catch(() => {});
  };
  const toggleKind = (k: Kind, on: boolean) => {
    const hidden = new Set(settings.hidden);
    if (on) hidden.delete(k);
    else hidden.add(k);
    changeSettings({ ...settings, hidden });
  };
  const fixes = useMemo(() => live.runs.flat(), [live.runs]);
  // RP20: whether the open place has a street or path close by, from the cached streets; said, never filtered.
  const [markReach, setMarkReach] = useState<{ key: string; near: boolean | null } | null>(null);
  // The range preview (E21): a ring around you while the drawer is up on an exploring walk, as on the ready screen.
  const preview = a.options && exploring && loaded ? loaded.rangeM : null;
  const explore = useExplore({
    walkId: walk?.id ?? null,
    exploring,
    here: live.here,
    riding: live.riding,
    fixes,
    captures: a.captures,
    route: nav.routeLine,
    routePath: navigation.nav?.route.path ?? null,
    previewRangeM: preview,
    onAreas: a.onAreas,
    onFound: (item) => {
      // Quietly on a quiet walk (E9): kept, shown in the replay, nothing on screen.
      if (!exploring) return;
      feedback('success');
      nav.setArrived(`Found: ${item.name}`);
      AccessibilityInfo.announceForAccessibility(`Found: ${item.name}, ${categoryOf(item.category).label}`);
    },
  });
  const openMark = markOpen ? explore.itemOf(markOpen) : null;
  const openMarkNamed = !!openMark && (explore.revealed.has(openMark.key) || explore.found.has(openMark.key));
  const openMarkReach = openMark && markReach?.key === openMark.key && !explore.found.has(openMark.key) ? reachLine(markReach.near) : null;
  /** A place's pin tapped: its reach is asked as its card opens (RP20). */
  const askReach = (id: string) => {
    const item = explore.itemOf(id);
    if (item) reach.ask(id, item.at, setMarkReach);
  };
  // Going to a place: "A place to find" until it is revealed, then its name (E12).
  const navKey = navigation.nav?.dest.kind === 'find' ? navigation.nav.dest.placeKey : undefined;
  const navItem = navKey ? explore.itemOf(navKey) : null;
  const relabel = navigation.relabel;
  useEffect(() => {
    if (navItem && (explore.revealed.has(navItem.key) || explore.found.has(navItem.key))) relabel(navItem.name);
  }, [navItem, explore.revealed, explore.found, relabel]);
  const ring = useMemo(() => (preview != null && live.here ? { center: live.here, radiusM: preview } : null), [preview, live.here]);
  const ringFit = useMemo(() => (ring ? boundsOf([ring.center], ring.radiusM * 1.15) : null), [ring]);
  // Each new range refits the map to the ring, in the part left above the raised drawer.
  const ringKey = ring ? 100000 + ring.radiusM : 0;
  return {
    explore, loaded, settings, changeSettings, toggleKind, preview,
    openMark, openMarkNamed, openMarkReach, askReach,
    ring, ringFit, ringKey,
  };
}

export type WalkExplore = ReturnType<typeof useWalkExplore>;
