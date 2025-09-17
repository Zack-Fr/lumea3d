#!/usr/bin/env bash
SID="$1"
PROJECT_ID="$2"
BASE=${3:-http://localhost:3000}

if [ -z "$SID" ] || [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./smoke-scene-alias.sh <sceneId> <projectId> [base]"
  exit 1
fi

echo "Checking project categories..."
curl -s "$BASE/projects/$PROJECT_ID/categories" | jq '.'

echo "Checking scene alias categories..."
curl -s "$BASE/scenes/$SID/categories" | jq '.'

echo "Checking scene manifest..."
curl -s "$BASE/scenes/$SID/manifest" | jq '.version'
