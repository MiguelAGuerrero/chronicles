/// <reference types="node" />
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getConfig } = require('expo/config') as typeof import('expo/config');

const ROOT = join(__dirname, '../../../..');

test('fix stale-chunk: the web build loads every screen with the page, so an open page never asks for a file a later deploy removed', () => {
  // SDK 58 split each route into its own file on web by default. A page left open across a Pages deploy then asked
  // for explore-<old hash>.js, which the deploy had replaced: 404, "Loading module ... failed" over the screen, and
  // Try again asked for the same missing file (the owner's iPhone, Navigate from the media gallery, Nov 11).
  // The config as the expo-router plugin resolves it, so a default that flips back is caught too.
  const { exp } = getConfig(ROOT, { skipSDKVersionRequirement: true });
  const asyncRoutes = (exp.extra?.router as { asyncRoutes?: unknown } | undefined)?.asyncRoutes;
  const web = typeof asyncRoutes === 'object' && asyncRoutes ? (asyncRoutes as { web?: unknown }).web : asyncRoutes;
  assert.equal(web, false, `expo-router's asyncRoutes on web: ${JSON.stringify(asyncRoutes)}`);
});
