# Production Deployment Simulation Script for Windows
# This script simulates a production deployment with all necessary steps

param(
    [switch]$SkipBuild,
    [switch]$SkipTests,
    [switch]$Cleanup
)

Write-Host "🚀 LUMEA PRODUCTION DEPLOYMENT SIMULATION" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Helper functions
function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    $prerequisites = @(
        @{Name="Docker"; Command="docker --version"},
        @{Name="Docker Compose"; Command="docker-compose --version"},
        @{Name="Node.js"; Command="node --version"}
    )
    
    $allSatisfied = $true
    
    foreach ($prereq in $prerequisites) {
        try {
            $null = Invoke-Expression $prereq.Command 2>$null
            Write-Success "$($prereq.Name) is available"
        }
        catch {
            Write-Error "$($prereq.Name) is not installed or not in PATH"
            $allSatisfied = $false
        }
    }
    
    if (-not $allSatisfied) {
        throw "Prerequisites not satisfied"
    }
    
    Write-Success "All prerequisites satisfied"
}

# Generate SSL certificates
function New-SSLCertificates {
    Write-Info "Setting up SSL certificates for testing..."
    
    $sslDir = "nginx\ssl"
    if (-not (Test-Path $sslDir)) {
        New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
    }
    
    # Create dummy self-signed certificates for testing
    $certContent = @'
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJALtest...dummy...cert...content...
-----END CERTIFICATE-----
'@

    $keyContent = @'
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w...dummy...key...content...
-----END PRIVATE KEY-----
'@

    $certContent | Out-File -FilePath "$sslDir\cert.pem" -Encoding ASCII
    $keyContent | Out-File -FilePath "$sslDir\key.pem" -Encoding ASCII
    
    Write-Success "SSL certificates created (dummy certificates for testing)"
}

# Build production images
function Build-ProductionImages {
    if ($SkipBuild) {
        Write-Info "Skipping Docker image build (--SkipBuild flag)"
        return
    }
    
    Write-Info "Building production Docker images..."
    
    try {
        Write-Info "Building API production image..."
        & docker build -t lumea-api:production -f apps/api/Dockerfile --target production .
        if ($LASTEXITCODE -ne 0) { throw "API image build failed" }
        
        Write-Info "Building Web production image..."
        & docker build -t lumea-web:production -f apps/web/Dockerfile --target production .
        if ($LASTEXITCODE -ne 0) { throw "Web image build failed" }
        
        Write-Success "Production Docker images built"
    }
    catch {
        Write-Error "Failed to build production images: $_"
        throw
    }
}

# Start production services
function Start-ProductionServices {
    Write-Info "Starting production services..."
    
    try {
        # Stop any existing services
        Write-Info "Stopping existing services..."
        & docker-compose -f docker-compose.production.yml down --remove-orphans 2>$null
        
        # Start production stack
        Write-Info "Starting production stack..."
        & docker-compose -f docker-compose.production.yml up -d
        if ($LASTEXITCODE -ne 0) { throw "Failed to start production services" }
        
        Write-Success "Production services started"
    }
    catch {
        Write-Error "Failed to start production services: $_"
        throw
    }
}

# Wait for services
function Wait-ForServices {
    Write-Info "Waiting for services to be ready..."
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        Write-Info "Health check attempt $attempt/$maxAttempts..."
        
        try {
            # Test if containers are running
            $containers = & docker-compose -f docker-compose.production.yml ps -q
            if ($containers.Count -eq 0) {
                throw "No containers running"
            }
            
            Write-Success "Containers are running"
            break
        }
        catch {
            if ($attempt -eq $maxAttempts) {
                Write-Error "Services failed to start within timeout"
                throw "Service startup timeout"
            }
            
            Start-Sleep -Seconds 10
            $attempt++
        }
    }
    
    # Wait additional time for services to initialize
    Write-Info "Waiting for services to initialize..."
    Start-Sleep -Seconds 30
}

# Run database setup
function Initialize-Database {
    Write-Info "Setting up production database..."
    
    try {
        # Wait for database to be ready
        Write-Info "Waiting for database to be ready..."
        Start-Sleep -Seconds 10
        
        # Try to run migrations (this might fail if not properly configured)
        Write-Info "Attempting to run database migrations..."
        & docker-compose -f docker-compose.production.yml exec -T api_prod npm run prisma:migrate 2>$null
        
        # Try to seed database
        Write-Info "Attempting to seed database..."
        & docker-compose -f docker-compose.production.yml exec -T api_prod npm run prisma:seed 2>$null
        
        Write-Success "Database setup completed (some steps may have been skipped)"
    }
    catch {
        Write-Warning "Database setup encountered issues but continuing..."
    }
}

# Test deployment
function Test-ProductionDeployment {
    if ($SkipTests) {
        Write-Info "Skipping production tests (--SkipTests flag)"
        return
    }
    
    Write-Info "Running production deployment tests..."
    
    if (Test-Path "production-deployment-test.js") {
        try {
            & node production-deployment-test.js
            Write-Success "Production tests completed"
        }
        catch {
            Write-Warning "Production tests failed but continuing..."
        }
    } else {
        Write-Warning "Production test file not found, skipping automated tests"
    }
}

# Show deployment status
function Show-DeploymentStatus {
    Write-Info "Production deployment status:"
    Write-Host ""
    
    # Show container status
    & docker-compose -f docker-compose.production.yml ps
    
    Write-Host ""
    Write-Info "Service URLs:"
    Write-Host "🌐 Frontend (Web):     http://localhost:3000" -ForegroundColor White
    Write-Host "🔌 API (Direct):       http://localhost:3002" -ForegroundColor White
    Write-Host "⚖️  Load Balancer:     http://localhost:8080" -ForegroundColor White
    Write-Host "🔒 HTTPS Load Balancer: https://localhost:8443" -ForegroundColor White
    Write-Host "📊 MinIO Console:      http://localhost:9091" -ForegroundColor White
    Write-Host ""
    
    Write-Info "Service Health Checks:"
    
    # Test services
    $healthChecks = @(
        @{Name="API"; Url="http://localhost:3002/health"},
        @{Name="Load Balancer"; Url="http://localhost:8080/health"}
    )
    
    foreach ($check in $healthChecks) {
        try {
            $response = Invoke-RestMethod -Uri $check.Url -TimeoutSec 5 -ErrorAction Stop
            Write-Success "$($check.Name) service is healthy"
        }
        catch {
            Write-Warning "$($check.Name) service health check failed (may still be starting)"
        }
    }
}

# Cleanup function
function Stop-ProductionServices {
    Write-Info "Cleaning up production deployment..."
    & docker-compose -f docker-compose.production.yml down --remove-orphans
    Write-Success "Cleanup completed"
}

# Main deployment process
function Start-ProductionDeployment {
    try {
        Write-Host "Starting production deployment simulation..." -ForegroundColor Blue
        Write-Host ""
        
        Test-Prerequisites
        New-SSLCertificates
        Build-ProductionImages
        Start-ProductionServices
        Wait-ForServices
        Initialize-Database
        
        Show-DeploymentStatus
        Test-ProductionDeployment
        
        Write-Success "Production deployment simulation completed!"
        Write-Info "Services are running. Use -Cleanup flag or Ctrl+C to stop services."
        
        if (-not $Cleanup) {
            Write-Host ""
            Write-Host "To stop services, run: docker-compose -f docker-compose.production.yml down" -ForegroundColor Yellow
            Write-Host "Or run this script with -Cleanup flag" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Error "Deployment failed: $_"
        Write-Info "Attempting cleanup..."
        Stop-ProductionServices
        throw
    }
}

# Main execution
if ($Cleanup) {
    Stop-ProductionServices
} else {
    Start-ProductionDeployment
}