/// <reference types="node" />
import { test } from 'node:test';

// Places pipeline, slice 1 (specs/places-pipeline): one failing test per criterion, written before its code
// (decision 0018). Each is a todo until its code lands in scripts/places-pipeline/.


test('PP1: an adapter without its full declaration is refused, and its declared allowed uses are enforced', { todo: 'test first' }, () => {});
test('PP2: only fetch touches the network; a rerun from the raw store makes no request', { todo: 'test first' }, () => {});
test('PP3: each source is held to its declared pace, waits a Retry-After and sends its User-Agent', { todo: 'test first' }, () => {});
test('PP4: a candidate that fails the schema is set aside with its reason and the run goes on', { todo: 'test first' }, () => {});
test('PP5: every object in the schema is closed and the only numbers are a position; no score field passes at any depth', { todo: 'test first' }, () => {});
test('PP6: from the same Wikidata items the pipeline yields the same places, through a gate blind to sources', { todo: 'test first' }, () => {});
test('PP7: a place needs a locating source, and nominations never change a pack', { todo: 'test first' }, () => {});
test('PP8: places keep their opaque IDs across builds; a dropped place\'s ID is retired, never reused', { todo: 'test first' }, () => {});
test('PP9: a pack feature holds exactly name, class, src and id, in ID order, one license family per pack', { todo: 'test first' }, () => {});
test('PP10: the owner\'s edits remove and add places after the gate', { todo: 'test first' }, () => {});
test('PP11: a block\'s hash changes when, and only when, a place inside it changes', { todo: 'test first' }, () => {});
test('PP12: a run in which no place changed publishes nothing', { todo: 'test first' }, () => {});
test('PP14: a failing source falls back to its last raw snapshot, is reported, and the run publishes', { todo: 'test first' }, () => {});
test('PP15: the weekly workflow runs the stages in order, keeps the state asset and stays within one 6-hour job', { todo: 'test first' }, () => {});
test('PP16: phones still never call a source: no new allowed host, no adapter host named under src/', { todo: 'test first' }, () => {});
