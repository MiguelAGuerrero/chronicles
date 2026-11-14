/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LocatePermission } from '../../atlas/findYou';
import { refusalFollower } from '../../recorder/followPermission';
import type { Walk } from '../../types';
import { fakePorts } from '../fakes';

// The follower O22 added (tend walk-screen 3) resumed whatever walk id it was handed. The review found three ways that
// records what no walk asked for: a refused Start (no walk row yet), a refused Resume (the walk paused), a walk ended in
// another tab. The follower now resumes only the walk the store holds open, with no open pause: checked as a refusal
// is heard (a refused Start or Resume follows nothing) and again as the permission comes back. Run here against the
// session's state (the fake db and recorder), not the source's text.

/** A permission reader the test drives, and whether anything is subscribed to it. */
function fakeWatch() {
  let on: ((s: LocatePermission) => void) | null = null;
  return {
    watch: (cb: (s: LocatePermission) => void) => {
      on = cb;
      return () => {
        on = null;
      };
    },
    tell: (s: LocatePermission) => on?.(s),
    live: () => on != null,
  };
}

const walk = (id: string): Walk => ({ id, started_at: 1000, ended_at: null, title: null, epilogue: null, open: true, area: null, snapped_build: null });
const settle = () => new Promise((r) => setTimeout(r, 0));

function setup() {
  const p = fakePorts();
  const w = fakeWatch();
  const follower = refusalFollower({ watch: w.watch, walks: p.db, resume: (id) => p.recorder.resume(id) });
  return { p, w, follower };
}

test('tend walk-screen audit 2: a refused Start follows nothing, and location given back after records nothing', async () => {
  const { p, w, follower } = setup();
  // `startWalk` starts the recorder before the walk's row exists: refused, no row is ever written.
  await follower.refused('id-new');
  assert.equal(w.live(), false, 'no permission followed');
  w.tell('denied');
  w.tell('granted');
  await settle();
  assert.equal(p.recorder.walkId, null, 'nothing resumed');
  assert.equal(follower.following(), null);
});

test('tend walk-screen audit 3: a refused Resume on a paused walk follows nothing; a pause begun while following stops it', async () => {
  const { p, w, follower } = setup();
  await p.db.createWalk(walk('w1'));
  await p.db.startPause('w1', 2000);
  await follower.refused('w1');
  assert.equal(w.live(), false, 'a paused walk records nothing on purpose: Resume is its way back');
  // Refused while recording, then paused in another tab before location is given back: nothing resumes.
  await p.db.endPause('w1', 3000);
  await follower.refused('w1');
  assert.equal(w.live(), true);
  await p.db.startPause('w1', 4000);
  w.tell('denied');
  w.tell('granted');
  await settle();
  assert.equal(p.recorder.walkId, null, 'a paused walk is not resumed');
  assert.equal(w.live(), false, 'and the following ends');
});

test('tend walk-screen audit 4: a walk ended elsewhere is not resumed; its open sibling is', async () => {
  const { p, w, follower } = setup();
  await p.db.createWalk(walk('w1'));
  await follower.refused('w1');
  assert.equal(w.live(), true, 'an open walk, recording, refused: followed');
  // Ended in another tab: the store holds it closed.
  await p.db.updateWalk('w1', { ended_at: 5000, open: false });
  w.tell('denied');
  w.tell('granted');
  await settle();
  assert.equal(p.recorder.walkId, null, 'the ended walk is not resumed');
  // The open walk is resumed when location comes back.
  const again = setup();
  await again.p.db.createWalk(walk('w2'));
  await again.follower.refused('w2');
  again.w.tell('denied');
  again.w.tell('granted');
  await settle();
  assert.equal(again.p.recorder.walkId, 'w2');
});
