# Windows Firewall Configuration for Lumea Network Access
# Run this as Administrator in PowerShell to allow network access

# Allow Lumea API (port 3000)
New-NetFirewallRule -DisplayName "Lumea API" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Allow Lumea Web Frontend (port 5173 for dev, 80 for prod)
New-NetFirewallRule -DisplayName "Lumea Web Dev" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
New-NetFirewallRule -DisplayName "Lumea Web Prod" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow Lumea Solver Service (port 8000)
New-NetFirewallRule -DisplayName "Lumea Solver" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow

# Allow MinIO Object Storage (port 9000)
New-NetFirewallRule -DisplayName "Lumea MinIO" -Direction Inbound -Protocol TCP -LocalPort 9000 -Action Allow

# Allow MinIO Console (port 9001)
New-NetFirewallRule -DisplayName "Lumea MinIO Console" -Direction Inbound -Protocol TCP -LocalPort 9001 -Action Allow

# Allow PostgreSQL (port 5432)
New-NetFirewallRule -DisplayName "Lumea PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow

# Allow Redis (port 6379)
New-NetFirewallRule -DisplayName "Lumea Redis" -Direction Inbound -Protocol TCP -LocalPort 6379 -Action Allow

Write-Host "Firewall rules configured successfully!"
Write-Host "Your Lumea application should now be accessible from your phone at:"
Write-Host "Frontend: http://192.168.1.10:5173"
Write-Host "API: http://192.168.1.10:3000"
Write-Host "Solver: http://192.168.1.10:8000"
Write-Host "MinIO Console: http://192.168.1.10:9001"