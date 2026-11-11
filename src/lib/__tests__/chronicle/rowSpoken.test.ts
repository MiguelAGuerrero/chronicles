/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { timelineWalkSpoken, walkRowSpoken } from '../../quietLines';

// tend chronicle 2: a walks list row says what it shows. react-native-web drops `accessibilityHint`, so on the
// web the row's name was only "Replay <title>": its date, distance and time, and the walk's one line in the
// owner's words, never reached a screen reader (WCAG 2.2, 1.3.1 Info and Relationships; 4.1.2 Name, Role, Value).

const META = 'Nov 11, 2026 · 589 m · 3 min · 1 photo';

test('tend chronicle 2: the name holds the title, what the row shows under it, and the one line', () => {
  assert.equal(
    walkRowSpoken('Fox Point at dusk', META, 'The harbour went pink.'),
    'Replay Fox Point at dusk. Nov 11, 2026, 589 m, 3 min, 1 photo. “The harbour went pink.”',
  );
});

test('tend chronicle 2: a walk with no line says none', () => {
  assert.equal(walkRowSpoken('Fox Point at dusk', META, null), 'Replay Fox Point at dusk. Nov 11, 2026, 589 m, 3 min, 1 photo');
  assert.equal(walkRowSpoken('Fox Point at dusk', META, '  '), 'Replay Fox Point at dusk. Nov 11, 2026, 589 m, 3 min, 1 photo');
});

// tend chronicle 3: a day's timeline names its walk by the title it shows. The entry said "9:41 AM, Walk · 589 m ·
// 2 moments. Replay it", so a renamed walk's name never reached a screen reader there (WCAG 2.2, 2.5.3 Label in Name).
test('tend chronicle 3: the timeline entry says the walk title it shows, after its time', () => {
  assert.equal(timelineWalkSpoken('9:41 AM', 'Fox Point at dusk', 'Walk · 589 m · 2 moments'), '9:41 AM, Fox Point at dusk, Walk, 589 m, 2 moments. Replay it');
});
