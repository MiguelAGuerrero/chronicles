import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createDiagnostics } from '../../diagnostics/shell';
import { caught, failedSave, failedSaves, fallback, report, resetSink, retryFailed } from '../../diagnostics/sink';
import { fakePorts } from '../fakes';
import type { Diagnostic } from '../../diagnostics/core';

/** The log's Db methods, until the Db interface has them (tests first). */
type LogDb = { getDiagnostics(): Promise<Diagnostic[]>; failNext(method: string): void };
const logDb = (p: ReturnType<typeof fakePorts>) => p.db as unknown as LogDb;

// Errors handled by kind: the sink and the log's shell over fakes (specs/errors-handled/spec.md, EH5, EH7-EH10).

beforeEach(() => resetSink());

const settle = () => new Promise((r) => setTimeout(r, 0));

test('EH5 every handler records; a store that fails keeps the entry in memory and shares it', async () => {
  const p = fakePorts({ now: 1_000 });
  const d = createDiagnostics(p);
  report('unexpected', 'walk · stop', new Error('boom'));
  caught('cache', 'tiles · read')(new Error('offline'));
  await settle();
  const first = await d.entries();
  assert.deepEqual(first.map((e) => e.message).sort(), ['boom', 'offline']);
  assert.equal(first.length, 2);
  assert.ok((await logDb(p).getDiagnostics()).length === 2, 'written to the store');
  logDb(p).failNext('addDiagnostic');
  report('cache', 'landing · read', new Error('lost'));
  await settle();
  const after = await d.entries();
  assert.ok(after.some((e) => e.message === 'lost'), 'kept in memory when the store refused it, and shared');
  assert.doesNotThrow(() => report('cache', 'x', undefined), 'reporting never throws');
});

test('EH5 what is reported before the log attaches is written when it does', async () => {
  report('cache', 'early · boot', new Error('first'));
  const p = fakePorts({ now: 5 });
  const d = createDiagnostics(p);
  await settle();
  assert.deepEqual((await d.entries()).map((e) => e.message), ['first']);
});

test('EH7 a failed save is one line with Retry; Retry saves and the line goes', async () => {
  const p = fakePorts();
  createDiagnostics(p);
  let tries = 0;
  const save = async () => {
    tries++;
    if (tries < 2) throw new Error('database or disk is full');
  };
  await save().catch(failedSave('nav · saveNav', 'your destination', save));
  assert.deepEqual(failedSaves.get().map((f) => [f.what, f.why]), [['your destination', 'the phone is full']]);
  await retryFailed();
  assert.equal(tries, 2);
  assert.deepEqual(failedSaves.get(), [], 'the line goes when the save succeeds');
  await settle();
  assert.ok((await logDb(p).getDiagnostics()).some((e) => e.kind === 'save' && e.place === 'nav · saveNav'), 'recorded as a failed save');
});

test('EH8 a refusal is recorded and shows no message', async () => {
  const p = fakePorts();
  createDiagnostics(p);
  caught('refused', 'audioMode · set')(new Error('NotAllowedError'));
  await settle();
  assert.deepEqual(failedSaves.get(), [], 'no line on screen');
  assert.ok((await logDb(p).getDiagnostics()).some((e) => e.kind === 'refused'));
});

test('EH9 cache work is recorded only', async () => {
  const p = fakePorts();
  createDiagnostics(p);
  await Promise.reject(new Error('tile 404')).catch(caught('cache', 'tiles · read'));
  await settle();
  assert.deepEqual(failedSaves.get(), []);
  assert.equal((await logDb(p).getDiagnostics())[0].kind, 'cache');
});

test('EH10 a fallback returns its value and says what it stood in for', async () => {
  const p = fakePorts();
  createDiagnostics(p);
  const stills = await Promise.reject<number[]>(new Error('closed')).catch(fallback('summary · loadReplay', [] as number[], 'the walk’s still spells'));
  assert.deepEqual(stills, []);
  await settle();
  const [e] = await logDb(p).getDiagnostics();
  assert.equal(e.kind, 'fallback');
  assert.match(e.message, /in place of the walk’s still spells: closed/);
});
