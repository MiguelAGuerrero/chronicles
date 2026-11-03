#!/bin/bash
# PreToolUse guard for Edit|Write|MultiEdit. Blocks edits to generated or
# vendored paths. Exit 2 blocks the call; stderr is the reason Claude sees.
INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -z "$FILE" ] && exit 0
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
REL="${FILE#"$ROOT"/}"
case "$REL" in
  ios/*|android/*)
    echo "Blocked: ios/ and android/ are generated (Continuous Native Generation). Configure native behaviour in app.json or a config plugin instead." >&2
    exit 2 ;;
  node_modules/*|dist/*|public/maplibre-gl-worker.mjs)
    echo "Blocked: $REL is installed or built output, not source." >&2
    exit 2 ;;
esac
exit 0
