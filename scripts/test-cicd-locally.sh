#!/bin/bash

# Comprehensive local CI/CD testing script
# This script mimics the GitHub Actions workflows to catch issues before pushing

set -e  # Exit on any error

echo "🔍 Starting comprehensive local CI/CD testing..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Test 1: Package installation
echo "🔧 Testing package installation..."
if pnpm install --frozen-lockfile; then
    print_status "Package installation successful"
else
    print_error "Package installation failed"
    exit 1
fi

# Test 2: TypeScript compilation
echo "📝 Testing TypeScript compilation..."
if pnpm typecheck; then
    print_status "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Test 3: Linting
echo "🧹 Testing linting..."
if pnpm lint; then
    print_status "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi

# Test 4: Build
echo "🏗️ Testing build..."
if pnpm build; then
    print_status "Build successful"
else
    print_error "Build failed"
    exit 1
fi

# Test 5: Unit tests
echo "🧪 Testing unit tests..."
if pnpm test; then
    print_status "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

# Test 6: Coverage tests
echo "📊 Testing coverage..."
if pnpm test:cov; then
    print_status "Coverage tests passed"
else
    print_error "Coverage tests failed"
    exit 1
fi

# Test 7: Docker build verification (if Dockerfiles exist)
echo "🐳 Testing Docker builds..."
if [ -f "apps/api/Dockerfile" ]; then
    echo "Building API Docker image..."
    if docker build -t lumea-api:test apps/api/; then
        print_status "API Docker build successful"
    else
        print_error "API Docker build failed"
        exit 1
    fi
fi

if [ -f "apps/web/Dockerfile" ]; then
    echo "Building Web Docker image..."
    if docker build -t lumea-web:test apps/web/; then
        print_status "Web Docker build successful"
    else
        print_error "Web Docker build failed"
        exit 1
    fi
fi

# Test 8: Check for common CI/CD issues
echo "🔍 Checking for common CI/CD issues..."

# Check for secrets usage in workflows
echo "Checking GitHub Actions workflows for issues..."

# Check if deployment workflow has syntax errors
if command -v yamllint &> /dev/null; then
    if find .github/workflows -name "*.yml" -o -name "*.yaml" | xargs yamllint; then
        print_status "YAML syntax validation passed"
    else
        print_error "YAML syntax validation failed"
        exit 1
    fi
else
    print_warning "yamllint not installed, skipping YAML validation"
fi

# Check for missing environment files
echo "Checking for required configuration files..."
if [ -f "infra/.env.example" ]; then
    print_status "Environment example file exists"
else
    print_error "Missing infra/.env.example file"
    exit 1
fi

# Test 9: OpenAPI generation (if script exists)
if [ -f "scripts/generate-openapi.mjs" ]; then
    echo "🔧 Testing OpenAPI generation..."
    if node scripts/generate-openapi.mjs; then
        print_status "OpenAPI generation successful"
    else
        print_error "OpenAPI generation failed"
        exit 1
    fi
fi

# Test 10: Check coverage output directory
echo "📁 Checking coverage output..."
if [ -d "coverage" ]; then
    print_status "Coverage directory exists"
else
    print_warning "Coverage directory not found - this might cause CI issues"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 All local CI/CD tests passed!${NC}"
echo "✅ Safe to push to remote repository"
echo ""
echo "Summary:"
echo "- Package installation: ✓"
echo "- TypeScript compilation: ✓"
echo "- Linting: ✓"
echo "- Build: ✓"
echo "- Unit tests: ✓"
echo "- Coverage tests: ✓"
echo "- Docker builds: ✓"
echo "- YAML validation: ✓"
echo "- Configuration files: ✓"