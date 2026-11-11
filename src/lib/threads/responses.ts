// @layer core
import type { Link } from './types';

/**
 * A moment's responses (response thread, decision 0128): every moment that answers it, or answers one of its
 * responses, read from the owner's replies (`moment_link`) alone (RT14). Pass links with what waits in Undo already
 * gone (`visibleThreads`): a response gone takes with it those that answered only it (RT8).
 */
export function responsesOf(rootId: string, links: Link[]): string[] {
  const answers = new Map<string, string[]>();
  for (const l of links) {
    if (l.from_id === l.to_id) continue;
    const list = answers.get(l.to_id) ?? [];
    list.push(l.from_id);
    answers.set(l.to_id, list);
  }
  const seen = new Set([rootId]);
  const out: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    for (const id of answers.get(queue.shift()!) ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      queue.push(id);
    }
  }
  return out;
}

export interface ResponseRow<M extends { id: string; t: number }> {
  moment: M;
  /** The response it answers, when that is not the sheet's own moment: only then does an entry say so (RT4). */
  answering: M | null;
}

/** The sheet's entries (RT4): the moment first, then every response kept, oldest first, each with the response it answers. */
export function responseRows<M extends { id: string; t: number }>(root: M, moments: ReadonlyMap<string, M>, links: Link[]): ResponseRow<M>[] {
  const ids = new Set(responsesOf(root.id, links));
  const kept = [...ids].map((id) => moments.get(id)).filter((m): m is M => !!m);
  kept.sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
  // The latest link from a response to the root or to another response is the one it answers.
  const parent = (id: string): string | null => {
    const mine = links.filter((l) => l.from_id === id && (l.to_id === root.id || ids.has(l.to_id))).sort((a, b) => b.created_at - a.created_at);
    return mine[0]?.to_id ?? null;
  };
  return [
    { moment: root, answering: null },
    ...kept.map((m) => {
      const p = parent(m.id);
      return { moment: m, answering: p && p !== root.id ? moments.get(p) ?? null : null };
    }),
  ];
}
