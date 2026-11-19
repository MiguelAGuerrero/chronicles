/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// The whole sweep of the walk screen (`/tend walk-screen`, Nov 19): the findings a picture cannot hold, read from the
// source. Each test names its finding; the journeys `ready` and `walk` hold what shows.

const SRC = join(__dirname, '../../..');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');

// tend walk-screen 10 (the sweep's auditor 1, ux 1): "On the map" was a heading the hosts drew whenever any layer was on,
// while the key lists only the layers that map draws; "Places" (on by default, Explore's map only, PL9) left it heading
// nothing in the walk's drawer and the ready bar's settings (PL12; WCAG 2.4.6). The key draws its own heading, only with rows.
test('tend walk-screen 10: the layers key draws its own heading, only when it has rows; no host tests every layer', () => {
  const key = read('components/LayersControl.tsx');
  const body = /export function LayersKey\([\s\S]*?\n\}\n/.exec(key)?.[0] ?? '';
  const empty = body.indexOf('if (!on.length) return null;');
  const heading = body.indexOf('props.heading');
  assert.ok(empty > 0 && heading > empty, 'the heading is drawn after the key returns nothing for no rows');
  for (const host of ['app/walk.tsx', 'components/StartSettings.tsx']) {
    const src = read(host);
    assert.doesNotMatch(src, /Object\.values\([\w.]*layers\.on\)\.some/, `${host} no longer heads the key itself`);
    assert.doesNotMatch(src, />On the map<\/Text>/, `${host} draws no "On the map" of its own`);
    assert.match(src, /<LayersKey [^>]*heading="On the map"/, `${host} hands the key its heading`);
  }
  // The ready bar's settings are Navigate's map: the key lists that map's layers (PL12).
  assert.match(read('components/StartSettings.tsx'), /<LayersKey map="navigate"/);
});

// tend walk-screen 11 (the sweep's auditor 3): the chevron is disabled while Start is on its way (navigate-ready audit 10),
// but Android's Back still closed the ready screen then, so the walk opened minimized with nothing said. Back is taken and
// does nothing while starting, and, as every Back handler on this screen, it waits for the screen to be in front.
test('tend walk-screen 11: the ready screen\'s Back does nothing while Start is on its way, and waits for focus', () => {
  const ready = read('components/walk/useReady.tsx');
  const effect = /useEffect\(\(\) => \{\s*if \(!active[^\n]*\n\s*const back = BackHandler\.addEventListener\('hardwareBackPress', \(\) => \{([\s\S]*?)\}\);[\s\S]*?\}, \[([^\]]*)\]\);/.exec(ready);
  assert.ok(effect, 'the ready screen\'s Back handler');
  const [whole, handler, deps] = effect;
  assert.match(whole, /if \(!active[^)]*!focused[^)]*\) return;/, 'only while the ready screen is in front');
  assert.match(handler, /if \(!starting\) close\(\);\s*return true;/, 'taken, and nothing done, while Start is on its way');
  for (const d of ['focused', 'starting']) assert.ok(deps.split(',').map((x) => x.trim()).includes(d), `re-subscribed as ${d} changes`);
});
