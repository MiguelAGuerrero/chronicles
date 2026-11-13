/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { JSONContent } from '@tiptap/core';
import { toBody, toDoc } from '../../notePage/schema';

// Note pages NP7 (specs/note-pages, decision 0151): what is kept is what is shown, and older notes stay literal.

/** The text a document shows, line by line: what a person reads, whatever the marks. */
const shown = (doc: JSONContent): string => {
  const out: string[] = [];
  const walk = (n: JSONContent, line: string[]): void => {
    if (n.type === 'text') line.push(n.text ?? '');
    else if (n.type === 'mention') line.push(`@${String(n.attrs?.label ?? n.attrs?.id)}`);
    else if (n.type === 'hardBreak') { out.push(line.join('')); line.length = 0; }
    else if (n.type === 'paragraph' || n.type === 'heading') { const l: string[] = []; for (const c of n.content ?? []) walk(c, l); out.push(l.join('')); }
    else for (const c of n.content ?? []) walk(c, line);
  };
  walk(doc, []);
  return out.join('\n');
};

const PAGE = '# Bakery\n\nSmelled it **two** blocks *off*.\n\n## The queue\n\n- rye\n- warm\n\n1. one\n2. two\n\n- [ ] come back\n- [x] ask her name\n\n> the queue went round the corner\n\nWent with @[abc_1|the bakery photo] in mind.';

test('NP7: a page the editor wrote reopens exactly as it was left', () => {
  assert.equal(toBody(toDoc(PAGE, 'md')), PAGE);
  const doc = toDoc(PAGE, 'md');
  const types = JSON.stringify(doc);
  for (const t of ['"heading"', '"bulletList"', '"orderedList"', '"taskList"', '"checked":true', '"blockquote"', '"bold"', '"italic"', '"mention"']) assert.ok(types.includes(t), t);
});

test('NP7: a mention survives as @[id|words], and one with no words as @[id]', () => {
  for (const body of ['see @[m1|the fig tree] again', 'see @[m-2_x]']) assert.equal(toBody(toDoc(body, 'md')), body);
});

test('NP7: a note without the mark shows character for character, and written in, still does (the steward)', () => {
  for (const old of ['> 5 km', '*sigh*', 'snake_case and _this_', '# 3 buses', '- 3 pints\n1. first\n+ plus', '~~gone~~ [a](http://x.y) <b>x</b> &amp;', 'two\nlines\n\nand a gap', 'with @[m1|a mention]']) {
    const doc = toDoc(old, null);
    assert.equal(shown(doc), old.replace('@[m1|a mention]', '@a mention'), old);
    assert.ok(!JSON.stringify(doc).match(/"(heading|bulletList|orderedList|blockquote|bold|italic)"/), old);
    // Written in, it is kept as Markdown that shows the same characters.
    assert.equal(shown(toDoc(toBody(doc), 'md')), shown(doc), old);
  }
});

test('NP7: Markdown outside what the page makes is kept as the text that was typed', () => {
  const typed: JSONContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '~~gone~~ [a](http://x.y) | t | `c` # 3 1. x' }] }] };
  assert.equal(shown(toDoc(toBody(typed), 'md')), '~~gone~~ [a](http://x.y) | t | `c` # 3 1. x');
  const leading: JSONContent = { type: 'doc', content: ['# 3 buses', '1. not a list', '- not a bullet', '> not a quote'].map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) };
  assert.equal(shown(toDoc(toBody(leading), 'md')), '# 3 buses\n1. not a list\n- not a bullet\n> not a quote');
});

test('NP13: a link, an image or HTML in a body is never made a link or loaded', () => {
  const doc = JSON.stringify(toDoc('[a](http://x.y) ![i](http://x.y/i.png) <img src="http://x.y/j.png"> <iframe src="http://x.y"></iframe> http://x.y', 'md'));
  for (const t of ['"link"', '"image"', 'iframe"', '"href"']) assert.ok(!doc.includes(t), t);
});
