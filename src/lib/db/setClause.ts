// @layer core
// UPDATE … SET for a patch, out of the native store (a file over the size limit may not grow; decision 0178).
import type { SQLiteBindValue } from 'expo-sqlite';

/** UPDATE ... SET for the given patch; only known column names reach the SQL. */
export function setClause(patch: Record<string, unknown>, allowed: readonly string[]) {
  const keys = Object.keys(patch).filter((k) => allowed.includes(k));
  const values = keys.map((k) => {
    const v = patch[k];
    return typeof v === 'boolean' ? (v ? 1 : 0) : (v as SQLiteBindValue);
  });
  return { sql: keys.map((k) => `${k} = ?`).join(', '), values };
}
