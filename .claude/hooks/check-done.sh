#!/bin/bash
# Stop hook. Before Claude ends a turn that changed the repo:
#   - the agent docs must pass scripts/check-docs.js (budgets, rule globs,
#     named paths), whenever anything changed: a moved source file can break
#     a doc as surely as an edit to one;
#   - the vision check (scripts/check-vision.js) must pass when source, a spec,
#     package.json or the check itself changed (decision 0094);
#   - the typecheck must pass when TypeScript changed; the layer check and the
#     unit tests that import what changed, when TypeScript or a script changed.
# "Changed" means the working tree, new files, or commits not yet pushed.
# Exit 2 blocks the stop and sends stderr back to Claude. CI runs the docs
# check too, so a breach that gets past this still can't deploy.
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT" || exit 0
INPUT=$(cat)
# Don't loop: if this stop was already caused by a hook, let it through.
if printf '%s' "$INPUT" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then exit 0; fi

CHANGED=$( {
  git diff --name-only HEAD
  git ls-files --others --exclude-standard
  git rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1 && git diff --name-only '@{upstream}' HEAD
} 2>/dev/null | sort -u )
[ -z "$CHANGED" ] && exit 0

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
