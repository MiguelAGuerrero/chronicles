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

// tend walk-screen 12 (the sweep's ux 3, auditor 4): the walk's strip of numbers is one button for a screen reader, and was
// named "The walk", which hid the time and distance under it; the ready bar's twin is named with its numbers (navigate-ready
// audit 6). It is named with what it shows, coarsely (minutes, tens of metres), so the name changes about once a minute,
// and says ", exploring" on an exploring walk. No live region: it is read when reached, never pushed.
test('tend walk-screen 12: the walk\'s strip is named with its distance and time, coarsely', async () => {
  const { walkSummaryLabel } = await import('../../readyNav');
  assert.equal(walkSummaryLabel({ elapsedMs: 26_000, distanceM: 55, rideM: 0, exploring: false, units: 'km' }), '60 m walked in 26 s');
  assert.equal(walkSummaryLabel({ elapsedMs: 754_000, distanceM: 1234, rideM: 0, exploring: true, units: 'km' }), '1.2 km walked in 13 min, exploring');
  assert.equal(walkSummaryLabel({ elapsedMs: 600_000, distanceM: 452, rideM: 1800, exploring: false, units: 'km' }), '450 m walked in 10 min, plus 1.8 km by ride');
  assert.equal(walkSummaryLabel({ elapsedMs: 120_000, distanceM: 100, rideM: 0, exploring: false, units: 'mi' }), '328 ft walked in 2 min');
  // The walk's screen names its strip with it, never the bare "The walk".
  const walk = read('app/walk.tsx');
  assert.match(walk, /summaryLabel=\{walkSummaryLabel\(\{/);
  assert.doesNotMatch(walk, /summaryLabel=\{exploring \? 'The walk, exploring' : 'The walk'\}/);
});

// tend walk-screen 13 (the sweep's ux 4): with a place armed ("The next moment is about …", Capture here), the Add to this
// moment offer still stood beside it, offering to send the next capture into the open moment instead: two transients
// saying different things about one tap. The offer steps aside while a place is armed; the journey `walk` holds it.
test('tend walk-screen 13: the walk\'s Add to this moment offer hides while a place is armed', () => {
  const pill = /<AddToMomentPill[\s\S]*?hidden=\{([^}]*)\}/.exec(read('app/walk.tsx'))?.[1] ?? '';
  assert.match(pill, /!!explore\.armed/);
});

// tend walk-screen 14 (the sweep's ux 5, auditor 5): three targets leaned on hitSlop, which react-native-web does not have
// (.claude/rules/tabs-and-home.md: "Small buttons are 44 pt themselves"): the dead-zone nudge's Dismiss, a bare 18 px
// icon; the motion row's "Turn on", bare text; the ready screen's pill buttons (Undo, Retry), 40 high where the walk's
// are 44. Each is 44 itself now; the journey `ready` measures the ready screen's Undo, the rest are read here.
test('tend walk-screen 14: the walk screen\'s small targets are 44 pt themselves', () => {
  const walk = read('app/walk.tsx');
  const style = (src: string, name: string) => new RegExp(`\\n  ${name}: \\{([^}]*)\\}`).exec(src)?.[1] ?? '';
  const dismiss = /<Pressable testID="dead-zone-dismiss"[^\n]*?style=\{styles\.(\w+)\}/.exec(walk);
  assert.ok(dismiss, 'the nudge\'s Dismiss has a test id and a style of its own');
  assert.match(style(walk, dismiss[1]), /width: 44, height: 44/);
  const motion = /<Pressable testID="motion-on"[^\n]*?style=\{styles\.(\w+)\}/.exec(walk);
  assert.ok(motion, 'Turn on has a style of its own');
  assert.match(style(walk, motion[1]), /minHeight: 44/);
  assert.match(style(read('components/MomentBar.tsx'), 'pillBtn'), /minHeight: 44/);
});

// tend walk-screen 15 (the sweep's steward 1): the long press's spot card offered `What happened here (${n})`, a bare
// count of pieces from any walk, against "Counts are words" (decision 0052) and AGENTS.md ("counts are said in words").
// The button says what it opens; the viewer it opens shows them. The journey `walk` reads the button's words.
test('tend walk-screen 15: the spot card\'s button reads "What happened here", with no count', () => {
  const walk = read('app/walk.tsx');
  const label = /testID="here-open"[\s\S]*?label=\{?([^\n]*)/.exec(walk)?.[1] ?? '';
  assert.match(label, /^"What happened here"$/);
  assert.doesNotMatch(walk, /What happened here \(\$\{/);
});

// tend walk-screen 16 (the sweep's steward 5): the drawer's "Passing a place" line went on, "It is said in words, never
// counted.", stating the product's rule to the person (Restraint, in copy). It says what passing is, and stops there.
test('tend walk-screen 16: "Passing a place" says what passing is, in one sentence', () => {
  const note = /export const passNote = \(m: number\) => `([^`]*)`;/.exec(read('components/ExploreSettings.tsx'))?.[1];
  assert.equal(note, 'A place is passed when you come within ${formatRange(m)} of it.');
});
