/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sectionOfSheet, sectionOnRoute, sheetForSection } from '../../resurface/section';

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

// The section bar names what Chronicle shows (specs/section-bar, G1, decision 0136).
test('SB1: each list the sheet shows names its section: the walks list Walks, the days list Days, the sheet at rest Map', () => {
  for (const from of ['walks', 'days', 'map'] as const) {
    assert.equal(sectionOfSheet('walks', from), 'walks', from);
    assert.equal(sectionOfSheet('days', from), 'days', from);
    assert.equal(sectionOfSheet('summary', from), 'map', from);
  }
});
test('SB2: each section opens its sheet: Walks and Days that list, Map the sheet at rest', () => {
  assert.equal(sheetForSection('walks'), 'walks');
  assert.equal(sheetForSection('days'), 'days');
  assert.equal(sheetForSection('map'), 'summary');
  // The bar and the sheet name each other: what a section opens names that section again.
  for (const s of ['walks', 'days', 'map'] as const) assert.equal(sectionOfSheet(sheetForSection(s), 'map'), s);
});
test('SB4: a place\'s walks and a day\'s timeline keep the section they were opened from', () => {
  for (const from of ['walks', 'days', 'map'] as const) {
    assert.equal(sectionOfSheet('place', from), from);
    assert.equal(sectionOfSheet('day', from), from);
  }
});
