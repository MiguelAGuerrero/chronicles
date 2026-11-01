/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StepDetector, STEPS, type MotionSample } from '../steps';

// Motion (MO3, MO4): steps are found from the phone's acceleration, the same on
// every platform (Expo's Pedometer has no web build). Signals are synthetic,
// sampled at 20 Hz like DeviceMotion's interval, with gravity on z.

const G = 9.80665;

function rng(seed: number) {
  let s = seed;
  const u = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return { u, g: () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u()) };
}

/** Samples over `seconds` from a function of time giving the dynamic acceleration on x, y, z. */
function signal(seconds: number, f: (t: number) => [number, number, number], t0 = 0, hz = 20): MotionSample[] {
  const out: MotionSample[] = [];
  for (let i = 0; i <= seconds * hz; i++) {
    const t = t0 + (i * 1000) / hz;
    const [x, y, z] = f(t / 1000);
    out.push({ t, x, y, z: z + G });
  }
  return out;
}

/** Walking: a bounce at the step rate, mostly vertical, with some sway and noise. */
const walk = (rate: number, amp = 2, seed = 3) => {
  const r = rng(seed);
  return (s: number): [number, number, number] => [0.4 * amp * Math.sin(Math.PI * rate * s) + 0.15 * r.g(), 0.15 * r.g(), amp * Math.sin(2 * Math.PI * rate * s) + 0.2 * r.g()];
};
/** Held in a hand while standing: small jiggles and a slow sway. */
const handHeld = (seed = 4) => {
  const r = rng(seed);
  return (s: number): [number, number, number] => [0.25 * Math.sin(2 * Math.PI * 0.3 * s) + 0.12 * r.g(), 0.12 * r.g(), 0.15 * r.g()];
};
/** Typing on the screen: a sharp tap now and then, at uneven times. */
const typing = (seed = 5) => {
  const r = rng(seed);
  const taps: number[] = [];
  for (let t = 0; t < 120; t += 0.15 + r.u() * 1.2) taps.push(t);
  return (s: number): [number, number, number] => {
    const near = taps.some((tap) => s >= tap && s < tap + 0.05);
    return [0.05 * r.g(), 0.05 * r.g(), (near ? 1.8 : 0) + 0.08 * r.g()];
  };
};
/** A bus: a fast engine hum and small, irregular bumps. */
const bus = (seed = 6) => {
  const r = rng(seed);
  return (s: number): [number, number, number] => [0.3 * r.g(), 0.3 * r.g(), 0.35 * Math.sin(2 * Math.PI * 9 * s) + 0.3 * r.g()];
};

function feed(d: StepDetector, samples: MotionSample[]) {
  const states: { t: number; s: string }[] = [];
  for (const p of samples) {
    d.push(p);
    states.push({ t: p.t, s: d.state(p.t) });
  }
  return states;
}

test('steps 1: walking at 1.6 to 2.2 steps a second is found within 3 s', () => {
  for (const rate of [1.6, 1.9, 2.2]) {
    const d = new StepDetector();
    const states = feed(d, signal(10, walk(rate)));
    const first = states.find((x) => x.s === 'walking');
    assert.ok(first && first.t <= 3000, `${rate} steps/s: walking from ${first?.t} ms`);
    assert.ok(states.filter((x) => x.t > 3000).every((x) => x.s === 'walking'), `${rate} steps/s: stays walking`);
  }
});

test('steps 2: a gentle walk, phone held flat to look at the map, is walking', () => {
  const d = new StepDetector();
  const states = feed(d, signal(10, walk(1.7, 1.2)));
  assert.ok(states.filter((x) => x.t > 3000).every((x) => x.s === 'walking'));
});

test('steps 3: a phone lying still, or held in a hand while standing, is still', () => {
  for (const f of [() => [0.02, 0.02, 0.02] as [number, number, number], handHeld()]) {
    const d = new StepDetector();
    const states = feed(d, signal(60, f));
    assert.ok(states.filter((x) => x.t > STEPS.stillAfterMs).every((x) => x.s === 'still'), 'still throughout');
  }
});

test('steps 4: typing on the screen while standing is still', () => {
  const d = new StepDetector();
  const states = feed(d, signal(60, typing()));
  const walking = states.filter((x) => x.t > STEPS.stillAfterMs && x.s === 'walking').length;
  assert.ok(walking === 0, `${walking} samples read as walking`);
});

test('steps 5: riding a bus is not steps', () => {
  const d = new StepDetector();
  const states = feed(d, signal(60, bus()));
  const walking = states.filter((x) => x.t > STEPS.stillAfterMs && x.s === 'walking').length;
  assert.ok(walking === 0, `${walking} samples read as walking`);
});

test('steps 6: stopping reads still within 3 s, and starting again reads walking within 3 s', () => {
  const d = new StepDetector();
  const a = feed(d, signal(10, walk(1.8)));
  const b = feed(d, signal(10, handHeld(), 10_050));
  const c = feed(d, signal(10, walk(1.8, 2, 9), 20_100));
  assert.equal(a.at(-1)!.s, 'walking');
  const still = b.find((x) => x.s === 'still');
  assert.ok(still && still.t - 10_050 <= STEPS.stillAfterMs + 500, `still ${still ? still.t - 10_050 : '-'} ms after stopping`);
  const again = c.find((x) => x.s === 'walking');
  assert.ok(again && again.t - 20_100 <= 3000, `walking ${again ? again.t - 20_100 : '-'} ms after starting`);
});

test('steps 7: before enough samples, or after a gap in them, it says unknown', () => {
  const d = new StepDetector();
  assert.equal(d.state(0), 'unknown');
  feed(d, signal(5, handHeld()));
  assert.equal(d.state(5000 + STEPS.gapMs + 1), 'unknown', 'no samples for a while: unknown again');
});
