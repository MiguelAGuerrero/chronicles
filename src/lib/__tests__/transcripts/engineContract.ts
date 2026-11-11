/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';


/**
 * What every engine must do, run over the fake and over the testable half of each adapter (as `dbContract` is run
 * over each Db). `MX29: every Engine member has a contract case` fails when a member of `Engine` is named in no title.
 */
export function engineContract(name: string, make: () => any) {
  test(`${name} MX29 id, model, offline: an engine says what it is, what it needs, and that it works offline`, { todo: 'test first' }, async () => {
    const e = make();
    assert.equal(typeof e.id, 'string');
    assert.equal(e.offline, true);
    for (const k of ['url', 'sha256', 'bytes', 'size', 'tag']) assert.ok(e.model[k], `model.${k}`);
    assert.match(e.model.sha256, /^[0-9a-f]{64}$/);
    assert.doesNotMatch(e.model.size, /[0-9]/, 'the size is said in words');
  });
  test(`${name} MX29 inputs: an engine names the audio it takes, best first`, { todo: 'test first' }, async () => {
    const e = make();
    assert.ok(e.inputs.length > 0 && e.inputs.every((k: string) => ['container', 'wav16k', 'samples16k'].includes(k)));
  });
  test(`${name} MX29 available, load, transcribe, release: nothing is held before load or after release`, { todo: 'test first' }, async () => {
    const e = make();
    assert.equal(typeof (await e.available()), 'boolean');
    await e.load({ ref: 'ref:x' });
    const words = await e.transcribe({ kind: e.inputs[0], path: '/x.wav', data: new Float32Array(2), uri: 'x' });
    assert.equal(typeof words, 'string');
    await e.release();
    await assert.rejects(() => e.transcribe({ kind: e.inputs[0], path: '/x.wav', data: new Float32Array(2), uri: 'x' }), 'released: not loaded');
  });
}

