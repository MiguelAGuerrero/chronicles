import ts from 'typescript';

/**
 * The meta keys a set of sources uses, read from the syntax tree (FC8,
 * functional-core audit 6): every first argument of a `getMeta` / `setMeta`
 * call, resolved through string constants (any name, either quote) and key
 * builders (`` (id) => `family:${id}` ``, as an arrow or a function). A key
 * builder or a template gives a family: its fixed head, without a trailing
 * colon. An argument that can't be read back to a string is listed in
 * `unreadable`, so the caller has to account for it.
 */
export function metaKeysIn(files: { file: string; source: string }[]): { keys: Set<string>; families: Set<string>; unreadable: string[] } {
  const parsed = files.map(({ file, source }) => ({ file, sf: ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS) }));
  // Names bound to an expression, per file, plus every top-level one across files (an imported constant).
  const local = new Map<string, Map<string, ts.Expression>>();
  const global = new Map<string, ts.Expression>();
  const builders = new Map<string, string>();
  for (const { file, sf } of parsed) {
    const names = new Map<string, ts.Expression>();
    local.set(file, names);
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        names.set(node.name.text, node.initializer);
        if (node.parent.parent.parent === sf) global.set(node.name.text, node.initializer);
        const head = builderHead(node.initializer);
        if (head != null) builders.set(node.name.text, head);
      }
      if (ts.isFunctionDeclaration(node) && node.name && node.body) {
        const ret = node.body.statements.find(ts.isReturnStatement);
        const head = ret?.expression ? templateHead(ret.expression) : null;
        if (head != null) builders.set(node.name.text, head);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  const keys = new Set<string>();
  const families = new Set<string>();
  const unreadable: string[] = [];
  const family = (head: string) => head.replace(/:$/, '');

  /** A key or a family for an expression, or null when it can't be read. */
  const read = (e: ts.Expression, file: string, depth = 0): { key?: string; family?: string } | null => {
    if (depth > 5) return null;
    if (ts.isStringLiteralLike(e)) return { key: e.text };
    const head = templateHead(e);
    if (head != null) return { family: family(head) };
    if (ts.isIdentifier(e)) {
      const init = local.get(file)?.get(e.text) ?? global.get(e.text);
      return init ? read(init, file, depth + 1) : null;
    }
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && builders.has(e.expression.text)) return { family: family(builders.get(e.expression.text)!) };
    return null;
  };

  for (const { file, sf } of parsed) {
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.arguments.length > 0) {
        const callee = node.expression;
        const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : null;
        if (name === 'getMeta' || name === 'setMeta') {
          const r = read(node.arguments[0], file);
          if (r?.key != null) keys.add(r.key);
          else if (r?.family != null) families.add(r.family);
          else unreadable.push(`${file}: ${name}(${node.arguments[0].getText(sf)}, …)`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { keys, families, unreadable };
}

/** The fixed head of a template with substitutions (`` `day:${d}` `` → `day:`), or null. */
function templateHead(e: ts.Expression): string | null {
  return ts.isTemplateExpression(e) && e.head.text ? e.head.text : null;
}

/** The head of a key builder, `(id) => `family:${id}``, or null. */
function builderHead(e: ts.Expression): string | null {
  if (!ts.isArrowFunction(e) && !ts.isFunctionExpression(e)) return null;
  if (ts.isBlock(e.body)) {
    const ret = e.body.statements.find(ts.isReturnStatement);
    return ret?.expression ? templateHead(ret.expression) : null;
  }
  return templateHead(e.body);
}
