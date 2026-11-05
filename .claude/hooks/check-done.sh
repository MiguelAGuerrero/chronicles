#!/bin/bash
# Stop hook. Before Claude ends a turn that changed the repo:
#   - the agent docs must pass scripts/check-docs.js (budgets, rule globs,
#     named paths), whenever anything changed: a moved source file can break
#     a doc as surely as an edit to one;
#   - the vision check (scripts/check-vision.js) must pass when source, a spec,
#     package.json or the check itself changed (decision 0094);
#   - the typecheck must pass when TypeScript changed; the layer check and the
#     unit tests that import what changed, when TypeScript or a script changed.
# "Changed" means the working tree, new files, or the branch's commits since main
# (scripts/affected.js changed), in the checkout the session is in (its cwd).
# Exit 2 blocks the stop and sends stderr back to Claude. CI runs the docs
# check too, so a breach that gets past this still can't deploy.
INPUT=$(cat)
# Don't loop: if this stop was already caused by a hook, let it through.
if printf '%s' "$INPUT" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then exit 0; fi
# The checkout to check is the one the session is in: a /fix worktree under .claude/worktrees/ is
# gitignored by the main checkout, so checking $CLAUDE_PROJECT_DIR would see nothing (procedures audit 1).
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
ROOT=$(git -C "${CWD:-${CLAUDE_PROJECT_DIR:-$(pwd)}}" rev-parse --show-toplevel 2>/dev/null) || ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT" || exit 0

# What changed: the working tree, new files, and the branch's commits since main, with or without an upstream.
CHANGED=$(node scripts/affected.js changed 2>/dev/null)
[ -z "$CHANGED" ] && exit 0
[ "$CHANGED" = '*' ] && CHANGED=$(git ls-files)

FAILED=0
DOCS=$(node scripts/check-docs.js 2>&1)
if [ $? -ne 0 ]; then
  printf '%s\n' "$DOCS" >&2
  FAILED=1
fi

if printf '%s\n' "$CHANGED" | grep -qE '^(src|specs|public)/|^package\.json$|^index\.js$|^app\.config\.js$|^scripts/(check-vision\.js|vision\.allow\.json)$'; then
  OUT=$(node scripts/check-vision.js 2>&1)
  if [ $? -ne 0 ]; then
    printf '%s\n' "$OUT" >&2
    FAILED=1
  fi
fi

if printf '%s\n' "$CHANGED" | grep -qE '\.(ts|tsx)$' && [ -d node_modules ]; then
  OUT=$(npx tsc --noEmit 2>&1)
  if [ $? -ne 0 ]; then
    echo "Typecheck fails (npm run typecheck). Fix before finishing:" >&2
    printf '%s\n' "$OUT" | head -25 >&2
    FAILED=1
  fi
fi

# With TypeScript or a script changed: the layer check and the unit tests that
# import what changed, the tree-wide ones included (scripts/affected.js, AC8, TG13).
if printf '%s\n' "$CHANGED" | grep -qE '\.(ts|tsx)$|^scripts/' && [ -d node_modules ]; then
  OUT=$(node scripts/affected.js hook 2>&1)
  if [ $? -ne 0 ]; then
    echo "The layer check or the affected unit tests fail (node scripts/affected.js hook). Fix before finishing:" >&2
    printf '%s\n' "$OUT" | tail -40 >&2
    FAILED=1
  fi
fi

[ $FAILED -eq 1 ] && exit 2
exit 0
