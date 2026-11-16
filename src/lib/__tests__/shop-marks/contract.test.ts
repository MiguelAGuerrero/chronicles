/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Shop marks (specs/shop-marks, SM8): the app's pinned copy of chronicles-data's shop contract, and the reader held to it.
const DIR = join(__dirname, 'contract');
const json = (f: string) => {
  try {
    return JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Record<string, unknown>;
  } catch {
    assert.fail(`${f} is not pinned yet`);
  }
};

test('SM8: the pinned contract names the version, the record\'s four fields and no more', () => {
  const schema = json('shops.schema.json') as { contractVersion: number; record: { properties: Record<string, unknown>; additionalProperties: boolean; required: string[] } };
  assert.equal(typeof schema.contractVersion, 'number');
  assert.deepEqual(Object.keys(schema.record.properties).sort(), ['at', 'chain', 'name', 'type']);
  assert.equal(schema.record.additionalProperties, false, 'a rating, hours or popularity field is not allowed by the contract');
  assert.deepEqual([...schema.record.required].sort(), ['at', 'name', 'type']);
});

test('SM8: the pinned type list holds every drawn type, and the reader draws nothing the contract does not list', async () => {
  const listed = (json('shop-types.json') as { types: string[] }).types;
  const { DRAWN_TYPES } = (await import('../../shopMarks/types' as string)) as { DRAWN_TYPES: readonly string[] };
  for (const t of DRAWN_TYPES) assert.ok(listed.includes(t), `${t} is in the contract`);
  const { shopsFromTile } = (await import('../../shopMarks/read' as string)) as { shopsFromTile: (f: unknown[]) => { type: string }[] };
  const got = shopsFromTile(listed.map((type, i) => ({ geometry: { type: 'Point', coordinates: [i / 100, 0] }, properties: { type, name: `S${i}` } })));
  assert.ok(got.every((p) => DRAWN_TYPES.includes(p.type)));
  assert.ok(listed.length > DRAWN_TYPES.length, 'the pack carries more than the layer draws (errand shops stay in it)');
});

test('SM8: the pinned manifest example reads through the app\'s manifest reader', async () => {
  const { parseManifest } = await import('../../discovery/archiveManifest');
  const text = readFileSync(join(DIR, 'example', 'manifest.json'), 'utf8');
  assert.notEqual(parseManifest(text, 'shops'), null);
});
