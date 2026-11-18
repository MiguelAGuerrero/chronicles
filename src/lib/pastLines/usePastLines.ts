// @layer view
import { useEffect, useMemo, useState } from 'react';
import type { PastView } from '../../components/map/types';
import { useHidden } from '../deletion/useDeletions';
import type { LngLat } from '../types';
import { createStore } from '../store';
import { useStore } from '../useStore';
import { linesKey, pastRuns, visibleLines, type WalkLine } from './core';
import { pastLines } from './index';

/** What the layer says under its switch (WB12): read by `layerNotes`. */
export type PastStatus = 'off' | 'waiting' | 'preparing' | 'none' | 'ready';

/**
 * The last lines read, shared by every screen's hook: the walk screen's live state starts from what its ready state drew, so
 * Start never blinks the lines off and sends them again (WB16).
 */
const lastRead = createStore<{ key: string; lines: WalkLine[] } | null>(null);

/** The centre's place to within about a kilometre: the lines are read again only when it changes, never per fix (WB16). */
const areaKey = (c: LngLat) => `${c[0].toFixed(2)},${c[1].toFixed(2)}`;

/**
 * Where I've been (WB6, WB8, WB12, WB13, WB15, WB16): the earlier walks' lines near `centre` while the layer is on. Turning it
 * on prepares older walks in the background; the lines are read once at the start and once when that is done, so they
 * appear together, never one walk at a time. Nothing is read while the layer is off.
 */
export function usePastLines(centre: LngLat | null, on: boolean, openWalkId: string | null = null): { view: PastView | null; status: PastStatus } {
  const version = useStore(pastLines.store, (s) => s.version);
  const preparing = useStore(pastLines.store, (s) => s.preparing);
  const hidden = useHidden();
  const [own, setRows] = useState<{ key: string; lines: WalkLine[] } | null>(null);
  const last = useStore(lastRead, (s) => s);
  // Until its own first read, a hook draws what was read last.
  const rows = own ?? last;
  const key = centre ? areaKey(centre) : '';
  // The centre the area key stands for, kept from when the key changed, so a new fix within it never re-reads.
  const [at, setAt] = useState<{ key: string; centre: LngLat } | null>(null);
  if (on && centre && at?.key !== key) setAt({ key, centre });

  useEffect(() => {
    if (!on || !at) return;
    let live = true;
    void pastLines.prepare(at.centre).catch(() => {});
    pastLines.near(at.centre).then(
      (lines) => {
        if (!live) return;
        const k = linesKey(lines);
        const next = lastRead.get()?.key === k ? lastRead.get()! : { key: k, lines };
        lastRead.set(next);
        setRows((was) => (was && was.key === k ? was : next));
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [on, at, version]);

  const view = useMemo((): PastView | null => {
    if (!on || !rows) return null;
    const shown = visibleLines(rows.lines, hidden, openWalkId);
    if (!shown.length) return null;
    const ids = shown.map((l) => l.walk_id);
    return { key: `${rows.key}#${ids.join(',')}`, ids, runs: pastRuns(shown) };
  }, [on, rows, hidden, openWalkId]);

  const status: PastStatus = !on ? 'off' : !centre && !rows ? 'waiting' : preparing || !rows ? 'preparing' : view ? 'ready' : 'none';
  return { view, status };
}
