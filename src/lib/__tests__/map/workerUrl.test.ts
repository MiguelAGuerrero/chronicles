/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { mapWorkerUrl } from '../../../components/map/types';

// tend map 10: the web map's worker was served at one address for every maplibre-gl, so a browser holding an older
// worker in its cache could run it under a newer bundle. The address now carries the installed version, as
// maplibre's own default does.
test('tend map 10: the worker address carries the installed maplibre-gl version, under the base path', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/maplibre-gl/package.json'), 'utf8')) as { version: string };
  assert.equal(mapWorkerUrl('', pkg.version), `/maplibre-gl-worker.mjs?v=${pkg.version}`);
  assert.equal(mapWorkerUrl('/chronicles', pkg.version), `/chronicles/maplibre-gl-worker.mjs?v=${pkg.version}`);
  // Two versions, two addresses.
  assert.notEqual(mapWorkerUrl('', '6.16.0'), mapWorkerUrl('', '6.17.0'));
});
