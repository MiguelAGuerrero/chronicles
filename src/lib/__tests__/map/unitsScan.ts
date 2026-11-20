/// <reference types="node" />
// The units scan (tend map 23, tend map audit 48): which views format a distance with the units store's default, which
// the React Compiler cannot see, so a line it memoized keeps the old units after a switch (QL16). Read from the source:
// comments are skipped, a lib function that formats with the store is followed into the views that call it, and a
// formatter is unbound when called short of its units, with `getUnits()` for them, under another name, or passed by name.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = join(__dirname, '..', '..', '..', '..');

/** The formatters that take the units, and how many arguments make a call bound. */
const BASE: Record<string, number> = { formatDistance: 2, formatDistanceNear: 2, formatRange: 2, passNote: 2, destLine: 3 };

const filesUnder = (dir: string, out: string[] = []): string[] => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== '__tests__') filesUnder(p, out);
    } else if (/\.tsx?$/.test(f) && !/\.d\.ts$/.test(f)) out.push(p);
  }
  return out;
};

/** The source with its comments blanked (newlines kept, so lines still count), strings and templates left as they are. */
export function stripComments(src: string): string {
  let out = '';
  const stack: ('code' | 'tpl')[] = ['code'];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const top = stack[stack.length - 1];
    if (top === 'tpl') {
      if (c === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { stack.pop(); out += c; i++; continue; }
      if (c === '$' && src[i + 1] === '{') { stack.push('code'); out += '${'; i += 2; continue; }
      out += c; i++; continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end < 0 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '`') { stack.push('tpl'); out += c; i++; continue; }
    if (c === '{') stack.push('code');
    if (c === '}' && stack.length > 1) stack.pop();
    out += c;
    i++;
  }
  return out;
}

/** The top-level arguments of the call whose `(` ends at `from`, as text; a trailing comma adds none. Null if it never closes. */
export function argsOf(src: string, from: number): string[] | null {
  let depth = 0;
  let cur = '';
  const args: string[] = [];
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) {
        if (cur.trim()) args.push(cur.trim());
        return args;
      }
      depth--;
    } else if (c === ',' && depth === 0) {
      args.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  return null;
}

const lineOf = (src: string, at: number) => src.slice(0, at).split('\n').length;
const words = (names: Iterable<string>) => [...names].sort((a, b) => b.length - a.length).map((n) => n.replace(/\$/g, '\\$')).join('|');

/**
 * Each name a file uses for a formatter: the ones it imports, under their own name or another (`formatDistance as fd`),
 * and its own top-level functions found to format with the store (`local`). A name it only declares itself (a
 * destructured `fmt`) is its own, never a formatter's.
 */
function namesIn(src: string, known: Map<string, number | 'lib'>, local: Set<string>): Map<string, string> {
  const out = new Map<string, string>([...local].map((k) => [k, k]));
  for (const imp of src.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from/g)) {
    for (const part of imp[1].split(',')) {
      const m = /^\s*(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*$/.exec(part);
      if (m && known.has(m[1])) out.set(m[2] ?? m[1], m[1]);
    }
  }
  return out;
}

/** The unbound uses of the formatters in one file's source (comments stripped). */
function unboundIn(src: string, known: Map<string, number | 'lib'>, local: Set<string> = new Set()): { at: number; name: string; how: string }[] {
  const names = namesIn(src, known, local);
  if (!names.size) return [];
  const found: { at: number; name: string; how: string }[] = [];
  const body = src.replace(/import\s*(?:type\s*)?\{[^}]*\}\s*from\s*['"][^'"]*['"]/g, (m) => m.replace(/[^\n]/g, ' '));
  const re = new RegExp(String.raw`(?<![\w.$])(${words(names.keys())})(?![\w$])`, 'g');
  for (const m of body.matchAll(re)) {
    const used = m[1];
    const name = names.get(used)!;
    const at = m.index!;
    const before = body.slice(Math.max(0, at - 40), at);
    const after = body.slice(at + used.length);
    // Its own definition, an export of it, an object's key: not a use.
    if (/(function\s+|(?:const|let)\s+|export\s*\{[^}]*)$/.test(before)) continue;
    if (/^\s*\??:/.test(after) && /[{,(]\s*$/.test(before)) continue;
    const call = /^\s*\(/.exec(after);
    if (!call) {
      found.push({ at, name, how: 'passed by name' });
      continue;
    }
    const args = argsOf(body, at + used.length + call[0].length);
    if (!args) continue;
    const need = known.get(name) ?? 'lib';
    if (need === 'lib') {
      if (!args.some((x) => /\bunits\b/.test(x) && !/getUnits\(\)/.test(x))) found.push({ at, name, how: 'formats with the store inside' });
    } else if (args.length < need) found.push({ at, name, how: `called short of its units (${args.length} of ${need})` });
    else if (/getUnits\(\)/.test(args[need - 1])) found.push({ at, name, how: 'given getUnits()' });
  }
  return found;
}

/** The top-level function a position lies in: the last `function NAME` or `const NAME =` at a line's start before it. */
function enclosing(src: string, at: number): string | null {
  let name: string | null = null;
  for (const m of src.slice(0, at).matchAll(/^(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=)/gm)) name = m[1] ?? m[2];
  return name;
}

/** The lib functions that format a distance with the store, found by following the formatters through `src/lib`. */
export function storeFormatters(): Map<string, number | 'lib'> {
  const known = new Map<string, number | 'lib'>(Object.entries(BASE));
  const lib = filesUnder(join(ROOT, 'src', 'lib'))
    .filter((f) => !/\/(format|useUnits)\.ts$/.test(f))
    .map((f) => ({ f, src: stripComments(readFileSync(f, 'utf8')), local: new Set<string>() }));
  for (let grew = true; grew; ) {
    grew = false;
    for (const file of lib) {
      for (const u of unboundIn(file.src, known, file.local)) {
        const name = enclosing(file.src, u.at);
        if (!name) continue;
        if (!file.local.has(name)) {
          file.local.add(name);
          grew = true;
        }
        // Only an exported function reaches another file.
        if (!known.has(name) && new RegExp(String.raw`^export\s+(?:async\s+)?(?:function|const)\s+${name.replace(/\$/g, '\\$')}\b`, 'm').test(file.src)) {
          known.set(name, 'lib');
          grew = true;
        }
      }
    }
  }
  return known;
}

/** The views (`src/app`, `src/components`, and `src/lib` modules of `@layer view`) with an unbound use, as `file:line name (how)`. */
export function unboundViews(): string[] {
  const known = storeFormatters();
  const views = [
    ...filesUnder(join(ROOT, 'src', 'app')),
    ...filesUnder(join(ROOT, 'src', 'components')),
    ...filesUnder(join(ROOT, 'src', 'lib')).filter((f) => /^\/\/ @layer view\b/.test(readFileSync(f, 'utf8'))),
  ].filter((f) => !/\/useUnits\.ts$/.test(f));
  const out: string[] = [];
  for (const file of views) {
    const src = stripComments(readFileSync(file, 'utf8'));
    for (const u of unboundIn(src, known)) out.push(`${file.slice(ROOT.length + 1)}:${lineOf(src, u.at)} ${u.name} (${u.how})`);
  }
  return out;
}

/** Unbound uses in a source given as text (for the scan's own tests), with the formatters known in the repo. */
export function unboundInText(text: string): string[] {
  return unboundIn(stripComments(text), storeFormatters()).map((u) => `${u.name} (${u.how})`);
}
