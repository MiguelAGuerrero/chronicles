import type { TracePoint } from '../types';

const listeners = new Set<(p: TracePoint) => void>();

export function subscribe(cb: (p: TracePoint) => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function emit(points: TracePoint[]) {
  for (const p of points) for (const l of listeners) l(p);
}
