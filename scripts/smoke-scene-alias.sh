#!/usr/bin/env bash

# Parse command line arguments
SID="$1"
PROJECT_ID="$2"

# Use environment variables or defaults
API_URL="${API_URL:-${3:-http://localhost:3001}}"
API_TOKEN="${API_TOKEN:-}"

if [ -z "$SID" ] || [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./smoke-scene-alias.sh <sceneId> <projectId> [base]"
  echo "You can set API_URL and API_TOKEN environment variables to avoid passing them every run."
  exit 1
fi

echo "Using base URL: $API_URL"

# Function to make API calls with optional authentication
invoke_api() {
  local path="$1"
  local headers=""
  
  if [ -n "$API_TOKEN" ]; then
    headers="-H \"Authorization: Bearer $API_TOKEN\""
    echo "Using authentication token for request to $path"
  fi
  
  echo "Making request to: $API_URL$path"
  if [ -n "$headers" ]; then
    eval "curl -s $headers \"$API_URL$path\""
  else
    curl -s "$API_URL$path"
  fi
}

echo "Fetching project categories: GET /projects/$PROJECT_ID/categories"
proj_json=$(invoke_api "/projects/$PROJECT_ID/categories")
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to fetch project categories"
  exit 2
fi

echo "Fetching scene alias categories: GET /scenes/$SID/categories"
scene_json=$(invoke_api "/scenes/$SID/categories")
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to fetch scene categories"
  exit 2
fi

# Compare JSON outputs
if [ "$proj_json" = "$scene_json" ]; then
  echo "SUCCESS: Project categories and scene alias categories match."
  exit 0
else
  echo "FAILURE: Project categories and scene alias categories differ."
  echo "--- Project JSON ---"
  echo "$proj_json" | jq '.' 2>/dev/null || echo "$proj_json"
  echo "--- Scene JSON ---"
  echo "$scene_json" | jq '.' 2>/dev/null || echo "$scene_json"
  exit 2
fi
