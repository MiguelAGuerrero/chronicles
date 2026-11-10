// @layer core
import type { PendingJob } from './pending';

const KINDS = new Set(['walk', 'media', 'moment', 'piece', 'split', 'thread', 'remove']);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const numOrNull = (v: unknown) => v === null || num(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** A waiting delete read back from meta: only a well-formed one is ever run (UC13). */
export function isPendingJob(v: unknown): v is PendingJob {
  if (!v || typeof v !== 'object') return false;
  const j = v as Record<string, unknown>;
  if (!KINDS.has(j.kind as string) || !Array.isArray(j.ids) || !j.ids.every(str)) return false;
  const s = j.spec as Record<string, unknown> | undefined;
  if (!s || typeof s !== 'object') return false;
  switch (s.type) {
    case 'walk':
      return str(s.walkId);
    case 'media':
      return str(s.walkId) && Array.isArray(s.captureIds) && s.captureIds.every(str);
    case 'moment':
      return str(s.captureId);
    case 'piece':
      return str(s.momentId) && str(s.pieceId);
    case 'split': {
      const m = s.moment as Record<string, unknown> | undefined;
      return str(s.pieceId) && !!m && typeof m === 'object' && str(m.id) && num(m.t) && numOrNull(m.lat) && numOrNull(m.lon) && (m.walk_id === null || str(m.walk_id)) && (m.segment_id === null || m.segment_id === undefined || str(m.segment_id));
    }
    case 'thread':
      return str(s.threadId);
    case 'remove':
      return str(s.threadId) && str(s.momentId);
    default:
      return false;
  }
}

/** The waiting and still-storing deletes, as saved (UC13, ui-conformance audit 5, 9). */
export function isPendingJobs(v: unknown): v is PendingJob[] {
  return Array.isArray(v) && v.every(isPendingJob);
}
