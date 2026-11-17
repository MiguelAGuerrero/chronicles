/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Capture, Moment } from '../../types';

// Stack with previous (SW6, SW8, decision 0196): which moment is "previous" and when an entry may be joined. Test first:
// reached by name, so each fails until `lib/join.ts` exists.
type Refs = Partial<Record<'thread' | 'link' | 'reminder' | 'find' | 'reaction' | 'hidden' | 'pick' | 'mention', boolean>>;
type Join = {
  previousFor(moments: Moment[], entry: Moment): Moment | null;
  joinable(entry: Moment, ctx: { refs: Refs; lastKept: string | null; writing: string | null }): boolean;
};
const mod = () => import('../../join/rules' + '') as Promise<Join>;

const LAT = 41.8, LON = -71.4;
const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m).getTime();
const piece = (id: string, t: number): Capture => ({ id, moment_id: id, t, kind: 'text', file_path: null, body: id });
const mk = (id: string, t: number, o: Partial<Moment> = {}): Moment => ({ id, walk_id: null, t, lat: LAT, lon: LON, segment_id: null, pieces: [piece(id, t)], ...o });

test('SW6: previous is the latest moment before the entry on the same local day', async () => {
  const { previousFor } = await mod();
  const a = mk('a', at(17, 8, 0)), b = mk('b', at(17, 8, 10)), entry = mk('e', at(17, 8, 21));
  assert.equal(previousFor([a, b, entry], entry)?.id, 'b', 'the latest one before it');
  assert.equal(previousFor([a, b, mk('later', at(17, 9, 0)), entry], entry)?.id, 'b', 'never one after it');
});

test('SW6: none, an earlier day, another walk or farther than 100 m offers nothing', async () => {
  const { previousFor } = await mod();
  const entry = mk('e', at(17, 8, 21));
  assert.equal(previousFor([entry], entry), null, 'none before it');
  assert.equal(previousFor([mk('y', at(16, 23, 50)), entry], entry), null, 'an earlier day');
  assert.equal(previousFor([mk('w', at(17, 8, 0), { walk_id: 'w1' }), entry], entry), null, 'a walk, the entry off any');
  assert.equal(previousFor([mk('w', at(17, 8, 0), { walk_id: 'w1' }), mk('e2', at(17, 8, 21), { walk_id: 'w2' })], mk('e2', at(17, 8, 21), { walk_id: 'w2' })), null, 'another walk');
  assert.equal(previousFor([mk('far', at(17, 8, 0), { lat: LAT + 0.0027 }), entry], entry), null, 'about 300 m away');
  assert.equal(previousFor([mk('near', at(17, 8, 0), { lat: LAT + 0.00045 }), entry], entry)?.id, 'near', 'about 50 m away');
  assert.equal(previousFor([mk('same', at(17, 8, 0), { walk_id: 'w1' }), mk('e3', at(17, 8, 5), { walk_id: 'w1' })], mk('e3', at(17, 8, 5), { walk_id: 'w1' }))?.id, 'same', 'the same walk');
  assert.equal(previousFor([mk('np', at(17, 8, 0), { lat: null, lon: null }), entry], entry)?.id, 'np', 'a moment with no place counts as near');
});

test('SW8: a thread, a link, a reminder, a find, a reaction, a Hidden mark, a resurfaced pick or a mention makes it not joinable', async () => {
  const { joinable } = await mod();
  const e = mk('e', at(17, 8, 21));
  const ok = { lastKept: 'e', writing: null };
  assert.equal(joinable(e, { ...ok, refs: {} }), true);
  for (const k of ['thread', 'link', 'reminder', 'find', 'reaction', 'hidden', 'pick', 'mention'] as const) {
    assert.equal(joinable(e, { ...ok, refs: { [k]: true } }), false, k);
  }
});

test('SW8: only the last entry kept, and not one being written, is joinable', async () => {
  const { joinable } = await mod();
  const e = mk('e', at(17, 8, 21));
  assert.equal(joinable(e, { refs: {}, lastKept: 'other', writing: null }), false, 'not the last kept: the slot empties at the next capture');
  assert.equal(joinable(e, { refs: {}, lastKept: null, writing: null }), false, 'not kept in this sitting');
  assert.equal(joinable(e, { refs: {}, lastKept: 'e', writing: 'e' }), false, 'being written');
});
