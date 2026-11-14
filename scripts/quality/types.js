// Checks that need the type checker, so they cost a full program (~20 s):
// run with `--types`. A floating promise is a call whose result is a promise
// that nothing awaits, returns, voids or catches: its rejection is lost, and
// on React Native an unhandled rejection is a red box in development and
// silence in production. `void p` says the drop is on purpose.

const path = require('path');
const ts = require('typescript');

function program(root) {
  const cfgPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  const cfg = ts.readConfigFile(cfgPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(cfgPath));
  return ts.createProgram({ rootNames: parsed.fileNames, options: { ...parsed.options, noEmit: true, incremental: false } });
}

function isThenable(checker, type) {
  const then = type.getProperty('then');
  if (!then) return type.isUnion() && type.types.some((t) => isThenable(checker, t));
  const decl = then.valueDeclaration || (then.declarations && then.declarations[0]);
  if (!decl) return false;
  return checker.getTypeOfSymbolAtLocation(then, decl).getCallSignatures().length > 0;
}

/** Floating promises per file (repo-relative), skipping tests. */
function floatingPromises(root, include) {
  const prog = program(root);
  const checker = prog.getTypeChecker();
  const out = {};
  for (const sf of prog.getSourceFiles()) {
    const rel = path.relative(root, sf.fileName).split(path.sep).join('/');
    if (!include(rel)) continue;
    const hits = [];
    const visit = (n) => {
      if (ts.isExpressionStatement(n)) {
        let e = n.expression;
        while (ts.isParenthesizedExpression(e)) e = e.expression;
        if (ts.isCallExpression(e) || ts.isNewExpression(e)) {
          const callee = ts.isCallExpression(e) ? e.expression : null;
          const handled = callee && ts.isPropertyAccessExpression(callee) && (callee.name.text === 'catch' || (callee.name.text === 'then' && e.arguments.length >= 2));
          if (!handled && isThenable(checker, checker.getTypeAtLocation(e))) {
            hits.push({ line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, text: e.getText(sf).split('\n')[0].slice(0, 80) });
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    if (hits.length) out[rel] = hits;
  }
  return out;
}

module.exports = { floatingPromises };
