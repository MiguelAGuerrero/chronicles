// @layer core
/**
 * What I'm into's way in (WI1, WI3; what-im-into-page audit 3), pure: the router's push and the clock are given. A
 * double tap on the row once pushed the page twice and left the walk's detour flag set, so a later blur to the tabs kept
 * the Add to this moment pill open over them. As `walkGate` does for the walk screen (tabs audit 1): no push while the
 * page is up or one is on its way (for `pendingMs`, or until the page mounts), and a detour counts only on the blur that
 * follows its push, within `pendingMs`.
 */
export type IntoHref = '/into' | { pathname: '/into'; params: { from: 'walk' } };

export function createIntoNav(p: { push: (href: IntoHref) => void; now: () => number; pendingMs?: number }) {
  const pendingMs = p.pendingMs ?? 1500;
  let up = false;
  let pendingUntil = 0;
  let detourAt: number | null = null;
  return {
    /** `from: 'walk'` when opened from the walk's drawer: its Back then names the walk (WI20). False when refused. */
    open(from: 'walk' | 'ready' = 'ready'): boolean {
      const t = p.now();
      if (up || t < pendingUntil) return false;
      pendingUntil = t + pendingMs;
      detourAt = t;
      p.push(from === 'walk' ? { pathname: '/into', params: { from: 'walk' } } : '/into');
      return true;
    },
    /** Whether the screen is being left for the page; asked once, on that blur. */
    tookDetour(): boolean {
      const at = detourAt;
      detourAt = null;
      return at != null && p.now() - at < pendingMs;
    },
    /** The page mounted; returns its unmount. */
    shown(): () => void {
      up = true;
      pendingUntil = 0;
      return () => {
        up = false;
      };
    },
  };
}
