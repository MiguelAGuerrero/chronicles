/** One month of the walks list (QL28). */
export interface MonthGroup<W> {
  /** "2026-11", local time. */
  key: string;
  /** "November" in the current year, "November 2025" in another. */
  label: string;
  walks: W[];
}

/**
 * The walks under a header per local month of their start, newest month
 * first and newest walk first inside. A month with no walk has no group.
 */
export function byMonth<W extends { started_at: number }>(walks: W[], now: number): MonthGroup<W>[] {
  const thisYear = new Date(now).getFullYear();
  const sorted = [...walks].sort((a, b) => b.started_at - a.started_at);
  const groups: MonthGroup<W>[] = [];
  for (const w of sorted) {
    const d = new Date(w.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.walks.push(w);
      continue;
    }
    const label = d.getFullYear() === thisYear
      ? d.toLocaleDateString(undefined, { month: 'long' })
      : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    groups.push({ key, label, walks: [w] });
  }
  return groups;
}
