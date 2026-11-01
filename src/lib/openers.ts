/**
 * Screens that can open something handed to them (a tapped reminder), newest
 * first. A screen that can't open it declines, and the one beneath is asked;
 * with none willing, the caller keeps it for the next screen to mount. Pure.
 */
export function createOpeners<T>() {
  const stack: { fn: (x: T) => boolean }[] = [];
  return {
    add(fn: (x: T) => boolean): () => void {
      const entry = { fn };
      stack.push(entry);
      return () => {
        const i = stack.indexOf(entry);
        if (i >= 0) stack.splice(i, 1);
      };
    },
    offer(x: T): boolean {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].fn(x)) return true;
      return false;
    },
    size: () => stack.length,
  };
}
