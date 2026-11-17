/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ATLAS_CODE, type AtlasArea, type Listed } from '../../atlas/atlas';

// Open in Maps beside Walk (specs/open-in-maps-here, OM1-OM14). The modules are imported inside each test.

const area = (name: string, at: AtlasArea['at'] | null = [-71.4, 41.8]): AtlasArea => ({
  key: name, level: 'neighborhood', name, at: at as AtlasArea['at'], reachM: 1000, build: 'b1', code: ATLAS_CODE, listed_at: 1, read_at: null, failed_at: null, profile: null,
});
const listed = (name: string, o: Partial<Listed> = {}, at: AtlasArea['at'] | null = [-71.4, 41.8]): Listed => ({ area: area(name, at), distanceM: 400, here: false, ...o });

/** Every .ts and .tsx under src, outside the tests. */
function sources(): { file: string; text: string }[] {
  const root = new URL('../../../', import.meta.url);
  const out: { file: string; text: string }[] = [];
  const walk = (dir: URL) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      const u = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
      if (e.isDirectory()) walk(u);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push({ file: u.pathname.split('/src/')[1], text: readFileSync(u, 'utf8') });
    }
  };
  walk(root);
  return out;
}

test('OM1: no screen says "Go here": its label, spoken name and JSX text are gone from src', () => {
  const bad: string[] = [];
  for (const { file, text } of sources()) {
    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (/>\s*Go here\s*</.test(line) || /label="Go here"/.test(line) || /['"`]Go here[,'"`]/.test(line) || /`Go here,/.test(line)) bad.push(`${file}:${i + 1} ${line.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(bad, []);
});

test('OM3: a control\'s spoken name is "Open in Maps, <place>" and "Walk there, <place>"', async () => {
  const { OPEN_IN_MAPS, openInMapsName, walkThereName } = await import('../../atlas/mapsButton');
  assert.equal(OPEN_IN_MAPS, 'Open in Maps');
  assert.equal(openInMapsName('Fox Point'), 'Open in Maps, Fox Point');
  assert.equal(walkThereName('Fox Point'), 'Walk there, Fox Point');
});

test('OM4: a storefront or complex row too far to walk still has Open in Maps; Walk to only when walkable', async () => {
  const { rowActions } = await import('../../atlas/mapsButton');
  assert.deepEqual(rowActions({ walkable: true }), { walk: true, maps: true });
  assert.deepEqual(rowActions({ walkable: false }), { walk: false, maps: true });
});

test('OM5: not on the area you are in, an area with no point, a card asking its far question, or a long press below zoom 12', async () => {
  const { canOpenInMaps, cardCanOpenInMaps, spotCanOpenInMaps } = await import('../../atlas/mapsButton');
  assert.equal(canOpenInMaps(listed('Fox Point')), true);
  assert.equal(canOpenInMaps(listed('Cranston', { unplaced: true })), true, 'no fix: still has its point');
  assert.equal(canOpenInMaps(listed('Here', { here: true })), false);
  assert.equal(canOpenInMaps(listed('Nowhere', {}, null)), false);
  assert.equal(cardCanOpenInMaps({ here: false, asking: false }), true);
  assert.equal(cardCanOpenInMaps({ here: true, asking: false }), false);
  assert.equal(cardCanOpenInMaps({ here: false, asking: true }), false);
  assert.equal(spotCanOpenInMaps({ zoom: 12, asking: false }), true);
  assert.equal(spotCanOpenInMaps({ zoom: 11.9, asking: false }), false);
  assert.equal(spotCanOpenInMaps({ zoom: 15, asking: true }), false);
});

test('OM7: a tile\'s walk button names what its tap does at every distance, and never starts a walk past 2 km', async () => {
  const { tileWalk } = await import('../../atlas/mapsButton');
  const near = tileWalk('start', { walkOpen: false, selected: true });
  assert.deepEqual([near.label, near.does], ['Walk there', 'start']);
  const band = tileWalk('ask', { walkOpen: false, selected: true });
  assert.deepEqual([band.label, band.does], ['Walk there', 'ask'], '2-10 km or no fresh fix: the card\'s question, never a start');
  const far = tileWalk('later', { walkOpen: false, selected: true });
  assert.deepEqual([far.label, far.does], ['Set as destination', 'later']);
  assert.match(far.hint ?? '', /Saves it in Navigate; starts nothing/);
  // A walk open: Walk to routes it (NV10), with no question, as the card does; too far to walk is still a destination.
  assert.equal(tileWalk('ask', { walkOpen: true, selected: true }).does, 'start');
  assert.equal(tileWalk('later', { walkOpen: true, selected: true }).does, 'later');
  for (const choice of ['ask', 'later'] as const) assert.notEqual(tileWalk(choice, { walkOpen: false, selected: true }).does, 'start');
});

test('OM8: only a selected tile\'s Walk there is the accent; Set as destination starts nothing and never is', async () => {
  const { tileWalk } = await import('../../atlas/mapsButton');
  assert.equal(tileWalk('start', { walkOpen: false, selected: true }).accent, true);
  assert.equal(tileWalk('start', { walkOpen: false, selected: false }).accent, false);
  assert.equal(tileWalk('ask', { walkOpen: false, selected: false }).accent, false);
  assert.equal(tileWalk('later', { walkOpen: false, selected: true }).accent, false);
});

test('OM10: the link carries coordinates; a star\'s title and "Your spot" never ride in it', async () => {
  const { shareLabel } = await import('../../atlas/mapsButton');
  const { mapsUrls } = await import('../../nav/handoff');
  assert.equal(shareLabel('area', 'Cranston'), 'Cranston');
  assert.equal(shareLabel('star', 'The bakery smelled of cardamom'), 'Destination');
  assert.equal(shareLabel('spot', 'Your spot'), 'Destination');
  for (const kind of ['star', 'spot'] as const) {
    const urls = mapsUrls([-71.4, 41.8], shareLabel(kind, 'Your spot and my words'), 'geo').join(' ');
    assert.doesNotMatch(decodeURIComponent(urls), /Your spot|my words/);
  }
});

test('OM10: every openInMaps caller passes its label through shareLabel, so a star\'s title never rides in the link', () => {
  const calls: string[] = [];
  for (const { file, text } of sources()) {
    for (const line of text.split('\n')) {
      if (/\bopenInMaps\(/.test(line) && !/export (async )?function openInMaps|^\s*(\*|\/\/)/.test(line)) calls.push(`${file}: ${line.trim()}`);
    }
  }
  assert.ok(calls.length >= 2, 'the callers are found');
  for (const c of calls) assert.match(c, /shareLabel\(/, `${c} must pass its label through shareLabel`);
});

test('OM11: no sheet, no sheet hook, no sheet handler anywhere in src', () => {
  const bad: string[] = [];
  for (const { file, text } of sources()) {
    for (const needle of ['go-here-sheet', 'useGoHere', 'GoHereSheet']) if (text.includes(needle)) bad.push(`${file}: ${needle}`);
  }
  assert.deepEqual(bad, []);
});

test('OM12: a decision record supersedes 0189 and 0190, cites 0058 and 0121, lists the hosts and says "Route here"', () => {
  const dir = new URL('../../../../docs/decisions/', import.meta.url);
  const hit = readdirSync(dir).filter((f) => f.startsWith('0193')).map((f) => readFileSync(new URL(f, dir), 'utf8'));
  assert.equal(hit.length, 1, 'one record for Open in Maps beside Walk');
  for (const need of [/0189/, /0190/, /0058/, /0121/, /storefront/i, /complex/i, /long-press|long press/i, /star/i, /Route here/]) assert.match(hit[0], need);
});

test('OM13: the walk screen\'s buttons and the pin viewer\'s menu item say "Route here"', () => {
  const all = sources();
  const walk = all.find((s) => s.file === 'app/walk.tsx')!.text;
  const viewer = all.find((s) => s.file === 'components/CaptureView.tsx')!.text;
  assert.ok((walk.match(/Route here/g) ?? []).length >= 3, 'the three in-walk buttons');
  assert.match(viewer, /Route here/);
});

test('OM14: a tile with no fix (no distance) asks, and every kind of tile gets the same two buttons', async () => {
  const { tileWalk } = await import('../../atlas/mapsButton');
  const { walkToChoice } = await import('../../startPlan');
  assert.equal(walkToChoice(null, null, 0), 'ask', 'no distance and no fix');
  assert.equal(tileWalk(walkToChoice(null, null, 0), { walkOpen: false, selected: false }).does, 'ask');
});
