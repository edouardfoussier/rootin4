#!/usr/bin/env bash
# Record (or roll back) a real match result against the live backend.
#
#   Group stage:   ./record-result.sh MATCH_ID GOALS_A GOALS_B
#   Knockout:      ./record-result.sh MATCH_ID GOALS_A GOALS_B TEAM_A TEAM_B [SHOOTOUT_WINNER]
#   Roll back:     ./record-result.sh --undo MATCH_ID
#
# Goals follow the schedule's team order (team A is the first-listed side —
# for match 1 that's Mexico). The admin token is read from
# $ROOTIN4_ADMIN_TOKEN or ~/.rootin4-admin-token.
set -euo pipefail

BACKEND="${ROOTIN4_BACKEND:-https://rootin4-agent-282461311841.europe-west1.run.app}"
TOKEN="${ROOTIN4_ADMIN_TOKEN:-$(cat "$HOME/.rootin4-admin-token")}"

if [[ "${1:-}" == "--undo" ]]; then
  curl -sf -X DELETE "$BACKEND/api/admin/results/${2:?usage: --undo MATCH_ID}" \
    -H "x-admin-token: $TOKEN" | python3 -m json.tool
  exit 0
fi

MATCH_ID="${1:?usage: record-result.sh MATCH_ID GOALS_A GOALS_B [TEAM_A TEAM_B [WINNER]]}"
GOALS_A="${2:?missing GOALS_A}"
GOALS_B="${3:?missing GOALS_B}"
TEAM_A="${4:-}"
TEAM_B="${5:-}"
WINNER="${6:-}"

BODY="{\"match_id\": $MATCH_ID, \"goals_a\": $GOALS_A, \"goals_b\": $GOALS_B"
[[ -n "$TEAM_A" ]] && BODY+=", \"team_a\": \"$TEAM_A\", \"team_b\": \"$TEAM_B\""
[[ -n "$WINNER" ]] && BODY+=", \"winner\": \"$WINNER\""
BODY+="}"

curl -sf -X POST "$BACKEND/api/admin/results" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  -d "$BODY" | python3 -m json.tool
