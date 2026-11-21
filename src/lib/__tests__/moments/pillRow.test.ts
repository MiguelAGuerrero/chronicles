import assert from 'node:assert/strict';
import { test } from 'node:test';

// Thread a moment as it is kept (specs/thread-at-capture CT1): the pill's five buttons sit in one row where they fit
// left of the capture stack, else three then two (the approved drawing at 320 px). Loaded in the test so a
// missing module or export fails inside the test, as a todo.
type Api = { pillPerRow: (room: number) => number };
const load = (): Promise<Api> => import('../../momentPill/row' as string).then((m) => m as unknown as Api, () => ({}) as Api);

test('CT1: five buttons in one row at 390 px, three then two where they do not fit (320 px)', async () => {
  const api = await load();
  // The room left of the stack: the window less the pills' left (16 + 12) and right (16 + 56 + 12) insets.
  assert.equal(api.pillPerRow(390 - 28 - 84), 5, 'at 390 px the five fit');
  assert.equal(api.pillPerRow(320 - 28 - 84), 3, 'at 320 px they wrap three, then two');
  assert.equal(api.pillPerRow(244), 5, 'exactly the five 44 pt buttons, their 4 pt gaps and the pill\'s padding');
  assert.equal(api.pillPerRow(243), 3);
});
