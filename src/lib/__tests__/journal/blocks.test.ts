/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENTRY_GOES_ON, SHEET_BLOCKS, noteBlocks, sheetBlocks } from '../../journal/blocks';
import { refToken } from '../../refs';


test('JN26: a page-written note is read into the blocks the sheet draws, its marks as words', () => {
  const md = '# Bakery\n\nSmelled it **two** blocks *off*.\n\n- rye\n- warm\n\n1. one\n2. two\n\n- [ ] come back\n- [x] ask her name\n\n> the queue went round the corner\n\n## Later';
  assert.deepEqual(noteBlocks(md), [
    { k: 'heading', level: 1, text: 'Bakery' },
    { k: 'para', text: 'Smelled it two blocks off.' },
    { k: 'bullet', text: 'rye' },
    { k: 'bullet', text: 'warm' },
    { k: 'number', n: 1, text: 'one' },
    { k: 'number', n: 2, text: 'two' },
    { k: 'task', done: false, text: 'come back' },
    { k: 'task', done: true, text: 'ask her name' },
    { k: 'quote', text: 'the queue went round the corner' },
    { k: 'heading', level: 2, text: 'Later' },
  ]);
});

test('JN26: a mention keeps its token in its block, and the editor\'s entities read as their characters', () => {
  const ref = refToken('m9', 'the pier, Sep 11');
  const blocks = noteBlocks(`Back at ${ref} again &gt; once\n\n- with ${ref}`);
  assert.deepEqual(blocks, [
    { k: 'para', text: `Back at ${ref} again > once` },
    { k: 'bullet', text: `with ${ref}` },
  ]);
});

test('JN26: nothing written is no blocks, and a bare box with no words is none', () => {
  assert.deepEqual(noteBlocks(''), []);
  assert.deepEqual(noteBlocks('- [ ] \n\n'), []);
});

test('JN27: the sheet draws the first blocks of a long entry and says it goes on, in words', () => {
  const blocks = noteBlocks(Array.from({ length: 40 }, (_, i) => `Paragraph ${String.fromCharCode(97 + (i % 26))}.`).join('\n\n'));
  const cut = sheetBlocks(blocks);
  assert.equal(cut.shown.length, SHEET_BLOCKS);
  assert.equal(cut.more, true);
  assert.deepEqual(sheetBlocks(blocks.slice(0, 3)), { shown: blocks.slice(0, 3), more: false });
  assert.equal(ENTRY_GOES_ON, 'The entry goes on; open it to read the rest');
  assert.doesNotMatch(ENTRY_GOES_ON, /[0-9?]/);
});
