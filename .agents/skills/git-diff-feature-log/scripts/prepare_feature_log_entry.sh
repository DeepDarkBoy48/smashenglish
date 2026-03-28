#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

timestamp="$(date '+%Y-%m-%d %H:%M:%S %z')"
branch="$(git rev-parse --abbrev-ref HEAD)"

if ! git diff --cached --quiet; then
  diff_label="staged"
  files="$(git diff --cached --name-only)"
elif ! git diff --quiet; then
  diff_label="working-tree"
  files="$(git diff --name-only)"
else
  diff_label="head"
  files="$(git show --pretty='' --name-only HEAD)"
fi

cat <<EOF
## ${timestamp}

- Commit: pending
- Branch: ${branch}
- Diff Source: ${diff_label}
- Summary: TODO

### Features

- TODO

### Files
EOF

if [[ -n "${files}" ]]; then
  while IFS= read -r file; do
    [[ -n "${file}" ]] && printf -- "- \`%s\`\n" "${file}"
  done <<< "${files}"
else
  echo "- (no changed files detected)"
fi
