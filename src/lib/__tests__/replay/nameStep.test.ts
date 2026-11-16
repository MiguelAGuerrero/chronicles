/// <reference types="node" />
// The first replay's name step and its ways out: a quiet Back to the card with the words kept (tend replay T21,
// decision 0165), read through the same decision as Android's Back and the web's Escape (tend replay 4, 5).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { backFrom } from '../../replay';

const SCREEN = readFileSync(join(__dirname, '../../../app/replay/[id].tsx'), 'utf8');
/** The JSX of the control with this testID, from its opening tag to its closing one. */
const control = (id: string, tag = 'Pressable') => new RegExp(`<${tag}\\s+testID="${id}"[\\s\\S]*?</${tag}>`).exec(SCREEN)?.[0] ?? '';

test('tend replay T21: the name sheet has a quiet Back that returns to the card with the words kept, as Back and Escape do', () => {
  assert.equal(backFrom('name'), 'card');
  const back = control('name-back');
  // One quiet text control in the card's "Not now" style, no new colour or words (decision 0165).
  assert.match(back, /accessibilityRole="button"/);
  assert.match(back, /onPress=\{stepBack\}/, "the Back control goes where Android's Back and Escape go");
  assert.match(back, /styles\.notNow\b|styles\.nameBack\b/);
  assert.match(back, /<Text style=\{styles\.notNowText\}>Back<\/Text>/);
  // It stands in the name sheet's top row, above its first field.
  const sheet = SCREEN.slice(SCREEN.indexOf('testID="name-back"') - 400, SCREEN.indexOf('testID="title-input"'));
  assert.ok(sheet.includes(') : (') && SCREEN.indexOf('testID="name-back"') < SCREEN.indexOf('nativeID="title-label"'), 'Back is the name sheet\'s top row');
  // One way back, read once: the control, Android's Back and Escape all go through stepBack, and it asks backFrom.
  assert.match(SCREEN, /const stepBack = useCallback\([\s\S]{0,200}?backFrom\(beatNow\.current/);
  assert.equal((SCREEN.match(/\bstepBack\(\)/g) ?? []).length, 2, "Android's Back and Escape call stepBack");
  // The words live in the screen, not in the sheet, so going back to the card keeps them.
  assert.match(SCREEN, /const \[title, setTitle\] = useState/);
});
