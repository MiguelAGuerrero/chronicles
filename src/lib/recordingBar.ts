import { formatDistance, formatDuration, formatElapsed } from './format';
import { pausedMs, type PauseSpan } from './geo';

/**
 * The recording bar's line (NV9): the time walked, paused time left out, and
 * the distance, with Paused first while paused. Pure.
 */
export function recordingLine(o: { startedAt: number | null; pauses: PauseSpan[]; now: number; distanceM: number }): {
  text: string;
  label: string;
  paused: boolean;
} {
  const paused = o.pauses.some((p) => p.ended_at == null);
  const ms = o.startedAt == null ? 0 : Math.max(0, o.now - o.startedAt - pausedMs(o.pauses, o.startedAt, o.now));
  const line = `${formatElapsed(ms)} · ${formatDistance(o.distanceM)}`;
  return {
    text: paused ? `Paused · ${line}` : line,
    label: `${paused ? 'Walk paused' : 'Walk recording'}, ${formatDistance(o.distanceM)} walked in ${formatDuration(ms)}. Return to the walk`,
    paused,
  };
}
