/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STEP_NOTE_CHARS, STEP_NOTE_MORE, stepNote, stripMarks } from '../../notePage/plain';
import { noteSlotPause } from '../../ceremony/rhythm';
import { plainNote } from '../../refs';
import type { Faced } from '../../moment';
import { termsOf } from '../../resurface/terms';
import { wordsOf } from '../../resurface/views';

// Note pages (specs/note-pages, decision 0149), written from the criteria before the code.

const PAGE = '# Bakery\n\nSmelled it **two** blocks *off*.\n\n- rye\n- warm\n\n1. one\n2. two\n\n- [ ] come back\n- [x] ask her name\n\n> the queue went round the corner';

test('NP10: a page\'s body reads as its words, marks dropped and lines kept', { todo: 'test first' }, () => {
  assert.equal(stripMarks(PAGE), 'Bakery\nSmelled it two blocks off.\nrye\nwarm\none\ntwo\ncome back\nask her name\nthe queue went round the corner');
  assert.equal(stripMarks('snake\\_case &gt; 5 km &amp; more'), 'snake_case > 5 km & more');
});

test('NP10: plainNote drops the marks of a body the page wrote, and its mentions read as their words', { todo: 'test first' }, () => {
  assert.equal(plainNote('## Hope Street\n\n- [x] the figs @[m1|the fig tree]', 'md'), 'Hope Street\nthe figs the fig tree');
});

test('NP7: a note without the mark reads character for character', { todo: 'test first' }, () => {
  for (const body of ['> 5 km', '*sigh*', 'snake_case', '# 3 buses', '- 3 pints\n1. first']) assert.equal(plainNote(body, null), body);
  assert.equal(plainNote('# 3 buses'), '# 3 buses');
});

test('NP10: the Chronicle\'s threads never take a mark as a word', { todo: 'test first' }, () => {
  const c = { id: 'n', kind: 'text', body: '# Figs\n\n- [x] **figs** again *figs* &gt; here', body_format: 'md' } as unknown as Faced;
  const words = wordsOf(c) ?? '';
  for (const mark of ['#', '[x]', '**', '*', '&gt;', '- ']) assert.ok(!words.includes(mark), `${mark} in ${words}`);
  const terms = termsOf(words).map((t) => t.term);
  assert.ok(terms.includes('figs') && !terms.some((t) => /[#*[\]]/.test(t)), terms.join(' '));
});

test('NP10: the replay\'s pause for a note counts its words, never its marks', { todo: 'test first' }, () => {
  const marked = '# a\n\n- [ ] b\n- [x] c\n\n> d **e** *f*';
  assert.equal(noteSlotPause({ body: marked, body_format: 'md' }), noteSlotPause({ body: 'a b c d e f', body_format: null }));
});

test('NP10: the screen reader\'s step reads a note\'s first 300 characters, then that it goes on', { todo: 'test first' }, () => {
  const short = stepNote('The figs were gone.');
  assert.deepEqual(short, { text: 'The figs were gone.', more: null });
  const long = stepNote('word '.repeat(200).trim());
  assert.ok(long.text.length <= STEP_NOTE_CHARS && !long.text.endsWith(' '), `${long.text.length}`);
  assert.equal(long.more, STEP_NOTE_MORE);
});
