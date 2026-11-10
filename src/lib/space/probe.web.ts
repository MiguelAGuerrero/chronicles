// @layer adapter
import { homeScreenNamed, type SpaceProbe } from './core';

type Nav = Navigator & { standalone?: boolean };
const nav = (): Nav | undefined => (typeof navigator === 'undefined' ? undefined : (navigator as Nav));

/**
 * The web's room (SA1, SA10): the browser's quota for the app minus what it uses, and its persistence
 * request. A web exception (docs/ARCHITECTURE.md): expo-file-system's web build reports 0 free.
 */
export const probe: SpaceProbe = {
  async free() {
    const s = nav()?.storage;
    if (!s?.estimate) return null;
    const { quota, usage } = await s.estimate();
    if (typeof quota !== 'number' || typeof usage !== 'number') return null;
    return Math.max(0, quota - usage);
  },
  async persist() {
    const s = nav()?.storage;
    if (!s?.persist) return null;
    if (await s.persisted?.().catch(() => false)) return true;
    return s.persist();
  },
  homeScreen() {
    const n = nav();
    const standalone = n?.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
    return homeScreenNamed({ ua: n?.userAgent, touchPoints: n?.maxTouchPoints, standalone });
  },
};
