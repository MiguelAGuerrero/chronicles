// @layer view
import { useEffect, useState } from 'react';

/** A toast that clears itself `ms` after it was set (Explore's "Zoom in to look closer"). */
export function useTimedToast(ms: number): [string | null, (t: string | null) => void] {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), ms);
    return () => clearTimeout(t);
  }, [toast, ms]);
  return [toast, setToast];
}
