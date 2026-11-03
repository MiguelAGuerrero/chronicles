import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import ts from 'typescript';
import type { Db } from '../db/types';
import { dbContract } from './dbContract';
import { memoryDb } from './fakes';

// The fake shells are tested against...
dbContract('memoryDb (fake)', async () => memoryDb());

// ...and the real web store, so the two can't drift apart. Each case gets a
// fresh IndexedDB and a fresh module instance (the store caches its
// connection at module level); cases in a file run one after another.
let n = 0;
dbContract('IndexedDB (db/index.web.ts)', async () => {
  (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  const mod = (await import(`../db/index.web.ts?case=${++n}` as string)) as { db: Db };
  return mod.db;
});

const parse = (rel: string) => {
  const file = join(__dirname, rel);
  return ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
};

/** The method (and property) names of `interface Db`, read by the TypeScript parser. */
function dbMethods(): string[] {
  const names: string[] = [];
  const src = parse('../db/types.ts');
  src.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node) || node.name.text !== 'Db') return;
    for (const m of node.members) {
      if ((ts.isMethodSignature(m) || ts.isPropertySignature(m)) && m.name && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name))) {
        names.push(m.name.text);
      }
    }
  });
  return names;
}

/** The titles of every `test('...')` in the contract suite. */
function contractTitles(): string[] {
  const titles: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'test') {
      const first = node.arguments[0];
      if (first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) titles.push(first.text);
    }
    node.forEachChild(visit);
  };
  visit(parse('dbContract.ts'));
  return titles;
}

test('FC7 every Db method has a contract case', () => {
  const methods = dbMethods();
  assert.ok(methods.length > 0, 'no methods read from interface Db in src/lib/db/types.ts');
  const titles = contractTitles();
  const missing = methods.filter((m) => !titles.some((t) => new RegExp(`\\b${m}\\b`).test(t)));
  assert.deepEqual(missing, [], `add a contract case for these Db methods in src/lib/__tests__/dbContract.ts: ${missing.join(', ')}`);
});
