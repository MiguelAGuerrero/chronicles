/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as MAP from '../../../components/map/types';
import { BORDER, COLORS, ENDS_PAINT, ENDS_RING_PAINT, FOG_STYLE, HOTSPOT, HOTSPOT_INK } from '../../../components/map/types';
import { KIND_COLOR } from '../../../components/atlas/kinds';
import { contrast, deltaE, hueGap, lch, over, seen, type Sight } from './colourSight';

// The map's palette, "Earth and ink" (the owner's answers to T22, Nov 17; decision 0188; specs/map-palette): the
// walked streets and the end in a blue-violet ink, the trace green as before, the kinds in earth pigments, a pin of
// several on charcoal. The accent, ink and muted of the screens stay. VISION.md Never, "accent-coloured wins";
// decision 0153, "The replay never lights anything in the accent".

const SRC = join(__dirname, '..', '..', '..');
const ROOT = join(SRC, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
/** A colour of the screens' theme, read from its source (`ui.tsx` imports React Native). */
const themeOf = (key: string) => {
  const m = new RegExp(`\\n  ${key}: '(#[0-9a-f]{6})'`).exec(read('components/ui.tsx'));
  assert.ok(m, `theme.${key}`);
  return m[1];
};
const ACCENT = themeOf('accent');
/** Positron's land, the live map's ground. */
const LAND = '#f2f3f0';
/** The e2e's fake map's ground, darker than Positron's. */
const E2E_LAND = '#e4e3e2';
const WHITE = '#ffffff';
const palette = COLORS as unknown as Record<string, string>;
const named = MAP as unknown as Record<string, unknown>;

/** The seven map roles of MP2. */
const ROLES = () => ({
  walked: palette.walked, trace: palette.trace, photo: palette.photo, video: palette.video,
  voice: palette.voice, text: palette.text, several: palette.several,
});
const PINS = ['photo', 'video', 'voice', 'text', 'several'] as const;
/** Beat one's lit street: the walked colour under the trace's white edge and the trace, as the replay draws them (MP4). */
const beatOne = (ground: string) => {
  const quiet = named.QUIET_TRACE_OPACITY as number;
  const edge = named.TRACE_EDGE_OPACITY as number;
  assert.equal(typeof quiet, 'number', 'QUIET_TRACE_OPACITY is the replay\'s faint trace');
  assert.equal(typeof edge, 'number', 'TRACE_EDGE_OPACITY is the trace\'s white edge');
  return over(palette.trace, over(WHITE, over(palette.walked, ground, 1), edge * quiet), quiet);
};

test('MP1: only colours change: the end markers\' sizes and the fog and trace widths are as they were', () => {
  assert.deepEqual(
    [ENDS_RING_PAINT['circle-radius'], ENDS_RING_PAINT['circle-stroke-width'], ENDS_PAINT['circle-radius'], ENDS_PAINT['circle-stroke-width']],
    [['match', ['get', 'kind'], 'start', 7, 9.5], ['match', ['get', 'kind'], 'start', 4, 1.5], 3.5, 2.5],
  );
  assert.deepEqual(FOG_STYLE, { opacity: 0.5, widthMin: 1, widthMax: 2.5, traceWidth: 4.5, edgeWidth: 7.5 });
  // The pin keeps its size and shape; only its colours come from the palette.
  const pin = read('components/CapturePinView.tsx');
  assert.match(pin, /export const PIN_HEIGHT = 44;/);
  assert.equal(palette.several, '#31352f');
});

test('MP2: each map colour by its role', () => {
  assert.deepEqual(ROLES(), {
    walked: '#5b5d9f', trace: '#15803d', photo: '#286766', video: '#87244e', voice: '#544516', text: '#7b7469', several: '#31352f',
  });
  // The end takes the walked colour; the start's ring the trace's.
  assert.equal(ENDS_PAINT['circle-color'], palette.walked);
  // The pin of several's head is the named colour beside the kinds, not a hex of the pin's own.
  const pin = read('components/CapturePinView.tsx');
  assert.match(pin, /COLORS\.several/);
  // Its white glyphs and edges and the clock's ink are not the palette's.
  assert.doesNotMatch(pin.replace(/['"]#(ffffff|1d2430)['"]/gi, ''), /['"]#[0-9a-fA-F]{6}['"]/, 'no hex in the pin\'s view but white and ink');
});

test('MP3: the accent, ink, muted, route, walker, fog, hotspot, its ink, the borders, the place kinds and the danger red are unchanged', () => {
  assert.deepEqual([themeOf('accent'), themeOf('ink'), themeOf('muted'), themeOf('danger')], ['#c2410c', '#1d2430', '#596273', '#b42318']);
  assert.deepEqual([palette.route, palette.walker, palette.fog, palette.veil], ['#2563eb', '#1d3557', '#8b939e', '#d7dbe0']);
  assert.deepEqual([HOTSPOT, HOTSPOT_INK, BORDER.color, BORDER.lined], ['#d6268c', '#86145a', '#c2410c', '#6b7280']);
  assert.deepEqual(KIND_COLOR, {
    history: '#8b5e34', art: '#6d4bc4', culture: '#2f6f8f', parks: '#3f7d3a', viewpoints: '#946405', food: '#c4501f', shops: '#a33d5c', nightlife: '#3b3f8f',
  });
  // Explore's "Walked once", its footsteps and the mini-map's walked path are the trace's green.
  for (const f of ['components/atlas/AtlasCard.tsx', 'components/atlas/AtlasTile.tsx', 'components/atlas/MiniMap.tsx']) {
    assert.doesNotMatch(read(f), /COLORS\.walked/, `${f} draws no walked colour`);
  }
});

test('MP4: lines and markers are 3:1 on the land; beat one\'s lit street, blended with the drawn opacities, 3:1', () => {
  for (const c of [palette.walked, palette.trace]) assert.ok(contrast(c, LAND) >= 3, `${c} ${contrast(c, LAND).toFixed(2)}`);
  const lit = beatOne(LAND);
  assert.equal(lit, '#658694');
  assert.ok(contrast(lit, LAND) >= 3, `beat one ${contrast(lit, LAND).toFixed(2)}`);
  assert.ok(contrast(beatOne(E2E_LAND), E2E_LAND) >= 3, 'and on the e2e\'s darker ground');
  // The maps and the replay draw with the named opacities, not copies of them.
  assert.match(read('app/replay/[id].tsx'), /QUIET_TRACE_OPACITY/);
  for (const f of ['components/map/WalkMap.web.tsx', 'components/map/WalkMap.native.tsx']) {
    assert.match(read(f), /TRACE_EDGE_OPACITY/, `${f} draws the trace's edge at the named opacity`);
    assert.doesNotMatch(read(f), /'line-opacity': 0\.9\b/, `${f} keeps no copy of the edge's opacity`);
  }
});

test('MP5: every pin\'s disc is 3:1 on the land and its white glyph 4.5:1 on the disc', () => {
  for (const k of PINS) {
    const c = palette[k];
    assert.ok(contrast(c, LAND) >= 3, `${k} disc ${contrast(c, LAND).toFixed(2)}`);
    assert.ok(contrast(WHITE, c) >= 4.5, `${k} glyph ${contrast(WHITE, c).toFixed(2)}`);
  }
});

test('MP6: the map\'s colours, beat one\'s lit street and the accent are 9.5 apart with deuteranopia and protanopia, 15 in normal vision', () => {
  const set: Record<string, string> = { ...ROLES(), beatOne: beatOne(LAND), accent: ACCENT };
  const names = Object.keys(set);
  const floor: Record<Sight, number> = { normal: 15, deutan: 9.5, protan: 9.5 };
  for (const sight of ['normal', 'deutan', 'protan'] as const) {
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const d = deltaE(seen(set[names[i]], sight), seen(set[names[j]], sight));
        assert.ok(d >= floor[sight], `${names[i]} and ${names[j]} are ${d.toFixed(1)} apart (${sight})`);
      }
    }
  }
});

test('MP7: every map colour is 20 from the accent and outside its family', () => {
  for (const [role, c] of Object.entries(ROLES())) {
    assert.notEqual(c.toLowerCase(), ACCENT, `${role} is not the accent`);
    assert.ok(deltaE(c, ACCENT) >= 20, `${role} is ${deltaE(c, ACCENT).toFixed(1)} from the accent`);
    const { c: chroma, h } = lch(c);
    assert.ok(!(chroma > 15 && h >= 5 && h <= 80), `${role} (hue ${h.toFixed(0)}, chroma ${chroma.toFixed(0)}) is in the accent's family`);
  }
  assert.ok(hueGap(lch(palette.walked).h, lch(ACCENT).h) > 90, 'the walked ink is far round the circle from the accent');
});

/** Every source file under a folder. */
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? (f === '__tests__' ? [] : files(p)) : /\.(ts|tsx)$/.test(f) ? [p] : [];
});

test('MP9: no file keeps a kind\'s old map hex; the pins and the replay\'s stage read the kinds from COLORS', () => {
  const old = /#(0f766e|7b2cbf|a16207|3f3f46|c2410c|b42318)\b/i;
  const allowed: Record<string, RegExp> = {
    // The screens' accent and danger red, and the town borders' (the accent's hex, out of scope; decision 0188).
    'components/ui.tsx': /^\s*(accent|danger): '#(c2410c|b42318)',$/,
    'components/map/types.ts': /^\s*color: '#c2410c',$/,
  };
  for (const p of files(SRC)) {
    const rel = p.slice(SRC.length + 1);
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!old.test(line)) continue;
      assert.ok(allowed[rel]?.test(line), `${rel} keeps an old map hex: ${line.trim()}`);
    }
  }
  const pin = read('components/CapturePinView.tsx');
  for (const k of ['photo', 'video', 'voice', 'text', 'several']) assert.match(pin, new RegExp(`COLORS\\.${k}\\b`), `the pin reads COLORS.${k}`);
  const bubbles = read('components/ceremony/Bubbles.tsx');
  assert.match(bubbles, /backgroundColor: COLORS\.voice/, 'a memo\'s play disc and waveform');
  assert.match(bubbles, /borderLeftColor: memo \? COLORS\.voice : COLORS\.text/, 'a bubble\'s edge');
  assert.match(read('components/ceremony/Pile.tsx'), /backgroundColor: COLORS\.video/, 'the pile\'s video tile');
});

test('MP10: only the replay and a day draw walked streets or an end; every other map passes none', () => {
  const hosts = files(join(SRC, 'app')).concat(files(join(SRC, 'components'))).filter((p) => /<WalkMap\b/.test(readFileSync(p, 'utf8')));
  const rel = hosts.map((p) => p.slice(SRC.length + 1)).sort();
  assert.ok(rel.includes('app/replay/[id].tsx') && rel.includes('app/day/[key].tsx') && rel.includes('app/walk.tsx'), rel.join(', '));
  for (const r of rel) {
    // The props of each <WalkMap ... />, up to its closing line.
    const maps = read(r).split(/<WalkMap\b/).slice(1).map((s) => s.slice(0, s.search(/\n\s*\/>/)));
    const walked = maps.flatMap((m) => [...m.matchAll(/\bwalked=\{([^}]*)\}/g)].map((x) => x[1]));
    const ended = maps.some((m) => /\bended=\{/.test(m));
    if (r === 'app/replay/[id].tsx') {
      assert.ok(walked.some((w) => w === 'shownWalked') && ended, 'the replay draws the walked streets and the end');
    } else if (r === 'app/day/[key].tsx') {
      assert.deepEqual(walked, ['NO_STREETS'], 'a day draws no walked streets');
      assert.ok(ended, 'a day draws the end');
    } else {
      assert.ok(walked.every((w) => /^(NONE|NO_STREETS)$/.test(w)), `${r} draws no walked streets (${walked.join(', ')})`);
      assert.equal(ended, false, `${r} draws no end`);
    }
  }
});

test('MP12: T22 is answered: out of the inbox, and decision 0188 records Earth and ink', { todo: 'test first' }, () => {
  const status = readFileSync(join(ROOT, 'docs', 'STATUS.md'), 'utf8');
  assert.doesNotMatch(status, /^- \*\*T22 /m, 'T22 has left the inbox');
  const record = readdirSync(join(ROOT, 'docs', 'decisions')).find((f) => /^0188-/.test(f));
  assert.ok(record, 'decision 0188');
  const text = readFileSync(join(ROOT, 'docs', 'decisions', record), 'utf8');
  assert.match(text, /Earth and ink/);
  assert.match(text, /Keep it, narrow the rule/);
});
