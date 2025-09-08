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
  if ($API_TOKEN) { 
    $headers['Authorization'] = "Bearer $API_TOKEN" 
    Write-Host "Using authentication token for request to $path"
  }
  try {
    Write-Host "Making request to: $BASE$path"
    return Invoke-RestMethod -Uri "$BASE$path" -Headers $headers -UseBasicParsing
  } catch {
    Write-Host "ERROR: Request to $path failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
      Write-Host "Response status: $($_.Exception.Response.StatusCode)"
    }
    throw
  }
}

Write-Host "Fetching project categories: GET /projects/$ProjectId/categories"
$proj = Invoke-Api "/projects/$ProjectId/categories"
$projCount = if ($proj -is [array]) { $proj.Length } else { 1 }
Write-Host "Project categories received (count: $projCount)"

Write-Host "Fetching scene alias categories: GET /scenes/$SID/categories"
$scene = Invoke-Api "/scenes/$SID/categories"
$sceneCount = if ($scene -is [array]) { $scene.Length } else { 1 }
Write-Host "Scene categories received (count: $sceneCount)"

# Compare JSON string representations for equality (order-sensitive)
$projJson = $proj | ConvertTo-Json -Depth 6 -Compress
$sceneJson = $scene | ConvertTo-Json -Depth 6 -Compress

if ($projJson -eq $sceneJson) {
  Write-Host "SUCCESS: Project categories and scene alias categories match."
  exit 0
} else {
  Write-Host "FAILURE: Project categories and scene alias categories differ."
  # Write diffs to help debugging
  Write-Host "--- Project JSON ---"
  Write-Host ($proj | ConvertTo-Json -Depth 6)
  Write-Host "--- Scene JSON ---"
  Write-Host ($scene | ConvertTo-Json -Depth 6)
  exit 2
}
