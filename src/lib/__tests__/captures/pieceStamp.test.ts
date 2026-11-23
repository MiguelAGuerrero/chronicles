/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Moment stacks, MS3 (decision 0123, 0036): a capture's stamp. A piece for an open moment takes no fix; a new
// moment takes a fresh one or asks for one. Test first: the module is reached by name.

// `place` (capture-at-a-place CA2-CA6): null unless a place's card began the capture, and never on a piece.
type Stamp = { t: number; at: [number, number] | null; locate: boolean; into: string | null; place: string | null };
type Mod = { stampFor(now: number, pos: { here: [number, number] | null; lastFixAt: number | null }, into: string | null, place?: string | null): Stamp };
const mod = () => import('../../pieceStamp' + '') as Promise<Mod>;

test('MS3: a piece\'s stamp asks for no fix and carries no place; a new moment\'s takes a fresh fix or asks for one', async () => {
  const { stampFor } = await mod();
  const fresh = { here: [-71.4, 41.8] as [number, number], lastFixAt: 9_000 };
  assert.deepEqual(stampFor(10_000, fresh, 'm1'), { t: 10_000, at: null, locate: false, into: 'm1', place: null });
  assert.deepEqual(stampFor(10_000, fresh, null), { t: 10_000, at: [-71.4, 41.8], locate: false, into: null, place: null });
  assert.deepEqual(stampFor(10_000, { here: null, lastFixAt: null }, null), { t: 10_000, at: null, locate: true, into: null, place: null });
  assert.deepEqual(stampFor(100_000, fresh, null).locate, true, 'a stale fix is not used');
});

// T44 (the owner's yes, "Camera stays (Recommended)", decision 0233, amending NR10): while a memo records, the camera keeps
// its slot and a photo taken then joins the memo's moment, through MS2's `into` alone.
type Memo = { t: number; into?: string | null; place?: string | null; replyTo?: { answeredId: string } | null };
type MidMemo = {
  photoMidMemo(memo: Memo | null, into: string | null, place: string | null): { into: string | null; place: string | null };
  memoJoins<S extends Memo>(memo: S, momentId: string): S;
};
const midMemo = () => import('../../pieceStamp' + '') as unknown as Promise<MidMemo>;

test('tend walk-screen T44: a photo mid-memo goes where the memo goes; with no moment yet it is the moment, the memo joining it', async () => {
  const { photoMidMemo, memoJoins } = await midMemo();
  const { stampFor } = await mod();
  const pos = { here: null, lastFixAt: null };
  // No memo: the camera's own target, as before.
  assert.deepEqual(photoMidMemo(null, 'open', null), { into: 'open', place: null });
  assert.deepEqual(photoMidMemo(null, null, 'pl'), { into: null, place: 'pl' });
  // A memo begun for an open moment (MS2): the photo's stamp joins that moment, and so does the memo, unchanged.
  const forOpen = { ...stampFor(1, pos, 'm1'), t: 1 };
  const toOpen = photoMidMemo(forOpen, null, null);
  assert.deepEqual(stampFor(4, pos, toOpen.into, toOpen.place).into, 'm1');
  assert.equal(memoJoins(forOpen, 'm1'), forOpen);
  // A memo of its own: the photo is stamped as a new moment ('ph' once kept), and the memo, saved after, goes into it,
  // keeping its own time, and its fix, place and reply for a moment gone meanwhile (UN11).
  const own = { t: 1, into: null, place: null, replyTo: { answeredId: 'a' } };
  const toOwn = photoMidMemo(own, null, null);
  assert.deepEqual(stampFor(4, pos, toOwn.into, toOwn.place), { t: 4, at: null, locate: true, into: null, place: null });
  assert.deepEqual(memoJoins(own, 'ph'), { t: 1, into: 'ph', place: null, replyTo: { answeredId: 'a' } });
});

test('tend walk-screen audit 22: a photo mid-memo follows the memo, never the camera\'s open moment', async () => {
  const { photoMidMemo, memoJoins } = await midMemo();
  // Group captures on (MS19): the edge camera would add to the open moment X. A memo begun from a place's card (CA3)
  // has no moment: the photo is kept as the moment that finds the card's place, and the memo joins it, never X.
  const fromCard = { t: 1, into: null, place: 'K' };
  const photo = photoMidMemo(fromCard, 'X', null);
  assert.deepEqual(photo, { into: null, place: 'K' });
  assert.deepEqual(memoJoins(fromCard, 'ph'), { t: 1, into: 'ph', place: 'K' }, 'the memo goes with the photo, to K');
  // With no place either, still not X.
  assert.deepEqual(photoMidMemo({ t: 1 }, 'X', 'other'), { into: null, place: null });
  // A memo begun for an open moment keeps that one, whatever the camera would add to.
  assert.deepEqual(photoMidMemo({ t: 1, into: 'm1' }, 'X', 'K'), { into: 'm1', place: null });
});
