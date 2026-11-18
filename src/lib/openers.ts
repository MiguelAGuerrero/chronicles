// @layer core
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

/**
 * An opener that opens only while its screen is in front (what-im-into-page audit 9): under a page pushed over it, it
 * declines, so the caller keeps the thing for later, and the screen takes it once it is in front again.
 */
export function whileFocused<T>(focused: () => boolean, open: (x: T) => void): (x: T) => boolean {
  return (x) => {
    if (!focused()) return false;
    open(x);
    return true;
  };
}
