/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mod } from './fixtures';

// Memo transcripts: the decoders (MX20, MX27, MX31). Written before `transcribe/decoder` and `decoder.web`.

function nativeParts(o: { available?: boolean; fail?: boolean } = {}) {
  const log = { decoded: [] as string[][], removed: [] as string[], n: 0 };
  return {
    log,
    native: {
      isAvailable: () => o.available ?? true,
      decodeToPcm: async (uri: string, out: string) => {
        log.decoded.push([uri, out]);
        if (o.fail) throw new Error('decode failed');
      },
    },
    fs: {
      tempPath: () => `/cache/transcribe/${++log.n}.wav`,
      remove: async (p: string) => void log.removed.push(p),
    },
  };
}

test('MX20: the native decoder writes 16 kHz mono PCM to a temporary file and removes it when let go; the memo is only read', { todo: 'test first' }, async () => {
  const { createDecoder } = await mod('decoder');
  const { native, fs, log } = nativeParts();
  const d = createDecoder(native, fs);
  assert.deepEqual([d.can('wav16k'), d.can('samples16k'), d.can('container')], [true, false, false]);
  const got = await d.decode('memo-m1.m4a', 'wav16k');
  assert.deepEqual(got.audio, { kind: 'wav16k', path: '/cache/transcribe/1.wav' });
  assert.deepEqual(log.decoded, [['memo-m1.m4a', '/cache/transcribe/1.wav']]);
  assert.deepEqual(log.removed, []);
  await got.dispose();
  assert.deepEqual(log.removed, ['/cache/transcribe/1.wav']);
});

test('MX20: a decode that fails leaves no temporary file behind and rejects', { todo: 'test first' }, async () => {
  const { createDecoder } = await mod('decoder');
  const { native, fs, log } = nativeParts({ fail: true });
  await assert.rejects(() => createDecoder(native, fs).decode('memo-m1.m4a', 'wav16k'), /decode failed/);
  assert.deepEqual(log.removed, ['/cache/transcribe/1.wav']);
});

test('MX20, MX27: where the module is not linked (Expo Go) the decoder gives nothing', { todo: 'test first' }, async () => {
  const { createDecoder } = await mod('decoder');
  const { native, fs } = nativeParts({ available: false });
  assert.equal(createDecoder(native, fs).can('wav16k'), false);
});

test('MX20: on the web the browser decodes in memory to 16 kHz samples and writes nothing; no AudioContext, no samples', { todo: 'test first' }, async () => {
  const { createWebDecoder } = await mod('decoder.web');
  const bytes = async () => new ArrayBuffer(8);
  const ok = createWebDecoder({ hasAudio: () => true, read: bytes, toSamples: async () => new Float32Array([0.1, 0.2]) });
  assert.deepEqual([ok.can('samples16k'), ok.can('wav16k'), ok.can('container')], [true, false, false]);
  const got = await ok.decode('blob:memo', 'samples16k');
  assert.equal(got.audio.kind, 'samples16k');
  assert.deepEqual([...got.audio.data], [0.1, 0.2].map((x) => Math.fround(x)));
  await got.dispose();
  const none = createWebDecoder({ hasAudio: () => false, read: bytes, toSamples: async () => new Float32Array() });
  assert.equal(none.can('samples16k'), false);
});
