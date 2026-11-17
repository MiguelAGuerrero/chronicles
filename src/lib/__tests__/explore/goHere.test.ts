/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ATLAS_CODE, type AtlasArea, type Listed } from '../../atlas/atlas';

// Explore: Go here on every tile (specs/explore-go-here, GH1-GH15).

const area = (name: string, at: AtlasArea['at'] | null = [-71.4, 41.8]): AtlasArea => ({
  key: name, level: 'neighborhood', name, at: at as AtlasArea['at'], reachM: 1000, build: 'b1', code: ATLAS_CODE, listed_at: 1, read_at: null, failed_at: null, profile: null,
});
const listed = (name: string, o: Partial<Listed> = {}, at: AtlasArea['at'] | null = [-71.4, 41.8]): Listed => ({ area: area(name, at), distanceM: 400, here: false, ...o });

test('GH2: two choices, Chronicles first, the maps app named for the phone; no choice is marked better', async () => {
  const { goHereChoices } = await import('../../atlas/goHere');
  const { mapsName } = await import('../../nav/handoff');
  assert.equal(mapsName('apple'), 'Apple Maps');
  assert.equal(mapsName('appleApp'), 'Apple Maps');
  assert.equal(mapsName('google'), 'Google Maps');
  assert.equal(mapsName('geo'), 'Maps');
  const c = goHereChoices('Apple Maps');
  assert.deepEqual(c.map((x) => x.id), ['app', 'maps'], 'exactly two, Chronicles first');
  assert.equal(c[0].label, 'Chronicles');
  assert.equal(c[1].label, 'Apple Maps', 'the maps row names the app that gets the destination');
  assert.match(c[0].hint, /Opens Navigate, ready/);
});

test('GH5: Chronicles saves and opens Navigate ready, or, with a walk open, does as the card\'s Walk to does (NV10)', async () => {
  const { goHereDo } = await import('../../atlas/goHere');
  assert.equal(goHereDo('app', false), 'later');
  assert.equal(goHereDo('app', true), 'start', 'a walk open: it routes that walk, as Walk to does');
  assert.equal(goHereDo('maps', false), 'maps');
  assert.equal(goHereDo('maps', true), 'maps', 'the maps app never touches the walk');
});

test('GH6: both choices are the same at any distance: nothing in the decision reads one', async () => {
  const { goHereDo } = await import('../../atlas/goHere');
  assert.equal(goHereDo.length, 2, 'the decision takes the choice and whether a walk is open, and no distance');
});

test('GH8: every tile with a point has Go here, with or without a fix; not where you are, nor an area with no point', async () => {
  const { canGoHere } = await import('../../atlas/goHere');
  assert.equal(canGoHere(listed('Fox Point')), true);
  assert.equal(canGoHere(listed('Cranston', { unplaced: true })), true, 'no fix: still offered (0121\'s planning case)');
  assert.equal(canGoHere(listed('Here', { here: true })), false, 'where you are: no Walk to, no Go here');
  assert.equal(canGoHere(listed('Nowhere', {}, null)), false, 'no point');
});

test('GH10: the sheet\'s own words hold no digit, minutes, "fastest" or count; the name is not the sheet\'s word', async () => {
  const { goHereChoices, goHereWords } = await import('../../atlas/goHere');
  const words = [...goHereChoices('Apple Maps'), ...goHereChoices('Maps')].flatMap((c) => [c.label, c.hint]).concat(goHereWords('5th Ward', true));
  const own = words.join(' ').replace('5th Ward', '');
  assert.doesNotMatch(own, /\d|minute|min\b|fastest|quickest|\bof\b \w+ \w+ routes/i);
  assert.match(goHereWords('Fox Point', true).join(' '), /Replaces where you were heading/, 'a replaced destination is said once');
  assert.doesNotMatch(goHereWords('Fox Point', false).join(' '), /Replaces/);
});

test('GH14: a decision record cites 0058 and 0121 and lists the tile as a host', () => {
  const dir = new URL('../../../../docs/decisions/', import.meta.url);
  const hit = readdirSync(dir).filter((f) => f.startsWith('0188')).map((f) => readFileSync(new URL(f, dir), 'utf8'));
  assert.ok(hit.length === 1, 'one record for Go here');
  assert.match(hit[0], /0058/);
  assert.match(hit[0], /0121/);
  assert.match(hit[0], /tile/i);
});

test('GH15: a Go here tap decides only between the maps app, saving a destination and starting a walk: nothing visited', async () => {
  const { goHereDo } = await import('../../atlas/goHere');
  const seen = new Set<string>();
  for (const choice of ['app', 'maps'] as const) for (const open of [false, true]) seen.add(goHereDo(choice, open));
  assert.deepEqual([...seen].sort(), ['later', 'maps', 'start']);
});

// ---- Go here on the rest of the surfaces (specs/go-here-everywhere, GE1-GE13). ----

test('GE5: a row too far to walk still has Go here, and Go here never asks the far question', async () => {
  const { rowActions } = await import('../../atlas/goHere');
  assert.deepEqual(rowActions({ walkable: true }), { walk: true, go: true });
  assert.deepEqual(rowActions({ walkable: false }), { walk: false, go: true });
});

test('GE7: not on the card of the area you are in, nor while a far question is open, nor below the long press\'s zoom', async () => {
  const { cardCanGoHere, spotCanGoHere } = await import('../../atlas/goHere');
  assert.equal(cardCanGoHere({ here: false, asking: false }), true);
  assert.equal(cardCanGoHere({ here: true, asking: false }), false, 'You\'re in <area>: no Walk to, no Go here');
  assert.equal(cardCanGoHere({ here: false, asking: true }), false, 'the question is open');
  assert.equal(spotCanGoHere({ zoom: 12, asking: false }), true);
  assert.equal(spotCanGoHere({ zoom: 11.9, asking: false }), false, 'below zoom 12 Explore\'s long press has no Walk here');
  assert.equal(spotCanGoHere({ zoom: 15, asking: true }), false);
});

test('GE4: the Chronicles row says it routes your walk when one is open, and opens Navigate otherwise', async () => {
  const { goHereChoices } = await import('../../atlas/goHere');
  assert.match(goHereChoices('Apple Maps', undefined, false)[0].hint, /Opens Navigate, ready/);
  assert.match(goHereChoices('Apple Maps', undefined, true)[0].hint, /Routes your walk/);
  assert.doesNotMatch(goHereChoices('Apple Maps', undefined, true)[0].hint, /Navigate, ready/);
});

test('GE13: only the destination leaves; a star\'s title and "Your spot" never ride in the link', async () => {
  const { shareLabel } = await import('../../atlas/goHere');
  const { mapsUrls } = await import('../../nav/handoff');
  assert.equal(shareLabel('area', 'Cranston'), 'Cranston');
  assert.equal(shareLabel('star', 'The bakery smelled of cardamom'), 'Destination');
  assert.equal(shareLabel('spot', 'Your spot'), 'Destination');
  for (const kind of ['star', 'spot'] as const) {
    const urls = mapsUrls([-71.4, 41.8], shareLabel(kind, 'Your spot and my words'), 'geo').join(' ');
    assert.doesNotMatch(decodeURIComponent(urls), /Your spot|my words/);
  }
});

test('GE12: a decision record cites 0188, 0058 and 0121, lists the hosts and keeps the dead-zone nudge deferred', () => {
  const dir = new URL('../../../../docs/decisions/', import.meta.url);
  const hit = readdirSync(dir).filter((f) => /go-here/.test(f) && !f.startsWith('0188')).map((f) => readFileSync(new URL(f, dir), 'utf8'));
  assert.ok(hit.length === 1, 'one record for Go here on the rest of the surfaces');
  for (const need of [/0188/, /0058/, /0121/, /storefront/i, /complex/i, /long-press|long press/i, /star/i, /dead-zone/i]) assert.match(hit[0], need);
});

// ---- Audit of go-here-everywhere (Nov 16). ----

test('go-here-everywhere audit 1: Escape or Back with the sheet open closes the sheet alone, never also the town page', async () => {
  const { pageBack } = await import('../../atlas/waitingPins');
  assert.equal(pageBack({ layersOpen: false, spot: false, goHere: true }), 'gohere', 'the sheet is open: the page does nothing');
  assert.equal(pageBack({ layersOpen: true, spot: true, goHere: true }), 'gohere', 'the sheet is the topmost thing');
  assert.equal(pageBack({ layersOpen: false, spot: false }), 'leave', 'with no sheet the page steps out as before');
  assert.equal(pageBack({ layersOpen: true, spot: false, goHere: false }), 'layers');
});

test('go-here-everywhere audit 2: every openInMaps caller passes the label through shareLabel, so a star\'s title never rides in the link', () => {
  const root = new URL('../../../', import.meta.url);
  const calls: string[] = [];
  const walk = (dir: URL) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      const u = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
      if (e.isDirectory()) walk(u);
      else if (/\.(ts|tsx)$/.test(e.name)) {
        for (const line of readFileSync(u, 'utf8').split('\n')) {
          if (/\bopenInMaps\(/.test(line) && !/export (async )?function openInMaps|^\s*(\*|\/\/)/.test(line)) calls.push(`${e.name}: ${line.trim()}`);
        }
      }
    }
  };
  walk(root);
  assert.ok(calls.length >= 2, 'the callers are found');
  for (const c of calls) assert.match(c, /shareLabel\(/, `${c} must pass its label through shareLabel`);
});

test('go-here-everywhere audit 3: the maps row\'s hint says recording pauses only where it is true, and fits one line', async () => {
  const { goHereMapsHint } = await import('../../atlas/goHere');
  assert.doesNotMatch(goHereMapsHint({ walkOpen: false, web: true }), /recording/i, 'nothing records with no walk open');
  assert.doesNotMatch(goHereMapsHint({ walkOpen: true, web: false }), /recording/i, 'on a phone Chronicles keeps recording');
  assert.match(goHereMapsHint({ walkOpen: true, web: true }), /Recording pauses/);
  for (const walkOpen of [false, true]) for (const web of [false, true]) assert.ok(goHereMapsHint({ walkOpen, web }).length <= 42, 'one line at 320 px');
});

test('go-here-everywhere audit 5: the sheet at the foot clears the bottom inset; at the top it sits at the top inset', async () => {
  const { sheetEdge } = await import('../../atlas/goHere');
  assert.deepEqual(sheetEdge('bottom', { top: 47, bottom: 34 }), { bottom: 34 }, 'over the card, which hides the tabs, above the home indicator');
  assert.deepEqual(sheetEdge('bottom', { top: 0, bottom: 0 }), { bottom: 0 });
  assert.deepEqual(sheetEdge('top', { top: 47, bottom: 34 }), { top: 47 });
});

test('go-here-everywhere audit 9: Go here says where it starts you when that is one of its streets, as Walk to does (`walkViaLine`)', async () => {
  const { goHereWords } = await import('../../atlas/goHere');
  assert.ok(goHereWords('Cranston', false, 'Park Avenue').includes('Starts you on Park Avenue'));
  assert.ok(!goHereWords('Cranston', false, null).some((w) => /Starts you/.test(w)));
  assert.ok(!goHereWords('Cranston', false).some((w) => /Starts you/.test(w)));
  assert.deepEqual(goHereWords('Cranston', true, 'Park Avenue'), ['Go to Cranston', 'Starts you on Park Avenue', 'Replaces where you were heading']);
});
