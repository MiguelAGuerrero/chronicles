/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { ChecklistItem, Kind } from '../../explore/explore';
import type { CaptureKind, LngLat } from '../../types';

// A place offered after the moment (specs/moment-assignment-fallback, PO1-PO12): written from the spec before the code.

type Moment = { id: string; walkId: string | null; at: LngLat | null; kind: CaptureKind };
type Offer = { captureId: string; walkId: string; at: LngLat; kind: CaptureKind; items: ChecklistItem[] };
type Api = {
  OFFER_RULES: { nearM: number; awayM: number; named: number };
  offerFor: (m: Moment, o: { items: ChecklistItem[]; found: Set<string>; hidden: Set<Kind>; left: Set<string>; places: boolean; atPlace: boolean }) => Offer | null;
  offerStill: (offer: Offer | null, o: { here: LngLat | null; walkId: string | null; places: boolean; paused: boolean; found: Set<string>; momentIds: Set<string> }) => Offer | null;
  offerLine: (offer: Offer) => string;
  offerLabels: (offer: Offer) => { yes: string | null; leave: string };
  offerTake: (offer: Offer | null, key: string) => ChecklistItem | null;
};
const api = async () => (await import('../../explore/placeOffer')) as unknown as Api;

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const item = (name: string, at: LngLat, kind: Kind = 'monuments'): ChecklistItem => ({
  key: `k:${name}`, area_key: 'A', name, category: 'history', kind, at, generic: false,
});
const moment = (more: Partial<Moment> = {}): Moment => ({ id: 'c1', walkId: 'w1', at: O, kind: 'photo', ...more });
const none = { found: new Set<string>(), hidden: new Set<Kind>(), left: new Set<string>(), places: true, atPlace: false };
const still = (more: Partial<Parameters<Api['offerStill']>[1]> = {}) => ({
  here: O, walkId: 'w1', places: true, paused: false, found: new Set<string>(), momentIds: new Set(['c1']), ...more,
});

test('PO1: one unfound shown place within 30 m is offered by name, with Yes and Leave it', async () => {
  const { offerFor, offerLine, offerLabels } = await api();
  const bridge = item('Old Bridge', m(20, 0));
  const offer = offerFor(moment(), { ...none, items: [bridge] });
  assert.ok(offer);
  assert.deepEqual(offer.items.map((i) => i.key), [bridge.key]);
  assert.equal(offer.captureId, 'c1');
  assert.equal(offerLine(offer), 'Was this photo about Old Bridge?');
  assert.ok(offerLabels(offer).yes, 'one place has a Yes');
});

test('PO2: the choices are spoken with the place and the moment in them', async () => {
  const { offerFor, offerLabels } = await api();
  const offer = offerFor(moment(), { ...none, items: [item('Old Bridge', m(20, 0))] });
  assert.ok(offer);
  assert.deepEqual(offerLabels(offer), { yes: 'Yes, this photo is about Old Bridge', leave: 'Leave it, keep this photo on its own' });
});

test('PO3: several within 30 m are all offered, nearest first, named in words; a tap takes only an offered one', async () => {
  const { offerFor, offerLine, offerLabels } = await api();
  const clock = item('Clock Tower', m(10, 5));
  const hall = item('Corn Exchange', m(-25, 0), 'museums');
  const offer = offerFor(moment(), { ...none, items: [hall, clock] });
  assert.ok(offer);
  assert.deepEqual(offer.items.map((i) => i.name), ['Clock Tower', 'Corn Exchange']);
  assert.equal(offerLine(offer), 'Was this photo about Clock Tower or Corn Exchange? Tap one on the map.');
  assert.equal(offerLabels(offer).yes, null, 'several places: no Yes, the map is the choice');
  const three = offerFor(moment(), { ...none, items: [hall, clock, item('Well', m(0, 3))] });
  assert.ok(three);
  assert.equal(offerLine(three), 'Was this photo about Well, Clock Tower or Corn Exchange? Tap one on the map.');
});

test('PO4: a place left with Leave it on this walk is not offered again', async () => {
  const { offerFor } = await api();
  const bridge = item('Old Bridge', m(20, 0));
  const clock = item('Clock Tower', m(0, 10));
  assert.equal(offerFor(moment(), { ...none, items: [bridge], left: new Set([bridge.key]) }), null);
  assert.deepEqual(offerFor(moment(), { ...none, items: [bridge, clock], left: new Set([bridge.key]) })?.items.map((i) => i.name), ['Clock Tower']);
});

test('PO5: nothing is offered with Places off, a moment begun on a place\'s card, no fix, no walk, only a place past 30 m, a found place or a hidden kind', async () => {
  const { offerFor, OFFER_RULES } = await api();
  assert.equal(OFFER_RULES.nearM, 30);
  const bridge = item('Old Bridge', m(20, 0));
  const items = [bridge];
  assert.equal(offerFor(moment(), { ...none, items, places: false }), null, 'Places off');
  assert.equal(offerFor(moment(), { ...none, items, atPlace: true }), null, 'begun on a place\'s card: it found that place (decision 0246)');
  assert.equal(offerFor(moment({ at: null }), { ...none, items }), null, 'no fix');
  assert.equal(offerFor(moment({ walkId: null }), { ...none, items }), null, 'not on a walk');
  assert.equal(offerFor(moment(), { ...none, items: [item('Far', m(31, 0))] }), null, '31 m');
  assert.equal(offerFor(moment(), { ...none, items, found: new Set([bridge.key]) }), null, 'found');
  assert.equal(offerFor(moment(), { ...none, items, hidden: new Set<Kind>(['monuments']) }), null, 'a kind switched off');
});

test('PO6: the offer holds within 60 m and with no fix; it goes past 60 m, on another walk, with Places off, paused, the moment gone or every place found', async () => {
  const { offerFor, offerStill, OFFER_RULES } = await api();
  assert.equal(OFFER_RULES.awayM, 60);
  const bridge = item('Old Bridge', m(20, 0));
  const clock = item('Clock Tower', m(0, 10));
  const offer = offerFor(moment(), { ...none, items: [bridge, clock] });
  assert.ok(offer);
  assert.equal(offerStill(offer, still({ here: m(55, 0) })), offer, 'within 60 m');
  assert.equal(offerStill(offer, still({ here: null })), offer, 'no fix holds');
  assert.equal(offerStill(offer, still({ here: m(61, 0) })), null, 'past 60 m');
  assert.equal(offerStill(offer, still({ walkId: 'w2' })), null, 'another walk');
  assert.equal(offerStill(offer, still({ walkId: null })), null, 'the walk ended');
  assert.equal(offerStill(offer, still({ places: false })), null, 'Places off');
  assert.equal(offerStill(offer, still({ paused: true })), null, 'paused');
  assert.equal(offerStill(offer, still({ momentIds: new Set() })), null, 'the moment deleted');
  assert.deepEqual(offerStill(offer, still({ found: new Set([bridge.key]) }))?.items.map((i) => i.name), ['Clock Tower'], 'a place found another way leaves the line');
  assert.equal(offerStill(offer, still({ found: new Set([bridge.key, clock.key]) })), null, 'every place found');
  assert.equal(offerStill(null, still()), null);
});

test('PO7: the offer never calls feedback(): only the pocket alert buzzes in useExplore', () => {
  // A source scan (performance.md, "Testing a cost"): every feedback() call in the hook, which must be the pocket alert's alone.
  const calls = (src: string) => [...src.matchAll(/feedback\(([^)]*)\)/g)].map((x) => x[1]);
  const src = readFileSync(new URL('../../explore/useExplore.ts', import.meta.url), 'utf8');
  assert.ok(/offerAfter/.test(src), 'the offer lives in useExplore: nothing to scan otherwise');
  assert.deepEqual(calls(src), ["'nudge'"]);
  // Shown to fail: a buzz added to the offer is caught.
  assert.notDeepEqual(calls(`${src}\nconst offerAfter = () => feedback('success');`), ["'nudge'"]);
});

test('PO8: the line names places and never counts them', async () => {
  const { offerFor, offerLine } = await api();
  const names = ['Well', 'Clock Tower', 'Corn Exchange', 'Gate', 'Font'];
  const offer = offerFor(moment(), { ...none, items: names.map((n, i) => item(n, m(i * 5, 1))) });
  assert.ok(offer);
  const line = offerLine(offer);
  assert.equal(line, 'Was this photo about Well, Clock Tower, Corn Exchange or another place nearby? Tap one on the map.');
  assert.ok(!/\d/.test(line), 'no number');
});

test('PO9: Yes or a tap takes the offered place for the moment; a key not offered takes nothing', async () => {
  const { offerFor, offerTake } = await api();
  const bridge = item('Old Bridge', m(20, 0));
  const offer = offerFor(moment(), { ...none, items: [bridge] });
  assert.deepEqual(offerTake(offer, bridge.key), bridge);
  assert.equal(offerTake(offer, 'k:Elsewhere'), null);
  assert.equal(offerTake(null, bridge.key), null);
});

test('PO10: every kind of moment is offered, said in its own word', async () => {
  const { offerFor, offerLine, offerLabels } = await api();
  const items = [item('Old Bridge', m(20, 0))];
  const said = (kind: CaptureKind) => {
    const o = offerFor(moment({ kind }), { ...none, items });
    assert.ok(o, kind);
    return [offerLine(o), offerLabels(o).leave];
  };
  assert.deepEqual(said('video'), ['Was this video about Old Bridge?', 'Leave it, keep this video on its own']);
  assert.deepEqual(said('voice'), ['Was this voice memo about Old Bridge?', 'Leave it, keep this voice memo on its own']);
  assert.deepEqual(said('text'), ['Was this note about Old Bridge?', 'Leave it, keep this note on its own']);
});

test('PO11: the words are plain: no exclamation, no reminder, no hurry', async () => {
  const { offerFor, offerLine, offerLabels } = await api();
  const one = offerFor(moment(), { ...none, items: [item('Old Bridge', m(20, 0))] });
  const two = offerFor(moment(), { ...none, items: [item('Old Bridge', m(20, 0)), item('Gate', m(0, 5))] });
  assert.ok(one && two);
  for (const s of [offerLine(one), offerLine(two), offerLabels(one).yes ?? '', offerLabels(one).leave])
    assert.ok(!/!|don.t forget|remember to|now\b|quick/i.test(s), s);
});

test('moment-assignment-fallback ui 2: with several places the line asks to tap one, never "it"', async () => {
  const { offerFor, offerLine } = await api();
  const offer = offerFor(moment(), { ...none, items: [item('Clock Tower', m(10, 5)), item('Corn Exchange', m(-25, 0))] });
  assert.ok(offer);
  assert.equal(offerLine(offer), 'Was this photo about Clock Tower or Corn Exchange? Tap one on the map.');
});
