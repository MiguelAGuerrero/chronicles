/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as meterModule from '../../ceremony/meter';

// A readout of the frames a replay really draws, for the owner's first look at the engine on the iPhone (replay
// ceremony RC6; decision 0206): the test machine draws the map in software and cannot say what a phone does. It shows at
// the preview address and when a replay's link asks (`meter=1`); never in the app itself.

type Meter = { line(): string; note(now: number, drew: boolean, drawMs: number): void; subscribe(l: () => void): () => void };
const { createMeter, meterOn } = meterModule as unknown as {
  createMeter(): Meter;
  meterOn(base: string, asked?: string | null): boolean;
};

test('RC6: the readout says the frames drawn a second, of those the display offered, the longest wait and the time to draw', { todo: 'test first' }, () => {
  const m = createMeter();
  let told = 0;
  m.subscribe(() => told++);
  assert.equal(m.line(), '', 'nothing to say before a second has passed');
  // A second of a 60 Hz display, every other frame drawn in 4 ms, one wait of 50 ms among them.
  let now = 1000;
  m.note(now, true, 4);
  for (let k = 1; k <= 60; k++) {
    now += k === 30 ? 50 : 16;
    m.note(now, k % 2 === 0, 4);
  }
  assert.equal(told, 1, 'said once a second, not every frame');
  assert.match(m.line(), /^\d+ of \d+ frames a second · longest wait \d+ ms · \d+(\.\d)? ms to draw$/);
  const [, drawn, offered, wait, draw] = /^(\d+) of (\d+) frames a second · longest wait (\d+) ms · ([\d.]+) ms to draw$/.exec(m.line()) ?? [];
  assert.ok(Number(offered) >= 58 && Number(offered) <= 62, `offered ${offered}`);
  assert.ok(Number(drawn) >= 28 && Number(drawn) <= 31, `drawn ${drawn}`);
  assert.ok(Number(wait) >= 60 && Number(wait) <= 70, `the longest wait between two drawn frames, ${wait} ms`);
  assert.equal(Number(draw), 4);
});

test('RC6: the readout shows at the preview address or when the link asks, and nowhere else', { todo: 'test first' }, () => {
  assert.equal(meterOn('/chronicles/preview'), true);
  assert.equal(meterOn('/chronicles/preview/'), true);
  assert.equal(meterOn('/chronicles'), false, 'never in the app itself');
  assert.equal(meterOn(''), false);
  assert.equal(meterOn('/chronicles', '1'), true, 'a link can ask');
  assert.equal(meterOn('/chronicles/preview', '0'), false, 'and can decline');
});
