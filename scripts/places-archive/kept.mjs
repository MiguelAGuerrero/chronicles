// A source's kept output (a staged places build, SB1, decision 0110): JSON lines, a header first
// ({ startedAt, classes }), then one item per line sorted by id, so the same items give the same text and
// SHA-256. Read and written by the fetch jobs and the assemble; kept between runs on chronicles-data's `sources`
// prerelease.
import { createHash } from 'node:crypto';

/** @param {string} text @returns {{ header: { startedAt: string, classes: string[] }, items: any[] } | null} */
export function readKept(text) {
  const lines = String(text ?? '').split('\n').filter(Boolean);
  if (!lines.length) return null;
  const header = JSON.parse(lines[0]);
  if (!header || typeof header.startedAt !== 'string' || !Array.isArray(header.classes)) throw new Error('not a kept output: no header');
  return { header, items: lines.slice(1).map((l) => JSON.parse(l)) };
}

/** @param {{ header: { startedAt: string, classes: string[] }, items: any[] }} kept */
export function writeKept({ header, items }) {
  const sorted = [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const head = { startedAt: header.startedAt, classes: [...header.classes].sort() };
  return [head, ...sorted].map((o) => JSON.stringify(o)).join('\n') + '\n';
}

export const sha256 = (text) => createHash('sha256').update(text).digest('hex');
