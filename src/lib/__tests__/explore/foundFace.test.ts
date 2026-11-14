/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { facesToRead, foundFaces } from '../../explore/foundFace';

// tend walk-screen 9 (decision 0172, O26, the owner's answer to "The green place pin carries a tick"): a found place's
// pin wore a tick, which reads as a checklist's "done". It wears the kept moment's own glyph instead (a camera, a
// note…), the moment that found it; its spoken name is unchanged ("Found: <name>, <kind>").

const finds = [
  { key: 'memorial', capture_id: 'm1' },
  { key: 'park', capture_id: 'm2' },
  { key: 'statue', capture_id: 'gone' },
];

test('tend walk-screen 9: each found place wears the face of the moment that found it', () => {
  const faces = foundFaces(finds, [
    { id: 'm1', kind: 'video' },
    { id: 'm2', kind: 'text' },
    { id: 'other', kind: 'photo' },
  ]);
  assert.deepEqual([...faces], [
    ['memorial', { kind: 'video' }],
    ['park', { kind: 'text' }],
  ]);
  // A moment not known (yet): no face, never a guess.
  assert.equal(faces.has('statue'), false);
});

test("tend walk-screen 9: the moments still to read are the shown finds' not known and not asked for already", () => {
  assert.deepEqual(facesToRead(finds, new Set(['memorial', 'park', 'statue']), new Set(['m1']), new Set()), ['m2', 'gone']);
  // Asked once, never again: a moment deleted meanwhile is not read round and round.
  assert.deepEqual(facesToRead(finds, new Set(['memorial', 'park', 'statue']), new Set(['m1']), new Set(['m2', 'gone'])), []);
  // A find not shown is not read.
  assert.deepEqual(facesToRead(finds, new Set(['park']), new Set(), new Set()), ['m2']);
});

test("tend walk-screen 9: the found pin draws the moment's glyph where the tick was, and the walk's pins pass it on", () => {
  const view = readFileSync(join(__dirname, '../../../components/MarkPinView.tsx'), 'utf8');
  assert.doesNotMatch(view, /name="checkmark"/, 'no tick on a found pin');
  assert.match(view, /testID=\{`found-kind-\$\{pin\.foundGlyph\}`\}/);
  assert.match(view, /pin\.foundGlyph \?\? ''/, 'a change of glyph redraws the pin');
  const hook = readFileSync(join(__dirname, '../../explore/useExplore.ts'), 'utf8');
  assert.match(hook, /foundFaces\(/);
  assert.match(hook, /foundGlyph: /);
});
