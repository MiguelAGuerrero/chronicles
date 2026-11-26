/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { facedOf, type Faced } from '../../moment';
import { mentioned } from '../../refs';
import { poolWithOpenWalks, toMomentViews } from '../../resurface/views';
import type { Walk } from '../../types';

// fix note-camera-photo (the owner, Nov 26): on a walk, a note page's camera kept its photo as a moment of the walk still
// open, and the page and the viewer said "A moment no longer kept": they looked the mention up among the feed's moments,
// which leave out a walk still open (RM17). A mention resolves against every kept moment, the open walk's too.

const walk = (o: Partial<Walk>): Walk => ({ id: 'w', started_at: new Date(2026, 10, 26, 16).getTime(), ended_at: 2, title: null, epilogue: null, open: false, area: null, snapped_build: null, ...o });
const cap = (o: Partial<Faced>): Faced => facedOf({ id: 'c', walk_id: null, t: 1, lat: null, lon: null, kind: 'text', file_path: null, body: null, segment_id: null, ...o });
const walks = [walk({}), walk({ id: 'open', open: true, ended_at: null })];
const caps = [
  cap({ id: 'photo', walk_id: 'open', kind: 'photo', file_path: 'p.jpg' }),
  cap({ id: 'note', walk_id: 'open', body: 'On the walk @[photo|A photo]', body_format: 'md' }),
  cap({ id: 'past', walk_id: 'w', kind: 'photo', file_path: 'q.jpg' }),
  cap({ id: 'loose', kind: 'voice', file_path: 'v.m4a' }),
];
const every = new Map(poolWithOpenWalks(caps, walks).map((v) => [v.id, v]));
const none = new Set<string>();

test('fix note-camera-photo: a mention of a photo on the walk still open names that photo', () => {
  assert.ok(!toMomentViews(caps, walks).some((v) => v.id === 'photo'), 'the feed still leaves the open walk out (RM17)');
  assert.equal(mentioned(every, none, 'photo')?.kind, 'photo');
  assert.equal(mentioned(every, none, 'photo')?.walkId, 'open');
  assert.equal(mentioned(every, none, 'past')?.id, 'past', 'a moment of a walk ended still resolves');
  assert.equal(mentioned(every, none, 'loose')?.id, 'loose', 'a moment on no walk still resolves');
});

test('fix note-camera-photo: a mention of a moment deleted, or waiting in Undo, is still gone (RF5)', () => {
  assert.equal(mentioned(every, none, 'never-kept'), null, 'an id that is no moment');
  assert.equal(mentioned(every, new Set(['photo']), 'photo'), null, 'waiting in Undo');
  assert.equal(mentioned(new Map(), none, 'photo'), null, 'nothing read');
});

test('fix note-camera-photo: every reader of a mention resolves it through `mentioned` from the whole pool', () => {
  const src = (f: string) => readFileSync(join(__dirname, '../../../components', f), 'utf8');
  // The page's and the reader's cards, the viewer's older note text, and the viewer's own gone-and-open lookups.
  for (const f of ['notePage/useMentionCards.ts', 'threads/NoteText.tsx']) {
    assert.match(src(f), /mentioned\(pool\.every, hidden,/, `${f} resolves through mentioned()`);
    assert.doesNotMatch(src(f), /\bbyId\b/, `${f} never looks a mention up among the feed's moments`);
  }
  assert.match(src('notePage/useMentionCards.ts'), /picturesWanted\(ids, pool\.every,/, 'its pictures from the whole pool');
  assert.doesNotMatch(src('notePage/NotePage.tsx'), /cardPool\.byId/, "the page's Edit finds the picture's moment in the whole pool");
  const viewer = src('CaptureView.tsx');
  assert.match(viewer, /onOpenMention: \(id\) => \{\s*const v = mentioned\(pool\.every, hidden, id\);/, "the viewer opens a mention's moment from the whole pool");
  assert.match(viewer, /gone: pool\.ready \? \(id\) => !mentioned\(pool\.every, hidden, id\)/, 'the viewer calls a mention gone only when it is');
});
