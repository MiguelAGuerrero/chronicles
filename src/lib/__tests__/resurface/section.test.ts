/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sectionOnRoute } from '../../resurface/section';

test('RM1: leaving for another tab or the walk puts Chronicle back on Memories', () => {
  for (const path of ['/navigate', '/walk', '/explore']) assert.equal(sectionOnRoute('map', path), 'memories', path);
});

test('RM1: a replay or a day keeps the section, so Back returns to the walks list it came from', () => {
  for (const path of ['/replay/w1', '/replay/w1?ceremony=0', '/day/2026-11-04']) assert.equal(sectionOnRoute('walks', path), 'walks', path);
});

test('RM1: Chronicle itself keeps its section', () => {
  assert.equal(sectionOnRoute('days', '/'), 'days');
});

test('HC5: Chronicle at the root keeps its section; Explore at /explore is elsewhere', () => {
  assert.equal(sectionOnRoute('days', '/'), 'days');
  assert.equal(sectionOnRoute('walks', '/explore'), 'memories');
  assert.equal(sectionOnRoute('map', '/navigate'), 'memories');
});
