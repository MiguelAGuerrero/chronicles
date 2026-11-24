/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { momentOf, facedOf } from '../../moment';
import { createResurface } from '../../resurface/shell';
import { fakePorts } from '../fakes';
import { at, NOW } from './fixtures';

// tend memories T54 (the owner's yes, Nov 21; mock-up approved as drawn, decision 0252): Contents' switch flips in place.
// A tap on Bring moments back leaves the sheet up, the switch moving and its note reading Off, as in Layers and What I'm
// into; Close, the scrim and Escape leave as before (ui-patterns F4, "a status that needs no action sits inline"; NN/g H1).

const SCREEN = join(__dirname, '../../../components/chronicle/MemoriesScreen.tsx');
const MENU = join(__dirname, '../../../components/chronicle/MemoriesMenu.tsx');

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

/** The text of each handler given to `<tag attr={...}>`, in the order they are written. */
export function handlersOf(src: string, tag: string, attr: string): string[] {
  const sf = ts.createSourceFile('x.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  walk(sf, (n) => {
    if (!(ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) || n.tagName.getText() !== tag) return;
    for (const a of n.attributes.properties) {
      if (ts.isJsxAttribute(a) && a.name.getText() === attr && a.initializer && ts.isJsxExpression(a.initializer) && a.initializer.expression) out.push(a.initializer.expression.getText());
    }
  });
  return out;
}

/** Whether a handler closes the contents: it sets `menuOpen` false. */
const closesSheet = (handler: string) => /\bsetMenuOpen\(\s*false\s*\)/.test(handler);

test('tend memories T54: a tap on Bring moments back flips the setting and leaves the contents sheet up', () => {
  const toggles = handlersOf(readFileSync(SCREEN, 'utf8'), 'MemoriesMenu', 'onToggle');
  assert.equal(toggles.length, 1, 'the screen gives the contents one switch handler');
  assert.match(toggles[0], /resurface\.setOff\(\s*!state\.prefs\.off\s*\)/, 'the switch flips the kept setting');
  assert.equal(closesSheet(toggles[0]), false, `the switch leaves the sheet up (${toggles[0]})`);
});

test('tend memories T54: the switch adds no word of its own: no toast, no other screen, its note alone says Off', () => {
  const [toggle] = handlersOf(readFileSync(SCREEN, 'utf8'), 'MemoriesMenu', 'onToggle');
  assert.doesNotMatch(toggle, /\bsay\(|Toast|set(Threads|Hidden|Reactions)Open/, `the switch only flips the setting (${toggle})`);
});

test('tend memories T54: Close, the scrim and Escape still leave the contents sheet', () => {
  const screen = readFileSync(SCREEN, 'utf8');
  const closes = handlersOf(screen, 'MemoriesMenu', 'onClose');
  assert.equal(closes.length, 1);
  assert.ok(closesSheet(closes[0]), `onClose closes the sheet (${closes[0]})`);
  const menu = readFileSync(MENU, 'utf8');
  assert.deepEqual(handlersOf(menu, 'Modal', 'onRequestClose'), ['close'], 'Escape and Back go through close');
  assert.ok(/<Pressable style=\{StyleSheet\.absoluteFill\} onPress=\{close\}/.test(menu), 'a tap on the scrim goes through close');
  assert.ok(/testID="menu-close"[^>]*onPress=\{close\}/.test(menu), 'Close goes through close');
  assert.ok(/const close = \(\) => \{[^}]*props\.onClose\(\);/.test(menu), 'close calls the screen\'s onClose');
});

test('tend memories T54: the switch in the sheet is drawn from the setting and flips through onToggle alone', () => {
  const menu = readFileSync(MENU, 'utf8');
  assert.deepEqual(handlersOf(menu, 'SwitchRow', 'onChange'), ['props.onToggle'], 'the row does not close the sheet itself');
  assert.deepEqual(handlersOf(menu, 'SwitchRow', 'value'), ['!props.off'], 'the thumb follows the setting');
  assert.deepEqual(handlersOf(menu, 'SwitchRow', 'note'), ['props.off ? HINT_OFF : HINT_ON'], 'its note follows the setting');
});

test('tend memories T54: the setting is in the store the moment the switch is tapped, before it is kept', async () => {
  const p = fakePorts({ now: NOW });
  await p.db.addMoment(momentOf(facedOf({ id: 'n0', walk_id: null, t: at(2026, 3, 1), lat: null, lon: null, kind: 'text', file_path: null, body: 'harbor', segment_id: null })));
  const r = createResurface(p);
  await r.load();
  assert.equal(r.store.get().prefs.off, false);
  const kept = r.setOff(true);
  assert.equal(r.store.get().prefs.off, true, 'the open sheet redraws its switch at once, with no wait on the write');
  assert.equal((await kept).saved, true);
});

test('tend memories T54: the handler scan is shown to tell a switch that closes the sheet from one that stays', () => {
  const closing = '<MemoriesMenu onToggle={() => { setMenuOpen(false); void resurface.setOff(!state.prefs.off); }} />';
  const staying = '<MemoriesMenu onToggle={() => { void resurface.setOff(!state.prefs.off); }} />';
  assert.equal(closesSheet(handlersOf(closing, 'MemoriesMenu', 'onToggle')[0]), true);
  assert.equal(closesSheet(handlersOf(staying, 'MemoriesMenu', 'onToggle')[0]), false);
});
