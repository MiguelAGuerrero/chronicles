/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakePorts } from '../fakes';
import { env, fakeDecoder, fakeEngine, mod, memo, row, SPEC, SPEC_B } from './fixtures';

// Memo transcripts: the run's shell over fakes (`transcribe/run`). Written before the module.

async function make(o: { engine?: any; decoder?: any; world?: any; on?: boolean; ref?: string | null; memos?: any[]; rows?: any[] } = {}) {
  const { createTranscriber } = await mod('run');
  const ports = fakePorts();
  for (const m of o.memos ?? [memo('m1', 10), memo('m2', 20), memo('m3', 30)]) await ports.db.addMoment(m);
  for (const r of o.rows ?? []) await (ports.db as any).putTranscript(r);
  const engine = o.engine ?? fakeEngine();
  const decoder = o.decoder ?? fakeDecoder();
  const world = o.world ?? env();
  const state = { on: o.on ?? true, ref: o.ref === undefined ? 'ref:x' : o.ref };
  const stored: string[] = [];
  const t = createTranscriber(ports, { engine, decoder, model: () => state, env: world, onStored: (id: string) => stored.push(id) });
  return { t, ports, engine, decoder, world, state, stored };
}
const rows = async (ports: any) => (await (ports.db as any).listTranscripts()).sort((a: any, b: any) => a.piece_id.localeCompare(b.piece_id));

test('MX4, MX6: a run stores each memo\'s words with the engine, the tag and the time, and never touches the memo', async () => {
  const { t, ports, engine } = await make();
  const before = JSON.stringify(await ports.db.getMomentsByIds(['m1', 'm2', 'm3']));
  await t.run();
  const got = await rows(ports);
  assert.deepEqual(got.map((r: any) => [r.piece_id, r.moment_id, r.engine, r.tag, r.text]), [
    ['m1', 'm1', 'fake', SPEC.tag, 'words 1'], ['m2', 'm2', 'fake', SPEC.tag, 'words 2'], ['m3', 'm3', 'fake', SPEC.tag, 'words 3'],
  ]);
  assert.ok(got.every((r: any) => typeof r.made_at === 'number'));
  assert.equal(JSON.stringify(await ports.db.getMomentsByIds(['m1', 'm2', 'm3'])), before, 'MX4: the memo is unchanged');
  assert.equal(engine.seen.length, 3);
});

test('MX3: a run writes transcripts and nothing else: no caption, title, note or summary', async () => {
  const { t, ports } = await make();
  const writes: string[] = [];
  for (const k of Object.keys(ports.db)) {
    const f = (ports.db as any)[k];
    if (typeof f === 'function' && /^(put|update|set|add|apply|delete|splice|split)/.test(k)) {
      (ports.db as any)[k] = (...a: unknown[]) => (writes.push(k), f(...a));
    }
  }
  await t.run();
  assert.deepEqual([...new Set(writes)], ['putTranscript']);
});

test('MX5: a stale transcript is read again and replaced in one write; its words show until then', async () => {
  const seenDuring: string[] = [];
  const engine = fakeEngine();
  const { t, ports } = await make({ rows: [row('m1', 'old words', SPEC_B.tag)], memos: [memo('m1', 10)], engine });
  engine.say = async () => {
    seenDuring.push((await (ports.db as any).listTranscripts())[0].text);
    return 'new words';
  };
  await t.run();
  assert.deepEqual(seenDuring, ['old words']);
  assert.deepEqual((await rows(ports)).map((r: any) => [r.text, r.tag]), [['new words', SPEC.tag]]);
});

test('MX16: the engine is loaded for a run and released when the queue is empty; idle holds nothing', async () => {
  const { t, engine } = await make();
  assert.equal(engine.live, false);
  await t.run();
  assert.deepEqual([engine.loads, engine.releases, engine.live], [1, 1, false]);
  await t.run();
  assert.equal(engine.loads, 1, 'nothing left to read: not even loaded');
});

test('MX16: going to the background or a memory warning stops the run and releases the engine', async () => {
  for (const stop of ['onBackground', 'onMemoryWarning']) {
    const engine = fakeEngine();
    let open!: () => void;
    engine.gate = new Promise<void>((r) => (open = r));
    const { t } = await make({ engine });
    const run = t.run();
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(engine.live, true);
    const stopped = t[stop]();
    open();
    await Promise.all([run, stopped]);
    assert.equal(engine.live, false, stop);
    assert.ok(engine.releases >= 1);
  }
});

test('MX17: no run without the switch, the model, the engine, the foreground, or while a walk records', async () => {
  const cases: [string, Parameters<typeof make>[0]][] = [
    ['switch off', { on: false }],
    ['no model', { ref: null }],
    ['background', { world: env({ foreground: false }) }],
    ['recording', { world: env({ recording: true }) }],
    ['no engine here', { engine: fakeEngine({ available: async () => false }) }],
  ];
  for (const [name, o] of cases) {
    const { t, engine, ports } = await make(o);
    assert.equal(await t.run(), 'skipped', name);
    assert.equal(engine.loads, 0, name);
    assert.equal((await (ports.db as any).listTranscripts()).length, 0, name);
  }
});

test('MX17: one memo at a time, the oldest first', async () => {
  const { t, engine, decoder } = await make({ memos: [memo('m3', 30), memo('m1', 10), memo('m2', 20)] });
  await t.run();
  assert.equal(engine.maxActive, 1);
  assert.deepEqual(decoder.calls.map((c: any) => c.uri), ['memo-m1.m4a', 'memo-m2.m4a', 'memo-m3.m4a']);
});

test('MX17: a memo kept while a run is going is saved at once and nothing is said', async () => {
  const engine = fakeEngine();
  let open!: () => void;
  engine.gate = new Promise<void>((r) => (open = r));
  const { t, ports, stored } = await make({ engine });
  const run = t.run();
  await new Promise((r) => setTimeout(r, 5));
  let saved = false;
  await ports.db.addMoment(memo('m9', 99)).then(() => (saved = true));
  assert.equal(saved, true, 'the save never waits for the run');
  assert.deepEqual(stored, [], 'nothing is announced mid-run');
  open();
  await run;
});

test('MX18: a memo that cannot be read does not stop the queue, is tried at most twice, and says nothing', async () => {
  const decoder = fakeDecoder(['wav16k'], { failFor: 'm2' });
  const { t, ports, engine } = await make({ decoder });
  await t.run();
  assert.deepEqual((await rows(ports)).map((r: any) => [r.piece_id, r.text, r.tries]), [['m1', 'words 1', 0], ['m2', null, 1], ['m3', 'words 2', 0]]);
  await t.run();
  await t.run();
  assert.equal((await rows(ports)).find((r: any) => r.piece_id === 'm2').tries, 2, 'a third run does not try it again');
  assert.equal(decoder.calls.filter((c: any) => c.uri.includes('m2')).length, 2);
  assert.equal(engine.seen.length, 2);
});

test('MX19: silence stores an empty transcript and is not read again', async () => {
  const engine = fakeEngine({ say: () => '' });
  const { t, ports } = await make({ engine, memos: [memo('m1', 10)] });
  await t.run();
  await t.run();
  assert.deepEqual((await rows(ports)).map((r: any) => r.text), ['']);
  assert.equal(engine.seen.length, 1);
});

test('MX20: the decoder\'s temporary audio is let go after each memo and the memo file is never changed', async () => {
  const { t, decoder, ports } = await make();
  await t.run();
  assert.equal(decoder.disposed, 3);
  const [m] = await ports.db.getMomentsByIds(['m1']);
  assert.equal(m.pieces[0].file_path, 'memo-m1.m4a');
});

test('MX31: the run asks the decoder only for the first accepted kind the platform has; a container engine skips it', async () => {
  const a = await make({ engine: fakeEngine({ inputs: ['container', 'wav16k'] }), decoder: fakeDecoder(['wav16k']) });
  await a.t.run();
  assert.equal(a.engine.seen[0].kind, 'container', 'the engine reads the memo\'s own container');
  assert.equal(a.decoder.calls.length, 0, 'so the decoder is never asked');
  const b = await make({ engine: fakeEngine({ inputs: ['samples16k', 'wav16k'] }), decoder: fakeDecoder(['wav16k']) });
  await b.t.run();
  assert.equal(b.decoder.calls[0].kind, 'wav16k');
  const c = await make({ engine: fakeEngine({ inputs: ['samples16k'] }), decoder: fakeDecoder(['wav16k']) });
  await c.t.run();
  assert.equal((await (c.ports.db as any).listTranscripts()).length, 0, 'an input the platform cannot give leaves the memo alone');
});

test('MX30: the same run over two engines with different models and inputs gives the same results', async () => {
  const outcome = async (engine: any, can: string[]) => {
    const { t, ports } = await make({ engine, decoder: fakeDecoder(can) });
    await t.run();
    return (await rows(ports)).map((r: any) => [r.piece_id, r.text]);
  };
  const a = await outcome(fakeEngine(), ['wav16k']);
  const b = await outcome(fakeEngine({ id: 'other', model: SPEC_B, inputs: ['samples16k'] }), ['samples16k']);
  assert.deepEqual(a, b);
});

test('MX32: a swapped engine re-reads quietly; the old words stay shown until each is replaced', async () => {
  const { t, ports } = await make({ rows: [row('m1', 'old one', SPEC_B.tag), row('m2', 'old two', SPEC_B.tag)], memos: [memo('m1', 10), memo('m2', 20)] });
  assert.deepEqual((await rows(ports)).map((r: any) => r.text), ['old one', 'old two']);
  await t.run();
  assert.ok((await rows(ports)).every((r: any) => r.tag === SPEC.tag));
});
