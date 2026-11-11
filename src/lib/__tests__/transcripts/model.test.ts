/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakePorts } from '../fakes';
import { fakeEngine, fakeFiles, mod, row, SPEC, SPEC_B } from './fixtures';

// Memo transcripts: the model's shell over fakes (`transcribe/model`). Written before the module.

async function make(o: { files?: any; engine?: any; on?: boolean; installed?: boolean } = {}) {
  const { createModelStore } = await mod('model');
  const ports = fakePorts();
  const files = o.files ?? fakeFiles();
  const engine = o.engine ?? fakeEngine();
  if (o.on) await ports.db.setMeta('transcribe_on', '1');
  if (o.installed) files.installed.set(engine.model.tag, engine.model.tag);
  const model = createModelStore(ports, { engine, files });
  return { model, ports, files, engine };
}

test('MX10: the switch is off by default and nothing is read from the network at launch', { todo: 'test first' }, async () => {
  const { model, files } = await make();
  await model.init();
  assert.equal(model.store.get().on, false);
  assert.equal(files.downloads, 0);
});

test('MX11: turning it on asks, in words, and fetches nothing until Download', { todo: 'test first' }, async () => {
  const { model, files } = await make();
  await model.init();
  model.ask();
  const s = model.store.get();
  assert.equal(s.asking, true);
  assert.equal(s.size, 'about sixty megabytes');
  assert.equal(files.downloads, 0, 'asking is not fetching');
  model.decline();
  assert.deepEqual([model.store.get().asking, model.store.get().on, files.downloads], [false, false, 0], 'Not now leaves the switch off');
});

test('MX11, MX12: Download fetches once, installs and turns the switch on; it is kept across a launch', { todo: 'test first' }, async () => {
  const { model, files, ports } = await make();
  await model.init();
  model.ask();
  await model.download();
  assert.deepEqual([files.downloads, files.committed, model.store.get().on, model.store.get().installed], [1, 1, true, true]);
  assert.equal(await ports.db.getMeta('transcribe_on'), '1');
});

test('MX12: a wrong hash and a failed download install nothing, are said in words and leave the switch off', { todo: 'test first' }, async () => {
  for (const files of [fakeFiles({ hash: 'f'.repeat(64) }), fakeFiles({ failDownload: true })]) {
    const { model } = await make({ files });
    await model.init();
    model.ask();
    await model.download();
    const s = model.store.get();
    assert.deepEqual([files.committed, files.installed.size, s.on, s.installed], [0, 0, false, false]);
    assert.equal(s.line, 'Couldn’t get it. Try again.');
  }
  const bad = fakeFiles({ hash: 'f'.repeat(64) });
  const { model } = await make({ files: bad });
  await model.init();
  model.ask();
  await model.download();
  assert.equal(bad.discarded, 1, 'a file that is not the pinned one is deleted, never moved into place');
});

test('MX13: an evicted model reads as not installed, is said only while the switch is on, and nothing is fetched', { todo: 'test first' }, async () => {
  const on = await make({ on: true });
  await on.model.init();
  assert.equal(on.model.store.get().installed, false);
  assert.match(on.model.store.get().line, /Not installed/);
  assert.equal(on.files.downloads, 0, 'a launch never starts a fetch');
  const off = await make({ on: false });
  await off.model.init();
  assert.equal(off.model.store.get().line, null, 'off: nothing is said');
  on.model.ask();
  assert.equal(on.model.store.get().asking, true, 'the download is offered again');
});

test('MX14: with less room than the model needs nothing is fetched and the owner is told in words', { todo: 'test first' }, async () => {
  const files = fakeFiles({ free: 1024 });
  const { model } = await make({ files });
  await model.init();
  model.ask();
  await model.download();
  assert.equal(files.downloads, 0);
  assert.match(model.store.get().line, /room/i);
  assert.doesNotMatch(model.store.get().line, /[0-9]/);
});

test('MX15: turning it off offers Remove, only on the owner\'s tap; Remove deletes the file and keeps every transcript', { todo: 'test first' }, async () => {
  const { model, files, ports } = await make({ on: true, installed: true });
  await (ports.db as any).putTranscript(row('m1', 'still here'));
  await model.init();
  const offer = await model.turnOff();
  assert.equal(offer.canRemove, true);
  assert.equal(model.store.get().on, false);
  assert.equal(files.installed.size, 1, 'turning it off alone keeps the file');
  await model.remove();
  assert.equal(files.installed.size, 0);
  assert.equal(model.store.get().installed, false);
  assert.doesNotMatch(model.store.get().line ?? '', /[0-9]/);
  assert.deepEqual((await (ports.db as any).listTranscripts()).map((r: any) => r.text), ['still here']);
});

test('MX27: an engine that cannot run here says so in words and nothing is fetched', { todo: 'test first' }, async () => {
  const engine = fakeEngine({ available: async () => false });
  const { model, files } = await make({ engine, on: true });
  await model.init();
  assert.equal(model.store.get().supported, false);
  assert.match(model.store.get().line, /can.t/i);
  model.ask();
  await model.download();
  assert.equal(files.downloads, 0);
});

test('MX32: a new engine\'s model is not installed until the owner taps Download; the old file goes when the new one installs', { todo: 'test first' }, async () => {
  const files = fakeFiles();
  files.installed.set(SPEC.tag, SPEC.tag); // the old engine's file
  const engine = fakeEngine({ model: SPEC_B });
  const { model } = await make({ files, engine, on: true });
  await model.init();
  assert.equal(model.store.get().installed, false, 'the new tag is not on the device');
  assert.equal(files.downloads, 0, 'never fetched on its own');
  assert.equal(files.removedOthers, 0);
  model.ask();
  await model.download();
  assert.deepEqual([files.removedOthers, [...files.installed.keys()]], [1, [SPEC_B.tag]]);
});
