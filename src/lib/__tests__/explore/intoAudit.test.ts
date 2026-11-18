/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { COMPLEX_KINDS, type ComplexKind } from '../../complexes/types';
import { kindParent } from '../../discovery/refinements';
import { DEFAULT_OFF } from '../../discovery/subtypes';
import type { Kind } from '../../discovery/types';
import { KINDS, kindOf, type KindInfo } from '../../explore/explore';

// What I'm into's page, its audit (specs/what-im-into-page, Nov 18): each regression test before its fix.

type Row = { id: Kind; label: string; depth: number; on: boolean; heavy: boolean; hint?: string; note?: string; spaced?: boolean };
type Section = { label: string; rows: Row[] };
type Child = { type: 'heading'; id: string; label: string } | { type: 'row'; row: Row } | { type: 'note' } | { type: 'complex'; kind: ComplexKind };
type Pin = { at: number; push: number; stuck: boolean; kind: string | null };
type Header = { headerBackTitle?: string; headerBackButtonDisplayMode?: string; backSpoken?: string };
type IntoPage = {
  intoSections: (kinds: readonly KindInfo[], hidden: ReadonlySet<Kind>) => Section[];
  intoChildren: (sections: Section[], complexes: readonly ComplexKind[]) => { children: Child[]; sticky: number[] };
  intoPin: (children: readonly Child[], heights: readonly number[], scrollY: number, headingH: number) => Pin;
  offLine: (kind: Kind, hidden: ReadonlySet<Kind>) => string | null;
  CHANGED_LINE: string;
  OFF_LINE_MAX: number;
  intoBack: (from: string | undefined, walkOpen: boolean) => { title: string; spoken: string } | null;
  intoHeader: (back: { title: string; spoken: string } | null, roomy: boolean, os: string) => Header;
  intoHeadingH: (label: string, width: number, fontScale: number) => number;
  intoBody: (settings: object | null, failed: boolean) => 'wait' | 'failed' | 'page';
  INTO_UNREAD: string;
  INTO_KIND_GAP: number;
};
const page = async () => (await import('../../explore/intoPage')) as unknown as IntoPage;

const SRC = join(__dirname, '../../..');
const source = (file: string) => readFileSync(join(SRC, file), 'utf8');
const kidsOf = (id: Kind) => KINDS.filter((k) => kindParent(k.id) === id);
const PARENTS = KINDS.filter((k) => kidsOf(k.id).length);

test('what-im-into-page audit 1: the Back and Escape handlers of what stays mounted under the page are gated on focus', () => {
  // A screen pushed over another keeps it mounted (react-navigation): its keys are the page's. Each handler here is
  // added only while its screen is in front, as ReadyBar's is. (The web's build unmounts Chronicle's sheet under the walk
  // route, so the journey checks the walk's drawer; Android's Back over Chronicle's sheet is a native item.)
  const gated = (file: string, marker: RegExp) => {
    const text = source(file);
    const at = text.search(marker);
    assert.ok(at > 0, `${file}: ${marker}`);
    const head = text.slice(Math.max(0, at - 600), at);
    assert.match(head, /if \(.*!(screenFocused|focused)\b.*\) return;/, `${file}: the handler before ${marker} waits for focus`);
  };
  gated('components/HomeSheet.tsx', /addEventListener\('hardwareBackPress', \(\) => \{\n\s+onSizeRef/);
  gated('components/walk/ReadyBar.tsx', /addEventListener\('hardwareBackPress', \(\) => \{\n\s+onUpRef/);
  gated('components/GapCard.tsx', /addEventListener\('hardwareBackPress', \(\) => \{\n\s+close\.current/);
  gated('app/walk.tsx', /addEventListener\('hardwareBackPress', \(\) => \{\n\s+close\(\);\n\s+return true;\n\s+\}\);\n\s+const onKey = \(e: KeyboardEvent\) => e\.key === 'Escape' && close\(\);/);
  gated('app/walk.tsx', /addEventListener\('hardwareBackPress', \(\) => \{\n\s+dismissPreview/);
});

test('what-im-into-page audit 2: Complexes\' switches wait for the setting, and two quick taps both stay', async () => {
  const { createKindSwitches } = (await import('../../complexes/kindSwitches')) as unknown as {
    createKindSwitches: (save: (h: ComplexKind[]) => void) => { loaded: (h: ComplexKind[]) => void; heard: (h: ComplexKind[]) => void; toggle: (k: ComplexKind, on: boolean) => ComplexKind[] | null; get: () => ComplexKind[] | null };
  };
  // A fake meta: what was saved, in order.
  const saved: ComplexKind[][] = [];
  const sw = createKindSwitches((h) => saved.push(h));
  assert.equal(sw.get(), null, 'nothing is known before the setting is read: no switch is drawn');
  assert.equal(sw.toggle('markets', false), null, 'a tap before the read saves nothing');
  assert.equal(saved.length, 0);
  sw.loaded(['civic']);
  // Two taps before any render: the second builds on the first, not on the list the view last drew.
  sw.toggle('shopping', false);
  sw.toggle('markets', false);
  assert.deepEqual([...sw.get()!].sort(), ['civic', 'markets', 'shopping']);
  assert.deepEqual([...saved[saved.length - 1]].sort(), ['civic', 'markets', 'shopping'], 'the last save keeps both taps');
  sw.toggle('civic', true);
  assert.deepEqual([...sw.get()!].sort(), ['markets', 'shopping']);
  // A change heard from elsewhere is the latest too.
  sw.heard(['stations']);
  sw.toggle('campuses', false);
  assert.deepEqual([...sw.get()!].sort(), ['campuses', 'stations']);
  // A read that lands after a tap never undoes it.
  const late = createKindSwitches(() => {});
  late.heard(['civic']);
  late.toggle('markets', false);
  late.loaded([]);
  assert.deepEqual([...late.get()!].sort(), ['civic', 'markets']);
});

test('what-im-into-page audit 3: a double tap on the row pushes the page once, and an untaken detour does not linger', async () => {
  const { createIntoNav } = (await import('../../intoGate')) as unknown as {
    createIntoNav: (p: { push: (href: unknown) => void; now: () => number; pendingMs?: number }) => { open: (from?: 'walk' | 'ready') => boolean; tookDetour: () => boolean; shown: () => () => void };
  };
  let t = 1000;
  const pushed: unknown[] = [];
  const nav = createIntoNav({ push: (h) => pushed.push(h), now: () => t });
  assert.equal(nav.open('walk'), true);
  t += 40;
  assert.equal(nav.open('walk'), false, 'the second tap of a double tap pushes nothing');
  assert.equal(pushed.length, 1);
  assert.equal(nav.tookDetour(), true, 'the walk\'s blur is the detour');
  assert.equal(nav.tookDetour(), false, 'asked once');
  const gone = nav.shown();
  t += 5000;
  assert.equal(nav.open('ready'), false, 'not while the page is up');
  gone();
  assert.equal(nav.open('ready'), true);
  // A push that never blurred the walk (the page never came): the flag goes, so a later blur to the tabs closes the pill.
  t += 10000;
  assert.equal(nav.tookDetour(), false, 'a detour not taken in time is not a detour');
  t += 10000;
  assert.equal(nav.open('ready'), true, 'a push whose page never showed holds the gate only for a moment');
  // The app's instance is the one way in.
  assert.match(source('lib/intoNav.ts'), /createIntoNav\(/);
  assert.match(source('app/into.tsx'), /intoShown\(\)/);
});

test('what-im-into-page audit 7: the line under a kind names only the subtypes changed from their default, either way', async () => {
  const { offLine, CHANGED_LINE, OFF_LINE_MAX, intoSections } = await page();
  const defaults = new Set<Kind>(DEFAULT_OFF);
  const with_ = (...k: Kind[]) => new Set<Kind>([...defaults, ...k]);
  const without = (...k: Kind[]) => new Set<Kind>([...defaults].filter((x) => !k.includes(x)));
  // A fresh install shows no line anywhere.
  for (const p of PARENTS) assert.equal(offLine(p.id, defaults), null, `${p.id}: no line as installed`);
  assert.ok(intoSections(KINDS, defaults).flatMap((s) => s.rows).every((r) => !r.note), 'no row carries a line as installed');
  assert.equal(offLine('curiosities', without('ghost_towns')), 'Ghost towns on');
  assert.equal(offLine('nature', with_('waterfalls')), 'Waterfalls off');
  assert.equal(offLine('nature', new Set<Kind>([...without('old_trees'), 'waterfalls'])), 'Old trees on, waterfalls off');
  // Past one line at 320 px: the fallback.
  assert.equal(offLine('curiosities', new Set<Kind>([...without('ghost_towns'), 'time_capsules'])), CHANGED_LINE);
  // No capital mid-sentence.
  assert.equal(offLine('monuments', without('plaques', 'small_memorials')), 'Plaques and small memorials on');
  // The fallback carries no count, and stays true whichever way the switches went.
  assert.ok(!/\d/.test(CHANGED_LINE) && !/\bsome\b/i.test(CHANGED_LINE) && !/\bon\b|\boff\b/i.test(CHANGED_LINE), CHANGED_LINE);
  for (const p of PARENTS) {
    const kids = kidsOf(p.id).map((k) => k.id);
    // Every subtype switched against its default alone is named: the fallback is never needed for one change.
    for (const k of kids) {
      const flipped = defaults.has(k) ? without(k) : with_(k);
      const line = offLine(p.id, flipped);
      assert.ok(line && line.includes(kindOf(k).label) && line.length <= OFF_LINE_MAX, `${p.id}, ${k} alone: "${line}"`);
    }
    // Everything switched: still no count.
    const all = new Set<Kind>(kids.filter((k) => !defaults.has(k)));
    const line = offLine(p.id, all);
    assert.ok(line && !/\d/.test(line), `${p.id}, all flipped: "${line}"`);
    assert.equal(offLine(p.id, new Set<Kind>([p.id, ...all])), null, `${p.id} off: no line`);
  }
});

test('what-im-into-page audit 8: the route passes the spoken Back it computes, where the platform can carry it', async () => {
  const { intoBack, intoHeader } = await page();
  const back = intoBack('walk', true)!;
  for (const os of ['ios', 'web']) {
    const h = intoHeader(back, true, os);
    // iOS and the web's header speak the back title as "<title>, back" themselves.
    assert.equal(h.headerBackTitle, back.title);
    assert.equal(`${h.headerBackTitle}, back`, back.spoken);
    assert.equal(h.headerBackButtonDisplayMode, 'default');
    assert.equal(intoHeader(back, false, os).headerBackButtonDisplayMode, 'minimal');
  }
  // Android's native back is an arrow named by the system: the route draws its own, named with the spoken words.
  assert.equal(intoHeader(back, true, 'android').backSpoken, back.spoken);
  assert.deepEqual(intoHeader(null, true, 'android'), {});
  const route = source('app/into.tsx');
  assert.match(route, /intoHeader\(/);
  assert.match(route, /accessibilityLabel=\{[^}]*backSpoken/);
});

test('what-im-into-page audit 9: a reminder tapped under the page waits until the walk is in front', async () => {
  const { createOpeners, whileFocused } = (await import('../../openers')) as unknown as {
    createOpeners: <T>() => { add: (fn: (x: T) => boolean) => () => void; offer: (x: T) => boolean };
    whileFocused: <T>(focused: () => boolean, open: (x: T) => void) => (x: T) => boolean;
  };
  const openers = createOpeners<string>();
  let focused = false;
  const opened: string[] = [];
  openers.add(whileFocused(() => focused, (x: string) => opened.push(x)));
  assert.equal(openers.offer('r1'), false, 'under the page: declined, so it is kept for later');
  assert.deepEqual(opened, []);
  focused = true;
  assert.equal(openers.offer('r2'), true);
  assert.deepEqual(opened, ['r2']);
  const walk = source('app/walk.tsx');
  assert.match(walk, /onRecallOpen\(\s*whileFocused\(/);
});

test('what-im-into-page audit 10: a link to /into?from=walk with no walk open reads "Go back"', async () => {
  const { intoBack } = await page();
  assert.equal(intoBack('walk', false), null);
  assert.ok(intoBack('walk', true));
  assert.equal(intoBack(undefined, true), null);
});

test('what-im-into-page audit 11: a failed read of the settings shows a line in words, never a blank page', async () => {
  const { intoBody, INTO_UNREAD } = await page();
  assert.equal(intoBody(null, false), 'wait');
  assert.equal(intoBody(null, true), 'failed');
  assert.equal(intoBody({}, false), 'page');
  assert.ok(INTO_UNREAD.length > 10 && !/\d/.test(INTO_UNREAD));
  assert.match(source('components/IntoPage.tsx'), /INTO_UNREAD/);
});

test('what-im-into-page audit 12: a heading reserves only its own lines, and a pushed-out heading draws no hairline', async () => {
  const { intoHeadingH, intoSections, intoChildren, intoPin } = await page();
  // At 200% (195 px wide), "Art" takes one line: its heading is no taller than at the default size.
  assert.equal(intoHeadingH('Art', 195, 1), intoHeadingH('Art', 390, 1));
  assert.ok(intoHeadingH('Viewpoints & oddities', 195, 1) > intoHeadingH('Art', 195, 1), 'a long category keeps its second line');
  assert.ok(intoHeadingH('Art', 390, 2) > intoHeadingH('Art', 390, 1), 'the heading grows with the text');
  // While the incoming heading pushes the pinned one out, the pinned one has no hairline (it would sit on the incoming one).
  const { children, sticky } = intoChildren(intoSections(KINDS, new Set()), COMPLEX_KINDS);
  const H = 52;
  const heights = children.map((c) => (c.type === 'heading' ? H : 48));
  const tops = heights.map((_, i) => heights.slice(0, i).reduce((a, b) => a + b, 0));
  const next = tops[sticky[1]];
  const pushed = intoPin(children, heights, next - H / 2, H);
  assert.ok(pushed.push < 0);
  assert.equal(pushed.stuck, false);
  assert.equal(intoPin(children, heights, next - H - 20, H).stuck, true, 'pinned, unpushed: the hairline shows');
});

test('what-im-into-page audit 14: Back\'s word is the walk screen\'s own name, from one source', async () => {
  const { intoBack } = await page();
  const { WALK_NAME } = (await import('../../walkName')) as unknown as { WALK_NAME: string };
  assert.equal(intoBack('walk', true)!.title, WALK_NAME);
  assert.equal(intoBack('walk', true)!.spoken, `${WALK_NAME}, back`);
  assert.ok(!/'Walk'/.test(source('lib/explore/intoPage.ts')), 'no literal in intoPage.ts');
  assert.match(source('app/_layout.tsx'), /name="walk"[^>]*title: WALK_NAME/);
});

test('what-im-into-page audit 16: a kind row that follows a subtype has a little space above it', async () => {
  const { intoSections, INTO_KIND_GAP } = await page();
  const rows = intoSections(KINDS, new Set()).flatMap((s) => s.rows);
  let spaced = 0;
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    const want = r.depth === 0 && !!prev && prev.depth > 0 && kindOf(prev.id).category === kindOf(r.id).category;
    assert.equal(!!r.spaced, want, `${r.id}`);
    if (want) spaced++;
  });
  assert.ok(spaced > 3 && INTO_KIND_GAP > 0 && INTO_KIND_GAP <= 12, 'restrained');
});
