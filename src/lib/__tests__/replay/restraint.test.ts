/// <reference types="node" />
// Replay ceremony, restraint and every surface (specs/replay-ceremony/spec.md, RC45-RC48; decision 0206), written
// before the code that completes them: source scans over the stage and the screens, and the story's steps.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { CEREMONIES } from '../../ceremony/registry';
import { storySteps } from '../../ceremony/story';
import { OVERLAY_KINDS } from '../../ceremony/types';
import type { Faced } from '../../moment';
import * as tokens from '../../motionTokens';
import { at, cap, frameAt, overlaysOf, planOf, several, SRC, walkOf, wholeOf } from './walks';

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
/** The stage's one file that keeps an interval, for something that is not the telling's time. */
const INTERVALS = ['components/ceremony/useMediaWait.ts'];
const stageFiles = () => readdirSync(join(SRC, 'components/ceremony')).map((f) => `components/ceremony/${f}`);

// ---------------------------------------------------------------- nothing counts or celebrates (RC45)

test('RC45: nothing added counts or celebrates: no numeral on the stack or the last view, no progress bar, no accent', { todo: 'test first' }, () => {
  // A walk with everything: pictures, a moment of several with a video, passed places.
  let market!: Faced;
  const w = walkOf(['Hessian Memorial', 'Sun Inn'], (fixes) => [cap('photo', fixes[30].t, at(210)), (market = several(['photo', 'photo', 'video'], fixes[50].t, at(350)))]);
  const p = planOf(w.story, { whole: wholeOf(w.bounds), namePassed: true });
  // No frame says a count: no number among what the stack, a picture or the last view is given to show.
  const counts = (o: Record<string, unknown>) => Object.entries(o).filter(([k, v]) => typeof v === 'number' && /count|total|index|position|of$/i.test(k)).map(([k]) => k);
  for (let ms = 0; ms < p.total; ms += 200) {
    const f = frameAt(p, ms);
    for (const o of [...overlaysOf(f, 'stack'), ...overlaysOf(f, 'picture'), ...overlaysOf(f, 'passed')]) assert.deepEqual(counts(o), [], `a ${o.kind} overlay carries a count`);
    for (const o of overlaysOf(f, 'stack')) for (const e of o.entries as Record<string, unknown>[]) assert.deepEqual(counts(e), [], 'a stack entry carries a count');
    for (const o of overlaysOf(f, 'passed')) assert.doesNotMatch(String(o.text), /\d/);
  }
  assert.ok(overlaysOf(frameAt(p, p.total - 1), 'stack').length === 1 && market.pieces.length === 3);
  // The stage: no progress bar, nothing in the accent, and the new views draw no text but the names and the date.
  for (const f of stageFiles()) {
    const src = read(f);
    assert.doesNotMatch(src, /accessibilityRole="progressbar"|ProgressBar|<progress\b/, `${f} draws a progress bar`);
    assert.doesNotMatch(src, /theme\.accent|theme\.ok\b|theme\.warn\b/, `${f} lights something in the accent`);
  }
  for (const f of ['components/ceremony/Stack.tsx', 'components/ceremony/Pictures.tsx']) assert.doesNotMatch(read(f), /<Text\b/, `${f} draws text`);
  // The stack's height is the one thing that grows with what was kept: the owner's call, recorded (decision 0206).
  assert.match(readFileSync(join(SRC, '..', 'docs/decisions/0206-the-replay-ceremony.md'), 'utf8'), /Its height is the one exception/);
});

// ---------------------------------------------------------------- every surface (RC46)

test('RC46: every way into a replay plays this way: one screen each for a walk and a day, one stage, one ceremony', { todo: 'test first' }, () => {
  const hosts = ['app/replay/[id].tsx', 'app/day/[key].tsx'];
  for (const f of hosts) {
    const src = read(f);
    assert.match(src, /useReplay\(\{/, `${f} is driven by the engine`);
    assert.match(src, /<Stage ctx=\{ctx\} \/>/, `${f} draws the stage`);
    assert.match(src, /ceremonyFor\(style\)\.show\(story, \{ reduceMotion, screen, whole/, `${f} tells the whole and its room`);
    // The pins of moments that stand as pictures wait for the card: the frame says which pins, the screen passes them on.
    assert.match(src, /useRevealed\(story, telling \? play\.pins : /);
  }
  // A first replay, a re-watch (`ceremony=0`) and a link reopened are one route and one telling; no other file draws a stage.
  const walk = read('app/replay/[id].tsx');
  assert.equal([...walk.matchAll(/ceremonyFor\(/g)].length, 1);
  assert.doesNotMatch(walk, /rewatch \? [^:\n]*showing|rewatch && !?telling/);
  const all = (dir: string): string[] => readdirSync(join(SRC, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? all(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []));
  const stages = [...all('app'), ...all('components')].filter((f) => /<Stage\b/.test(read(f)));
  assert.deepEqual(stages.sort(), [...hosts].sort());
  assert.deepEqual(Object.keys(CEREMONIES), ['rhythm']);
  // The stage has a view for each kind the telling can put on it, the new ones among them.
  for (const kind of ['picture', 'stack', 'passed']) assert.ok((OVERLAY_KINDS as readonly string[]).includes(kind), `no "${kind}" on the stage`);
  assert.ok(CEREMONIES.rhythm.overlays.every((k) => (OVERLAY_KINDS as readonly string[]).includes(k)) && (CEREMONIES.rhythm.overlays as readonly string[]).includes('stack'));
});

// ---------------------------------------------------------------- the screen reader's steps (RC47)

test('RC47: the screen reader\'s steps are as they were: every moment in turn, a stack\'s pieces one by one, no stage', { todo: 'test first' }, () => {
  let market!: Faced;
  const w = walkOf(['Hessian Memorial'], (fixes) => [(market = several(['photo', 'video', 'voice'], fixes[50].t, at(350)))]);
  const steps = storySteps(w.story);
  // One step a stop, in walked order; a stacked moment is one item there, its pieces stepped through by the steps' own view (MS9).
  assert.deepEqual(steps.map((s) => s.map((c) => c.id)), [[w.photo.id], [market.id], [w.note.id]]);
  assert.equal(steps[1][0].pieces.length, 3);
  // The steps draw no stage and read no frame: nothing of the ceremony's rework reaches them.
  const view = read('components/ceremony/StepThrough.tsx');
  assert.doesNotMatch(view, /useLive|StageLive|\.\/Stack|\.\/Pictures|\.\/Stage|overlayOf/);
  assert.match(view, /Continue/);
  for (const f of ['app/replay/[id].tsx', 'app/day/[key].tsx']) {
    const src = read(f);
    assert.match(src, /srMode && \(\s*<StepThrough/, `${f} steps through with a screen reader`);
    assert.match(src, /const telling = [^;\n]*!srMode/, `${f} tells no path under the steps`);
  }
  // Marked done by this slice only because the steps are untouched: the telling's new parts are all behind `telling`.
  assert.ok(existsSync(join(SRC, 'components/ceremony/Stack.tsx')), 'the stack is not built yet');
});

// ---------------------------------------------------------------- the old way is gone (RC48)

test('RC48: the old way of playing is gone: no pile, no dim, no cut opening, no video in a cell, no interval', { todo: 'test first' }, () => {
  assert.equal(existsSync(join(SRC, 'components/ceremony/Pile.tsx')), false, 'the pile\'s view is still there');
  const scanned = [...stageFiles(), ...readdirSync(join(SRC, 'lib/ceremony')).map((f) => `lib/ceremony/${f}`), 'app/replay/[id].tsx', 'app/day/[key].tsx'];
  for (const f of scanned) {
    const src = read(f);
    assert.doesNotMatch(src, /\bPile\b|PileOverlay|pileCenter|\bPILE\b|kind: 'pile'|'pile'/, `${f} still knows the pile`);
    assert.doesNotMatch(src, /useCeremonyClock|introZoomOut|CellVideo/, `${f} keeps a part of the old path`);
    // No interval drives the telling: the one left checks on a medium that plays.
    if (!INTERVALS.includes(f)) assert.doesNotMatch(src, /setInterval\(/, `${f} keeps an interval`);
  }
  assert.doesNotMatch(read('lib/ceremony/types.ts'), /\bdim\b/);
  for (const gone of ['intro', 'introZoomOut']) assert.ok(!(gone in tokens.REPLAY_RHYTHM), `REPLAY_RHYTHM.${gone} is still a token`);
  // One camera and one way to end a card: onto its place.
  assert.doesNotMatch(read('components/ceremony/layout.ts'), /tiltOf\(o\.capture\.id\)/, 'a card still tilts into a pile');
  assert.match(read('components/ceremony/layout.ts'), /PICTURE\./);
});
