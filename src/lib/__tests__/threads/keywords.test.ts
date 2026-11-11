import { test } from 'node:test';

// Reference keywords (specs/reference-keywords): the palette's entries, the token, and what plain text says.

test('RK2: a keyword reference is inserted at the @, and every other character of the note is untouched', { todo: 'test first' }, () => {});
test('RK3: the token carries the keyword, its word, its value and payload; a note with no keyword is byte for byte as before', { todo: 'test first' }, () => {});
test('RK4: a keyword resolves from the fix and time it is given, never the present', { todo: 'test first' }, () => {});
test('RK5: a stored reference reads the same value after anything the app rebuilds', { todo: 'test first' }, () => {});
test('RK6: an entry that cannot resolve is absent, never invented', { todo: 'test first' }, () => {});
test('RK7: places are ordered by distance only, said in words, with no number, rank or digit', { todo: 'test first' }, () => {});
test('RK8: a moment row carries its place and date, a placeless one says so in words', { todo: 'test first' }, () => {});
test('RK9: plain text reads a keyword as its word and value in parentheses, and as the word alone when the values are off', { todo: 'test first' }, () => {});
test('RK10: correcting a reference replaces its value and keeps its word', { todo: 'test first' }, () => {});
test('RK12: no weather or temperature entry exists', { todo: 'test first' }, () => {});
test('RK13: here and next to me name a place only when exactly one is in range; else the street, or nothing', { todo: 'test first' }, () => {});
test('RK16: time words resolve against the moment\'s time, as absolute values, and say nothing of quality or mood', { todo: 'test first' }, () => {});
test('RK17: a shared note reads its keywords as words and carries no raw token or coordinate', { todo: 'test first' }, () => {});
test('RK18: the resolution picker lists notable places by distance and always offers the map', { todo: 'test first' }, () => {});
test('RK20: a pointer to a deleted moment goes alone: the word and value stay; a walk\'s cache clearing leaves the token', { todo: 'test first' }, () => {});
