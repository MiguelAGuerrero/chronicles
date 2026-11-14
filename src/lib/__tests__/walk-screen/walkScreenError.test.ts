/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { walkErrorLine } from '../../readyNav';

// tend walk-screen 6 (decision 0172, O35, the owner's answer to "The walk screen's error mid-walk"): an error on the
// walk screen mid-walk said "Your walk is saved." beside "Back to Chronicle", which can read as the walk ended. The
// recorder goes on behind the error screen, so the walk screen's says "Your walk is still recording."; the button
// stays "Back to Chronicle", and every other screen's error keeps "Your walk is saved.".

const APP = join(__dirname, '../../../app');
const boundaryOf = (file: string) =>
  /^export\s*\{\s*(\w+)\s+as\s+ErrorBoundary\s*\}/m.exec(readFileSync(join(APP, file), 'utf8'))?.[1] ?? null;
const screenError = readFileSync(join(__dirname, '../../../components/ScreenError.tsx'), 'utf8');
/** The words the named error screen shows under its title, read from its source. */
const bodyOf = (name: string) => {
  const fn = new RegExp(`export function ${name}\\(props: ErrorBoundaryProps\\) \\{\\s*return <ErrorScreen \\{\\.\\.\\.props\\} exit="(\\w+)"(?: body="([^"]+)")? />;`).exec(screenError);
  return fn ? { exit: fn[1], body: fn[2] ?? 'Your walk is saved.' } : null;
};

test('tend walk-screen 6: the walk screen\'s error says "Your walk is still recording.", and its way back is unchanged', () => {
  assert.equal(boundaryOf('walk.tsx'), 'WalkScreenError');
  assert.match(screenError, /export function WalkScreenError\(props: ErrorBoundaryProps\) \{\s*const line = walkErrorLine\(useOpenWalkInfo\(\)\);\s*return <ErrorScreen \{\.\.\.props\} exit="dismiss" body=\{line\} \/>;/);
  assert.match(screenError, /\{body != null && <Text style=\{styles\.body\}>\{body\}<\/Text>\}/, 'the body is the one each screen passes, or none');
  assert.match(screenError, /body = 'Your walk is saved\.'/, 'and "Your walk is saved." where none is passed');
});

// tend walk-screen audit 5 (the review's auditor 3 and ux 2): the walk route is also Navigate with no walk open and a
// paused walk, where "Your walk is still recording." was untrue. The line follows the keeper's open walk and pauses:
// recording, the owner's words; paused, "Your walk is saved." as before; no walk open, no walk line.
test('tend walk-screen audit 5: the walk route\'s error line follows the open walk and its pause', () => {
  const walk = { id: 'w1' };
  assert.equal(walkErrorLine({ known: true, walk, pauses: [] }), 'Your walk is still recording.');
  assert.equal(walkErrorLine({ known: true, walk, pauses: [{ ended_at: 5 }] }), 'Your walk is still recording.');
  assert.equal(walkErrorLine({ known: true, walk, pauses: [{ ended_at: 5 }, { ended_at: null }] }), 'Your walk is saved.');
  assert.equal(walkErrorLine({ known: true, walk: null, pauses: [] }), null);
  // Not read yet: nothing is claimed.
  assert.equal(walkErrorLine({ known: false, walk: null, pauses: [] }), null);
});

test('tend walk-screen 6: every other screen\'s error keeps "Your walk is saved."', () => {
  for (const name of ['ScreenError', 'TabScreenError', 'HomeScreenError']) assert.equal(bodyOf(name)?.body, 'Your walk is saved.', name);
  for (const f of ['chronicle.tsx', 'day/[key].tsx', 'replay/[id].tsx']) assert.equal(boundaryOf(f), 'ScreenError', f);
  for (const f of ['(tabs)/explore.tsx', '(tabs)/navigate.tsx']) assert.equal(boundaryOf(f), 'TabScreenError', f);
  for (const f of ['(tabs)/index.tsx', '(tabs)/_layout.tsx']) assert.equal(boundaryOf(f), 'HomeScreenError', f);
});
