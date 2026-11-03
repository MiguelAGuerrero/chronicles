#!/bin/bash
# Stop hook: when TypeScript sources changed since HEAD, the typecheck must
# pass before Claude ends its turn. Exit 2 blocks the stop; stderr goes back
# to Claude. Lint, tests and the e2e stay the agent's own job (see AGENTS.md).
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT" || exit 0
INPUT=$(cat)
# Don't loop: if this stop was already caused by a hook, let it through.
if printf '%s' "$INPUT" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then exit 0; fi
CHANGED=$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null | grep -E '\.(ts|tsx)$' )
[ -z "$CHANGED" ] && exit 0
[ -d node_modules ] || exit 0
OUT=$(npx tsc --noEmit 2>&1)
if [ $? -ne 0 ]; then
  echo "Typecheck fails (npm run typecheck). Fix before finishing:" >&2
  printf '%s\n' "$OUT" | head -25 >&2
  exit 2
fi
exit 0
