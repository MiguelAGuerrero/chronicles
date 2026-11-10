import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Counts returns to the front, so a hint or reminder tapped in the background is picked up (and QL20's retry). */
export function useResumed(): number {
  const [resumed, setResumed] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setResumed((n) => n + 1));
    return () => sub.remove();
  }, []);
  return resumed;
}
