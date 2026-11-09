/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Storage awareness (specs/storage-awareness): the decisions, pure. Written before the module, which a
// test loads inside its body.
const core = (): Promise<any> => import(`../../space/${'core'}`);

const MB = 1024 * 1024;

test('SA2: low under 500 MB, very low under 100 MB, else nothing; unreadable is nothing', async () => {
  const { spaceLevel, SPACE } = await core();
  assert.equal(SPACE.lowBytes, 500 * MB);
  assert.equal(SPACE.veryLowBytes, 100 * MB);
  assert.equal(spaceLevel(2000 * MB), null, 'plenty');
  assert.equal(spaceLevel(500 * MB), null, 'exactly 500 MB is not low');
  assert.equal(spaceLevel(500 * MB - 1), 'low');
  assert.equal(spaceLevel(100 * MB), 'low', 'exactly 100 MB is low, not very low');
  assert.equal(spaceLevel(100 * MB - 1), 'very-low');
  assert.equal(spaceLevel(0), 'very-low');
  assert.equal(spaceLevel(null), null, 'unread says nothing (SA1)');
  assert.equal(spaceLevel(Number.NaN), null, 'not a number says nothing (SA1)');
  assert.equal(spaceLevel(-5), null, 'a negative reading says nothing (SA1)');
});

test('SA3: the lines, verbatim; none says "this device"', async () => {
  const { spaceLine } = await core();
  assert.equal(spaceLine('low'), 'Room for new photos and videos is running low.');
  assert.equal(spaceLine('very-low'), 'There is almost no room left for new photos, videos and memos.');
  for (const l of [spaceLine('low'), spaceLine('very-low')]) assert.doesNotMatch(l, /this device/i);
});

test('SA4: once for each level; again only when worse', async () => {
  const { shouldSay } = await core();
  assert.equal(shouldSay(null, null), false, 'nothing to say');
  assert.equal(shouldSay(null, 'low'), true, 'first time at this level');
  assert.equal(shouldSay('low', 'low'), false, 'said already');
  assert.equal(shouldSay('low', 'very-low'), true, 'worse');
  assert.equal(shouldSay('very-low', 'very-low'), false);
  assert.equal(shouldSay('very-low', 'low'), false, 'better is not said again');
});

test('SA7: no line holds a digit, a percentage or a size, or asks to free, delete or clear', async () => {
  const { spaceLine, persistLine, saveFailLine, heldLabel } = await core();
  const lines = [
    spaceLine('low'), spaceLine('very-low'), persistLine(false), persistLine(true),
    ...(['photo', 'video', 'voice'] as const).flatMap((k) => [saveFailLine(k, true), saveFailLine(k, false)]),
    heldLabel(['photo']), heldLabel(['photo', 'photo', 'video']),
  ];
  for (const l of lines) {
    assert.ok(l.length > 0);
    assert.doesNotMatch(l, /[0-9%]|\b(KB|MB|GB|bytes?)\b/i, l);
    assert.doesNotMatch(l, /\b(free (up|some)|delete|remove|clear (some|space|up))\b/i, l);
  }
});

test('SA8: what is held, in words, never a count', async () => {
  const { heldLabel } = await core();
  assert.equal(heldLabel(['photo']), 'Photo not saved');
  assert.equal(heldLabel(['video']), 'Video not saved');
  assert.equal(heldLabel(['photo', 'photo']), 'Photos not saved');
  assert.equal(heldLabel(['video', 'video']), 'Videos not saved');
  assert.equal(heldLabel(['video', 'photo']), 'Photos and videos not saved');
});

test('SA9: a failure from lack of room is told apart from any other', async () => {
  const { isOutOfSpace } = await core();
  const named = (name: string, message = '') => Object.assign(new Error(message), { name });
  assert.equal(isOutOfSpace(named('QuotaExceededError', 'The quota has been exceeded.')), true, 'the web');
  assert.equal(isOutOfSpace({ name: 'QuotaExceededError', message: '' }), true, 'a DOMException-like');
  assert.equal(isOutOfSpace(new Error('ENOSPC: no space left on device, write')), true, 'Android, node');
  assert.equal(isOutOfSpace(new Error('No space left on device')), true);
  assert.equal(isOutOfSpace(new Error('database or disk is full (code 13 SQLITE_FULL)')), true, 'SQLite');
  assert.equal(isOutOfSpace(new Error('The file couldn’t be saved because there isn’t enough space.')), true, 'iOS (NSFileWriteOutOfSpaceError)');
  assert.equal(isOutOfSpace(new Error('Error Domain=NSCocoaErrorDomain Code=640')), true, 'iOS by code');
  assert.equal(isOutOfSpace(new Error('Network request failed')), false);
  assert.equal(isOutOfSpace(new Error('The operation couldn’t be completed.')), false);
  assert.equal(isOutOfSpace(null), false);
  assert.equal(isOutOfSpace('quota'), false, 'a bare string is not an error');
});

test('SA9: the words, never the raw error', async () => {
  const { saveFailLine } = await core();
  assert.equal(saveFailLine('photo', true), 'Not saved: there is no room left. It is held here for Retry.');
  assert.equal(saveFailLine('video', true), 'Not saved: there is no room left. It is held here for Retry.');
  assert.equal(saveFailLine('photo', false), 'Couldn’t save this photo.');
  assert.equal(saveFailLine('video', false), 'Couldn’t save this video.');
  assert.equal(saveFailLine('voice', false), 'Couldn’t save this voice memo.');
});

test('SA10: the browser\'s refusal, verbatim; the Home Screen named only where there is one', async () => {
  const { persistLine } = await core();
  assert.equal(persistLine(false), 'This browser may clear Chronicles’ moments when it needs room.');
  assert.equal(persistLine(true), 'This browser may clear Chronicles’ moments when it needs room. The Home Screen app is less likely to.');
});

test('SA10: the Home Screen is named only in an iPhone or iPad browser, never in the Home Screen app', async () => {
  const { homeScreenNamed } = await core();
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
  assert.equal(homeScreenNamed({ ua: iphone }), true);
  assert.equal(homeScreenNamed({ ua: iphone, standalone: true }), false, 'already on the Home Screen');
  assert.equal(homeScreenNamed({ ua: mac, touchPoints: 5 }), true, 'an iPad asking for the desktop site');
  assert.equal(homeScreenNamed({ ua: mac, touchPoints: 0 }), false, 'a Mac');
  assert.equal(homeScreenNamed({ ua: 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36' }), false);
  assert.equal(homeScreenNamed({}), false);
});
