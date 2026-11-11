#!/bin/bash
# PreToolUse guard for Bash inside the report-only subagents (auditor, steward; decision 0131).
# Their "edits nothing" is enforced here, not asked for: every part of the command must be a read or
# a test run from the list below. Exit 2 blocks the call; stderr is the reason the subagent sees.
INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$CMD" ] && exit 0

deny() { echo "Blocked: this reviewer's shell is read-only ($1). Allowed: npm test, npm run check:* and test:*, npx tsx --test, read-only git (log, diff, show, status, ls-files, grep, blame, rev-parse, cat-file), grep, rg, ls, cat, head, tail, wc, sort, uniq, cut, sed -n, jq, find, echo. Report what you would have run instead." >&2; exit 2; }

# No substitution, no writing redirect (2>&1 and >/dev/null aside), no background job.
case "$CMD" in *'$('*|*'`'*|*'<('*) deny "command substitution" ;; esac
STRIPPED=$(printf '%s' "$CMD" | sed -E 's/[0-9]*>&[0-9]+//g; s/[0-9]*>[[:space:]]*\/dev\/null//g')
case "$STRIPPED" in *'>'*) deny "a redirect that writes" ;; esac

# Each part between && || ; | and newlines is checked by its leading words.
PARTS=$(printf '%s\n' "$STRIPPED" | sed -E 's/(&&|\|\||;|\|)/\n/g')
case "$PARTS" in *'&'*) deny "a background job" ;; esac
while IFS= read -r PART; do
  PART=$(printf '%s' "$PART" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')
  [ -z "$PART" ] && continue
  case "$PART" in *--output*|"sort -o"*|"sort "*" -o"*) deny "a flag that writes a file" ;; esac
  case "$PART" in
    "npm test"|"npm test "*|"npm run test:"*|"npm run check:"*|"npm run -s check:"*|"npm run -s test:"*|"npx tsx --test "*) ;;
    "git log"|"git log "*|"git diff"|"git diff "*|"git show "*|"git status"|"git status "*|"git ls-files"|"git ls-files "*|"git grep "*|"git blame "*|"git rev-parse "*|"git cat-file "*) ;;
    "grep "*|"rg "*|"ls"|"ls "*|"cat "*|"head"|"head "*|"tail"|"tail "*|"wc"|"wc "*|"sort"|"sort "*|"uniq"|"uniq "*|"cut "*|"jq "*|"echo "*|"true") ;;
    "sed -n "*) printf '%s' "$PART" | grep -Eq "^sed -n '?[0-9,\$]+p'?( |\$)" || deny "sed beyond printing lines" ;;
    "find "*) case "$PART" in *-delete*|*-exec*|*-ok*|*-fprint*) deny "find that acts" ;; esac ;;
    *) deny "\`$(printf '%s' "$PART" | cut -c1-60)\`" ;;
  esac
done <<EOF2
$PARTS
EOF2
exit 0
