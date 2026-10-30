import type { TracePoint } from '../types';
import type { RecorderStatus } from './types';

const pointListeners = new Set<(p: TracePoint) => void>();
const statusListeners = new Set<(s: RecorderStatus) => void>();
let lastStatus: RecorderStatus = { kind: 'idle' };

export function subscribe(cb: (p: TracePoint) => void) {
  pointListeners.add(cb);
  return () => {
    pointListeners.delete(cb);
  };
}

export function emit(points: TracePoint[]) {
  for (const p of points) for (const l of pointListeners) l(p);
}

/** Subscribes to status changes; the current status is delivered at once. */
export function subscribeStatus(cb: (s: RecorderStatus) => void) {
  statusListeners.add(cb);
  cb(lastStatus);
  return () => {
    statusListeners.delete(cb);
  };
}

export function setStatus(s: RecorderStatus) {
  lastStatus = s;
  for (const l of statusListeners) l(s);
}
