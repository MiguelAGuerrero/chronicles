/// <reference types="node" />
// A delete's confirm says what goes in words, as the reminders and pins do (tend deletion T30, decision 0170).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mediaRemoveText, walkDeleteText } from '../../deletion/core';

test('tend deletion T30: deleting a walk says its moments and streets in words', () => {
  assert.equal(walkDeleteText({ moments: 3, streets: 12, bytes: 0 }).body, 'Its trace, three moments and twelve streets walked go.');
  assert.equal(walkDeleteText({ moments: 0, streets: 2, bytes: 0 }).body, 'Its trace and two streets walked go.');
  assert.doesNotMatch(walkDeleteText({ moments: 40, streets: 59, bytes: 0 }).body, /\d/);
});

test('tend deletion T30: removing media says its kinds in the pins\' words', () => {
  assert.equal(mediaRemoveText({ photos: 2, videos: 0, voices: 1, bytes: 0 }).body, 'Two photos and a voice memo go. The walk, its notes and its streets stay.');
  assert.equal(mediaRemoveText({ photos: 1, videos: 0, voices: 0, bytes: 0 }).body, 'A photo goes. The walk, its notes and its streets stay.');
  assert.equal(mediaRemoveText({ photos: 1, videos: 2, voices: 3, bytes: 0 }).body, 'A photo, two videos and three voice memos go. The walk, its notes and its streets stay.');
});

test('tend deletion audit 1: past fifty-nine a confirm says "its moments", never "many"', () => {
  // The owner, Nov 14, "its moments".
  assert.equal(walkDeleteText({ moments: 60, streets: 75, bytes: 0 }).body, 'Its trace, its moments and its streets walked go.');
  assert.equal(walkDeleteText({ moments: 59, streets: 60, bytes: 0 }).body, 'Its trace, fifty-nine moments and its streets walked go.');
  assert.equal(mediaRemoveText({ photos: 80, videos: 0, voices: 1, bytes: 0 }).body, 'Its photos and a voice memo go. The walk, its notes and its streets stay.');
  assert.doesNotMatch(walkDeleteText({ moments: 200, streets: 200, bytes: 0 }).body + mediaRemoveText({ photos: 99, videos: 99, voices: 99, bytes: 0 }).body, /many/i);
});
