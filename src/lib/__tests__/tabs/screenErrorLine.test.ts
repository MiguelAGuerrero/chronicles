/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { replayErrorLine, walkErrorLine } from '../../readyNav';

// tend tabs 16 (the lenses' auditor 1, ux 1, steward 5; the owner, Nov 20: "Yes, 'still recording' (Recommended)"): the
// tabs' error screens said "Your walk is saved." with no walk at all, and under a walk minimized and still recording.
// O35 extends to every error screen but the replay's: no walk open, no walk line; recording, "Your walk is still
// recording."; paused, "Your walk is saved." (`walkErrorLine`, from the keeper). The replay's is a walk that is kept.

const APP = join(__dirname, '../../../app');
const screenError = readFileSync(join(__dirname, '../../../components/ScreenError.tsx'), 'utf8');

/** Every route file under src/app, by its path there. */
const routes = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? routes(p) : /\.tsx$/.test(f) ? [relative(APP, p)] : [];
  });

/** The component a route exports as its ErrorBoundary. */
const boundaryOf = (file: string) =>
  /^export\s*\{\s*(\w+)\s+as\s+ErrorBoundary\s*\}/m.exec(readFileSync(join(APP, file), 'utf8'))?.[1] ?? null;

/** What the named error screen passes as its body: its source text between `body=` and the end of the tag. */
const bodyOf = (name: string): string | null => {
  const fn = new RegExp(`export function ${name}\\(props: ErrorBoundaryProps\\) \\{([\\s\\S]*?)\\n\\}`).exec(screenError);
  if (!fn) return null;
  const line = /const line = (.+);/.exec(fn[1])?.[1];
  const body = /body=(\{[^}]*\}|"[^"]*")/.exec(fn[1])?.[1] ?? null;
  return body === '{line}' && line ? `{${line}}` : body;
};

test('tend tabs 16: every error screen but the replay\'s takes its walk line from the keeper', () => {
  const byRoute = Object.fromEntries(routes(APP).map((f) => [f, boundaryOf(f)]).filter(([, b]) => b));
  const keeper = '{walkErrorLine(useOpenWalkInfo())}';
  for (const [file, name] of Object.entries(byRoute)) {
    const body = bodyOf(name as string);
    // The replay's follows the open walk too, its own way since tend tabs audit 58.
    if (file === 'replay/[id].tsx') assert.equal(body, '{replayErrorLine(useOpenWalkInfo())}', `${file}: a replay is of a walk that is kept`);
    else assert.equal(body, keeper, `${file} (${name}) says what the open walk is, or nothing`);
  }
  // Every route has one (fix ios-video 2 checks that), and the tabs are among them.
  for (const f of ['(tabs)/_layout.tsx', '(tabs)/index.tsx', '(tabs)/explore.tsx', '(tabs)/navigate.tsx', 'day/[key].tsx', 'into.tsx', 'chronicle.tsx']) {
    assert.ok(byRoute[f], `${f} has an error boundary`);
  }
  assert.doesNotMatch(screenError, /body = 'Your walk is saved\.'/, 'no screen says "saved" unless it passes it');
});

test('tend tabs 16: a tab\'s error line follows the open walk (none: no line; recording: still recording; paused: saved)', () => {
  const walk = { id: 'w1' };
  assert.equal(walkErrorLine({ known: true, walk: null, pauses: [] }), null);
  assert.equal(walkErrorLine({ known: false, walk: null, pauses: [] }), null);
  assert.equal(walkErrorLine({ known: true, walk, pauses: [] }), 'Your walk is still recording.');
  assert.equal(walkErrorLine({ known: true, walk, pauses: [{ ended_at: null }] }), 'Your walk is saved.');
});

// The steward's silent 1 on the diff: a replay of an earlier walk that throws while another walk records said "Your walk
// is saved.", with no recording bar on screen, and "saved" can read as ended (O35's worry). The owner, Nov 20: "Nothing
// while one records (Recommended)". The replay keeps "Your walk is saved." only while no other walk records.
test('tend tabs audit 58: a replay\'s error says "Your walk is saved." only while no other walk records', () => {
  const walk = { id: 'w2' };
  assert.equal(replayErrorLine({ known: true, walk: null, pauses: [] }), 'Your walk is saved.');
  assert.equal(replayErrorLine({ known: true, walk, pauses: [] }), null, 'another walk records: no line');
  assert.equal(replayErrorLine({ known: true, walk, pauses: [{ ended_at: null }] }), 'Your walk is saved.', 'paused, it records nothing');
  assert.equal(replayErrorLine({ known: false, walk: null, pauses: [] }), null, 'not read yet: nothing claimed');
  assert.match(screenError, /export function ReplayScreenError\(props: ErrorBoundaryProps\) \{\s*return <ErrorScreen \{\.\.\.props\} exit="dismiss" body=\{replayErrorLine\(useOpenWalkInfo\(\)\)\} \/>;/);
});
