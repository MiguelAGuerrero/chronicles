// @layer core
import type { PendingJob } from './pending';

const KINDS = new Set(['walk', 'media', 'moment', 'thread', 'remove']);
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
