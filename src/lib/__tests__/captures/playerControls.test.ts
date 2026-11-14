import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pausePlayer, playPlayer, seekPlayer } from '../../playerControls';

// One copy of the player's controls the memo screens share (refactor captures 1-2, R1 and R2; paying back the import
// line errors-handled added to frozen files, decision 0178).

test('refactor captures 1: seek, play and pause call the player they are given, and nothing else', () => {
  const calls: string[] = [];
  const player = {
    seekTo: async (s: number) => {
      calls.push(`seek ${s}`);
    },
    play: () => calls.push('play'),
    pause: () => calls.push('pause'),
  };
  seekPlayer(player, 3.5);
  playPlayer(player);
  pausePlayer(player);
  assert.deepEqual(calls, ['seek 3.5', 'play', 'pause']);
});
