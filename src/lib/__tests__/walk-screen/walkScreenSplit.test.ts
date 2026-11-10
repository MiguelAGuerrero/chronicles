// @tree-wide: reads the walk screen's files and every journey's covers (the walk screen in parts, WS1-WS5, WS7, WS8)
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..', '..', '..', '..');
const WALK = 'src/app/walk.tsx';
const PARTS_DIR = 'src/components/walking';
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
const parts = () => (existsSync(join(ROOT, PARTS_DIR)) ? readdirSync(join(ROOT, PARTS_DIR)).filter((f) => /\.tsx?$/.test(f)).sort() : []);
const scenarios = () => require(join(ROOT, 'scripts', 'e2e-scenarios.js')).SCENARIOS as { name: string; covers: string[]; file: string }[];
const e2eFor = (files: string[]) => (require(join(ROOT, 'scripts', 'affected.js')).e2eFor(files, scenarios()) as { scenarios: { name: string }[] }).scenarios.map((s) => s.name).sort();

/** The plan's table (specs/walk-screen-split/plan.md, "Parts"): each part and the journeys that check it. */
export const PARTS: Record<string, string[]> = {
  'WalkLoading.tsx': ['ready', 'reload'],
  'useShownWalk.ts': ['ready', 'reload', 'tabs'],
  'useResumed.ts': ['qol'],
  'useWalkMap.ts': ['qol', 'ready', 'walk'],
  'useWalkNotice.ts': ['drive', 'hidden', 'qol', 'ready', 'tabs'],
  'NoticeBanner.tsx': ['drive', 'hidden', 'qol', 'ready', 'tabs'],
  'useRecorderStatus.ts': ['qol'],
  'StatusChip.tsx': ['qol'],
  'WalkTop.tsx': ['edit', 'launch', 'ready', 'reload', 'tabs'],
  'useWalkNavigation.ts': ['drive', 'headsup', 'scenic', 'walk'],
  'NavBar.tsx': ['drive', 'headsup', 'launch', 'scenic', 'walk'],
  'useWalkLayers.ts': ['headsup', 'layers', 'walkability'],
  'HeadsUpLine.tsx': ['headsup'],
  'WalkLayersControl.tsx': ['layers', 'walkability'],
  'useWalkStreets.ts': ['ready', 'walk'],
  'UnwalkedButton.tsx': ['ready', 'walk'],
  'EdgeButtons.tsx': ['qol', 'ready', 'walk'],
  'useWayBack.ts': ['drive', 'ready', 'walk'],
  'WalkBackButton.tsx': ['drive', 'ready', 'walk'],
  'useWalkCaptures.ts': ['edit', 'ready', 'space', 'stacks', 'walk'],
  'CapturePills.tsx': ['edit', 'ready', 'space', 'stacks'],
  'WalkCaptureStack.tsx': ['drive', 'edit', 'gaps', 'ready', 'space', 'walk'],
  'NoteSheet.tsx': ['qol', 'ready', 'walk'],
  'useWalkLifecycle.ts': ['edit', 'gaps', 'launch', 'marks', 'ready', 'reload', 'space', 'tabs'],
  'WalkStrip.tsx': ['edit', 'gaps', 'launch', 'marks', 'memories', 'ready', 'reload', 'tabs'],
  'WalkOptions.tsx': ['launch', 'layers', 'marks', 'nudge', 'ready', 'tabs', 'walk', 'walkability'],
  'useWalkExplore.ts': ['marks', 'nudge', 'ready', 'walk'],
  'MarkCard.tsx': ['marks', 'walk'],
  'useHotspots.ts': [],
  'HotspotLines.tsx': [],
  'useWalkMemories.ts': ['memories'],
  'MemoryCard.tsx': ['memories'],
  'useRecall.ts': ['memories', 'walk'],
  'useCards.ts': ['drive', 'gaps', 'headsup', 'marks', 'memories', 'scenic', 'walk'],
  'SpotCard.tsx': ['drive', 'headsup', 'scenic', 'walk'],
  'useWalkGaps.ts': ['gaps'],
  'WalkGapCard.tsx': ['gaps'],
  'WalkingMap.tsx': ['gaps', 'layers', 'marks', 'memories', 'ready', 'scenic', 'walk', 'walkability'],
  'WalkViewers.tsx': ['edit', 'qol', 'tabs', 'walk'],
};

/** Parts no journey checks, each with its reason (WS4; docs/DEFERRED.md says the same). */
const UNCOVERED: Record<string, string> = {
  'useHotspots.ts': 'On a strip and the dead-zone nudge: no journey checks them (docs/DEFERRED.md, walk-screen-split)',
  'HotspotLines.tsx': 'On a strip and the dead-zone nudge: no journey checks them (docs/DEFERRED.md, walk-screen-split)',
};

/** Every testID walk.tsx rendered when the slice began (dd329ae). */
const IDS = [
  'dead-zone', 'explore-walk', 'go-here', 'held-captures', 'held-retry', 'here-open', 'mark-card', 'mark-close', 'mark-go',
  'mark-reach', 'motion-off', 'motion-on', 'nav-bar', 'nav-cancel', 'nav-end', 'nav-handoff', 'nav-left', 'note-input', 'note-save',
  'on-strip', 'options-card', 'pause-walk', 'pocket-alert', 'ready-close', 'recenter', 'resume-walk', 'share-gps-log', 'spot-close',
  'spot-handoff', 'spot-way-back', 'status-chip', 'stop', 'unwalked', 'voice-undo', 'walk-ahead', 'walk-back', 'walk-minimize', 'walk-stats',
  // Passed to components as ids rather than written as testID="…".
  'cap-photo', 'cap-voice', 'cap-note', 'voice-save', 'voice-discard',
];

test('WS1: walk.tsx is a composition: under 300 lines, no state or effects, routing imports only', { todo: 'test first' }, () => {
  const src = read(WALK);
  const lines = src.split('\n').length;
  assert.ok(lines <= 300, `walk.tsx is ${lines} lines, over 300`);
  for (const hook of ['useState', 'useReducer', 'useEffect', 'useLayoutEffect', 'useRef', 'useMemo']) {
    assert.ok(!new RegExp(`\\b${hook}\\s*[(<]`).test(src), `walk.tsx calls ${hook}: state and effects belong to a part`);
  }
  const lib = [...src.matchAll(/from '\.\.\/lib\/([^']+)'/g)].map((m) => m[1]).sort();
  const allowed = new Set(['walkNav', 'readyNav', 'momentPill', 'perfCount', 'useUnits']);
  assert.deepEqual(lib.filter((m) => !allowed.has(m)), [], 'walk.tsx imports from src/lib only what routes the screen');
});

test('WS2: only ready, reload and tabs cover walk.tsx; no journey covers walking/** whole', { todo: 'test first' }, () => {
  assert.deepEqual(e2eFor([WALK]), ['ready', 'reload', 'tabs']);
  for (const s of scenarios()) {
    for (const g of s.covers) assert.ok(!/^src\/components\/walking\/\*\*?$/.test(g) && g !== `${PARTS_DIR}/**`, `${s.name} covers ${g}: name the parts it checks`);
  }
});

test('WS3: each part names exactly its journeys', { todo: 'test first' }, () => {
  assert.deepEqual(parts(), Object.keys(PARTS).sort(), 'the parts on disk are the plan\'s table');
  for (const [f, journeys] of Object.entries(PARTS)) assert.deepEqual(e2eFor([`${PARTS_DIR}/${f}`]), [...journeys].sort(), f);
});

test('WS4: every part is named by a journey, or listed with its reason', { todo: 'test first' }, () => {
  const found = parts();
  assert.ok(found.length > 0, 'no parts yet');
  for (const f of found) {
    if (UNCOVERED[f]) {
      assert.deepEqual(e2eFor([`${PARTS_DIR}/${f}`]), [], `${f} is listed as covered by nothing, but a journey names it: take it off the list`);
      assert.match(read('docs/DEFERRED.md'), new RegExp(f.replace('.', '\\.')), `${f}: say why in docs/DEFERRED.md`);
    } else assert.ok(e2eFor([`${PARTS_DIR}/${f}`]).length > 0, `${f} is covered by no journey`);
  }
});

test("WS5: the walk screen's views import no db, recorder, notifier or ports; walk.tsx's suppressions are gone", { todo: 'test first' }, () => {
  const views = [WALK, ...parts().map((f) => `${PARTS_DIR}/${f}`)];
  for (const f of views) {
    const src = read(f);
    for (const m of src.matchAll(/import\s+(?!type)\{([^}]*)\}\s+from\s+'([^']+)'/g)) {
      const names = m[1].split(',').map((x) => x.trim().replace(/^type\s+/, ''));
      for (const bad of ['db', 'recorder', 'notifier', 'ports']) assert.ok(!names.includes(bad), `${f} imports ${bad} from ${m[2]}: reach it through lib/walkScreen`);
    }
  }
  const sup = JSON.parse(read('eslint-suppressions.json')) as Record<string, unknown>;
  for (const f of views) assert.ok(!(f in sup), `${f} has suppressed lint violations`);
  assert.ok(parts().length > 0, 'no parts yet');
});

test('WS7: every testID walk.tsx rendered is still rendered', { todo: 'test first' }, () => {
  assert.ok(parts().length > 0, 'no parts yet');
  const src = [WALK, ...parts().map((f) => `${PARTS_DIR}/${f}`)].map(read).join('\n');
  const missing = IDS.filter((id) => !src.includes(`'${id}'`) && !src.includes(`"${id}"`));
  assert.deepEqual(missing, [], 'ids no longer rendered by walk.tsx or a part');
  const added = [...parts().map((f) => read(`${PARTS_DIR}/${f}`)).join('\n').matchAll(/testID="([a-z0-9-]+)"/g)].map((m) => m[1]).filter((id) => !IDS.includes(id));
  assert.deepEqual([...new Set(added)], [], 'a part adds no id of its own');
});

test("WS8: the parts' views hold no state or subscriptions", { todo: 'test first' }, () => {
  const views = parts().filter((f) => f.endsWith('.tsx'));
  assert.ok(views.length > 0, 'no views yet');
  for (const f of views) {
    const src = read(`${PARTS_DIR}/${f}`);
    for (const hook of ['useState', 'useReducer', 'useEffect', 'useStore', 'useOpenWalk']) {
      assert.ok(!new RegExp(`\\b${hook}\\s*[(<]`).test(src), `${f} calls ${hook}: its state belongs in a hook WalkScreen calls, or render:walk misses its renders`);
    }
  }
});
