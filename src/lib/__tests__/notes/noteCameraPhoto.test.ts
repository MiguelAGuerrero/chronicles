/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { facedOf, type Faced } from '../../moment';
import { photoMidMemo } from '../../pieceStamp';
import { mentioned } from '../../refs';
import { poolWithOpenWalks, toMomentViews } from '../../resurface/views';
import type { Walk } from '../../types';
import { retryInto } from '../../unsaved/core';

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

const lib = (f: string) => readFileSync(join(__dirname, '../..', f), 'utf8');

test('fix note-camera-photo audit 1: a shot whose into is gone names the moment it was kept as', () => {
  // The open moment it was to join was deleted before the shot was kept: it is kept as a moment of its own (UN11), so
  // the moment it names is that one, its own id, never the deleted moment it was asked into.
  assert.equal(retryInto('M', false), null);
  const caps = lib('useCaptures.ts');
  assert.match(caps, /return 'error' in r \? r : \{ \.\.\.r, into: stamp\.into \?\? null \};/, 'keepCapture says the into it used');
  assert.match(caps, /momentId: r\.into \?\? r\.id \}/, 'keepOrHold names the moment from the into used');
  assert.doesNotMatch(caps, /momentId: k\.stamp\.into \?\? r\.id/, 'never from the stamp it was asked with');
});

test('fix note-camera-photo audit 1: the page\'s camera keeps its own moment while a memo records (NP14)', () => {
  // With no memo to go with, a shot goes where the camera alone puts it: here a moment of its own.
  assert.deepEqual(photoMidMemo(null, null, null), { into: null, place: null });
  const caps = lib('useCaptures.ts');
  assert.match(caps, /const memo = shot\?\.alone \? null : recording;/, 'a shot said to be alone goes with no memo');
  assert.match(caps, /mediaTypes: recording \? \['images'\]/, 'a memo still holds the microphone: photos only meanwhile');
  assert.match(readFileSync(join(__dirname, '../../../components/notePage/NewNotePage.tsx'), 'utf8'), /cap\.takePhoto\(null, null, undefined, \{ alone: true \}\)/, 'the page\'s camera says it is alone');
});

test('fix note-camera-photo audit 3: a mention of a moment whose walk waits in Undo reads gone', () => {
  assert.equal(mentioned(every, new Set(['open']), 'photo'), null, 'its walk deleted, waiting in Undo');
  assert.equal(mentioned(every, new Set(['open']), 'loose')?.id, 'loose', 'a moment on no walk is untouched');
  assert.equal(mentioned(every, new Set(['w']), 'photo')?.id, 'photo', 'another walk in Undo is not its');
});

test('fix note-camera-photo audit 4: the page\'s Edit finds its picture\'s moment in the whole pool, said as what it is', () => {
  const page = readFileSync(join(__dirname, '../../../components/notePage/NotePage.tsx'), 'utf8');
  assert.match(page, /const v = menuFor \? cardPool\.every\.get\(menuFor\) : null;/);
});
