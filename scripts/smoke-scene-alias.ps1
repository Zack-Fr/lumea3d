param(
  [string]$SID,
  [string]$ProjectId,
  [string]$API_URL = $env:API_URL,
  [string]$API_TOKEN = $env:API_TOKEN
)

if (-not $SID -or -not $ProjectId) {
  Write-Host "Usage: ./smoke-scene-alias.ps1 -SID <sceneId> -ProjectId <projectId> [-API_URL <baseUrl>]"
  Write-Host "You can set API_URL and API_TOKEN environment variables to avoid passing them every run."
  exit 1
}

$BASE = if ($API_URL) { $API_URL } else { 'http://localhost:3001' }

Write-Host "Using base URL: $BASE"

function Invoke-Api($path) {
  $headers = @{}
  if ($API_TOKEN) { $headers['Authorization'] = "Bearer $API_TOKEN" }
  try {
    return Invoke-RestMethod -Uri "$BASE$path" -Headers $headers -UseBasicParsing
  } catch {
    Write-Host "Request to $path failed: $_"
    throw
  }
}

Write-Host "Fetching project categories: GET /projects/$ProjectId/categories"
$proj = Invoke-Api "/projects/$ProjectId/categories"
Write-Host "Project categories received: $($proj | ConvertTo-Json -Depth 3)"

Write-Host "Fetching scene alias categories: GET /scenes/$SID/categories"
$scene = Invoke-Api "/scenes/$SID/categories"
Write-Host "Scene categories received: $($scene | ConvertTo-Json -Depth 3)"

# Compare JSON string representations for equality (order-sensitive). If you need order-insensitive compare, adjust accordingly.
$projJson = $proj | ConvertTo-Json -Depth 6
$sceneJson = $scene | ConvertTo-Json -Depth 6

if ($projJson -eq $sceneJson) {
  Write-Host "OK: Project categories and scene alias categories match."
  exit 0
} else {
  Write-Host "FAIL: Project categories and scene alias categories differ."
  # Write diffs to help debugging
  Write-Host "--- Project JSON ---"
  Write-Host $projJson
  Write-Host "--- Scene JSON ---"
  Write-Host $sceneJson
  exit 2
}
