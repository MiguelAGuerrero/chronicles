import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStore } from '../store';

test('set replaces the state and tells subscribers; an unchanged value tells no one', () => {
  const s = createStore({ n: 0 });
  let told = 0;
  const off = s.subscribe(() => told++);
  s.set({ n: 1 });
  s.set((prev) => ({ n: prev.n + 1 }));
  assert.equal(s.get().n, 2);
  assert.equal(told, 2);
  s.set((prev) => prev);
  assert.equal(told, 2);
  off();
  s.set({ n: 3 });
  assert.equal(told, 2);
});

test('a listener that unsubscribes while being told does not stop the others', () => {
  const s = createStore(0);
  const seen: string[] = [];
  const offA = s.subscribe(() => {
    seen.push('a');
    offA();
  });
  s.subscribe(() => seen.push('b'));
  s.set(1);
  s.set(2);
  assert.deepEqual(seen, ['a', 'b', 'b']);
});
