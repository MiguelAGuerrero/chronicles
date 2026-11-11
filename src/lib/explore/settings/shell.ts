// @layer shell
import type { Ports } from '../../ports/types';
import { clampRange, EXPLORE_RULES, KINDS, parseHidden, setKind, type Kind } from '../explore';

/** Settings, kept in meta: the kinds switched off (E16), the "?" range (E20), the pocket alert (E19). */
export const HIDDEN_KEY = 'explore_hidden';
export const RANGE_KEY = 'explore_range';
export const HAPTIC_KEY = 'explore_haptic';
/** PK18: the kinds there were when the choice was saved, so a kind added since is told from one switched on. */
export const KNOWN_KEY = 'explore_kinds_known';

export interface ExploreSettings {
  hidden: Set<Kind>;
  rangeM: number;
  haptic: boolean;
}

export const DEFAULT_SETTINGS: ExploreSettings = { hidden: new Set(), rangeM: EXPLORE_RULES.rangeDefault, haptic: false };

export interface ExploreSettingsStore {
  load(): Promise<ExploreSettings>;
  /** `load`, or every kind on and the default range when the read fails (explore-settings audit 5): the panel never waits for ever. */
  loadOrDefault(): Promise<ExploreSettings>;
  /** Saves all of them; an open walk screen or Explore hears of it at once (E17: a kind switched back on shows at once). */
  save(s: ExploreSettings): Promise<void>;
  onSettings(fn: (s: ExploreSettings) => void): () => void;
  /**
   * One kind on or off (ES1, ES2), from Explore's panel: reads what is saved, changes that kind alone and writes only the kinds,
   * so the range and the pocket alert are never written back. Changes queue, so two in one tick both land; one that fails to save
   * is not heard and not thrown.
   */
  toggleKind(kind: Kind, on: boolean): Promise<void>;
}

export function createExploreSettings(p: Pick<Ports, 'db'>): ExploreSettingsStore {
  const listeners = new Set<(s: ExploreSettings) => void>();
  const tell = (s: ExploreSettings) => {
    for (const fn of listeners) fn(s);
  };
  const load = async (): Promise<ExploreSettings> => {
    const [hidden, range, haptic, known] = await Promise.all([p.db.getMeta(HIDDEN_KEY), p.db.getMeta(RANGE_KEY), p.db.getMeta(HAPTIC_KEY), p.db.getMeta(KNOWN_KEY)]);
    return { hidden: parseHidden(hidden, known), rangeM: range ? clampRange(Number(range)) : EXPLORE_RULES.rangeDefault, haptic: haptic === '1' };
  };
  // The kinds first, then which kinds there were: a failure on the second leaves the choice itself stored (explore-settings audit 6).
  const writeKinds = async (hidden: Set<Kind>) => {
    await p.db.setMeta(HIDDEN_KEY, JSON.stringify([...hidden]));
    await p.db.setMeta(KNOWN_KEY, JSON.stringify(KINDS.map((k) => k.id))).catch(() => {});
  };
  // Every write runs in turn, a whole save too, so what is heard last is what is stored (explore-settings audit 4).
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(run: () => Promise<T>): Promise<T> => {
    const next = queue.then(run, run);
    queue = next.catch(() => {});
    return next;
  };
  return {
    load,
    loadOrDefault: () => load().catch(() => DEFAULT_SETTINGS),
    save: (s) =>
      enqueue(async () => {
        await Promise.all([
          writeKinds(s.hidden),
          p.db.setMeta(RANGE_KEY, String(clampRange(s.rangeM))),
          p.db.setMeta(HAPTIC_KEY, s.haptic ? '1' : '0'),
        ]);
        tell(s);
      }),
    onSettings(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    toggleKind: (kind, on) =>
      enqueue(async () => {
        try {
          const cur = await load();
          const hidden = setKind(cur.hidden, kind, on);
          await writeKinds(hidden);
          tell({ ...cur, hidden });
        } catch {
          // Not kept, so not heard: the switch stays as it was saved.
        }
      }),
  };
}
