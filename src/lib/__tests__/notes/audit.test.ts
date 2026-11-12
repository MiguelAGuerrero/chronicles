/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { JSONContent } from '@tiptap/core';
import { facedAt, type Faced } from '../../moment';
import { NOTE_SAVE_PAUSE } from '../../motionTokens';
import { closable, startSave, stepSave, type SaveEvent, type SaveState } from '../../notePage/autosave';
import { noteHead } from '../../notePage/head';
import { stripMarks } from '../../notePage/plain';
import { NOTE_MAX } from '../../noteEdit';
import { roomOf, roomOfCount } from '../../notePage/room';
import { toBody, toDoc } from '../../notePage/schema';
import { GONE, noteParts, withGone } from '../../refs';

// The audit of note pages (specs/note-pages, Record): one regression test per accepted finding, before its fix.

const run = (s: SaveState, ...events: SaveEvent[]) => {
  const effects = [];
  for (const e of events) {
    const r = stepSave(s, e);
    s = r.state;
    effects.push(...r.effects);
  }
  return { s, effects };
};

test('note-pages audit 1: a piece of a stack carries its own body_format, never its face\'s', () => {
  const photo = { id: 'm', moment_id: 'm', t: 1, kind: 'photo' as const, file_path: 'p.jpg', body: null };
  const note = { id: 'n', moment_id: 'm', t: 2, kind: 'text' as const, file_path: null, body: '# Bakery', body_format: 'md' as const };
  const old = { id: 'o', moment_id: 'm', t: 3, kind: 'text' as const, file_path: null, body: '# 3 buses' };
  const face = { ...photo, walk_id: null, lat: null, lon: null, segment_id: null, piece_id: 'm', pieces: [photo, note, old] } as unknown as Faced;
  assert.equal(facedAt(face, 'n').body_format, 'md');
  const mdFace = { ...face, kind: 'text', body: '# Figs', body_format: 'md' } as unknown as Faced;
  assert.equal(facedAt(mdFace, 'o').body_format ?? null, null);
});

const T = new Date(2026, 10, 12, 16, 12).getTime();
const base = { t: T, now: T + 3600000, time: '4:12 pm', context: null, placing: false, draft: null };

test('note-pages audit 2: a placed note with no context line never says "No place kept"', () => {
  const h = noteHead({ ...base, placed: true, onWalk: true });
  assert.ok(!h.line.includes('No place kept'), h.line);
  assert.equal(h.line, '4:12 pm · On a walk');
  assert.equal(noteHead({ ...base, placed: true, onWalk: false }).line, '4:12 pm · Not on a walk');
  // Lately's line says "No place kept" while it has no street for a placed moment: the head leaves that out.
  assert.equal(noteHead({ ...base, placed: true, context: 'No place kept · Tuesday evening · On its own' }).line, '4:12 pm · Tuesday evening · On its own');
});

test('note-pages audit 3: a page being written says "Place not kept yet" while its fix is on the way', () => {
  assert.equal(noteHead({ ...base, placing: true, draft: { onWalk: false } }).line, '4:12 pm · Not on a walk · Place not kept yet');
  assert.equal(noteHead({ ...base, placing: false, draft: { onWalk: true } }).line, '4:12 pm · On your walk');
});

test('note-pages audit 4: leaving after a failed save tries again and stays until it is kept', () => {
  const failed = run(startSave({ kept: false, body: '', now: 0 }), { type: 'edit', text: 'words', now: 0 }, { type: 'tick', now: NOTE_SAVE_PAUSE }, { type: 'failed' });
  const left = run(failed.s, { type: 'leave' });
  assert.deepEqual(left.effects, [{ type: 'create', body: 'words' }]);
  assert.equal(closable(left.s), false);
  const again = run(left.s, { type: 'failed' });
  assert.equal(closable(again.s), false);
  assert.equal(closable(run(left.s, { type: 'saved', text: 'words' }).s), true);
});

test('note-pages audit 6: a page holding only empty list items, boxes or quotes has no words', () => {
  for (const md of ['-', '- [ ]', '>', '1.', '#', '- [ ] \n- ']) {
    assert.deepEqual(run(startSave({ kept: false, body: '', now: 0 }), { type: 'edit', text: md, now: 0 }, { type: 'tick', now: 9000 }, { type: 'leave' }).effects, [], md);
  }
  assert.deepEqual(run(startSave({ kept: true, body: 'old', now: 0 }), { type: 'edit', text: '- [ ]', now: 0 }, { type: 'leave' }).effects, [{ type: 'delete' }]);
});

const shown = (doc: JSONContent): string => {
  const out: string[] = [];
  const walk = (n: JSONContent): void => {
    if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'codeBlock') out.push((n.content ?? []).map((c) => c.text ?? '').join(''));
    else if (n.type === 'horizontalRule') out.push('<hr>');
    else for (const c of n.content ?? []) walk(c);
  };
  walk(doc);
  return out.join('\n');
};

test('note-pages audit 7: a literal --- or an indented line survives being written in', () => {
  // Leading spaces may come back as no-break spaces, which read the same; a tab as four of them.
  const norm = (x: string) => x.replace(/\u00a0/g, ' ').replace(/\t/g, '    ');
  for (const old of ['Morning\n---\nNoon', '***', '    indented four', '\tand a tab', '___']) {
    const back = shown(toDoc(toBody(toDoc(old, null)), 'md'));
    assert.equal(norm(back), norm(old), JSON.stringify(old));
  }
});

test('note-pages audit 8: the room line counts what the editor counts', () => {
  assert.deepEqual(roomOfCount(NOTE_MAX), { full: true, line: 'This note is full' });
  assert.deepEqual(roomOfCount(NOTE_MAX - 999), roomOf('a'.repeat(NOTE_MAX - 999)));
  assert.deepEqual(roomOfCount(NOTE_MAX - 1000), { full: false, line: null });
});

test('note-pages audit 10: a mention of a moment no longer kept reads so, wherever it is drawn', () => {
  assert.equal(withGone('see @[m1|the fig tree] and @[m2|the pier]', (id) => id === 'm1'), `see @[m1|${GONE}] and @[m2|the pier]`);
});

test('note-pages audit 11: a second leave emits nothing', () => {
  const emptied = run(startSave({ kept: true, body: 'old', now: 0 }), { type: 'edit', text: '', now: 0 }, { type: 'leave' });
  assert.deepEqual(emptied.effects, [{ type: 'delete' }]);
  assert.deepEqual(run(emptied.s, { type: 'leave' }).effects, []);
  const written = run(startSave({ kept: true, body: 'old', now: 0 }), { type: 'edit', text: 'new', now: 0 }, { type: 'leave' }, { type: 'saved', text: 'new' });
  assert.deepEqual(run(written.s, { type: 'leave' }).effects, []);
});

test('note-pages audit 12: a page split at its mentions keeps its marks whole and drops them', () => {
  assert.deepEqual(noteParts('**warm @[m|x] bread**', 'md'), [{ text: 'warm ' }, { ref: 'm', label: 'x' }, { text: ' bread' }]);
  assert.deepEqual(noteParts('**not a page @[m|x]**', null), [{ text: '**not a page ' }, { ref: 'm', label: 'x' }, { text: '**' }]);
});
