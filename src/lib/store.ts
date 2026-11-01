/**
 * A feature shell's state, as a screen sees it: read it, replace it, and be
 * told when it changed. Shells hold one; screens read it with `useStore`
 * (`lib/useStore.ts`), which subscribes to a slice so a change elsewhere in
 * the state doesn't re-render them (the render budget, AGENTS.md).
 *
 * Plain TypeScript, no library: a shell test reads `get()` directly.
 */
export interface Store<S> {
  get(): S;
  /** Replaces the state; subscribers are told only when it actually changed (`Object.is`). */
  set(next: S | ((prev: S) => S)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<S>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      const value = typeof next === 'function' ? (next as (prev: S) => S)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      for (const l of [...listeners]) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
