/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const TABS = join(__dirname, '../../../app/(tabs)');

/** The component a route exports as its ErrorBoundary, by name. */
const boundaryOf = (file: string) =>
  /^export\s*\{\s*(\w+)\s+as\s+ErrorBoundary\s*\}/m.exec(readFileSync(join(TABS, file), 'utf8'))?.[1] ?? null;

test("tend replay audit 7: Explore's and Navigate's error screens leave by the tabs' own way to Chronicle", () => {
  // Inside the tab navigator router.dismissTo('/') is a POP_TO the tabs have not, and did nothing (the T20 review's
  // auditor 1); TabScreenError goes by router.navigate('/'), which opens Chronicle's tab.
  assert.deepEqual(
    ['explore.tsx', 'navigate.tsx'].map((f) => [f, boundaryOf(f)]),
    [['explore.tsx', 'TabScreenError'], ['navigate.tsx', 'TabScreenError']],
  );
});

test("tend replay audit 8: Chronicle's tab and the tabs' layout show Try again alone, with no way back that goes nowhere", () => {
  // On Chronicle's own tab a way back to Chronicle stays where it is, and the layout's boundary stands in for the
  // whole tab navigator, tab bar included, where it did nothing either (the T20 review's ux 1, auditor 2).
  assert.deepEqual(
    ['index.tsx', '_layout.tsx'].map((f) => [f, boundaryOf(f)]),
    [['index.tsx', 'HomeScreenError'], ['_layout.tsx', 'HomeScreenError']],
  );
});
