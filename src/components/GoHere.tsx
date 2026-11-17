import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Platform } from 'react-native';
import { goHereDo, goHereMapsHint, shareLabel, type GoHereChoice } from '../lib/atlas/goHere';
import { feedback } from '../lib/motion';
import { mapsAppName, openInMaps } from '../lib/nav/openInMaps';
import { loadPendingDest } from '../lib/nav/store';
import type { Waypoint } from '../lib/nav/types';
import type { LngLat } from '../lib/types';
import { GoHereSheet } from './GoHereSheet';

/** A place to go to: where, what it is called on the device, and what it is (GE3: only an area's name rides in the maps link). */
export interface GoHereTarget {
  at: LngLat;
  label: string;
  kind: 'area' | 'star' | 'spot';
  /** The street Go here starts you on, when it starts you on one (audit 9). */
  via?: string | null;
}

/**
 * Go here on any surface (decision 0187 and the rest: specs/go-here-everywhere): `ask(target)` opens the one sheet of two
 * choices; Chronicles saves the place and opens Navigate, ready (or, with a walk open, does what the host's own walk start
 * does, NV10); the maps app gets the destination straight from the tap. Back and Escape close the sheet. `sheet` is to be
 * rendered by the host, inside its screen.
 */
export function useGoHere(o: {
  walkOpen: boolean;
  /** What the host's own Walk to does with a walk open (NV10). */
  start: (dest: Waypoint) => void;
  /** When I get there: the host's own (`useStartWalk().later`). */
  later: (dest: Waypoint) => Promise<void> | void;
  /** A maps app that won't open. */
  onFail: () => void;
  focused?: boolean;
  anchor?: 'top' | 'bottom';
}): { ask: (t: GoHereTarget) => void; close: () => void; open: boolean; sheet: ReactNode } {
  const [state, setState] = useState<{ target: GoHereTarget; replaces: boolean } | null>(null);
  const close = useCallback(() => setState(null), []);
  const ask = useCallback((target: GoHereTarget) => {
    setState({ target, replaces: false });
    // A destination already saved is said to be replaced (GE4), once it is read.
    void loadPendingDest().then((d) => setState((s) => (s && s.target === target ? { target, replaces: !!d } : s)), () => {});
  }, []);
  // A sheet left open on a tab you leave does not come back, stale, when you return (audit 6): adjust during render, on the change.
  const focusedNow = o.focused !== false;
  const [wasFocused, setWasFocused] = useState(focusedNow);
  if (focusedNow !== wasFocused) {
    setWasFocused(focusedNow);
    if (!focusedNow && state) setState(null);
  }
  const shown = state != null && focusedNow;
  useEffect(() => {
    if (!shown) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      setState(null);
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setState(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, [shown]);
  const choose = (id: GoHereChoice['id']) => {
    if (!state) return;
    const t = state.target;
    const did = goHereDo(id, o.walkOpen);
    setState(null);
    const dest: Waypoint = { at: t.at, label: t.label, kind: t.kind === 'star' ? 'place' : 'point' };
    if (did === 'maps') {
      feedback('tap');
      openInMaps(t.at, shareLabel(t.kind, t.label)).then((ok) => ok || o.onFail(), o.onFail);
    } else if (did === 'start') o.start(dest);
    else void o.later(dest);
  };
  const sheet = state && shown ? (
    <GoHereSheet
      name={state.target.label}
      mapsApp={mapsAppName()}
      mapsHint={goHereMapsHint({ walkOpen: o.walkOpen, web: Platform.OS === 'web' })}
      via={state.target.via}
      replaces={state.replaces}
      walkOpen={o.walkOpen}
      anchor={o.anchor}
      onChoose={choose}
      onClose={close}
    />
  ) : null;
  return { ask, close, open: shown, sheet };
}
