/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compassRotation, showsCompass } from '../../compass';

// Compass (CP3, CP6): shown only while the map is turned more than a degree from north.

test('CP6: hides within 1 degree of north, either side', () => {
  for (const b of [0, 0.9, -0.9, 359.5, -359.5, 360, 1]) assert.equal(showsCompass(b), false, `${b}`);
});

test('CP6: shows once the map is turned past a degree', () => {
  for (const b of [1.5, -1.5, 90, 270, 180, -180, 358.4]) assert.equal(showsCompass(b), true, `${b}`);
});

test('CP6: a missing or non-finite bearing hides it', () => {
  for (const b of [NaN, Infinity, -Infinity]) assert.equal(showsCompass(b), false, `${b}`);
});

test('CP3: rotation is minus the bearing (north to the left when the map is turned 90 clockwise)', () => {
  assert.equal(compassRotation(90), -90);
  assert.equal(compassRotation(-45), 45);
  assert.equal(compassRotation(0), 0);
});

test('CP3: rotation wraps to the short way round', () => {
  assert.equal(compassRotation(270), 90);
  assert.equal(compassRotation(350), 10);
});
